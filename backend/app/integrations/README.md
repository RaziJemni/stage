# External Integration Adapters

Provider-specific code belongs here so domain modules depend on stable interfaces rather than provider SDK details.

Planned adapters:

- iCalendar feed download and parsing
- WhatsApp simulator, test, and production transports
- configurable chatbot model provider

Each external integration must support truthful health state, idempotency, failure handling, and deterministic testing.
