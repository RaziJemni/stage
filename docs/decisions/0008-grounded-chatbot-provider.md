# Decision 0008: Grounded Chatbot Provider and Reply Processing

**Status:** Accepted
**Date:** 2026-08-22
**Owners:** Vayca project team
**Related requirements/issues:** FR-MSG-05..07, FR-MSG-10, NFR-AI-01, NFR-AI-03..06, #9

## Context

Issue #9 needs multilingual guest replies without allowing an AI provider to
invent property information, calculate availability, select tenant data, or
perform an operational action. WhatsApp delivery is still simulator-only; an
outbound production provider has not been approved.

## Options considered

### Option A: Deterministic templates only

This guarantees exact facts but does not satisfy the configured multilingual
model-provider requirement.

### Option B: Provider adapter behind a deterministic policy and fact boundary

The backend first runs the existing escalation policy and retrieves the one
authorized property fact or exact availability result. A configured provider
receives only that minimum context. Simulator and tests use a deterministic,
network-free provider.

## Decision

Accept Option B.

- The policy gate executes before property lookup or model invocation.
- The chatbot service owns intent recognition, tenant-scoped property lookup,
  and calls the Calendar module's availability service directly. A model never
  receives, chooses, or executes a property or company identifier.
- `CHATBOT_PROVIDER=deterministic` is the default for simulator and tests.
  It produces auditable French, English, or Arabic fact templates without an
  external request.
- `CHATBOT_PROVIDER=openai` uses the OpenAI Responses API through an adapter.
  Its model and API key are environment configuration, never database values or
  committed secrets.
- Processing runs in Celery after the signed inbound webhook has persisted and
  acknowledged the event. A task is idempotent per inbound-message identifier.
- A chatbot reply is persisted as `queued`, `automatically_sent=true`, with a
  model/configuration version. This records a generated reply awaiting an
  outbound transport; it must not be represented as WhatsApp delivery.
- Provider failure, missing/ambiguous facts, unsupported safe intent, and
  mandatory escalation categories switch the conversation to manual handling.
  Staff can then continue through the existing conversation workflow.

## Consequences

The exact availability result stays database-owned and testable. Provider
changes do not bypass tenant authorization, and local development remains
deterministic and secret-free. A production provider/model must still be
evaluated for French, English, Modern Standard Arabic, and Tunisian Arabic
quality, latency, and cost before real guest communication is enabled.

An approved outbound WhatsApp adapter is still required to deliver queued
chatbot replies. Until then, the integration remains simulator-only.

## Validation

Test safe property facts, exact available/unavailable date ranges, missing
facts, sensitive content, provider failure, task idempotency, and tenant
isolation. Run the deterministic multilingual evaluation set without network
access.
