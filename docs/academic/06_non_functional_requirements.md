# Non-Functional Requirements

**Status:** Proposed measurable baseline

## Security and Privacy

| ID | Requirement | Verification target |
|---|---|---|
| NFR-SEC-01 | All protected API operations shall require authenticated identity. | Automated authorization tests |
| NFR-SEC-02 | Every tenant-owned query shall enforce company isolation. | Cross-company access tests return no data or forbidden response |
| NFR-SEC-03 | Passwords shall use a modern password-hashing algorithm such as Argon2. | Hash format inspection and authentication tests |
| NFR-SEC-04 | Secrets shall be loaded from environment or secret storage and excluded from Git. | Repository scan contains no real credentials |
| NFR-SEC-05 | Production communication shall use HTTPS. | Deployment configuration review |
| NFR-SEC-06 | Sensitive property data shall be returned only to authorized users and controlled chatbot workflows. | Permission and chatbot-grounding tests |
| NFR-SEC-07 | Authentication and sensitive endpoints shall apply rate limiting or equivalent abuse protection before production use. | Repeated request test |
| NFR-SEC-08 | Security verification shall use a documented subset of OWASP ASVS guidance. | Security checklist in test report |

Tunisia's personal-data framework includes Organic Law No. 2004-63 and INPDP declaration or authorization procedures for relevant processing purposes. Final legal compliance must be reviewed with a qualified person before production deployment [REF-INPDP-LAW] [REF-INPDP-FORMS].

## Reliability and Data Integrity

| ID | Requirement | Verification target |
|---|---|---|
| NFR-REL-01 | Reprocessing the same external event shall not duplicate persistent records. | Idempotency tests |
| NFR-REL-02 | Integration failures shall be logged with a recoverable state. | Failure simulation |
| NFR-REL-03 | Calendar refresh failure shall not delete the last known booking data. | Feed outage test |
| NFR-REL-04 | Database updates involving related records shall use transactions. | Integration tests and code review |
| NFR-REL-05 | Critical status changes shall record actor and timestamp. | Audit-field verification |
| NFR-REL-06 | Backup and restore procedures shall be documented before pilot use. | Successful restore exercise |

## Performance

| ID | Requirement | Initial target |
|---|---|---|
| NFR-PERF-01 | Common authenticated pages should become usable promptly under pilot load. | 95% of normal API requests under 1 second in local/pilot conditions, excluding external providers |
| NFR-PERF-02 | Webhook endpoints shall acknowledge valid events quickly and defer slow processing. | Response under 2 seconds under test conditions |
| NFR-PERF-03 | Calendar import shall process asynchronously without blocking user requests. | Worker execution test |
| NFR-PERF-04 | The application shall support the agreed pilot portfolio without manual partitioning. | Load test using at least 100 properties and representative records |

Performance targets are initial engineering targets, not service-level guarantees. They should be revised after measurement.

## Usability and Accessibility

| ID | Requirement | Verification target |
|---|---|---|
| NFR-UX-01 | The main navigation shall contain six plain-language destinations. | Interface review |
| NFR-UX-02 | Important statuses shall use text, icon, and color rather than color alone. | Accessibility review |
| NFR-UX-03 | Core workflows shall remain usable on common mobile widths. | Tests at 360px, 390px, and 768px widths |
| NFR-UX-04 | Forms shall provide explicit labels, validation messages, and recovery guidance. | Manual and automated UI tests |
| NFR-UX-05 | Empty, loading, success, and failure states shall be designed for data-driven pages. | State checklist per page |
| NFR-UX-06 | Technical terms shall be replaced or explained in user-facing interfaces. | Terminology review with target users |

## Maintainability

| ID | Requirement | Verification target |
|---|---|---|
| NFR-MNT-01 | The repository shall have one authoritative architecture baseline and one authoritative design system. | Documentation review |
| NFR-MNT-02 | Database changes shall use version-controlled Alembic migrations. | Migration history review |
| NFR-MNT-03 | Frontend and backend shall share documented API schemas through OpenAPI or generated types where practical. | Contract review |
| NFR-MNT-04 | Each feature branch shall remain limited to one reviewable issue or tightly related unit. | Pull-request review |
| NFR-MNT-05 | Automated tests shall cover critical domain rules. | CI test report |
| NFR-MNT-06 | Logs shall include correlation identifiers for external events where practical. | Log inspection |

## Portability and Deployment

| ID | Requirement | Verification target |
|---|---|---|
| NFR-DEP-01 | A documented Docker workflow shall start the development stack from a clean clone. | Clean-machine or clean-environment test |
| NFR-DEP-02 | Environment-specific configuration shall not require source-code changes. | Development/test configuration comparison |
| NFR-DEP-03 | Health checks shall distinguish API, database, Redis, and worker readiness. | Container health test |
| NFR-DEP-04 | Deployment shall support database migrations as an explicit release step. | Staging deployment test |

## Chatbot Quality and Safety

| ID | Requirement | Verification target |
|---|---|---|
| NFR-AI-01 | The chatbot shall not invent property facts or availability. | Grounded-answer evaluation set |
| NFR-AI-02 | Sensitive and uncertain messages shall prefer escalation over unsupported response. | Edge-case evaluation set |
| NFR-AI-03 | Chatbot outputs and decisions shall be auditable. | Stored source, model/config version, and escalation reason |
| NFR-AI-04 | French, English, Modern Standard Arabic, and representative Tunisian Arabic inputs shall be evaluated. | Language test dataset |
| NFR-AI-05 | Model selection shall be based on measured quality, latency, and cost rather than brand assumption. | Recorded evaluation comparison |
| NFR-AI-06 | A provider outage shall not prevent staff from handling conversations manually. | Provider failure test |
