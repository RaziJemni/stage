from typing import Literal

from pydantic import BaseModel, ConfigDict


class WhatsAppIntegrationHealthResponse(BaseModel):
    """Safe WhatsApp mode information for the Settings integrations screen."""

    model_config = ConfigDict(extra="forbid")

    integration: Literal["whatsapp"] = "whatsapp"
    mode: Literal["simulator", "test", "production"]
    health_status: Literal["simulator", "test", "unconfigured"]
    detail: str
