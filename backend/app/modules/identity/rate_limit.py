import hashlib

from redis import Redis
from redis.exceptions import RedisError

from app.api.errors import ApiProblem
from app.core.config import settings


class LoginRateLimiter:
    def __init__(self, client: Redis) -> None:
        self.client = client

    @staticmethod
    def key(email: str, client_ip: str) -> str:
        identity = hashlib.sha256(f"{email}|{client_ip}".encode("utf-8")).hexdigest()
        return f"vayca:auth:login:{identity}"

    def ensure_allowed(self, email: str, client_ip: str) -> None:
        try:
            attempts = int(self.client.get(self.key(email, client_ip)) or 0)
        except RedisError as exc:
            raise ApiProblem(
                status=503,
                title="Authentication temporarily unavailable",
                detail="Login protection is temporarily unavailable. Please try again later.",
                code="auth_rate_limit_unavailable",
            ) from exc
        if attempts >= settings.login_rate_limit_attempts:
            raise ApiProblem(
                status=429,
                title="Too many login attempts",
                detail="Wait before trying to sign in again.",
                code="login_rate_limited",
            )

    def record_failure(self, email: str, client_ip: str) -> None:
        key = self.key(email, client_ip)
        try:
            self.client.eval(
                """
                local attempts = redis.call('INCR', KEYS[1])
                if attempts == 1 then
                    redis.call('EXPIRE', KEYS[1], ARGV[1])
                end
                return attempts
                """,
                1,
                key,
                settings.login_rate_limit_window_seconds,
            )
        except RedisError as exc:
            raise ApiProblem(
                status=503,
                title="Authentication temporarily unavailable",
                detail="Login protection is temporarily unavailable. Please try again later.",
                code="auth_rate_limit_unavailable",
            ) from exc

    def clear(self, email: str, client_ip: str) -> None:
        try:
            self.client.delete(self.key(email, client_ip))
        except RedisError:
            return


_login_rate_limiter = LoginRateLimiter(Redis.from_url(settings.redis_url, decode_responses=True))


def get_login_rate_limiter() -> LoginRateLimiter:
    return _login_rate_limiter
