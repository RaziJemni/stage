import os
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from uuid import uuid4

import pytest
import sqlalchemy as sa
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from redis import Redis
from sqlalchemy.engine import make_url

from app.api.errors import ApiProblem
from app.core.config import settings
from app.core.database import SessionLocal
from app.core.enums import UserStatus
from app.main import create_app
from app.modules.identity.models import AppUser, AuthSession, UserInvitation
from app.modules.identity.rate_limit import LoginRateLimiter, get_login_rate_limiter


class FakeLoginRateLimiter:
    def __init__(self) -> None:
        self.attempts: dict[str, int] = defaultdict(int)

    def ensure_allowed(self, email: str, client_ip: str) -> None:
        if self.attempts[f"{email}|{client_ip}"] >= settings.login_rate_limit_attempts:
            raise ApiProblem(
                status=429,
                title="Too many login attempts",
                detail="Wait before trying to sign in again.",
                code="login_rate_limited",
            )

    def record_failure(self, email: str, client_ip: str) -> None:
        self.attempts[f"{email}|{client_ip}"] += 1

    def clear(self, email: str, client_ip: str) -> None:
        self.attempts.pop(f"{email}|{client_ip}", None)


def alembic_config() -> Config:
    database_url = os.environ["DATABASE_URL"]
    assert (make_url(database_url).database or "").endswith("_test")
    backend_root = Path(__file__).resolve().parents[1]
    config = Config(str(backend_root / "alembic.ini"))
    config.set_main_option("script_location", str(backend_root / "alembic"))
    config.set_main_option("sqlalchemy.url", database_url.replace("%", "%%"))
    return config


@pytest.fixture(scope="module", autouse=True)
def migrated_auth_database() -> None:
    config = alembic_config()
    command.downgrade(config, "base")
    command.upgrade(config, "head")
    yield
    command.downgrade(config, "base")
    command.upgrade(config, "head")


@pytest.fixture(autouse=True)
def clean_auth_data() -> None:
    with SessionLocal() as db:
        db.execute(sa.text("TRUNCATE TABLE companies CASCADE"))
        db.commit()


@pytest.fixture
def client() -> TestClient:
    app = create_app()
    limiter = FakeLoginRateLimiter()
    app.dependency_overrides[get_login_rate_limiter] = lambda: limiter
    with TestClient(app) as test_client:
        yield test_client


def registration_payload(email: str = "Manager@Example.com") -> dict[str, str]:
    return {
        "company_name": "Hammamet Agency",
        "name": "Razi Manager",
        "email": email,
        "password": "correct-horse-battery-staple",
        "timezone": "Africa/Tunis",
    }


def register(client: TestClient, email: str = "Manager@Example.com") -> dict:
    response = client.post("/api/v1/auth/register", json=registration_payload(email))
    assert response.status_code == 201, response.text
    return response.json()


def csrf_headers(client: TestClient) -> dict[str, str]:
    token = client.cookies.get(settings.csrf_cookie_name)
    assert token
    return {"X-CSRF-Token": token}


def invite_staff(client: TestClient, email: str = "staff@example.com") -> tuple[dict, str]:
    response = client.post(
        "/api/v1/team/invitations",
        json={"name": "Amira Staff", "email": email},
        headers=csrf_headers(client),
    )
    assert response.status_code == 201, response.text
    payload = response.json()
    invitation_url = payload["invitation_url"]
    token = parse_qs(urlparse(invitation_url).query)["token"][0]
    return payload, token


def test_registration_hashes_password_and_normalizes_email(client: TestClient) -> None:
    payload = register(client)
    assert payload["user"]["email"] == "manager@example.com"
    assert payload["user"]["role"] == "manager"
    assert client.cookies.get(settings.session_cookie_name)
    with SessionLocal() as db:
        user = db.scalar(sa.select(AppUser).where(AppUser.email == "manager@example.com"))
        assert user is not None
        assert user.password_hash.startswith("$argon2id$")
        assert "correct-horse" not in user.password_hash

    duplicate = client.post(
        "/api/v1/auth/register",
        json=registration_payload("MANAGER@example.com"),
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["code"] == "email_already_registered"


def test_login_me_logout_and_expired_session(client: TestClient) -> None:
    identity = register(client)
    assert client.get("/api/v1/auth/me").json() == identity
    logout = client.post("/api/v1/auth/logout", headers=csrf_headers(client))
    assert logout.status_code == 204
    assert client.get("/api/v1/auth/me").status_code == 401

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "manager@example.com", "password": "correct-horse-battery-staple"},
    )
    assert login.status_code == 200
    session_token = client.cookies.get(settings.session_cookie_name)
    assert session_token
    with SessionLocal() as db:
        session = db.scalar(sa.select(AuthSession).where(AuthSession.revoked_at.is_(None)))
        assert session is not None
        session.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.commit()
    assert client.get("/api/v1/auth/me").status_code == 401


def test_csrf_is_required_for_authenticated_writes(client: TestClient) -> None:
    register(client)
    response = client.post(
        "/api/v1/team/invitations",
        json={"name": "Amira Staff", "email": "staff@example.com"},
    )
    assert response.status_code == 403
    assert response.json()["code"] == "csrf_invalid"


def test_invitation_is_hashed_single_use_and_staff_is_forbidden(client: TestClient) -> None:
    register(client)
    invitation, token = invite_staff(client)
    with SessionLocal() as db:
        stored = db.scalar(sa.select(UserInvitation))
        assert stored is not None
        assert stored.token_hash != token

    staff_client = TestClient(client.app)
    accepted = staff_client.post(
        "/api/v1/auth/invitations/accept",
        json={"token": token, "password": "staff-secure-password"},
    )
    assert accepted.status_code == 200
    assert accepted.json()["user"]["role"] == "staff"
    assert staff_client.get("/api/v1/team").status_code == 403
    reused = TestClient(client.app).post(
        "/api/v1/auth/invitations/accept",
        json={"token": token, "password": "another-secure-password"},
    )
    assert reused.status_code == 400
    assert invitation["member"]["status"] == "invited"


def test_expired_invitation_cannot_activate_staff(client: TestClient) -> None:
    register(client)
    _, token = invite_staff(client)
    with SessionLocal() as db:
        invitation = db.scalar(sa.select(UserInvitation))
        assert invitation is not None
        invitation.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.commit()

    response = TestClient(client.app).post(
        "/api/v1/auth/invitations/accept",
        json={"token": token, "password": "staff-secure-password"},
    )
    assert response.status_code == 400
    assert response.json()["code"] == "invitation_invalid"


def test_client_company_id_cannot_override_session_company(client: TestClient) -> None:
    identity = register(client)
    response = client.post(
        "/api/v1/team/invitations",
        json={
            "name": "Amira Staff",
            "email": "staff@example.com",
            "company_id": str(uuid4()),
        },
        headers=csrf_headers(client),
    )
    assert response.status_code == 422
    assert response.json()["code"] == "request_validation_failed"
    assert identity["company"]["id"]


def test_manager_deactivation_revokes_staff_sessions(client: TestClient) -> None:
    register(client)
    invitation, token = invite_staff(client)
    staff_client = TestClient(client.app)
    assert staff_client.post(
        "/api/v1/auth/invitations/accept",
        json={"token": token, "password": "staff-secure-password"},
    ).status_code == 200
    staff_id = invitation["member"]["id"]
    response = client.patch(
        f"/api/v1/team/{staff_id}/status",
        json={"status": "inactive"},
        headers=csrf_headers(client),
    )
    assert response.status_code == 200
    assert response.json()["status"] == "inactive"
    assert staff_client.get("/api/v1/auth/me").status_code == 401


def test_cross_company_team_member_is_not_visible(client: TestClient) -> None:
    register(client, "manager-a@example.com")
    other_client = TestClient(client.app)
    other_identity = register(other_client, "manager-b@example.com")
    response = client.patch(
        f"/api/v1/team/{other_identity['user']['id']}/status",
        json={"status": "inactive"},
        headers=csrf_headers(client),
    )
    assert response.status_code == 404


def test_inactive_account_and_login_rate_limit(client: TestClient) -> None:
    register(client)
    with SessionLocal() as db:
        user = db.scalar(sa.select(AppUser).where(AppUser.email == "manager@example.com"))
        assert user is not None
        user.status = UserStatus.INACTIVE
        db.commit()
    inactive_client = TestClient(client.app)
    inactive = inactive_client.post(
        "/api/v1/auth/login",
        json={"email": "manager@example.com", "password": "correct-horse-battery-staple"},
    )
    assert inactive.status_code == 403
    assert inactive.json()["code"] == "account_inactive"

    for _ in range(settings.login_rate_limit_attempts):
        failed = inactive_client.post(
            "/api/v1/auth/login",
            json={"email": "unknown@example.com", "password": "wrong"},
        )
        assert failed.status_code == 401
    limited = inactive_client.post(
        "/api/v1/auth/login",
        json={"email": "unknown@example.com", "password": "wrong"},
    )
    assert limited.status_code == 429
    assert limited.json()["code"] == "login_rate_limited"


def test_redis_login_limiter_enforces_configured_window() -> None:
    redis_client = Redis.from_url(settings.redis_url, decode_responses=True)
    limiter = LoginRateLimiter(redis_client)
    email = f"rate-{uuid4()}@example.com"
    client_ip = "192.0.2.10"
    key = limiter.key(email, client_ip)
    redis_client.delete(key)
    try:
        for _ in range(settings.login_rate_limit_attempts):
            limiter.ensure_allowed(email, client_ip)
            limiter.record_failure(email, client_ip)
        with pytest.raises(ApiProblem) as caught:
            limiter.ensure_allowed(email, client_ip)
        assert caught.value.status == 429
        ttl = redis_client.ttl(key)
        assert 0 < ttl <= settings.login_rate_limit_window_seconds
    finally:
        redis_client.delete(key)


def test_user_preferred_language_persistence_and_update(client: TestClient) -> None:
    reg_data = register(client, email="lang_user@example.com")
    assert reg_data["user"]["preferred_language"] == "fr"

    me_response = client.get("/api/v1/auth/me")
    assert me_response.status_code == 200
    assert me_response.json()["user"]["preferred_language"] == "fr"

    update_response = client.patch(
        "/api/v1/auth/preferences",
        json={"preferred_language": "en"},
        headers=csrf_headers(client),
    )
    assert update_response.status_code == 200
    assert update_response.json()["user"]["preferred_language"] == "en"

    me_after = client.get("/api/v1/auth/me")
    assert me_after.status_code == 200
    assert me_after.json()["user"]["preferred_language"] == "en"

    invalid_patch = client.patch(
        "/api/v1/auth/preferences",
        json={"preferred_language": "de"},
        headers=csrf_headers(client),
    )
    assert invalid_patch.status_code == 422


def test_team_invitation_failure_rolls_back_user_and_invitation(client: TestClient) -> None:
    from unittest.mock import patch
    register(client)
    target_email = "willfail@example.com"

    with patch.object(settings, "email_provider", "smtp"):
        with patch(
            "app.integrations.email.adapters.SmtpEmailAdapter.send",
            side_effect=ApiProblem(
                status=502,
                title="Email delivery failed",
                detail="SMTP server unreachable",
                code="email_delivery_failed",
            ),
        ):
            response = client.post(
                "/api/v1/team/invitations",
                json={"name": "Failed Staff", "email": target_email},
                headers=csrf_headers(client),
            )
            assert response.status_code == 502
            assert response.json()["code"] == "email_delivery_failed"

    # Verify no orphaned AppUser or UserInvitation records exist
    with SessionLocal() as db:
        user = db.query(AppUser).filter(AppUser.email == target_email).first()
        assert user is None


def test_team_invitation_production_smtp_dispatches_email(client: TestClient) -> None:
    from unittest.mock import MagicMock, patch
    register(client)
    target_email = "prodstaff@example.com"

    mock_send = MagicMock(return_value=True)
    with patch.object(settings, "environment", "production"):
        with patch.object(settings, "email_provider", "smtp"):
            with patch("app.integrations.email.adapters.SmtpEmailAdapter.send", mock_send):
                response = client.post(
                    "/api/v1/team/invitations",
                    json={"name": "Prod Staff", "email": target_email},
                    headers=csrf_headers(client),
                )
                assert response.status_code == 201
                data = response.json()
                # In production, invitation_url must be None to prevent token exposure
                assert data["invitation_url"] is None
                assert data["member"]["email"] == target_email
                assert data["member"]["status"] == "invited"

    # Verify mock_send was called with an EmailPayload containing the invitation link
    assert mock_send.call_count == 1
    sent_payload = mock_send.call_args[0][0]
    assert sent_payload.to_email == target_email
    assert sent_payload.to_name == "Prod Staff"
    assert "/accept-invite?token=" in sent_payload.html_body
    assert "/accept-invite?token=" in sent_payload.text_body


def test_team_invitation_production_unconfigured_raises_503(client: TestClient) -> None:
    from unittest.mock import patch
    register(client)
    target_email = "unconfigured@example.com"

    with patch.object(settings, "environment", "production"):
        with patch.object(settings, "email_provider", "console"):
            response = client.post(
                "/api/v1/team/invitations",
                json={"name": "Unconfigured Staff", "email": target_email},
                headers=csrf_headers(client),
            )
            assert response.status_code == 503
            assert response.json()["code"] == "invitation_delivery_unavailable"

    with SessionLocal() as db:
        user = db.query(AppUser).filter(AppUser.email == target_email).first()
        assert user is None
