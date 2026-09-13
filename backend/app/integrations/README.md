# External Integration Adapters

Provider-specific code belongs here so domain modules depend on stable interfaces rather than provider SDK details.

Planned adapters:

- iCalendar feed download and parsing
- WhatsApp simulator, test, and production transports
- configurable chatbot model provider
- transactional email adapters (console, memory, SMTP)

Each external integration must support truthful health state, idempotency, failure handling, and deterministic testing.

## Transactional Email Adapter

`backend/app/integrations/email/` implements the transactional email service:

- `EMAIL_PROVIDER=console`: local development default; logs outgoing emails to application logs without external network requests while returning activation links for development convenience.
- `EMAIL_PROVIDER=memory`: captures sent messages in `InMemoryEmailAdapter.sent_emails` for deterministic testing.
- `EMAIL_PROVIDER=smtp`: production adapter supporting STARTTLS, SSL (`port 465`), authentication, and custom timeouts via standard Python `smtplib` and `email.message.EmailMessage` (no external heavyweight SDKs).
- Templates in `templates.py` render bilingual (French & English) HTML and plaintext messages styled with the Sidi Bou Said visual palette and escaped to prevent HTML injection.
- Delivery failures raise truthful `502 email_delivery_failed` or `503 invitation_delivery_unavailable` ApiProblems, rolling back database changes to prevent orphaned team members or tokens.

## Chatbot provider

`chatbot.py` keeps the configured model provider outside the chatbot domain
service. `CHATBOT_PROVIDER=deterministic` is the local simulator/test default;
it makes no network request. `CHATBOT_PROVIDER=openai` requires
`CHATBOT_MODEL` and `OPENAI_API_KEY`, and only generates a reply from the
already-authorized fact supplied by the domain service. It is not an outbound
WhatsApp transport: generated messages remain `queued` until one is approved.

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
