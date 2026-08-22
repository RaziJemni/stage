"""Chatbot model adapters kept outside the domain service."""

from dataclasses import dataclass

from app.core.config import settings


class ChatbotProviderError(Exception):
    """Raised when a configured model provider cannot produce a safe reply."""


@dataclass(frozen=True)
class GroundedReplyRequest:
    language: str
    guest_message: str
    fact_label: str
    fact_value: str


@dataclass(frozen=True)
class GeneratedReply:
    content: str
    model_version: str


class DeterministicChatbotProvider:
    """Network-free reply generator for simulator and automated tests."""

    model_version = "vayca-deterministic-v1"

    def generate(self, request: GroundedReplyRequest) -> GeneratedReply:
        labels = {
            "en": {"Availability": "Availability", "available": "available", "unavailable": "unavailable"},
            "fr": {"Availability": "Disponibilité", "available": "disponible", "unavailable": "indisponible"},
            "ar": {"Availability": "التوفر", "available": "متاح", "unavailable": "غير متاح"},
        }
        templates = {
            "en": "{label}: {value}",
            "fr": "{label} : {value}",
            "ar": "{label}: {value}",
        }
        language_labels = labels[request.language]
        return GeneratedReply(
            content=templates[request.language].format(
                label=language_labels.get(request.fact_label, request.fact_label),
                value=language_labels.get(request.fact_value, request.fact_value),
            ),
            model_version=self.model_version,
        )


class OpenAIChatbotProvider:
    """Configured production adapter; it has no database or tool access."""

    def generate(self, request: GroundedReplyRequest) -> GeneratedReply:
        if not settings.openai_api_key or not settings.chatbot_model:
            raise ChatbotProviderError("OpenAI chatbot configuration is incomplete")
        try:
            from openai import OpenAI

            response = OpenAI(api_key=settings.openai_api_key).responses.create(
                model=settings.chatbot_model,
                input=[
                    {
                        "role": "system",
                        "content": (
                            "Reply only in the requested language. Use exactly the verified "
                            "fact provided. Do not add, infer, alter, or omit operational facts."
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Language: {request.language}\n"
                            f"Guest message: {request.guest_message}\n"
                            f"Verified {request.fact_label}: {request.fact_value}"
                        ),
                    },
                ],
            )
        except Exception as exc:  # Provider exceptions must not block staff handling.
            raise ChatbotProviderError("OpenAI chatbot provider is unavailable") from exc
        content = (response.output_text or "").strip()
        if not content:
            raise ChatbotProviderError("OpenAI chatbot provider returned an empty reply")
        return GeneratedReply(content=content, model_version=settings.chatbot_model)


def get_chatbot_provider() -> DeterministicChatbotProvider | OpenAIChatbotProvider:
    if settings.chatbot_provider == "deterministic":
        return DeterministicChatbotProvider()
    if settings.chatbot_provider == "openai":
        return OpenAIChatbotProvider()
    raise ChatbotProviderError("Configured chatbot provider is unavailable")
