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
    whatsapp_provider: str = "meta"
    whatsapp_phone_number_id: str | None = None
    whatsapp_access_token: str | None = None
    whatsapp_api_secret: str | None = None
    whatsapp_webhook_verify_token: str | None = None
    whatsapp_business_account_id: str | None = None
    twilio_account_sid: str | None = None
    twilio_auth_token: str | None = None
    twilio_from_number: str | None = None
    whatsapp_default_property_id: str | None = None
    chatbot_provider: str = "deterministic"
    chatbot_model: str | None = None
    openai_api_key: str | None = None
    email_provider: str = "console"
    email_sender_address: str = "no-reply@vayca.tn"
    email_sender_name: str = "Vayca"
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_use_tls: bool = True
    smtp_timeout_seconds: int = 10

    @property
    def allowed_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @model_validator(mode="after")
    def require_secure_production_cookies(self) -> "Settings":
        if self.environment.lower() == "production" and not self.cookie_secure:
            raise ValueError("COOKIE_SECURE must be true in production")
        if self.whatsapp_mode not in {"simulator", "test", "production"}:
            raise ValueError("WHATSAPP_MODE must be simulator, test, or production")
        if self.whatsapp_provider not in {"meta", "twilio"}:
            raise ValueError("WHATSAPP_PROVIDER must be meta or twilio")
        if self.chatbot_provider not in {"deterministic", "openai"}:
            raise ValueError("CHATBOT_PROVIDER must be deterministic or openai")
        if self.email_provider not in {"console", "smtp", "memory"}:
            raise ValueError("EMAIL_PROVIDER must be console, smtp, or memory")
        if self.email_provider == "smtp" and not self.smtp_host:
            raise ValueError("SMTP_HOST must be set when EMAIL_PROVIDER is smtp")
        return self


settings = Settings()
