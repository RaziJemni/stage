# Data Conception

**Status:** Provisional domain model; initial schema baseline implemented, final DDL and workflow semantics remain subject to team review

## Modeling Goals

- Represent one or many properties under a company account.
- Preserve booking, conversation, and maintenance history.
- Support reliable external-event synchronization.
- Enforce tenant isolation and key integrity.
- Provide auditable chatbot and staff actions.
- Avoid unnecessary marketplace, payment, guest-account, or contractor-login entities.

## Conceptual Model

```mermaid
erDiagram
    COMPANY ||--o{ APP_USER : has
    COMPANY ||--o{ PROPERTY : manages
    COMPANY ||--o{ CONTRACTOR : registers
    PROPERTY ||--o{ CHANNEL : connects
    CHANNEL ||--o{ BOOKING : supplies
    PROPERTY ||--o{ BOOKING : schedules
    PROPERTY ||--o{ CONVERSATION : contextualizes
    BOOKING o|--o{ CONVERSATION : may_contextualize
    CONVERSATION ||--o{ MESSAGE : contains
    PROPERTY ||--o{ TICKET : has
    BOOKING o|--o{ TICKET : may_explain
    TICKET ||--o{ TICKET_ASSIGNMENT : records
    CONTRACTOR ||--o{ TICKET_ASSIGNMENT : receives
    CHANNEL ||--o{ CALENDAR_SYNC_RUN : refreshes
    BOOKING }o--o{ BOOKING_CONFLICT : participates
```

## Candidate Entities

### Company

Represents an agency or independent-owner workspace.

Candidate fields:

- `id`
- `name`
- `status`
- `timezone`
- `default_currency`
- `created_at`, `updated_at`

### AppUser

Represents a manager or staff member.

Candidate fields:

- `id`, `company_id`
- `name`, `email`
- `password_hash`
- `role`: manager or staff
- `status`
- `last_login_at`
- audit timestamps

Open decision for the database lead: whether email is globally unique or unique per company. Global uniqueness simplifies login; company-scoped uniqueness supports the same email in several companies but requires company selection.

### Property

Represents one managed accommodation.

Candidate fields:

- `id`, `company_id`
- name and address fields
- city and timezone
- capacity and operational status
- check-in/out information
- Wi-Fi, parking, amenities, house rules, emergency contact
- external booking link
- archived timestamp
- audit timestamps

Sensitive operational fields require authorization and careful chatbot exposure.

### Channel

Represents one property connection to one booking source.

Candidate fields:

- `id`, `property_id`
- platform or source type
- external listing identifier
- calendar URL or encrypted integration reference
- active state
- last successful synchronization time
- last error summary

### Booking

Represents an imported or manually created reservation/block.

Candidate fields:

- `id`, `property_id`
- nullable `channel_id` for direct/manual records
- source type
- external event identifier
- guest name and contact when available
- check-in and check-out timestamps/dates
- status
- record type: reservation or blocked period
- last external update time
- audit timestamps

Candidate integrity rules:

- check-out must be after check-in;
- external identity should be unique within a channel;
- cancelled records do not count as occupied;
- adjacent stays are not overlaps when one checkout equals the next check-in;
- external payload may be stored in a controlled JSON field for troubleshooting, with retention review.

### CalendarSyncRun

Records synchronization observability:

- channel
- start and completion time
- status
- created, updated, cancelled, and rejected event counts
- sanitized error information
- correlation identifier

### BookingConflict

Represents detected overlap state rather than only a transient notification.

Candidate fields:

- property
- participating bookings, through association rows if needed
- detected time
- status: open, acknowledged, resolved, dismissed
- resolution note
- actor and resolution time

### Conversation

Represents one guest communication context.

Candidate fields:

- `id`, `company_id`, `property_id`
- optional active/relevant `booking_id`
- guest contact identifier
- status
- handling mode: automatic or manual
- assigned staff user, optional
- last message time
- audit timestamps

Conversation identity needs testing. A practical MVP rule is one open conversation per company, property, and guest contact, with optional booking context.

### Message

Candidate fields:

- `id`, `conversation_id`
- external provider/message identifier
- direction: inbound or outbound
- sender type: guest, chatbot, staff, system
- sender user ID where applicable
- language
- content
- delivery status
- automatic-send flag
- model/configuration reference where applicable
- confidence/escalation reason where applicable
- provider timestamps and local audit timestamps

### Contractor

Represents a contact, not an authenticated user.

Candidate fields:

- `id`, `company_id`
- name
- phone
- specialty
- notes
- active state
- audit timestamps

### Ticket

Candidate fields:

- `id`, `company_id`, `property_id`
- optional `booking_id` and `conversation_id`
- title and description
- category and priority
- status
- created by user
- suggested by chatbot flag/reference
- resolved time
- audit timestamps

### TicketAssignment

Preserves assignment history:

- ticket and contractor
- assigned by user
- assigned time
- ended/reassigned time
- notes

## Tenant-Isolation Strategy

The database lead should choose and document one consistent strategy:

1. Direct `company_id` on all tenant-owned tables, with validation against parent relationships; or
2. Company ownership derived through mandatory parent relationships, with repository-level scoping and selected direct keys for high-risk queries.

The first option simplifies filtering but creates redundant consistency obligations. The second is more normalized but can make authorization joins easier to omit. Whichever is chosen must be enforced through tests and repository patterns.

## Data Lifecycle

- Prefer archive/deactivation over deleting operational history.
- Define retention for guest contacts, message content, external payloads, and logs.
- Provide correction and deletion procedures where legally required.
- Do not place secrets or access codes in logs.
- Back up production/pilot data and verify restore.

## Migration Strategy

The first migration should create only approved entities and constraints. Every later schema change should use a reviewed Alembic migration. Autogenerated migrations must be inspected before execution because generation does not replace domain review [REF-ALEMBIC].

## Database Review Checklist

- [ ] Final entity names approved
- [ ] Tenant-isolation strategy approved
- [ ] Email uniqueness decision approved
- [ ] Booking date and timezone semantics approved
- [ ] iCalendar cancellation policy approved
- [ ] Conversation identity rule approved
- [ ] Ticket status transitions approved
- [ ] Unique constraints and indexes identified
- [ ] Audit fields consistent
- [ ] Sensitive-data and retention policy documented
- [x] Initial migration runs against a clean database
- [ ] Cross-company tests pass
