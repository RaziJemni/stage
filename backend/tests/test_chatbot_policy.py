import json
from pathlib import Path

from app.core.enums import HandlingMode
from app.modules.chatbot.policy import (
    PolicyOutcome,
    apply_escalation,
    classify_message,
)
from app.modules.messaging.models import Conversation


def test_versioned_escalation_dataset() -> None:
    dataset_path = Path(__file__).parent / "fixtures" / "chatbot_escalation_dataset.json"
    dataset = json.loads(dataset_path.read_text(encoding="utf-8"))
    assert dataset["version"] == "1.0.0"
    cases = dataset["cases"]
    for case in cases:
        decision = classify_message(case["message"], facts_available=case["facts_available"])
        assert decision.outcome.value == case["outcome"]
        assert decision.reason == case["reason"]


def test_escalation_switches_conversation_to_manual_with_a_reason() -> None:
    conversation = Conversation(handling_mode=HandlingMode.AUTOMATIC)
    decision = classify_message("There is a fire in the property")

    apply_escalation(conversation, decision)

    assert decision.outcome is PolicyOutcome.ESCALATE
    assert conversation.handling_mode is HandlingMode.MANUAL
    assert conversation.escalation_reason == "emergency"
