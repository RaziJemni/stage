# Risks, Constraints, and Mitigation

**Status:** Active risk register

## Risk Scale

Probability and impact are rated Low, Medium, or High. Priority is derived qualitatively and should be reviewed each iteration.

## Risk Register

| ID | Risk | Probability | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| R-01 | MVP scope exceeds three-person capacity | High | High | Keep explicit exclusions; require trade-off for additions | Team lead |
| R-02 | Official booking APIs are unavailable | High | Medium | Use RFC 5545 calendar feeds and manual bookings; label limitations | Calendar lead |
| R-03 | Calendar feed is stale, incomplete, or unavailable | Medium | High | Polling status, retries, last-known data, visible errors, manual refresh | Calendar lead |
| R-04 | Chatbot sends an incorrect or harmful answer | Medium | High | Grounding, safe categories, mandatory escalation, evaluations, audit | Communication lead |
| R-05 | Tunisian Arabic quality is inadequate | Medium | Medium | Local test set, human review, escalation, phased language tuning | Communication lead |
| R-06 | WhatsApp approval is delayed | Medium | High | Simulator and provider test mode; integration adapter | Communication lead |
| R-07 | One company accesses another company's data | Low/Medium | Critical | Central tenant scoping, authorization tests, code review | Platform lead |
| R-08 | Team branches implement incompatible contracts | Medium | High | OpenAPI contracts, small issues, review, frequent integration | Entire team |
| R-09 | Database schema is implemented before workflow approval | Medium | High | Team review and provisional conception checklist before migration | Database lead |
| R-10 | Prototype UI is mistaken for completed functionality | Medium | Medium | Truthful statuses, connected-data criteria, definition of done | Entire team |
| R-11 | Docker setup differs between teammates | Medium | Medium | Clean-clone startup test and pinned dependencies | Platform lead |
| R-12 | Sensitive guest/property information leaks through logs or prompts | Medium | High | Data minimization, sanitized logs, authorization, retention policy | Platform and AI leads |
| R-13 | Lack of customer validation weakens academic/business claims | High | Medium | Structured interviews and pilot evidence | Documentation coordinator |
| R-14 | Documentation and implementation drift | High | Medium | Requirement IDs, traceability, documentation in same PR | Entire team |
| R-15 | Dependency or provider cost becomes excessive | Medium | Medium | Usage limits, model evaluation, configurable provider/model | Team lead |
| R-16 | Demo depends on unstable external services | Medium | High | Deterministic fixtures and simulation mode | Entire team |

## Technical Constraints

- PostgreSQL is the persistent database baseline.
- FastAPI and React/TypeScript are the application baseline.
- Docker is the shared development environment.
- Calendar support begins with supported iCalendar data.
- Guests and contractors do not authenticate.
- External providers may impose approval, rate, content, and delivery restrictions.

## Organizational Constraints

- Three members must divide development and academic work.
- Members have limited prior group-development experience.
- Supervisor review may require changes to study or conception.
- Internship deadlines limit integration breadth and pilot duration.

## Ethical and Legal Considerations

- Guests should not be misled into believing uncertain chatbot answers are verified facts.
- Automated messages should be attributable and reviewable.
- Personal data should be collected only for defined operational purposes.
- Real data use should follow Tunisian personal-data obligations and provider terms.
- The final report should clearly distinguish evidence, assumptions, simulation, and implemented functionality.

## Contingency Demonstration

The project must support an end-to-end demonstration with controlled fixtures if external services are unavailable:

- iCalendar fixture server or local feed;
- WhatsApp webhook simulator;
- fake outgoing-message adapter;
- configurable chatbot stub for deterministic escalation cases;
- seeded multi-tenant demonstration database.

This fallback is not a substitute for integration work. It prevents the academic demonstration from depending entirely on external service availability.
