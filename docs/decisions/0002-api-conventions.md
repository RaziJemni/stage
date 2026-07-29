# Decision 0002: Shared API and Error Conventions

**Status:** Accepted
**Date:** 2026-07-29
**Owners:** Vayca project team
**Related requirements/issues:** NFR-MNT-03, NFR-DEP-01..04, #30

## Context

Three developers will implement separate modules. Without one API versioning, pagination, error, and integration-mode contract, backend modules and frontend consumers will drift.

## Decision Drivers

- Keep frontend integration predictable.
- Keep the MVP understandable for a three-person team.
- Preserve useful machine-readable errors without leaking internal details.
- Allow future API evolution without coupling contracts to database tables.

## Options Considered

### Option A: Shared versioned API with problem details and page pagination

All product routes use `/api/v1`, errors use an RFC 9457-style structure with stable Vayca codes, and collections use page/page-size metadata.

### Option B: Module-owned response and error formats

Each module chooses its own routes and envelopes. This reduces initial coordination but transfers complexity to the frontend and makes cross-module behavior inconsistent.

### Option C: Cursor pagination for every collection

Cursor pagination scales well for rapidly changing datasets but adds unnecessary implementation and UI complexity to low-volume MVP resources.

## Decision

Use Option A. Keep unversioned operational health probes, use server-generated request IDs, and permit cursor pagination later only for endpoints such as high-volume message timelines where page pagination becomes insufficient.

Integration adapters explicitly declare `simulator`, `test`, or `production` mode. Simulator and test behavior must never be presented as a live production connection.

## Consequences

### Positive

- Frontend error and pagination handling is reusable.
- OpenAPI contracts have one predictable location.
- Request IDs support troubleshooting without exposing stack traces.
- Teams can implement modules independently against shared boundaries.

### Negative or risky

- Existing FastAPI default validation errors are replaced by a project-specific envelope.
- Page pagination can become inefficient for high-volume mutable timelines.
- Every new module must use shared helpers and tests instead of creating local variants.

## Validation

- API contract tests verify request IDs, errors, pagination, and versioned OpenAPI.
- Pull requests must include endpoint response-model and failure-case evidence.
- Reconsider cursor pagination when measured message-volume or UX requirements justify it.
