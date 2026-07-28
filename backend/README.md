# Vayca Backend

The backend is a FastAPI modular monolith. The current code is a skeleton; domain models, migrations, authentication, APIs, and integrations are implemented through requirement-linked feature issues.

## Planned Boundaries

- `identity`: companies, users, authentication, authorization
- `properties`: property records and operational knowledge
- `calendar`: channels, bookings, availability, synchronization, conflicts
- `messaging`: conversations, messages, WhatsApp transport
- `chatbot`: grounded answers, tools, policy, escalation, evaluations
- `maintenance`: tickets, contractor contacts, assignments, status history
- `dashboard`: operational read models and alerts

Cross-cutting provider code belongs under integrations/adapters rather than inside route handlers.

## Database Ownership

Before creating models or migrations, review:

- `docs/academic/05_functional_requirements.md`
- `docs/academic/06_non_functional_requirements.md`
- `docs/academic/10_data_conception.md`
- `docs/architecture.md`

The data conception is provisional. Record accepted cross-module database decisions in `docs/decisions/`.

## Worker

`app.worker:celery` is the Celery entrypoint. It currently exposes a diagnostic task so Docker startup is valid before feature tasks are added.
