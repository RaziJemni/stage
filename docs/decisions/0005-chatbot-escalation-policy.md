# Decision 0005: Chatbot Escalation Policy

**Status:** Accepted
**Date:** 2026-08-03
**Owners:** Vayca team
**Related requirements/issues:** FR-MSG-08, FR-MSG-09, FR-MSG-10, NFR-AI-01 to NFR-AI-06, #10

## Context

Guest-facing automation must not handle high-impact, uncertain, or adversarial requests without staff oversight. No production chatbot provider has been selected yet.

## Decision

Use a deterministic policy gate before any future chatbot reply. It classifies a message as safe, confirmation-required, or escalation-required. Escalation-required messages change the conversation to manual handling and store a machine-readable reason for staff.

The initial mandatory escalation categories are emergencies, payments or refunds, cancellations or date changes, complaints or conflicts, missing or uncertain information, and prompt-injection attempts. Creating a ticket or assigning a contractor requires staff confirmation.

The policy does not send messages, create tickets, assign contractors, or select an AI model. A future chatbot provider must call this guardrail and provide whether its answer is grounded in verified property data.

## Consequences

### Positive

- Staff can see why a conversation was handed over before replying.
- Automation stops immediately for defined risky cases.
- A versioned English, French, Arabic, and Tunisian Arabic evaluation dataset protects the baseline as the chatbot evolves.

### Negative or risky

- Keyword rules are intentionally limited and can miss unfamiliar wording.
- Provider quality, latency, cost, and production multilingual evaluation remain open under `OPEN-008` and must be decided before live chatbot replies.

## Validation

Focused tests execute every dataset case, verify manual takeover records the reason, and verify a risky inbound message persists that state.
