# Vayca Backend

The backend is a FastAPI modular monolith. The initial domain models and
Alembic migration baseline are implemented; authentication, feature APIs, and
integrations remain requirement-linked implementation work.

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

## PostgreSQL and Migrations

The Docker Compose `db` service provides the local PostgreSQL instance. The
backend reads `DATABASE_URL` from the environment and exposes a SQLAlchemy
engine/session through `app.core.database`.

Alembic is configured in `alembic.ini` and uses the same `DATABASE_URL` as the
application. The initial schema is defined by migration
`0001_initial_schema`; later changes must use reviewed migrations.

From the repository root:

```bash
docker compose up -d db backend
docker compose exec db pg_isready -U vayca -d vayca_dev
docker compose exec backend alembic upgrade head
docker compose exec backend alembic current
```

The upgrade command creates the initial domain tables. Inspect every generated
or hand-written migration before applying it to shared or production data.

## Worker

`app.worker:celery` is the Celery entrypoint. It currently exposes a diagnostic task so Docker startup is valid before feature tasks are added.
