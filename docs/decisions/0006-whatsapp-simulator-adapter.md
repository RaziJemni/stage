# Decision 0006: WhatsApp Simulator Adapter

**Status:** Accepted
**Date:** 2026-08-03
**Owners:** Vayca team
**Related requirements/issues:** FR-MSG-01 to FR-MSG-03, NFR-PERF-02, NFR-REL-01 to NFR-REL-02, #8

## Context

The MVP needs repeatable inbound-message testing before an approved WhatsApp Business provider and credentials are available. The simulator must not be confused with a real WhatsApp connection or bypass tenant isolation.

## Decision

Provide a local simulator-only inbound webhook endpoint. It receives a synthetic event signed with HMAC-SHA256 over the raw request body. The event identifies a property, not a company; the backend resolves the company from that persisted property and uses the shared idempotent messaging service.

The simulator is enabled only when `WHATSAPP_MODE=simulator`. Test and production modes return a truthful unavailable response until a provider-specific adapter, verification scheme, and credentials are approved.

## Consequences

### Positive

- Developers and CI can create repeatable inbound-message events without external accounts or guest data.
- Invalid signatures and unknown properties are rejected before message persistence.
- Existing external-message deduplication protects webhook retries.

### Negative or risky

- HMAC verification is a simulator contract, not evidence that a production provider webhook is configured.
- Chatbot processing and outbound delivery remain separate future work; no external message is sent.

## Validation

Focused integration tests cover valid signed events, duplicate events, invalid signatures, and unknown properties. Manual PowerShell instructions are in the repository README.
