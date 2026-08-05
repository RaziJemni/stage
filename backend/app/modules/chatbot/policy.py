from dataclasses import dataclass
from enum import StrEnum

from app.core.enums import HandlingMode
from app.modules.messaging.models import Conversation


class PolicyOutcome(StrEnum):
    SAFE = "safe"
    CONFIRMATION_REQUIRED = "confirmation_required"
    ESCALATE = "escalate"


@dataclass(frozen=True)
class PolicyDecision:
    outcome: PolicyOutcome
    reason: str | None = None


_ESCALATION_RULES = {
    "emergency": ("fire", "emergency", "urgent", "accident", "danger", "حريق", "طارئ"),
    "payment_or_refund": ("refund", "payment", "pay", "charge", "remboursement"),
    "cancellation_or_date_change": (
        "cancel",
        "cancellation",
        "date change",
        "annuler",
        "تغيير",
        "إلغاء",
        "nbadel",
    ),
    "complaint_or_conflict": ("complaint", "unhappy", "problem", "conflict", "شكوى"),
    "prompt_injection": ("ignore previous", "ignore instructions", "system prompt", "تعليمات النظام"),
}

_CONFIRMATION_REQUIRED_RULES = (
    "create a ticket",
    "assign contractor",
    "send a contractor",
)


def classify_message(content: str, *, facts_available: bool = True) -> PolicyDecision:
    normalized = content.casefold()
    if not facts_available:
        return PolicyDecision(PolicyOutcome.ESCALATE, "missing_or_uncertain_information")
    for reason, keywords in _ESCALATION_RULES.items():
        if any(keyword in normalized for keyword in keywords):
            return PolicyDecision(PolicyOutcome.ESCALATE, reason)
    if any(keyword in normalized for keyword in _CONFIRMATION_REQUIRED_RULES):
        return PolicyDecision(PolicyOutcome.CONFIRMATION_REQUIRED)
    return PolicyDecision(PolicyOutcome.SAFE)


def apply_escalation(conversation: Conversation, decision: PolicyDecision) -> None:
    if decision.outcome is not PolicyOutcome.ESCALATE:
        return
    conversation.handling_mode = HandlingMode.MANUAL
    conversation.escalation_reason = decision.reason
