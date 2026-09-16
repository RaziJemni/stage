# Decision 0013: Token-Secured Owner Portal and Automated Monthly Reports

**Status:** Accepted  
**Date:** 2026-09-16  
**Related issue:** #22  

## Context

Property owners require transparency into gross reservation revenues, agency management commissions, and deductible maintenance expenses incurred for their properties. However, `AGENTS.md` Section 3 strictly limits platform authentication to two authenticated actors: Company Managers and Company Staff. Introducing full account credentials, user roles, or password authentication for external property owners would breach established product boundaries and expand attack surfaces.

## Decision

Vayca implements a secure, read-only, tokenized Owner Statement Portal combined with automated monthly email reports and printable branded statements ("Option A"):

1. **Token-Secured Read-Only Portal (`/owner/statements?token=...`):**
   - Owners access their monthly statements via time-limited, cryptographically secure URLs without a username or password.
   - Access tokens are generated with 32 cryptographically random bytes (`secrets.token_urlsafe(32)`).
   - The database stores only the SHA-256 hash (`owner_statement_access_tokens` table), matching Vayca's credential security standards (invitation tokens, reset tokens).
   - Each token is strictly scoped to a specific `company_id`, `owner_id`, `year`, and `month`, with an expiration timestamp (`expires_at`, default 30 days) and explicit revocation support (`is_revoked`).
   - Public API endpoints (`/api/v1/public/owner-statements/*`) validate token hashes against active records before returning statement data, CSV exports, or printable HTML.

2. **Automated Monthly Email Dispatch:**
   - A scheduled Celery task (`dispatch_monthly_owner_statements`) runs automatically on the 1st of each month via Celery Beat.
   - It computes the previous calendar month's financial metrics for all active partner owners with configured email addresses across companies.
   - Each email is rendered using bilingual HTML/plain text templates (FR/EN) matching the company's preferred language, with key financial KPIs and a secure direct portal link.
   - In addition to automated schedules, company managers can trigger on-demand statement email dispatches from the Supervision interface.

3. **Branded Printable A4 Statements:**
   - A dedicated server-rendered HTML template (`statement_html.py`) produces professional, branded A4 financial statements styled with the Sidi Bou Said design palette and `@media print` CSS rules.
   - Statements can be printed directly or saved as PDF from both the manager Supervision view and the public Owner Portal.

4. **1-Click Shareable Access Links:**
   - Managers can instantly generate fresh access links and copy them to their clipboard to send to owners via WhatsApp, SMS, or direct communication.

## Guardrails

- External property owners are never granted system login credentials, user records, or platform authentication roles.
- Public statement portal endpoints are strictly read-only; no modification or submission of operational data is permitted.
- Raw access tokens are never persisted in the database; only SHA-256 digests are stored and indexed.
- Expired or revoked tokens immediately fail with descriptive, localized error messages.
- All calculation of revenue, commission, and deductible maintenance expenses relies on persisted database records (`bookings`, `maintenance_tickets`), maintaining complete company tenant isolation.
- Email delivery uses Vayca's abstracted email adapter architecture (`EmailAdapter`), supporting memory, console, and SMTP providers without external leaks during testing.
