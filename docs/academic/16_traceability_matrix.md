# Requirements Traceability Matrix

**Status:** Initial baseline; GitHub issue numbers must be updated during backlog reconciliation

## Purpose

Traceability connects stakeholder needs to requirements, modules, implementation work, and verification. GitHub issue references below reflect the current backlog where a suitable issue exists. Issues should be split or rewritten when they combine materially different requirements.

## Functional Traceability

| Need | Requirements | Module | Current GitHub issue | Primary verification |
|---|---|---|---|---|
| Shared environment and contracts | NFR-MNT-03, NFR-DEP-01..04 | Foundation | #30 | Clean-start and contract verification |
| Secure company access | FR-AUTH-01..06 | Foundation | #18, #19 | Auth, role, and migration tests |
| Manage property information | FR-PROP-01..05 | Properties/Calendar | #7 | CRUD and tenant-isolation tests |
| Connect calendar source | FR-CAL-01..03, FR-CAL-09 | Properties/Calendar | #3, #4 | Feed fixture and idempotency tests |
| Record direct reservations and calculate availability | FR-CAL-04, FR-MSG-07 | Properties/Calendar | #31 | Manual-booking and availability tests |
| Detect booking conflicts | FR-CAL-05, FR-CAL-08 | Properties/Calendar | #5 | Date-overlap matrix |
| View portfolio calendar | FR-CAL-06..07 | Properties/Calendar | #6 | Connected UI and mobile test |
| Receive guest messages | FR-MSG-01..04 | Communication | #8, #11, #12 | Webhook, deduplication, and UI tests |
| Answer in guest language | FR-MSG-05..07 | Communication/Chatbot | #9 | Multilingual grounded evaluation |
| Escalate and take over | FR-MSG-08..10 | Communication/Chatbot | #10, #11 | Sensitive-message and takeover tests |
| Suggest ticket from issue | FR-MSG-11..12 | Communication/Maintenance | #13 | Suggest/confirm/reject scenarios |
| Create maintenance ticket | FR-TKT-01..02 | Maintenance | #13 | Ticket validation tests |
| Manage contractors and assignment | FR-TKT-03..04 | Maintenance | #14 | Contact and assignment-history tests |
| Track status and history | FR-TKT-05..07 | Maintenance | #15 | Transition and history tests |
| Update guest about issue | FR-TKT-08 | Maintenance/Communication | #16 | Approved-message test |
| Review daily operations | FR-DASH-01..04 | Supervision | #17 | Derived-data and navigation tests |
| Manage settings and integration health | FR-SET-01..04 | Foundation/Supervision | #18, #32 | Role and truthful-status tests |
| Validate the integrated MVP | Cross-cutting NFRs | Cross-cutting | #33 | Staging end-to-end evidence |
| Replace market assumptions with field evidence | Project-study validation | Documentation | #34 | Reviewed interviews and study update |

## Non-Functional Traceability

| Quality concern | Requirements | Design response | Verification |
|---|---|---|---|
| Authentication and authorization | NFR-SEC-01, 03, 05, 07 | FastAPI security, Argon2, JWT, HTTPS | Security tests and deployment review |
| Tenant isolation | NFR-SEC-02, 06 | Company-scoped repositories and role checks | Cross-company tests |
| Secret protection | NFR-SEC-04 | Environment configuration and Git exclusions | Secret scan |
| Idempotency and recovery | NFR-REL-01..04 | External IDs, sync runs, transactions, retries | Duplicate and outage tests |
| Auditability | NFR-REL-05, NFR-AI-03 | Actor timestamps and chatbot provenance | Database verification |
| Performance | NFR-PERF-01..04 | Async jobs, indexed queries, load fixtures | API and worker load tests |
| Usability | NFR-UX-01..06 | Six-section navigation and explicit states | Task-based user tests |
| Maintainability | NFR-MNT-01..06 | Modules, migrations, OpenAPI, small PRs | Review and CI evidence |
| Deployment | NFR-DEP-01..04 | Docker environments and health checks | Clean-clone/staging test |
| Chatbot safety | NFR-AI-01..06 | Tool grounding, policy, escalation, provider fallback | Versioned evaluation set |

## Backlog Reconciliation Actions

1. Add a Foundation epic or grouping for company, authentication, migrations, and shared API conventions.
2. Split property CRUD from property knowledge if one issue becomes too large.
3. Split each calendar provider/feed issue into configuration, import, update/cancellation, and health visibility if needed.
4. Add manual/direct booking and availability-service issues.
5. Split WhatsApp transport from conversation persistence.
6. Separate chatbot safe answers, availability tool, escalation, and evaluation dataset.
7. Add ticket-suggestion confirmation as explicit work.
8. Correct frontend issue statuses only after deciding whether prototype completion counts as design/prototype work or implementation.
9. Add requirement IDs and dependency links to every MVP issue.
10. Keep Phase 2 issues outside active MVP views.

## Change Traceability

When a requirement changes:

1. Update its requirement text and status.
2. Update affected use cases and diagrams.
3. Update the data or architecture chapter if applicable.
4. Update GitHub issues and acceptance criteria.
5. Update test cases.
6. Add a decision-log entry for material changes.
