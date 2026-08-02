# AGENTS.md -- Canonical Instructions for AI Coding Agents

This is the canonical instruction file for every AI tool working in this repository. `CLAUDE.md` and `.github/copilot-instructions.md` point here so the workflow does not drift between tools.

## 1. Required Reading

Before proposing or changing code, read:

1. `docs/architecture.md`
2. `docs/design-system.md` for UI work
3. `docs/academic/00_README.md`
4. The academic chapters relevant to the assigned requirement/module
5. The assigned GitHub issue and its dependencies
6. Applicable decision records in `docs/decisions/`

Weekly reports under `docs/weekly-reports/` are historical logs only. They may help identify what happened, but they are not authoritative requirements and must never override current architecture, requirements, GitHub issues, or accepted decision records.

## 2. Discuss Before Coding

Do not jump from an issue title directly into implementation.

Before writing code, briefly state:

- the problem and requirement IDs being addressed;
- the affected module and user workflow;
- the files and API/data contracts likely to change;
- assumptions or missing information;
- technology choices already established by the repository;
- any new dependency, schema change, external service, or architectural pattern being considered;
- at least one simpler alternative when the proposed approach adds significant complexity;
- expected tests and failure states.

If the task requires a decision not settled in current sources, discuss it with the user/team first. Do not silently invent a database field, dependency, role, page, integration behavior, or AI policy.

Challenge an unsafe or unnecessarily complex request clearly. Prefer the smallest design that satisfies the approved requirement.

## 3. Product Boundaries

Vayca is a B2B operations platform for agencies and independent vacation-property owners. It is not a public marketplace.

MVP actors:

- Manager: authenticated, full company access
- Staff: authenticated, operational access
- Guest: no Vayca account; communicates through WhatsApp
- Contractor: contact record only; no Vayca login
- Chatbot: controlled system capability that answers safe questions and escalates or suggests actions

Main navigation:

- Dashboard
- Calendar
- Messages
- Maintenance
- Properties
- Settings

The chatbot must use backend data for availability and property facts. It may suggest a ticket, but staff must confirm creation and contractor assignment. It must escalate sensitive, uncertain, complaint, cancellation, refund, payment, emergency, and conflict cases.

## 4. Branch and Sync Rules

Check the branch before editing:

```bash
git branch --show-current
```

- Work only on a `feature/*`, `fix/*`, `docs/*`, `test/*`, or `chore/*` branch matching the task.
- Create branches from current `testing`, never from stale `main`.
- Never commit or push directly to `testing` or `main`.

```bash
git checkout testing
git pull origin testing
git checkout -b feature/<short-task-name>
```

For long-running work, refresh from `origin/testing` before final integration.

## 5. Scope and Architecture Discipline

- Touch only files required by the assigned issue.
- Do not fix unrelated problems inline; report them under “Noticed but out of scope.”
- Keep module boundaries from `docs/academic/08_module_decomposition.md`.
- Keep tenant isolation explicit in every data-access path.
- Use versioned database migrations; never rely on undocumented manual schema changes.
- Keep external providers behind adapters so simulator/test modes remain possible.
- Do not display mock or simulated integrations as connected production services.
- Do not present prototype UI behavior as persistent functionality.

## 6. Technology Decisions

Established baseline:

- React + TypeScript + Vite
- Tailwind CSS
- FastAPI + Python 3.12
- PostgreSQL
- SQLAlchemy + Alembic for persistence and migrations
- Redis + Celery for asynchronous work
- Docker Compose for shared development

Before adding a dependency or changing a major technology:

1. Explain the requirement it solves.
2. Check whether an existing dependency already solves it.
3. Compare maintenance, security, licensing, learning cost, and Docker impact.
4. Record an accepted decision in `docs/decisions/` when the choice affects multiple modules or future development.
5. Mention the new dependency prominently in the pull request.

## 7. Definition of Done

A feature is not done because the screen exists.

Applicable work must include:

- persistent or explicitly simulated data behavior;
- authorization and tenant isolation;
- input validation;
- loading, empty, success, and failure states;
- mobile-width behavior for UI work;
- focused tests for normal and edge cases;
- updated OpenAPI/data contracts where applicable;
- documentation and diagram changes when behavior changed;
- exact verification evidence in the pull request.

## 8. Commits

Use small, reviewable commits with one of these prefixes:

- `feat:` new product behavior
- `fix:` defect correction
- `docs:` documentation only
- `test:` tests only
- `chore:` tooling or maintenance
- `refactor:` behavior-preserving restructuring

Commit messages must explain the concrete change. Avoid vague messages such as `update files`, `work`, or `fix stuff`.

Good examples:

```text
feat: persist manual bookings and validate date ranges
fix: prevent cancelled bookings from triggering conflicts
docs: align chatbot escalation requirements with ticket workflow
test: cover cross-company property access rejection
```

For a complex commit, include a body describing why the change was needed, important design choices, and tests performed.

## 9. Pull Requests

Open pull requests into `testing`, never directly into `main`. Complete every section in `.github/PULL_REQUEST_TEMPLATE.md` with real evidence.

Before opening **any** pull request into `testing`, review `README.md` → **Current State**. If the pull request adds, changes, removes, or materially connects implemented behavior, setup, or development capability, update that section in the same pull request. If there is no current-state impact, state `README current-state: no change` and give the reason in the pull request's Documentation section. Do not let README claims get ahead of merged, verified behavior.

The PR must identify:

- requirement and issue IDs;
- design/technology decisions;
- API or schema impact;
- tests and observed results;
- screenshots for UI work;
- known limitations;
- documentation updated;
- unrelated issues noticed but not fixed.

## 10. Weekly Reports

At the end of each development week, add or update one report using `docs/weekly-reports/TEMPLATE.md`.

Reports are factual history:

- completed and merged work;
- work in progress;
- tests executed;
- decisions formally accepted elsewhere;
- blockers, risks, and next actions.

Do not use weekly reports as requirements, architecture, or authority for future decisions. Link to the relevant issue, PR, requirement, or decision record instead.

## 11. Prohibited Actions

- Never commit `.env`, tokens, API keys, passwords, guest data, or real property access codes.
- Never weaken authorization to make a test or demo pass.
- Never let the chatbot directly perform high-impact actions outside approved policy.
- Never add a marketplace, payment workflow, guest login, or contractor login without an explicit scope decision.
- Never mark an integration connected when it is a mock, fixture, simulator, or unconfigured card.
- Never mark work complete without running and recording relevant validation.
