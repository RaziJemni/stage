# Functional Requirements

**Status:** Proposed baseline for backlog reconciliation

## Requirement Convention

Each requirement has a stable identifier. Priority uses the MoSCoW convention:

- **Must:** required for the internship MVP
- **Should:** important but may use a reduced implementation
- **Could:** useful if schedule permits
- **Won't:** excluded from the current MVP

## Authentication and Company Management

| ID | Requirement | Priority | Acceptance summary |
|---|---|---|---|
| FR-AUTH-01 | A manager shall create or activate a company account. | Must | Company and manager records are persisted |
| FR-AUTH-02 | A user shall authenticate with email and password. | Must | Valid credentials produce an authenticated session; invalid credentials do not |
| FR-AUTH-03 | The system shall hash passwords and never store plaintext passwords. | Must | Database contains only secure password hashes |
| FR-AUTH-04 | A manager shall create, invite, deactivate, and view staff accounts. | Must | Changes persist and affect access |
| FR-AUTH-05 | The backend shall restrict manager-only operations from staff users. | Must | Direct unauthorized API calls return a forbidden response |
| FR-AUTH-06 | An authenticated user shall log out and invalidate or remove the active session credentials. | Must | Protected requests no longer succeed |

## Property Management

| ID | Requirement | Priority | Acceptance summary |
|---|---|---|---|
| FR-PROP-01 | A manager shall create a property belonging to the current company. | Must | Property persists and appears in the property list |
| FR-PROP-02 | Authorized users shall view property details. | Must | Only the current company's properties are visible |
| FR-PROP-03 | A manager shall edit property details and operational knowledge. | Must | Updated values reload correctly |
| FR-PROP-04 | Property knowledge shall include check-in, Wi-Fi, parking, house rules, amenities, and emergency information as applicable. | Must | Information can be stored and retrieved for chatbot grounding |
| FR-PROP-05 | A manager shall archive a property without deleting historical bookings, messages, or tickets. | Should | Archived property is hidden from normal active views but history remains |

## Channels, Bookings, and Calendar

| ID | Requirement | Priority | Acceptance summary |
|---|---|---|---|
| FR-CAL-01 | A manager shall add and update a supported calendar feed for a property. | Must | Valid configuration persists; invalid URL is rejected |
| FR-CAL-02 | The system shall periodically import iCalendar events. | Must | New or changed events appear within the configured polling interval |
| FR-CAL-03 | The system shall update or cancel existing imported records without creating duplicates. | Must | Re-importing the same feed remains idempotent |
| FR-CAL-04 | Authorized users shall create manual/direct bookings. | Must | Manual booking blocks the selected dates internally |
| FR-CAL-05 | The system shall detect relevant overlapping active bookings for the same property. | Must | True overlaps create a conflict; adjacent stays do not |
| FR-CAL-06 | Authorized users shall view a multi-property calendar. | Must | Bookings render on correct properties and dates |
| FR-CAL-07 | The calendar shall distinguish booking source and status using text plus visual cues. | Must | Meaning is understandable without color alone |
| FR-CAL-08 | Managers and staff shall view conflict details and acknowledgement state. | Must | Conflict source, dates, and related bookings are visible |
| FR-CAL-09 | The system shall record calendar refresh status and failures. | Must | Users can distinguish current, delayed, and failed feeds |

## Guest Conversations and Chatbot

| ID | Requirement | Priority | Acceptance summary |
|---|---|---|---|
| FR-MSG-01 | The system shall receive incoming WhatsApp webhook events or equivalent simulator events. | Must | Valid event is accepted and persisted |
| FR-MSG-02 | The system shall find or create the correct conversation for the guest and property context. | Must | Message appears in one appropriate conversation |
| FR-MSG-03 | The system shall prevent duplicate storage of repeated external message events. | Must | Same external message ID is stored once |
| FR-MSG-04 | Authorized users shall view conversation lists and ordered message history. | Must | Messages show sender, time, language, and delivery state |
| FR-MSG-05 | The chatbot shall identify or use the guest's supported language. | Must | Response uses French, English, or Arabic as appropriate |
| FR-MSG-06 | The chatbot shall answer safe property questions using the relevant property record. | Must | Test questions receive grounded answers without invented facts |
| FR-MSG-07 | Availability answers shall be calculated by a backend availability function. | Must | Model output cannot override database result |
| FR-MSG-08 | The chatbot shall escalate uncertain or sensitive requests instead of automatically answering. | Must | Complaint, refund, cancellation, payment, emergency, and uncertain cases are flagged |
| FR-MSG-09 | Staff shall take over a conversation and reply manually. | Must | Chatbot sending is disabled while staff takeover is active |
| FR-MSG-10 | The system shall record whether each outgoing message was generated by the chatbot or written by staff. | Must | Source is auditable |
| FR-MSG-11 | The chatbot may suggest a maintenance ticket from a reported issue. | Should | Structured suggestion is shown without creating a ticket automatically |
| FR-MSG-12 | Staff shall confirm, edit, or reject a chatbot ticket suggestion. | Should | Only confirmation creates the ticket |
| FR-MSG-13 | The chatbot may provide an owner-configured external booking link after checking availability. | Could | No booking is created by Vayca from the guest interaction |

## Maintenance

| ID | Requirement | Priority | Acceptance summary |
|---|---|---|---|
| FR-TKT-01 | Authorized users shall create a ticket linked to a property and optionally a booking. | Must | Required fields validate and persist |
| FR-TKT-02 | A ticket shall have a defined priority and lifecycle status. | Must | Status uses Open, Assigned, In Progress, Resolved, or Cancelled as approved |
| FR-TKT-03 | A manager or authorized staff member shall maintain contractor contacts. | Must | Contractors are contacts and cannot authenticate |
| FR-TKT-04 | Staff shall assign a contractor manually and record the assignment. | Must | Assignment history contains contractor, actor, and time |
| FR-TKT-05 | Authorized users shall update ticket status. | Must | Valid transition persists and invalid transition is rejected |
| FR-TKT-06 | Authorized users shall view maintenance work by status and property. | Must | Board/list reflects database state |
| FR-TKT-07 | The system shall preserve ticket and assignment history after resolution. | Must | Historical record remains accessible |
| FR-TKT-08 | Staff may send a guest update when a linked ticket changes status. | Should | Message is reviewed or generated from an approved template |

## Dashboard and Alerts

| ID | Requirement | Priority | Acceptance summary |
|---|---|---|---|
| FR-DASH-01 | The dashboard shall show items requiring attention. | Must | Conflicts, escalated conversations, and urgent tickets are visible |
| FR-DASH-02 | The dashboard shall show today's arrivals and departures. | Must | Values are calculated from active booking data |
| FR-DASH-03 | The dashboard shall show basic portfolio occupancy states. | Should | Values are derived, not hard-coded |
| FR-DASH-04 | Users shall open the relevant workflow from each dashboard item. | Must | Alert links to the correct booking, conversation, or ticket |

## Settings and Integration Visibility

| ID | Requirement | Priority | Acceptance summary |
|---|---|---|---|
| FR-SET-01 | Managers shall view and update company settings. | Must | Staff access is forbidden |
| FR-SET-02 | Managers shall view booking-channel connection status. | Must | Status reflects real configuration and last refresh |
| FR-SET-03 | Managers shall view WhatsApp integration mode and health. | Should | UI distinguishes simulator, test, and production modes |
| FR-SET-04 | The interface shall not display an integration as connected when it is simulated or unconfigured. | Must | Demonstration state is truthful |
