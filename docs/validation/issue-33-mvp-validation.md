# Issue #33 MVP validation and staging demonstration

**Issue:** #33  
**Requirements:** NFR-SEC-01..08, NFR-REL-01..06, NFR-UX-01..06, NFR-DEP-01..04  
**Environment:** Docker Compose with the repository's synthetic test data and simulator modes only

## What is demonstrated

`backend/tests/test_mvp_validation.py` is the repeatable API and persistence demonstration. It executes this authenticated manager workflow against PostgreSQL and Redis test services:

1. Register a synthetic company manager and create a property with operational knowledge.
2. Create two overlapping direct bookings, view the persisted conflict, and acknowledge it.
3. Submit the same signed simulator event twice and verify that exactly one inbound message is stored.
4. Process a safe Wi-Fi question through the deterministic chatbot provider and verify a grounded, queued—not delivered—reply.
5. Submit a refund request, verify mandatory manual escalation and shared unread state, mark it read, and queue a staff reply.
6. Create a linked urgent ticket, assign a contractor contact, transition it through the approved lifecycle, and verify immutable history.
7. Register a second company and verify cross-company property, conversation, ticket, conflict, and filtered-list requests expose no first-company data.

The normal frontend suite covers API-connected loading, empty, failure, filter, navigation, status-text, and mobile-navigation component states. The production build and stack smoke workflow verify the browser application can be built and served by the Docker stack.

## Runbook

From a clean checkout of `testing` (or the branch under review):

```powershell
Copy-Item .env.example .env
docker compose up -d --build
docker compose ps
docker compose --profile test run --rm --build backend_test
docker compose run --rm frontend npm test
docker compose run --rm frontend npm run lint
docker compose run --rm frontend npm run build
```

Then open `http://localhost:5173`, register a synthetic manager account, and use only synthetic property and guest data. The root README's **Test the WhatsApp Simulator** section provides the signed local event command. It must be sent twice to demonstrate idempotency. In the UI, confirm the resulting conversation is labelled as simulator/queued rather than delivered, then inspect Calendar, Messages, Maintenance, Dashboard, and Settings.

For mobile review, use browser responsive emulation at **360px**, **390px**, and **768px**. Confirm the bottom navigation remains usable, settings are reachable through Profile for managers, wide calendar content scrolls in its labelled container, and status text remains understandable without color alone. Record screenshots of normal, loading/empty, and API-failure states before a staging presentation.

## Evidence and result record

| Check | Evidence | Result |
|---|---|---|
| Clean database migrations | Backend test profile upgrades Alembic from base before the suite | Passed on 2026-08-26 |
| Cross-module operational scenario | `test_mvp_operational_flow_is_persistent_tenant_scoped_and_recoverable` | Passed on 2026-08-26 |
| Tenant isolation and authorization | Cross-company assertions in the scenario and module tests | Automated in `backend_test` |
| External-event idempotency | Signed simulator event is submitted twice | Automated in `backend_test` |
| Chatbot provider fallback | Existing grounded-chatbot failure test changes the conversation to manual handling | Automated in `backend_test` |
| Backend regression suite | `docker compose --profile test run --rm backend_test` | 69 passed on 2026-08-26 |
| Frontend operational states | Component tests for connected pages, including loading, empty, and retryable failures | 46 passed on 2026-08-26 |
| Frontend static checks | `npm run lint` and `npm run build` in Docker | Passed on 2026-08-26 |
| Docker service health and public URLs | Local `docker compose ps`, `/health`, `/health/live`, `/api/v1/openapi.json`, and frontend root | Passed on 2026-08-26 |
| Mobile widths and screenshots | Manual responsive-browser checklist above | Requires recorded browser evidence |

## Known limitations and unresolved deployment choices

- WhatsApp is simulator-only. A queued chatbot or staff reply is persisted but is **not** a delivered WhatsApp message. A provider test/production adapter, credentials, delivery retries, and approval remain outside the current MVP implementation.
- The deterministic chatbot provider is suitable for controlled local validation. A production model/provider still requires recorded multilingual quality, latency, and cost evaluation before live guest use.
- Docker provides local development and CI smoke validation, not a deployed staging service. Hosting, HTTPS termination, allowed production origins, secrets management, monitoring, and network egress controls require an explicit deployment decision.
- Backup and restore storage, ownership, retention, and a successful restore exercise are not implemented in this repository. They must be accepted and executed before a pilot, as required by NFR-REL-06.
- Automated tests do not replace target-user usability sessions. The manual mobile checklist and representative-user task sessions in `docs/academic/14_testing_and_validation.md` still need recorded results.
- This evidence uses only synthetic company, property, booking, contractor, and guest data. It does not establish legal approval for real personal-data processing.
