# Decision 0001: Initial Operational Database Schema

**Status:** Accepted
**Date:** 2026-07-29
**Owners:** Vayca project team
**Related requirements/issues:** FR-AUTH-01..06, FR-PROP-01..05, FR-CAL-01..09, FR-MSG-01..12, FR-TKT-01..07, NFR-SEC-02, NFR-MNT-02, NFR-DEP-04

## Context

The project needs a first PostgreSQL schema for the Foundation, Properties and
Calendar, Communication, and Maintenance modules. The academic data conception
identifies the entities and integrity concerns, but leaves several decisions
open until implementation.

## Decision Drivers

- Preserve company-level tenant isolation in database relationships.
- Support reliable calendar and webhook idempotency.
- Preserve operational and audit history.
- Keep the first migration reviewable for the three-person team.
- Avoid marketplace, payment, guest-account, and contractor-login entities.

## Options Considered

### Option A: Direct company keys and UUID identifiers

Every tenant-owned table stores `company_id`, foreign keys include the company
key where relationships cross tenant-owned tables, and identifiers use UUIDs.

### Option B: Derived tenant ownership and integer identifiers

Child tables derive ownership only through parent joins and use sequential
integer identifiers. This reduces repeated columns but makes authorization
scoping easier to omit in repository queries.

## Decision

Use Option A with these rules:

- UUID primary keys with PostgreSQL `gen_random_uuid()` defaults.
- `company_id` is stored on every tenant-owned table and is included in
  composite foreign keys for cross-tenant relationships.
- App-user email is globally unique.
- Booking timestamps use timezone-aware UTC values; company and property
  records retain their IANA timezone for presentation and business rules.
- A missing iCalendar event is cancelled only after a successful full feed sync;
  a failed or partial sync preserves the last known booking data.
- One open conversation is allowed for a company/property/guest-contact tuple;
  closing a conversation permits a later conversation to be created.
- Ticket statuses are `open`, `assigned`, `in_progress`, `resolved`, and
  `cancelled`. Status history is append-only.
- The initial schema includes Company, AppUser, Property, Channel, Booking,
  CalendarSyncRun, BookingConflict, Conversation, Message, Contractor, Ticket,
  TicketAssignment, and TicketStatusHistory, plus the booking-conflict
  association table.

Sensitive property fields and calendar URLs require application-layer access
control and encryption/secret-handling before production use.

## Consequences

### Positive

- Tenant boundaries are represented in the relational schema and can be tested
  with composite foreign keys.
- UUIDs avoid exposing sequential tenant record counts.
- External event identifiers and partial unique indexes support idempotent
  imports and webhook handling.
- Historical ticket assignments and status changes remain queryable.

### Negative or risky

- Repeated `company_id` values require repository and service code to keep them
  consistent with authenticated user context.
- PostgreSQL-specific UUID, JSONB, partial-index, and enum features reduce
  portability to other databases.
- Email uniqueness may need a future migration if users must belong to several
  companies.

## Validation

- Apply Alembic revision `0001_initial_schema` to a clean PostgreSQL database.
- Confirm all tables, enum types, foreign keys, and partial unique indexes are
  present.
- Add cross-company and date-range integrity tests before feature modules rely
  on the schema.
