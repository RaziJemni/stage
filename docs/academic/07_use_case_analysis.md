# Use-Case Analysis

**Status:** Proposed baseline

## Use-Case Catalogue

| ID | Use case | Primary actor | Supporting actor/system |
|---|---|---|---|
| UC-AUTH-01 | Log in | Manager or staff | Authentication service |
| UC-TEAM-01 | Manage staff | Manager | Email service, optional |
| UC-PROP-01 | Manage property | Manager | Database |
| UC-CAL-01 | Connect calendar feed | Manager | Booking platform feed |
| UC-CAL-02 | Synchronize calendar | System | Worker, external feed |
| UC-CAL-03 | Create manual booking | Manager or staff | Conflict service |
| UC-CAL-04 | Review booking conflict | Manager or staff | Alert service |
| UC-MSG-01 | Receive guest message | Guest | WhatsApp provider |
| UC-MSG-02 | Answer safe guest question | Chatbot | Property and availability services |
| UC-MSG-03 | Escalate conversation | Chatbot/system | Staff |
| UC-MSG-04 | Take over conversation | Staff | WhatsApp provider |
| UC-TKT-01 | Suggest maintenance ticket | Chatbot | Staff |
| UC-TKT-02 | Create maintenance ticket | Manager or staff | Property/booking service |
| UC-TKT-03 | Assign contractor | Manager or staff | Contractor directory |
| UC-TKT-04 | Update ticket status | Manager or staff | Guest-message service, optional |
| UC-DASH-01 | Review daily operations | Manager or staff | All operational modules |

## UC-AUTH-01: Log In

**Preconditions:** User account exists and is active.
**Trigger:** User submits email and password.

### Main flow

1. The system validates the input format.
2. The system locates the user account.
3. The system verifies the password hash.
4. The system creates signed authentication credentials.
5. The system returns the user's identity, company, and role context.
6. The application opens the Dashboard.

### Alternative flows

- Invalid credentials: show a generic authentication error.
- Inactive account: deny access and provide a contact instruction.
- Excessive failed attempts: apply rate limiting.

**Postcondition:** An authenticated session exists for an active user.

## UC-CAL-02: Synchronize Calendar

**Preconditions:** An active property and valid calendar-feed configuration exist.
**Trigger:** Scheduled worker run or authorized manual refresh.

### Main flow

1. The worker creates a synchronization-run record.
2. The worker downloads the calendar feed.
3. The parser validates the iCalendar content according to supported RFC 5545 elements [REF-IETF-ICAL].
4. Each supported event is normalized into booking or blocked-period data.
5. Existing records are matched by channel and external event identity.
6. New records are created and changed records are updated.
7. Missing or cancelled events follow the approved cancellation policy.
8. Conflict detection evaluates changed active periods.
9. The run records success, counts, and completion time.

### Alternative flows

- Feed unavailable: retain previous data and mark refresh failed.
- Invalid event: record the event error and continue where safe.
- Duplicate delivery: update the matched record without duplication.

**Postcondition:** The database reflects the latest successfully interpreted feed state.

## UC-CAL-04: Review Booking Conflict

**Preconditions:** Conflict detection has identified overlapping active bookings.
**Trigger:** User opens a conflict alert.

### Main flow

1. The system displays the property, dates, booking sources, and current statuses.
2. The user verifies the source-channel information.
3. The user acknowledges or records the conflict resolution externally.
4. The system records the acknowledgement and actor.

Vayca does not automatically cancel or modify a source-platform booking during the MVP.

## UC-MSG-02: Answer Safe Guest Question

**Preconditions:** The guest message is linked to a property or reliably resolved booking context.
**Trigger:** A supported incoming message is stored.

### Main flow

1. The system detects language and intent.
2. The system classifies the request as safe, sensitive, or uncertain.
3. For property information, the backend retrieves authorized property knowledge.
4. For availability, the backend calculates availability from active booking data.
5. The chatbot produces a response constrained by retrieved facts.
6. Safety checks verify that the response is eligible for automatic sending.
7. The response is sent and stored with chatbot provenance.

### Alternative flows

- Missing property context: escalate.
- Missing knowledge: state that staff will confirm and escalate.
- Sensitive intent: do not auto-send; escalate.
- Provider failure: preserve the incoming message for staff handling.

## UC-MSG-04: Take Over Conversation

1. Staff opens an escalated or active conversation.
2. Staff activates manual-reply mode.
3. Automatic chatbot sending is disabled for that conversation.
4. Staff sends a reply.
5. The system stores and delivers the message.
6. Staff may return the conversation to automatic mode after review.

## UC-TKT-01: Suggest Maintenance Ticket

1. The chatbot detects a probable property issue.
2. The chatbot extracts a proposed category, description, and priority.
3. The system displays the suggestion to staff.
4. Staff confirms, edits, or rejects the suggestion.
5. Only confirmation creates a ticket.

## UC-TKT-03: Assign Contractor

1. Staff opens an unassigned ticket.
2. Staff selects an active contractor contact.
3. Staff confirms the assignment.
4. The system records assignment history and sets the ticket to Assigned.
5. Staff contacts the contractor manually through WhatsApp or telephone.

Contractors do not authenticate during the MVP.
