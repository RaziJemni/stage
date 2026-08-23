from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://vayca:changeme_local_only@localhost:5432/vayca_dev"
    redis_url: str = "redis://localhost:6379/2"
    allowed_origins: str = "http://localhost:5173"
    frontend_base_url: str = "http://localhost:5173"
    environment: str = "development"
    session_cookie_name: str = "vayca_session"
    csrf_cookie_name: str = "vayca_csrf"
    session_hours: int = 8
    invitation_hours: int = 72
    cookie_secure: bool = False
    login_rate_limit_attempts: int = 5
    login_rate_limit_window_seconds: int = 900
    calendar_sync_interval_seconds: int = 900
    calendar_feed_max_bytes: int = 1_048_576
    whatsapp_mode: str = "simulator"
    whatsapp_simulator_webhook_secret: str = "local_simulator_secret_change_me"
    chatbot_provider: str = "deterministic"
    chatbot_model: str | None = None
    openai_api_key: str | None = None

    @property
    def allowed_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @model_validator(mode="after")
    def require_secure_production_cookies(self) -> "Settings":
        if self.environment.lower() == "production" and not self.cookie_secure:
            raise ValueError("COOKIE_SECURE must be true in production")
        if self.whatsapp_mode not in {"simulator", "test", "production"}:
            raise ValueError("WHATSAPP_MODE must be simulator, test, or production")
        if self.chatbot_provider not in {"deterministic", "openai"}:
            raise ValueError("CHATBOT_PROVIDER must be deterministic or openai")
        return self


settings = Settings()
