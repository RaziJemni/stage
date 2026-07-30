import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Response
from pwdlib import PasswordHash

from app.core.config import settings
from app.core.enums import UserRole


password_hash = PasswordHash.recommended()
DUMMY_PASSWORD_HASH = password_hash.hash("vayca-dummy-password")


def normalize_email(email: str) -> str:
    return email.strip().lower()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, stored_hash: str) -> bool:
    return password_hash.verify(password, stored_hash)


def generate_secret() -> str:
    return secrets.token_urlsafe(32)


def hash_secret(secret: str) -> str:
    return hashlib.sha256(secret.encode("utf-8")).hexdigest()


def expires_at(hours: int) -> datetime:
    return datetime.now(timezone.utc) + timedelta(hours=hours)


def permissions_for_role(role: UserRole) -> list[str]:
    shared = ["operations:access"]
    if role is UserRole.MANAGER:
        return [*shared, "company:manage", "team:read", "team:write"]
    return shared


def set_auth_cookies(response: Response, session_token: str, csrf_token: str) -> None:
    max_age = settings.session_hours * 60 * 60
    response.set_cookie(
        key=settings.session_cookie_name,
        value=session_token,
        max_age=max_age,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    response.set_cookie(
        key=settings.csrf_cookie_name,
        value=csrf_token,
        max_age=max_age,
        httponly=False,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(settings.session_cookie_name, path="/")
    response.delete_cookie(settings.csrf_cookie_name, path="/")
