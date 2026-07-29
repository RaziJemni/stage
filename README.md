# Vayca

Vayca is a B2B operations platform for vacation-property agencies and independent owners. It centralizes property information, booking calendars, guest messages, chatbot assistance, and maintenance follow-up.

> **Current state:** project skeleton and interactive frontend prototype. The Docker PostgreSQL connection, initial domain models, and Alembic migration baseline are implemented; authentication, feature APIs, and external integrations remain implementation work unless their GitHub issues are marked Done with test evidence.

## Product Boundary

Vayca is not a public marketplace. Guests find and reserve properties through Airbnb, Booking.com, or direct contact. Guests and contractors do not create Vayca accounts.

Main application areas:

- Dashboard
- Calendar
- Messages
- Maintenance
- Properties
- Settings

## Required Project Reading

Before implementation, humans and AI tools must read:

1. `AGENTS.md`
2. `docs/architecture.md`
3. `docs/design-system.md` for UI work
4. `docs/academic/00_README.md`
5. The relevant academic requirements/conception chapters
6. The assigned GitHub issue and dependencies

The two existing PDFs are historical project artifacts. Current Markdown documents and accepted decision records are the living source of truth.

## Repository Structure

```text
vayca/
|-- backend/                  FastAPI application and workers
|-- frontend/                 React/TypeScript prototype and application
|-- docs/
|   |-- academic/             Study, requirements, conception, UML, validation
|   |-- decisions/            Accepted cross-cutting technical/product decisions
|   |-- weekly-reports/       Historical weekly logs only
|   |-- architecture.md       Canonical implementation architecture summary
|   `-- design-system.md      Canonical UI rules
|-- .github/                  PR and issue templates
|-- docker-compose.yml
|-- .env.example
|-- AGENTS.md
`-- Makefile
```

## Prerequisites

Install once:

- Git
- Docker Desktop with Docker Compose
- An editor such as VS Code

Local Python and Node.js are optional for editor support because the shared application runs through Docker.

## First-Time Setup

### 1. Clone and enter the repository

```bash
git clone <repo-url>
cd stage
```

### 2. Create the local environment file

Git Bash:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

Never commit `.env`.

### 3. Start infrastructure and application services

```bash
docker compose up --build
```

Expected services:

- `db`: PostgreSQL
- `pgadmin`: PostgreSQL administration panel
- `redis`: Redis
- `backend`: FastAPI
- `worker`: Celery worker
- `frontend`: Vite development server

### 4. Verify services

```bash
docker compose ps
```

- Backend readiness (including PostgreSQL): http://localhost:8000/health
- Backend liveness: http://localhost:8000/health/live
- API documentation: http://localhost:8000/docs
- Frontend: http://localhost:5173

## Database Setup

PostgreSQL runs in the `db` Docker service using values from `.env`.

The application containers connect to PostgreSQL through the Docker service name
`db`. From the host machine, use `localhost` and the `POSTGRES_PORT` value from
`.env` (default `5432`).

### First-time setup on Windows

Run these commands from the repository root, meaning the folder that contains
`docker-compose.yml`. If Docker reports `no configuration file provided`, the
terminal is in the wrong folder.

```powershell
Copy-Item .env.example .env
docker compose up -d --build db redis backend worker pgadmin
docker compose ps
```

Never commit `.env`. Each teammate can use the same `.env.example` while keeping
their local database volume and credentials on their own machine.

### Start only PostgreSQL and Redis

```bash
docker compose up -d db redis
docker compose ps
```

### Check database readiness

```bash
docker compose exec db pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

If your shell does not expand `.env` values, use the default development values from `.env.example` explicitly:

```bash
docker compose exec db pg_isready -U vayca -d vayca_dev
```

The expected result is `accepting connections`.

### Open PostgreSQL

```bash
docker compose exec db psql -U vayca -d vayca_dev
```

Useful commands inside `psql`:

```text
\conninfo
\dt
\d table_name
\q
```

To inspect the schema directly:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

\d+ companies
\d+ properties
\d+ bookings
\d+ tickets
```

### Open pgAdmin

Start the administration panel with the database:

```bash
docker compose up -d db pgadmin
```

Open http://localhost:5050 and sign in with `PGADMIN_DEFAULT_EMAIL` and
`PGADMIN_DEFAULT_PASSWORD` from `.env` (the local defaults are shown in
`.env.example`). Add a PostgreSQL server using:

```text
Host: db
Port: 5432
Database: vayca_dev
Username: vayca
Password: POSTGRES_PASSWORD from .env
```

Use `db`, not `localhost`, as the host because pgAdmin runs inside Docker.

If pgAdmin is unavailable, check its status and logs:

```powershell
docker compose ps pgadmin
docker compose logs --tail=50 pgadmin
```

### Migration workflow

Alembic is configured in `backend/alembic.ini` and the initial operational schema
is available as migration `0001_initial_schema`. The standard workflow is:

```bash
docker compose exec backend alembic upgrade head
docker compose exec backend alembic current
docker compose exec backend alembic history
```

To create a reviewed migration after changing approved models:

```bash
docker compose exec backend alembic revision --autogenerate -m "describe schema change"
```

Always inspect generated migration code before applying it. Do not edit the database manually as a substitute for a migration.

### Team migration workflow

The schema is shared through migration files, not through manually edited local
databases:

1. Pull the latest branch.
2. Start PostgreSQL and the backend with Docker Compose.
3. Run `docker compose exec backend alembic upgrade head`.
4. Make model changes and generate a migration on your feature branch.
5. Review the migration in the pull request before applying it to shared data.

The current baseline migration creates the operational tables in
`backend/alembic/versions/0001_initial_schema.py`. A future managed PostgreSQL
provider can use the same `DATABASE_URL` and migration workflow.

### Resetting local development data

`docker compose down` preserves the PostgreSQL volume. Removing the volume deletes local database data and should only be done intentionally after confirming no needed local data exists.

To remove local PostgreSQL and pgAdmin data intentionally:

```powershell
docker compose down -v
```

This permanently deletes the local database volume. Run the migration again
afterward to recreate the schema:

```powershell
docker compose up -d db redis backend worker pgadmin
docker compose exec backend alembic upgrade head
```

## Daily Git Workflow

```bash
git checkout testing
git pull origin testing
git checkout -b feature/short-task-name
```

Work on one issue or reviewable unit. Then:

```bash
git add <specific-files>
git commit -m "feat: describe the concrete behavior added"
git push -u origin feature/short-task-name
```

Open a pull request into `testing` and request one teammate review. Stable releases are promoted from `testing` to `main` through a separate reviewed pull request.

## AI Onboarding Prompt

Teammates can paste this prompt into an AI assistant before beginning an issue:

```text
You are helping with Vayca, a three-person internship project for a B2B vacation-property operations platform.

Before proposing or changing code:
1. Read AGENTS.md completely.
2. Read docs/architecture.md.
3. Read docs/academic/00_README.md and the academic chapters relevant to this issue.
4. For UI work, read docs/design-system.md.
5. Read the assigned GitHub issue, its requirement IDs, dependencies, and acceptance criteria.
6. Check the current branch and repository status.

Do not use docs/weekly-reports as requirements or architecture. They are historical logs only.

Then summarize:
- your understanding of the user problem and approved scope;
- the affected module and requirements;
- assumptions or missing decisions;
- the simplest implementation approach;
- any technology/dependency/schema/API choice that needs discussion;
- files likely to change;
- tests, authorization, tenant-isolation, empty states, and failure states required.

Do not start coding until unresolved product or architecture decisions have been discussed. Do not invent new actors, pages, database entities, dependencies, or external-service behavior. Keep the change limited to the assigned issue and follow the branch, commit, PR, documentation, and weekly-report rules in AGENTS.md.
```

## Documentation Workflow

- Current product and architecture decisions belong in canonical Markdown files or `docs/decisions/`.
- Academic analysis and requirements belong in `docs/academic/`.
- Weekly progress belongs in `docs/weekly-reports/` and is historical only.
- A behavior-changing PR updates relevant documentation and diagrams.
- Final PDFs should be generated from the reviewed Markdown baseline, not edited independently.

## Troubleshooting

```bash
docker compose logs -f backend
docker compose logs -f worker
docker compose logs -f db
docker compose down
docker compose up --build
```

After pulling dependency or Dockerfile changes, use `docker compose up --build` to avoid running stale images.
