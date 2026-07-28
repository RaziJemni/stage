# Scope, Assumptions, and Boundaries

**Status:** Accepted working baseline; subject to reviewed change

## MVP Definition

The MVP is considered complete when the selected workflows operate end to end using persistent data, authentication, authorization, validation, and tested failure handling. A visually complete prototype does not satisfy this definition by itself.

## In-Scope Capabilities

### Foundation

- Company-based multi-tenancy
- Manager and staff accounts
- Email/password authentication
- Role-based backend authorization
- Database migrations
- Reproducible Docker development environment

### Properties and booking calendar

- Create and update properties
- Store property knowledge and operational instructions
- Add supported calendar-feed connections
- Import and refresh iCalendar data
- Store bookings and blocked periods
- Create manual/direct bookings
- Detect relevant date overlaps
- Display portfolio calendar and conflict alerts

### Guest communication

- Receive WhatsApp messages through a real test integration or simulator
- Store conversations and messages
- Detect and respond in supported languages
- Answer safe property-information questions
- Check availability through backend data
- Escalate sensitive or uncertain requests
- Allow staff to take over and reply manually

### Maintenance

- Create tickets linked to properties and optional bookings
- Suggest ticket creation from a guest issue
- Require staff confirmation before ticket creation or assignment
- Store contractor contacts
- Record assignment and ticket status history
- Send or prepare guest status updates

### Supervision

- Dashboard of attention items and daily operations
- In-app alerts
- Team and company settings
- Booking-channel configuration

## Explicitly Out of Scope

- Public property marketplace
- Guest accounts
- Contractor accounts
- Online payment processing
- Public search and checkout
- Native mobile applications
- Dynamic pricing
- Owner portal
- Advanced revenue analytics
- Automated owner PDF reports
- Expedia and VRBO integration
- Italian and German chatbot support
- Automated review-request sequences
- 360-degree virtual property tours

## Working Assumptions

| ID | Assumption | Consequence if false |
|---|---|---|
| ASM-01 | Airbnb and Booking.com calendar feeds are available for pilot properties | A simulator or manual import becomes necessary |
| ASM-02 | WhatsApp test integration can be used during development | Demonstration relies on the webhook simulator |
| ASM-03 | Property managers accept a web application | Additional mobile-first work may be required |
| ASM-04 | French, English, and Arabic cover the MVP pilot | Language scope must be revised |
| ASM-05 | Staff can manually contact contractors | Automated contractor notification becomes a new requirement |
| ASM-06 | One company account can represent an independent owner | Separate account modeling would be required |

## Constraints

- Three-person team with limited prior group-development experience
- Internship schedule and academic-documentation obligations
- Dependence on third-party service availability and approval
- No guaranteed access to official booking-platform partner APIs
- Need to protect personal, access, and conversation data
- Need to keep the application usable for non-technical operators

## Change-Control Rule

Any proposal that adds a new actor, public page, external dependency, database entity, or MVP integration must answer:

1. Which validated need does it address?
2. Which existing requirement changes?
3. Which module owns it?
4. What implementation and testing work does it add?
5. What is removed or delayed to preserve the schedule?
