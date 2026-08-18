# Decision 0007: Shared Conversation Unread State

**Status:** Accepted
**Date:** 2026-08-18
**Owners:** Vayca project team
**Related requirements/issues:** FR-MSG-04, FR-DASH-01, NFR-UX-02..05, #11

## Context

The company inbox needs a truthful operational unread indicator. The MVP has
manager and staff users but does not define personal task ownership, assignment,
or per-user read receipts. The state must remain auditable from persisted
message history and must not imply unread history that was never recorded.

## Decision Drivers

- Keep the inbox a shared company queue.
- Preserve tenant isolation and webhook idempotency.
- Avoid introducing an undefined personal ownership model.
- Keep the first implementation small and testable.

## Options Considered

### Option A: Shared conversation unread count

Store one non-negative unread count on each conversation. Any authorized company
user opening a thread resets it for the company.

### Option B: Per-user read receipts

Store a read state per staff member and calculate unread counts per user. This
would support individual responsibility, but requires roles, ownership, and
notification rules that are not defined for the MVP.

## Decision

Accept Option A. `conversations.unread_message_count` is a shared company-level
count with a database default of zero and a non-negative constraint.

- A successfully persisted inbound guest message atomically increments the
  count.
- Duplicate external message events do not increment it.
- Staff and chatbot outbound messages do not change it.
- An authorized manager or staff member explicitly marks a conversation read,
  resetting the count to zero.
- Existing conversations start at zero because historical unread state cannot be
  reconstructed truthfully.
- The latest sender type is derived from the newest persisted message rather
  than copied into the conversation record.

## Consequences

### Positive

- The sidebar can present one company-wide operational count.
- The model stays consistent with the shared inbox and is easy to audit.
- It avoids a new table and undefined per-user notification behavior.

### Negative or risky

- One staff member reading a conversation clears it for all authorized users.
- A future personal inbox or ownership feature requires a new decision and
  migration for per-user read state.

## Validation

- Verify inbound increments, duplicate-event idempotency, outbound stability,
  and idempotent mark-read behavior.
- Verify the list, mark-read, and message-history paths remain company scoped.
- Verify the sidebar requests its unread total independently of the active inbox
  filter and page.
