# Vayca Architecture Reference

**Status:** Canonical implementation summary
**Detailed study and conception:** `docs/academic/`

Read this document before changing business logic, APIs, the database, integrations, or navigation. Detailed requirements and provisional models live in the numbered academic chapters. Accepted cross-cutting changes must be recorded in `docs/decisions/`.

## Product Boundary

Vayca is a B2B web application for vacation-property agencies and independent owners. It centralizes operations around properties listed through existing booking channels.

Vayca is not a marketplace. It does not provide public search, guest checkout, online payments, guest accounts, or contractor accounts during the MVP.

## Actors

| Actor | Access | Responsibility |
|---|---|---|
| Manager | Authenticated | Full company, property, staff, integration, and operational access |
| Staff | Authenticated | Calendar, guest conversation, property-information, and maintenance work |
| Guest | WhatsApp only | Requests information and reports issues |
| Contractor | No account | External contact manually selected and contacted by staff |
| Chatbot | Controlled system capability | Answers safe questions, uses backend tools, escalates or suggests actions |
| Booking channel | External system | Supplies calendar data through supported feeds/integrations |

## Main Navigation

- Dashboard
- Calendar
- Messages
- Maintenance
- Properties
- Settings

Property details and conversation threads are drill-down routes rather than sidebar destinations.

## MVP Workflows

### Property and booking calendar

Manager creates a property -> adds operational knowledge -> connects a supported calendar feed -> worker imports events -> bookings/blocks are updated idempotently -> availability and conflicts are recalculated -> users see calendar and alerts.

Manual/direct bookings are supported for reservations received outside a platform.

### Guest communication

WhatsApp event -> webhook verifies and stores message -> conversation/property context is resolved -> chatbot classifies request -> safe questions use property data or backend availability -> sensitive/uncertain cases escalate -> staff may take over and reply.

### Maintenance

Issue reported -> chatbot may suggest ticket -> staff confirms or creates ticket -> staff selects contractor contact -> assignment is recorded -> staff contacts contractor manually -> ticket progresses -> history is preserved.

## Chatbot Safety Boundary

The chatbot may:

- answer approved property questions;
- check availability through backend logic;
- provide an owner-configured external booking link;
- suggest ticket category, priority, and description.

The chatbot must escalate or require confirmation for:

- refunds, payments, cancellations, date changes, complaints, emergencies, conflicts, missing data, and uncertain requests;
- creating a ticket from a suggestion;
- assigning a contractor;
- any high-impact operational action.

## Module Boundaries

1. **Foundation:** company, users, authentication, authorization, configuration, migrations, deployment
2. **Properties and Calendar:** property knowledge, channels, bookings, manual bookings, availability, synchronization, conflicts
3. **Communication and Chatbot:** webhooks, conversations, messages, language, grounded answers, escalation, takeover
4. **Maintenance:** tickets, contractor contacts, assignment history, status lifecycle
5. **Supervision:** dashboard, alerts, team/settings, integration health

See `docs/academic/08_module_decomposition.md` for dependencies.

## Technical Baseline

- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Python 3.12 + FastAPI
- Persistence: PostgreSQL + SQLAlchemy
- Migrations: Alembic
- Background work: Celery + Redis
- Calendar baseline: RFC 5545 iCalendar feeds
- Messaging baseline: WhatsApp adapter with simulator/test/production modes
- Chatbot: configurable multilingual model selected through evaluation
- Development: Docker Compose
- Authentication: email/password, Argon2id hashing, opaque PostgreSQL-backed sessions in secure cookies, CSRF protection, and Redis login limiting

Shared API versioning, pagination, error responses, OpenAPI rules, and integration
modes are defined in `docs/api-conventions.md` and accepted in
`docs/decisions/0002-api-conventions.md`.

## Provisional Core Data

The database owner must review `docs/academic/10_data_conception.md` before writing the final schema. Candidate entities are:

- Company
- AppUser
- AuthSession
- UserInvitation
- Property
- Channel
- Booking
- CalendarSyncRun
- BookingConflict
- Conversation
- Message
- Contractor
- Ticket
- TicketAssignment

The initial approved baseline is implemented in
`backend/alembic/versions/0001_initial_schema.py` and documented in
`docs/decisions/0001-initial-database-schema.md`. This list remains provisional
domain guidance for future workflow decisions, not an immutable final DDL
contract.

## Multi-Tenant Rule

Every authenticated request resolves the user and company from trusted server-side state. Every tenant-owned query is scoped to that company. Client-supplied company identifiers are never treated as authorization.

## Integration Rules

- External events must be idempotent.
- Failures must preserve last-known valid data and expose truthful health status.
- Provider-specific logic belongs behind adapters.
- Development must support deterministic simulator or fixture modes.
- iCalendar import is not described as unrestricted real-time two-way channel management.

## Source-of-Truth Order

When documents conflict, use:

1. Explicit current user/team instruction
2. `AGENTS.md`
3. Accepted records in `docs/decisions/`
4. This architecture reference
5. Requirement and conception chapters in `docs/academic/`
6. `docs/design-system.md` for UI rules
7. GitHub issue acceptance criteria
8. Weekly reports and old PDFs as historical context only
