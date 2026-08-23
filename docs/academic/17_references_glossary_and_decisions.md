# References, Glossary, and Decision Log

**Status:** Active supporting chapter

## References

### Tunisian sector and legal context

- **REF-INS-CST-2024:** Institut National de la Statistique, Tunisia, “Compte Satellite du Tourisme 2023-2024,” 2026. https://www.ins.tn/publication/compte-satellite-du-tourisme-2023-2024
- **REF-INS-ACCOMMODATION:** Institut National de la Statistique, Tunisia, “Nuitées touristiques et hébergement” statistical series. https://www.ins.tn/statistiques/130
- **REF-INPDP-LAW:** Instance Nationale de Protection des Données Personnelles, Organic Law No. 2004-63 of 27 July 2004 concerning personal-data protection. https://www.inpdp.tn/ressources/loi_2004.pdf
- **REF-INPDP-FORMS:** INPDP, declaration and authorization procedures for personal-data processing. https://www.inpdp.tn/Formulaires.html

### Technical standards and official documentation

- **REF-IETF-ICAL:** Internet Engineering Task Force, RFC 5545, “Internet Calendaring and Scheduling Core Object Specification (iCalendar).” https://datatracker.ietf.org/doc/html/rfc5545
- **REF-FASTAPI-SECURITY:** FastAPI documentation, “OAuth2 with Password (and hashing), Bearer with JWT tokens.” https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/
- **REF-ALEMBIC:** SQLAlchemy project, Alembic documentation. https://alembic.sqlalchemy.org/en/latest/
- **REF-OWASP-ASVS:** OWASP Foundation, Application Security Verification Standard. https://owasp.org/www-project-application-security-verification-standard/
- **REF-OWASP-SESSION:** OWASP Foundation, Session Management Cheat Sheet. https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- **REF-OPENAI-EVALS:** OpenAI API documentation, Evals. https://platform.openai.com/docs/api-reference/evals

### Project sources

- Root `README.md`
- `AGENTS.md`
- `docs/architecture.md`
- `docs/design-system.md`
- `design_system.md`
- `VacayOps_Project_Report.pdf`
- `VacayOps_Conception_and_Database_Design.pdf`
- GitHub repository issues and Project “app features”

## Citation Policy

- Prefer official public sources for statistics, standards, laws, and technical behavior.
- Record access dates during final PDF production if required by the institution.
- Do not repeat unsupported market-size or competitor claims from earlier reports without verification.
- Mark interview evidence with anonymized participant identifiers and interview dates.
- Distinguish project decisions from externally verified facts.

## Glossary

| Term | Meaning in Vayca |
|---|---|
| Agency | Company managing properties for itself or owners |
| Independent owner | Small Vayca customer represented by a normal company workspace |
| Availability | Whether a property has no active blocking record in a requested period |
| Booking | Imported or manually entered reservation record |
| Blocked period | Calendar period unavailable without necessarily containing full reservation data |
| Channel | A property's connection to an external booking source |
| Chatbot | Controlled AI-supported guest communication capability |
| Company | Tenant boundary containing users, properties, contractors, and operational data |
| Conflict | Relevant overlap between active booking/block records for one property |
| Contractor | External maintenance contact without a Vayca account |
| Escalation | Transfer of a conversation to staff attention |
| Grounding | Restricting chatbot answers to verified context and backend results |
| iCalendar/iCal | Standard calendar exchange format defined by RFC 5545 |
| Idempotency | Property that repeating the same event does not create duplicate effects |
| Manager | Authenticated user with company-administration permission |
| Marketplace | Public searchable booking platform; excluded from Vayca MVP |
| Multi-tenancy | One system serving several isolated company workspaces |
| Staff | Authenticated operational user without manager-only administration access |
| Ticket | Structured maintenance or operational issue record |
| Webhook | Provider-initiated HTTP event sent to Vayca |

## Decision Log

| ID | Date | Status | Decision | Rationale / consequence |
|---|---|---|---|---|
| DEC-001 | 2026-07-28 | Accepted | Vayca remains a B2B operations platform. | Avoids marketplace complexity and preserves original problem focus |
| DEC-002 | 2026-07-28 | Accepted | Independent owners use the same company architecture and may receive a lower-priced plan later. | No second product or schema is required |
| DEC-003 | 2026-07-28 | Rejected for MVP | Public marketplace and guest booking checkout. | Adds discovery, payments, cancellations, reviews, and public support obligations |
| DEC-004 | 2026-07-28 | Accepted | Contractors do not authenticate. | Staff records assignment and contacts them manually |
| DEC-005 | 2026-07-28 | Accepted | Main navigation uses Dashboard, Calendar, Messages, Maintenance, Properties, and Settings. | Reduces technical terminology and navigation complexity |
| DEC-006 | 2026-07-28 | Accepted | iCalendar is the initial calendar integration candidate. | Accessible and sufficient for imported availability, with documented limitations |
| DEC-007 | 2026-07-28 | Accepted | WhatsApp uses simulator, test, and later production modes. | Development remains possible during provider approval or outages |
| DEC-008 | 2026-07-28 | Accepted | The user-facing term is chatbot. | Clearer for the target audience than AI assistant or autonomous agent |
| DEC-009 | 2026-07-28 | Accepted | Chatbot answers safe questions, uses backend tools, and escalates sensitive/uncertain cases. | Prevents autonomous high-impact decisions |
| DEC-010 | 2026-07-28 | Accepted | Ticket creation/assignment from chatbot output requires staff confirmation. | Preserves human responsibility |
| DEC-011 | 2026-07-28 | Accepted | MVP chatbot languages are French, English, and Arabic, with Tunisian Arabic evaluation. | Matches current target while controlling scope |
| DEC-012 | 2026-07-28 | Accepted | Manual/direct bookings are included without creating a marketplace. | Owners can block dates received through phone or WhatsApp |
| DEC-013 | 2026-07-30 | Accepted | Authentication uses Argon2id passwords and revocable opaque server-backed sessions in secure cookies. | Avoids browser-stored credentials and supports immediate revocation |
| DEC-014 | 2026-07-28 | Accepted | Academic documentation is written in English. | Team decision |
| DEC-015 | 2026-07-28 | Accepted | These documents are a living baseline, not immutable final decisions. | Implementation and validation may reveal necessary changes |
| DEC-016 | 2026-08-22 | Accepted | Grounded chatbot provider and deferred reply processing. | Policy and backend facts run before the configured provider; simulator remains deterministic and outbound delivery remains unconfigured. |

## Open Decisions

| ID | Decision needed | Responsible discussion |
|---|---|---|
| OPEN-001 | Resolved by Decision 0003: opaque session tokens, hashed server-side storage, and secure cookies | Closed 2026-07-30 |
| OPEN-002 | Global or company-scoped user email uniqueness | Database and UX review |
| OPEN-003 | Final tenant-key strategy on child tables | Database review |
| OPEN-004 | Exact booking date/time and timezone semantics | Calendar/database review |
| OPEN-005 | iCalendar missing-event cancellation policy | Calendar integration testing |
| OPEN-006 | Conversation identity and reopening rules | Messaging/database review |
| OPEN-007 | Final ticket lifecycle and transition matrix | Maintenance workflow review |
| OPEN-008 | AI provider and model | Decision 0008 selects the adapter approach; production model enablement remains subject to evaluation results |
| OPEN-009 | Hosting platform and production topology | Deployment review |
| OPEN-010 | Institution-specific report template and citation style | Supervisor confirmation |

## Finalization Checklist

- [ ] Replace assumptions with interview/pilot evidence where available
- [ ] Reconcile approved schema and migration with data conception
- [ ] Add screenshots only after connected implementation exists
- [ ] Add test results and measured performance
- [ ] Update GitHub issue statuses and requirement links
- [ ] Record all material scope decisions
- [ ] Confirm legal/privacy obligations for pilot data
- [ ] Apply institution formatting and citation requirements
- [ ] Render Mermaid diagrams at publication quality
- [ ] Generate and visually inspect the combined PDF
