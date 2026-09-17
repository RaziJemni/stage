# Architecture and Product Decision Records

This folder stores accepted cross-cutting decisions that affect more than one issue or module. Examples include authentication strategy, tenant-key strategy, calendar date semantics, provider selection, and conversation identity.

Decision records are authoritative only after team review and acceptance. Proposed records must remain marked Proposed.

## Naming

Use sequential filenames:

```text
0001-authentication-strategy.md
0002-tenant-key-strategy.md
```

Copy `0000-template.md` when creating a record.

## Lifecycle

- **Proposed:** under discussion
- **Accepted:** current decision
- **Superseded:** replaced by a newer record
- **Rejected:** considered but not adopted

When superseding a decision, preserve the old record and link both directions.

## Index of Decisions

| ID | Title | Status | Date |
|---|---|---|---|
| [0001](0001-initial-database-schema.md) | Initial Database Schema and Multi-Tenancy Strategy | Accepted | 2026-07-28 |
| [0002](0002-api-conventions.md) | REST API Conventions and Problem Details (RFC 7807) | Accepted | 2026-07-29 |
| [0003](0003-authentication-sessions.md) | Cookie-Based Session Authentication and CSRF Architecture | Accepted | 2026-07-30 |
| [0004](0004-icalendar-feed-import.md) | iCalendar Feed Import and Normalization Pipeline | Accepted | 2026-08-01 |
| [0005](0005-chatbot-escalation-policy.md) | Chatbot Escalation Policy and Operational Safety Rails | Accepted | 2026-08-02 |
| [0006](0006-whatsapp-simulator-adapter.md) | WhatsApp Simulator Adapter and HMAC Webhook Transport | Accepted | 2026-08-03 |
| [0007](0007-shared-conversation-unread-state.md) | Shared Conversation Read States and Staff Tracking | Accepted | 2026-08-05 |
| [0008](0008-grounded-chatbot-provider.md) | Grounded Property Knowledge Provider and Fact Retrieval | Accepted | 2026-08-08 |
| [0009](0009-ticket-lifecycle-transitions.md) | Maintenance Ticket Lifecycle Transitions and Audit History | Accepted | 2026-08-11 |
| [0010](0010-staff-property-scoping.md) | Staff Property Scoping and Role Capability Flags | Accepted | 2026-08-15 |
| [0011](0011-vrbo-expedia-ical-extension.md) | Vrbo and Expedia iCalendar Feed Extension | Accepted | 2026-08-20 |
| [0012](0012-direct-booking-pricing.md) | Direct Booking Pricing Engine, Quotes, and Override Auditing | Accepted | 2026-08-24 |
| [0013](0013-owner-portal-and-automated-reports.md) | Token-Secured Owner Portal and Automated Monthly Dispatches | Accepted | 2026-09-15 |
| [0014](0014-native-mobile-evaluation.md) | Native Mobile Evaluation and PWA Ergonomics | Accepted | 2026-09-16 |
| [0015](0015-presentation-whatsapp-web-simulator-and-qr.md) | Presentation WhatsApp Web Simulator and Dynamic QR Code | Accepted | 2026-09-17 |

