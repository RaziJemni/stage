# Testing and Validation Strategy

**Status:** Implemented baseline and active validation record

## Objectives

- Verify that each requirement has observable evidence.
- Protect critical rules such as tenant isolation, date overlap, and chatbot escalation.
- Detect integration failures before pilot use.
- Validate usability with target users, not only developers.
- Distinguish prototype completeness from functional correctness.

## Verified Test Suite Summary (MVP Baseline)

| Suite | Scope / Tool | Test count | Result |
|---|---|---|---|
| Backend Domain & Auth | Pytest + SQLAlchemy (`test_api_conventions.py`, `test_authentication.py`, `test_database_schema.py`) | 20 passed | Verified in Docker |
| Properties & Calendar | Pytest + Celery (`test_properties.py`, `test_calendar.py`, `test_manual_bookings.py`) | 23 passed | Verified in Docker |
| Messaging & Chatbot | Pytest (`test_messaging.py`, `test_chatbot_policy.py`, `test_chatbot_grounding.py`) | 16 passed | Verified in Docker |
| Maintenance & Supervision | Pytest (`test_maintenance.py`, `test_supervision.py`) | 10 passed | Verified in Docker |
| Cross-Module MVP Validation | Pytest (`test_mvp_validation.py`) | 1 passed | Verified in Docker |
| **Total Backend** | **Pytest / Docker Compose `backend_test` profile** | **70 passed** | **Green** |
| Frontend Components & Pages | Vitest + Testing Library (14 test suites) | 54 passed | Verified locally & CI |
| Frontend Static Checks | Oxlint linter & TypeScript build (`tsc -b && vite build`) | 0 errors | Verified |

## Test Levels

### Unit tests

Focus on deterministic domain rules:

- booking-overlap calculation;
- availability calculation;
- ticket status transitions;
- role-permission decisions;
- calendar-event normalization;
- chatbot policy classification helpers.

### Integration tests

Verify collaboration with real infrastructure or controlled substitutes:

- API with PostgreSQL;
- Alembic migration upgrade from a clean database;
- Redis/Celery task dispatch;
- iCalendar fixture import;
- webhook deduplication;
- outgoing provider adapter with a fake server;
- tenant-isolation queries.

### API contract tests

- request and response validation;
- correct status codes;
- authentication and authorization;
- pagination and filtering;
- stable error format;
- OpenAPI schema generation.

### Frontend tests

- key component behavior;
- route protection;
- loading, empty, failure, and success states;
- API error display;
- mobile navigation;
- form validation;
- status labels and accessibility.

### End-to-end tests

Critical scenarios:

1. Manager logs in, creates a property, and adds operational knowledge.
2. Calendar import creates bookings and displays them.
3. Overlapping booking produces a visible conflict alert.
4. Manual booking changes availability.
5. Guest simulator message creates a conversation.
6. Safe question receives a grounded response.
7. Sensitive question escalates and staff takes over.
8. Maintenance report becomes a staff-confirmed ticket.
9. Staff assigns a contractor contact and resolves the ticket.
10. Dashboard reflects the resulting live data.

## Critical Test Matrix

| Area | Normal case | Edge/failure case |
|---|---|---|
| Authentication | Valid manager/staff login | Invalid, inactive, expired, rate-limited |
| Tenant isolation | User reads own company data | User attempts another company's IDs |
| Calendar import | Valid event create/update | Invalid feed, duplicate event, outage, cancellation |
| Overlap | True overlapping periods | Adjacent stays, cancelled booking, different property |
| Availability | Free and occupied ranges | Invalid range, partial overlap, unknown property |
| Webhook | New incoming message | Duplicate, invalid signature, unknown property/contact |
| Chatbot | Known safe answer | Missing fact, complaint, emergency, provider outage |
| Ticket | Valid create and transition | Invalid transition, unauthorized update, archived property |
| Dashboard | Correct derived counts | Empty portfolio and stale integration |

## Chatbot Evaluation

Maintain a versioned dataset with expected outcomes. Each example includes:

- language;
- property/booking context;
- guest message;
- expected intent;
- expected allowed action;
- expected facts;
- whether escalation is mandatory;
- quality notes.

### Initial quality gates

- No fabricated availability in the evaluation set.
- No automatic answer to defined mandatory-escalation categories.
- Property facts match the supplied context.
- Responses remain understandable in supported languages.
- Provider failure leaves the conversation available to staff.

These gates should become numeric after the dataset is sufficiently large. Ten questions are useful for initial debugging but insufficient evidence for production reliability.

## Usability Validation

Conduct task-based sessions with representative users. Suggested tasks:

- find today's arrivals;
- identify a booking conflict;
- answer an escalated guest message;
- create and assign a maintenance ticket;
- update property check-in instructions.

Record:

- task completion;
- completion time;
- errors and hesitation;
- terms users do not understand;
- assistance required;
- qualitative feedback.

## Security Verification

Use a manageable subset of OWASP ASVS as guidance [REF-OWASP-ASVS]. At minimum verify:

- authentication and session handling;
- authorization and tenant isolation;
- input validation;
- password and secret storage;
- logging without sensitive-data leakage;
- webhook authenticity and replay resistance;
- dependency and container vulnerability review before pilot deployment.

## Test Environments and Data

- Use synthetic guest and booking data in development and CI.
- Keep test credentials separate from production credentials.
- Do not use real guest conversations in automated tests without authorization and anonymization.
- Reset test databases deterministically.
- Store iCalendar and webhook fixtures in version control without secrets.

## Acceptance Evidence

Each completed issue should record:

- tests executed;
- result observed;
- environment used;
- relevant screenshots for UI work;
- known limitations;
- requirement IDs verified.
