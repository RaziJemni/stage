# Context and Existing-System Study

**Status:** Draft; market claims require continued field validation

## Sector Context

Tourism is economically significant in Tunisia and accommodation operations are distributed across several major coastal regions. Tunisia's National Institute of Statistics reported 2024 internal tourism expenditure of 16,122.6 million TND and a direct tourism contribution of approximately 5.1% of national GDP. Official accommodation statistics also show substantial capacity in Nabeul-Hammamet, Sousse-Kairouan, Yasmine Hammamet, Monastir-Skanes, and other target regions [REF-INS-CST-2024] [REF-INS-ACCOMMODATION].

These figures support the relevance of hospitality software, but they do not by themselves prove demand for Vayca. Customer interviews, workflow observation, pilot usage, and willingness-to-pay evidence remain necessary.

## Existing Operational Situation

The working hypothesis is that small agencies and independent owners commonly combine several tools:

- Airbnb, Booking.com, or similar platform dashboards for reservations;
- exported iCalendar feeds for basic availability synchronization;
- WhatsApp for guest and contractor communication;
- spreadsheets or notes for property information and operational follow-up;
- informal calls and messages for maintenance assignment.

This arrangement is flexible and familiar, but information is fragmented. The same property may have booking dates in one system, access instructions in another file, guest history in a message thread, and maintenance status known only to one staff member.

## Observed or Expected Problems

### Fragmented booking visibility

Staff must consult multiple sources to understand availability. Delayed imports, manual bookings, cancellations, and blocked dates can produce inconsistent views.

### Slow or inconsistent guest response

Property-specific questions may arrive outside working hours and in different languages. Staff must locate the correct information before replying, increasing response time and the chance of error.

### Unstructured maintenance coordination

An issue reported in a guest conversation may be forwarded manually to a contractor. Without a ticket and status history, responsibility, urgency, and completion are difficult to verify.

### Limited operational overview

Managers need a concise view of arrivals, departures, conflicts, escalated conversations, and urgent tickets. Existing channel dashboards generally focus on their own bookings rather than the operator's complete portfolio workflow.

## Existing Solution Categories

### Booking-channel dashboards

These provide authoritative information for reservations originating on their own platforms. Their limitation for Vayca's use case is fragmentation across channels and limited support for internal maintenance workflow.

### Property-management systems

Commercial property-management systems may offer channel management, messaging, reporting, and automation. A detailed competitor matrix must be maintained using current vendor evidence before making strong claims about language support, pricing, or local-market absence.

### General messaging tools

WhatsApp is accessible to guests and contractors but does not create structured property, booking, or ticket relationships by itself.

### General task-management tools

Task boards can track maintenance, but they require manual duplication of guest, property, and booking context.

## Proposed Improvement

Vayca does not replace public booking channels. It connects operational information around them:

```text
Booking channels -> Vayca calendar and conflict monitoring
WhatsApp messages -> Vayca conversation and chatbot workflow
Reported issue -> Vayca maintenance ticket and assignment history
All modules -> Vayca dashboard and alerts
```

## Preliminary SWOT Analysis

| Strengths | Weaknesses |
|---|---|
| Focused operational workflows | Small and inexperienced implementation team |
| Multilingual chatbot concept | Dependence on third-party services |
| Local market and terminology awareness | No validated production customer yet |
| Unified context across modules | Broad MVP if boundaries are not controlled |

| Opportunities | Threats |
|---|---|
| Independent-owner subscription tier | Restricted access to official channel APIs |
| Pilot partnerships with local agencies | WhatsApp approval and policy constraints |
| Expansion to related Maghreb markets | Incorrect chatbot responses harming trust |
| Direct booking pages as a future add-on | Established PMS vendors improving localization |

## Validation Work Still Required (Issue #34)

The market study and problem analysis require empirical confirmation through direct field interviews. Chapter 3 (`docs/academic/03_stakeholders_and_needs.md`) defines the complete **Customer Discovery and Field Interview Framework**, including target cohort criteria (agencies and independent owners across Sousse, Tunis, Hammamet, and Djerba), INPDP-compliant ethical guidelines, the 20-question semi-structured interview guide, and the anonymized recording template.

Status remains **Protocol Prepared & Pending Field Interviews**. Actual participant evidence will be incorporated once interviews are completed, without fabricating findings.
