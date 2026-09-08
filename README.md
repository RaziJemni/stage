# Vayca

Vayca is a B2B operations platform for vacation-property agencies and independent owners. It brings property information, booking calendars, guest messages, chatbot assistance, maintenance follow-up, and team access into one workspace.

Vayca is not a public booking marketplace. Guests continue to book through services such as Airbnb, Booking.com, or direct contact, while managers and staff use Vayca for daily operations.

## Current State

The repository currently provides:

- a Docker-based React, FastAPI, PostgreSQL, Redis, Celery, and pgAdmin environment;
- versioned PostgreSQL migrations through Alembic;
- manager and staff registration, login, sessions, invitations, roles, and protected pages;
- an interactive frontend for the planned operational modules;
- automated backend, database, and frontend tests;
- a repeatable cross-module MVP validation scenario and [synthetic-data demonstration runbook](docs/validation/issue-33-mvp-validation.md);
- CI verification that a clean checkout can build the full Docker stack, keep all services running, and reach the documented health, OpenAPI, and frontend URLs;
- architecture, design-system, academic, and workflow documentation.

Property management is connected to the authenticated API: managers can create, edit, archive, and restore persistent company properties, while staff can view company properties. The property detail view fetches live upcoming bookings for the property directly from the authenticated calendar API with truthful loading, empty, and retryable failure states. Staff and managers can also create, update, and cancel persistent manual/direct bookings for active company properties; the backend availability service uses active reservation and blocked-period data. Managers can configure supported iCalendar feeds through the authenticated API; Celery imports, updates, and cancels events asynchronously while recording truthful synchronization health. The backend detects, lists, and acknowledges persistent pairwise booking conflicts, while automatically resolving conflicts when their overlap disappears. The portfolio Calendar screen is connected to persisted properties, bookings, blocked periods, feed health, and conflicts, with responsive filtering and manual booking controls. Manager Settings Integrations now reads persisted calendar-feed health, supports URL-private iCalendar setup and refresh requests, and reports WhatsApp simulator, test, or explicitly unconfigured production mode. Authenticated staff can view company-scoped conversation lists and history, filter unread and handling states, mark shared unread messages as read, manually take over a conversation, and save replies. A signed local WhatsApp simulator persists deterministic inbound messages but does not connect to WhatsApp or send outbound messages. Safe simulator messages are processed asynchronously into grounded French, English, or Arabic replies from authorized property facts or the backend availability service; replies are recorded as queued, not delivered. Missing facts, sensitive requests, and provider failures are switched to manual handling with an escalation reason. Production model configuration is isolated behind an adapter and is not an approved WhatsApp connection. Maintenance creates and lists persistent company tickets, holds chatbot suggestions for staff confirmation or rejection, allows staff to send reviewed template updates to guests for linked tickets, and allows staff to manage contractor contacts and assign or reassign active contacts while preserving history. Staff can filter the connected maintenance board, transition tickets through the approved lifecycle, and view immutable status history; terminal transitions end active contractor assignments. Contractors remain external contacts without Vayca login.

The Dashboard derives company-scoped attention items, today’s arrivals and departures, and basic portfolio counts from persistent source APIs, with links to the relevant operational workflow. The workstation interface defaults to French (`fr`) as the primary operational language tailored for Tunisian property operators, with dynamic English (`en`) support and an interactive language selector located in Settings.

## Install the Required Software

Only Git and Docker Desktop are required to run the complete project. An editor is optional.

1. Install [Git](https://git-scm.com/downloads/).
2. Install [Docker Desktop](https://docs.docker.com/desktop/).
3. Optional: install [Visual Studio Code](https://code.visualstudio.com/download).
4. Open Docker Desktop and wait until the Docker engine is running.

Local Python, Node.js, PostgreSQL, and Redis installations are not required.

## Quick Setup

Open PowerShell, Git Bash, or a terminal and run:

```bash
git clone https://github.com/RaziJemni/stage.git
cd stage
git checkout testing
git pull origin testing
```

Create your local environment file.

PowerShell:

```powershell
Copy-Item .env.example .env
```

Git Bash, macOS, or Linux:

```bash
cp .env.example .env
```

Start the whole project:

```bash
docker compose up -d --build
```

That single command builds the application, starts every service, and applies all database migrations automatically.

## Confirm Everything Works

Check the containers:

```bash
docker compose ps
```

The `db`, `redis`, `backend`, `worker`, `beat`, `frontend`, and `pgadmin` services should be running. PostgreSQL and Redis should show as healthy.

Open these pages:

- Frontend: http://localhost:5173
- Backend health: http://localhost:8000/health
- API documentation: http://localhost:8000/docs
- pgAdmin: http://localhost:5050

The backend health response should report that both the application and database are healthy. On the frontend, open `/register` and create a local company manager to test the authenticated workspace.

pgAdmin credentials come from `.env`. When adding the PostgreSQL server inside pgAdmin, use:

```text
Host: db
Port: 5432
Database: value of POSTGRES_DB
Username: value of POSTGRES_USER
Password: value of POSTGRES_PASSWORD
```

Use `db`, not `localhost`, because pgAdmin runs inside Docker.

## Run the Tests

Backend, API, PostgreSQL migration, and Redis tests:

```bash
docker compose --profile test run --rm --build backend_test
docker compose --profile test stop db_test redis_test
docker compose --profile test rm -f db_test redis_test
```

Repeatable cross-module MVP validation scenario:

```bash
docker compose --profile test run --rm backend_test pytest tests/test_mvp_validation.py
```

Frontend tests, lint, and production build:

```bash
docker compose run --rm frontend npm test
docker compose run --rm frontend npm run lint
docker compose run --rm frontend npm run build
```

The CI workflow also runs a clean-stack smoke test from a fresh checkout. It
builds every service, verifies `db`, `redis`, `backend`, `worker`, `beat`,
`frontend`, and `pgadmin` remain running, probes `/health`, `/health/live`,
`/api/v1/openapi.json`, and the frontend root, then removes its disposable
containers and volumes.

If all commands pass, the checkout is ready for development.

## Test the WhatsApp Simulator

The simulator is local only. It creates an inbound guest message; it never contacts WhatsApp.

1. Set a local `WHATSAPP_SIMULATOR_WEBHOOK_SECRET` in `.env`, then start the project.
2. Create a manager and property through the frontend or API documentation and copy the property ID.
3. Run this PowerShell example from the repository. Replace the property ID and use the same secret as `.env`.

```powershell
$secret = "your_local_simulator_secret"
$body = @{ property_id = "replace-property-id"; guest_contact_identifier = "+21699887766"; content = "Can I check in late?"; external_message_id = "manual-simulator-001"; language = "en" } | ConvertTo-Json -Compress
$bytes = [Text.Encoding]::UTF8.GetBytes($body)
$hash = [Security.Cryptography.HMACSHA256]::new([Text.Encoding]::UTF8.GetBytes($secret)).ComputeHash($bytes)
$signature = -join ($hash | ForEach-Object { $_.ToString("x2") })
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/v1/integrations/whatsapp/simulator/inbound" -ContentType "application/json" -Headers @{ "X-Vayca-Simulator-Signature" = $signature } -Body $body
```

The response has `mode: "simulator"` and `created: true`. Open **Messages** in the app to see the new conversation. Send the exact command again to confirm that `created` becomes `false`, proving duplicate events are not stored twice.

## Daily Commands

Start or refresh the project after pulling changes:

```bash
docker compose up -d --build
```

View logs:

```bash
docker compose logs -f backend frontend worker
```

Stop the project without deleting database data:

```bash
docker compose down
```

Do not use `docker compose down -v` unless you intentionally want to delete the local PostgreSQL and pgAdmin data.

## Contribution Workflow

Create every feature branch from the latest `testing` branch:

```bash
git checkout testing
git pull origin testing
git checkout -b feature/short-feature-name
```

Keep each branch focused on one issue. Use detailed commits and open pull requests into `testing`, not `main`. Before opening a pull request, review **Current State** above and update it in the same pull request whenever implemented behavior, setup, or development capability changed. If it did not change, record the reason in the PR documentation section. Complete every section of `.github/PULL_REQUEST_TEMPLATE.md` with real test evidence.

Never commit `.env`, passwords, API keys, tokens, real guest information, or property access codes.

## Important Documentation

Read these files before changing code:

1. `AGENTS.md` — canonical rules for humans and AI coding tools.
2. `docs/architecture.md` — approved technology and module architecture.
3. `docs/design-system.md` — required UI styles and responsive behavior.
4. `docs/api-conventions.md` — API routes, errors, pagination, and integration modes.
5. `docs/academic/00_README.md` — academic documentation map.
6. The academic chapters relevant to the assigned module.
7. The assigned GitHub issue and applicable files in `docs/decisions/`.

`docs/weekly-reports/` contains historical logs only. Reports can explain what happened, but they must not override current requirements, architecture, issues, or accepted decisions.

## AI Onboarding Prompt

Paste this prompt into an AI coding assistant before starting an issue:

```text
You are working on Vayca, a three-person B2B vacation-property operations project.

Before proposing or changing code:
1. Scan the repository structure and check the current branch and git status.
2. Read AGENTS.md completely and follow it as the canonical workflow.
3. Read docs/architecture.md and docs/api-conventions.md.
4. Read docs/design-system.md for any frontend work.
5. Read docs/academic/00_README.md and the chapters relevant to the assigned module.
6. Read the assigned GitHub issue, its requirement IDs, dependencies, acceptance criteria, and applicable decision records in docs/decisions/.
7. Inspect the existing implementation and tests before suggesting changes.

Do not treat docs/weekly-reports as requirements. Do not assume prototype UI or mock data is implemented backend behavior.

Then report:
- the repository's current verified state;
- the problem, requirement IDs, module, and user workflow involved;
- files and API/database contracts likely to change;
- assumptions, missing information, and decisions that need discussion;
- the simplest suitable implementation and any meaningful alternative;
- authorization, tenant isolation, validation, loading, empty, success, and failure states;
- tests and documentation required for completion.

Discuss unresolved technology, schema, dependency, external-service, or product decisions before coding. Do not invent actors, pages, fields, integrations, or permissions. Work only on a task-specific branch created from current testing, keep the change focused, use detailed commits, and prepare a factual pull request into testing.
```

## Troubleshooting

If a service is not running:

```bash
docker compose ps
docker compose logs --tail=100 backend frontend db redis
docker compose up -d --build
```

If Docker says no configuration file was found, run the command from the repository folder containing `docker-compose.yml`. If a port is already in use, stop the conflicting local application or change the corresponding port in `.env` or `docker-compose.yml`.
