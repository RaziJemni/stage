# External Integration Adapters

Provider-specific code belongs here so domain modules depend on stable interfaces rather than provider SDK details.

Planned adapters:

- iCalendar feed download and parsing
- WhatsApp simulator, test, and production transports
- configurable chatbot model provider

Each external integration must support truthful health state, idempotency, failure handling, and deterministic testing.

## WhatsApp Simulator

The implemented local adapter accepts a signed synthetic inbound event at
`POST /api/v1/integrations/whatsapp/simulator/inbound`. It is enabled only when
`WHATSAPP_MODE=simulator` and verifies the raw request body with
`X-Vayca-Simulator-Signature` using HMAC-SHA256 and
`WHATSAPP_SIMULATOR_WEBHOOK_SECRET`.

It resolves the company from the trusted property record, persists messages
through the shared idempotent messaging service, and does not make an external
network request. `test` and `production` modes intentionally remain unavailable
until a provider-specific adapter and credentials are approved.
