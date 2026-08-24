# Decision 0009: Ticket Lifecycle Transitions

**Status:** Accepted
**Date:** 2026-08-24
**Owners:** Vayca project team
**Related requirements/issues:** FR-TKT-02, FR-TKT-05..07, NFR-REL-05, #15

## Context

Maintenance tickets require predictable state changes, accurate contractor engagement durations, and an append-only audit trail. The initial schema defined the available statuses and history table but not the transition matrix.

## Decision

Use a forward-only lifecycle:

| Current status | Allowed next statuses |
|---|---|
| `open` | `assigned`, `cancelled` |
| `assigned` | `in_progress`, `cancelled` |
| `in_progress` | `resolved`, `cancelled` |
| `resolved` | none (terminal) |
| `cancelled` | none (terminal) |

Invalid, backward, repeated, or terminal-state transitions return `409 Conflict` with code `invalid_status_transition`.

Every ticket creation and status transition appends `TicketStatusHistory` with the actor, timestamp, previous status, next status, and optional note. Assigning a contractor moves an open ticket to assigned and records that transition.

When a ticket becomes resolved or cancelled, its active assignment is ended in the same transaction at exactly the transition timestamp. Contractor filtering matches any `TicketAssignment` in the ticket's preserved history, not only an active assignment.

## Consequences

- Terminal tickets and their audit records remain available for reporting.
- Staff cannot reopen or bypass a ticket state through the MVP API.
- A contractor's historical resolved work remains searchable after the assignment ends.

## Validation

- API tests cover each valid path, cancellation from each non-terminal state, invalid transitions, terminal assignment closure, history records, filters, and cross-company rejection.
- Frontend tests cover server-side filter selection, transition actions, and status-history display.
