# Stakeholders and Needs Analysis

**Status:** Accepted working baseline

## Stakeholder Map

| Stakeholder | Relationship to Vayca | Primary needs |
|---|---|---|
| Property manager | Authenticated primary user | Portfolio control, alerts, users, properties, assignments |
| Staff member | Authenticated operational user | Messages, bookings, property details, maintenance follow-up |
| Independent owner | Authenticated manager of a small company account | Same core workflows with simpler scale and pricing |
| Guest | External person without a Vayca account | Fast and accurate WhatsApp responses |
| Contractor | External contact without a Vayca account | Clear assignment details through existing communication channels |
| Chatbot | Controlled system capability | Verified context, allowed actions, escalation rules |
| Booking channel | External system | Calendar data exchange through supported mechanisms |
| WhatsApp provider | External system | Message delivery and webhook events |
| Project supervisor | Academic/industry governance | Demonstrable methodology, traceability, and justified decisions |
| Development team | Builder and maintainer | Stable contracts, module boundaries, reproducible environment |

## User Profiles

### Property manager

The manager oversees one or more properties and is accountable for availability, guest service, maintenance, and staff coordination. The interface should prioritize exceptions and decisions rather than technical configuration.

### Staff member

Staff handle day-to-day operations. They require fast access to guest context, property information, arrivals, departures, and maintenance status. They should not access company-user management or sensitive integration configuration unless explicitly authorized.

### Independent owner

The independent owner follows the manager workflow but has a smaller portfolio and often works alone. The architecture should not create a separate user type or application. Simpler pricing and onboarding are commercial decisions rather than separate software architecture.

### Guest

The guest never logs into Vayca. The guest communicates through WhatsApp and receives answers or updates without learning the internal system.

### Contractor

The contractor is stored as a company contact but does not authenticate. Staff choose the contractor and communicate assignment details manually through WhatsApp or telephone during the MVP.

## Core User Needs

### Manager needs

- Know what requires attention today.
- Trust the portfolio availability view.
- Identify booking overlaps quickly.
- Control staff access.
- Review escalated conversations.
- Track unresolved maintenance work.

### Staff needs

- Find the correct property information quickly.
- See whether the chatbot or a human is handling a conversation.
- Take over a conversation safely.
- Create a ticket from a reported issue.
- Record contractor assignment and ticket progress.

### Guest needs

- Receive prompt answers in an understandable language.
- Receive accurate property and availability information.
- Reach a human for sensitive, uncertain, or exceptional requests.
- Receive understandable updates about reported issues.

## Usability Principles

1. Use familiar operational terms rather than implementation terms.
2. Put exceptions and required actions before secondary statistics.
3. Keep the main navigation limited to Dashboard, Calendar, Messages, Maintenance, Properties, and Settings.
4. Open property details and conversation threads as drill-down views.
5. Combine color, icon, and text for every important status.
6. Never require users to understand terms such as RAG, OTA, webhook, or Kanban.
7. Make risky chatbot actions require human confirmation.


