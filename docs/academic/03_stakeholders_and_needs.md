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

## Customer Discovery and Field Interview Framework (Issue #34)

**Status:** Protocol prepared and reviewed; pending field interview execution (no fabricated customer data).

To ground the product requirements and market study in observable operational practice in Tunisia, this section establishes the reviewed interview guide, participant cohort criteria, ethical safeguards, and evidence recording structure.

### Target Cohorts and Recruitment Criteria

| Cohort | Description | Sample Target | Recruitment Criteria |
|---|---|---|---|
| **Cohort A: Small Agency Operators** | Professional property managers operating multi-property portfolios in Tunisian coastal/urban tourist centers. | 3–4 agencies | • 3 to 25 managed units.<br>• Active listings across at least 2 channels (e.g., Airbnb, Booking.com, Direct).<br>• Employing at least 1 operational staff or coordinator. |
| **Cohort B: Independent Property Owners** | Private owners managing their own vacation residences or rental villas. | 2–3 owners | • 1 to 4 owned rental properties.<br>• Managing guest communication and maintenance directly.<br>• Using WhatsApp and direct local inquiries. |

**Target Geographic Focus:** Sousse / Monastir, Tunis / La Marsa / Sidi Bou Said, Nabeul / Hammamet, and Djerba.

### Ethical Guidelines and Privacy Protection

In compliance with Tunisian Organic Law No. 2004-63 on Personal Data Protection [REF-INPDP-LAW]:
- **Informed Consent:** Participants are informed of the study's academic and operational research purpose prior to the session.
- **Anonymization:** Commercial names, staff names, property addresses, and private financial figures are masked using synthetic identifiers (e.g., `Agency-Sousse-01`, `Owner-Tunis-01`).
- **Confidentiality:** Audio recordings or raw field notes are kept internal to the research team and destroyed following academic evaluation.

### Semi-Structured Interview Guide

The interview consists of 6 core thematic sections designed to take 30–45 minutes:

#### Section 1: Portfolio & Team Profile
1. How many properties do you currently manage, and what types (apartments, seaside villas, traditional dars)?
2. How many team members handle daily operations, guest messaging, and check-ins?
3. What seasonal variations affect your occupancy and workload (summer peak vs. off-season)?

#### Section 2: Channel Management & Booking Synchronization
4. Which channels do you use to receive bookings (Airbnb, Booking.com, Vrbo, direct phone/WhatsApp, social media)?
5. How do you keep calendar availability synchronized across these channels today?
6. Have you experienced double-bookings or date conflicts? What was the financial or operational consequence?
7. How do you handle manual reservations (walk-ins, returning direct guests, friend referrals)?

#### Section 3: Guest Communication & Language Handling
8. How many guest messages/inquiries do you receive daily during peak season?
9. What languages do your guests speak (French, English, Tunisian Arabic, Standard Arabic, Italian, German)?
10. What are the most frequent repetitive questions (Wi-Fi, directions, check-in time, house rules, pool maintenance)?
11. How do you feel about an automated chatbot answering standard questions, provided it transfers complaints or payment requests to you immediately?

#### Section 4: Maintenance & Contractor Coordination
12. How do you currently track maintenance issues reported by guests (e.g., AC malfunction, plumbing leak)?
13. How do you dispatch and follow up with local contractors (plumbers, electricians, cleaners)?
14. What is your biggest challenge in keeping guests updated about ongoing repairs?

#### Section 5: Current Tools & Tech Stack
15. What software tools or spreadsheets do you currently use for your operations?
16. What is your monthly expenditure on property management or channel management software?
17. What frustrates you most about existing solutions (complexity, lack of local language, lack of WhatsApp integration, high cost)?

#### Section 6: Prioritization & Willingness to Adopt
18. If a unified workspace centralized your calendar, WhatsApp messages, automated Wi-Fi/check-in answers, and maintenance tracking, which feature would provide the immediate highest value?
19. What would be an acceptable monthly subscription price in Tunisian Dinars (TND) for your portfolio size?
20. What would be your main hesitation or barrier before adopting such a platform?

### Evidence Recording Template (Pending Field Execution)

When interviews are executed, responses will be recorded using the following standardized evidence matrix:

| Participant ID | Role & Region | Portfolio Size | Primary Channels | Top Operational Bottleneck | Current Software / Cost | Stance on Chatbot | Maintenance Process | Stated Willingness to Pay |
|---|---|---|---|---|---|---|---|---|
| `[Pending P01]` | Agency Manager (Sousse) | *Target: 8–15 units* | *To be recorded* | *To be recorded* | *To be recorded* | *To be recorded* | *To be recorded* | *To be recorded* |
| `[Pending P02]` | Agency Manager (Tunis) | *Target: 5–10 units* | *To be recorded* | *To be recorded* | *To be recorded* | *To be recorded* | *To be recorded* | *To be recorded* |
| `[Pending P03]` | Independent Owner (Hammamet) | *Target: 2–3 villas* | *To be recorded* | *To be recorded* | *To be recorded* | *To be recorded* | *To be recorded* | *To be recorded* |
| `[Pending P04]` | Agency Coordinator (Djerba) | *Target: 10–20 units* | *To be recorded* | *To be recorded* | *To be recorded* | *To be recorded* | *To be recorded* | *To be recorded* |
| `[Pending P05]` | Independent Owner (Tunis) | *Target: 1–2 apartments* | *To be recorded* | *To be recorded* | *To be recorded* | *To be recorded* | *To be recorded* | *To be recorded* |

### Pattern-Analysis and Synthesis Framework

Following interview completion, the team will synthesize recurring patterns across four analytical dimensions:
1. **Confirmed Pain Points vs. Disproved Assumptions:** Identify whether manual calendar synchronization and off-hours messaging are genuine daily friction points across all cohorts.
2. **Essential vs. Secondary Capabilities:** Validate whether the MVP scope matches operator priorities or if certain features (e.g., contractor login, online payments) should remain deferred.
3. **Operational Risks & Adoption Barriers:** Document practical objections regarding AI trust, internet connectivity, and onboarding effort.
4. **Commercial Model Calibration:** Align independent-owner and agency tier pricing with verified local willingness-to-pay benchmarks in TND.
