# Decision 0003: Manager and Staff Authentication Sessions

**Status:** Accepted
**Date:** 2026-07-30
**Owners:** Vayca project team
**Related requirements/issues:** FR-AUTH-01..06, NFR-SEC-01..07, #18

## Context

Every operational module needs a trusted company and role before it can expose
tenant-owned data. Vayca must support immediate logout and deactivation while
keeping browser credentials inaccessible to frontend JavaScript.

## Decision Drivers

- Enforce company isolation from server-controlled identity.
- Revoke sessions immediately after logout or deactivation.
- Minimize exposure if the database or browser JavaScript is compromised.
- Keep the design understandable and testable for a three-person team.
- Support local invitation development before selecting an email provider.

## Options Considered

### Option A: Opaque server-backed sessions

Send a random token in an `HttpOnly` cookie and store only its hash with the
user, company, expiry, revocation, and CSRF state in PostgreSQL.

### Option B: Browser-stored JWT access tokens

JWTs avoid a session lookup but expose credentials to browser JavaScript when
stored in web storage and require additional revocation infrastructure for
immediate deactivation.

### Option C: Signed cookie containing identity claims

This prevents client modification but still makes immediate central revocation
and trusted current-role resolution more complex.

## Decision

Use Option A. Hash passwords with `pwdlib` Argon2id. Generate cryptographically
random session and invitation tokens, store only SHA-256 hashes, and transmit
the session in an `HttpOnly`, `SameSite=Lax` cookie. Production sets `Secure` and
uses HTTPS.

Every protected request loads the active session, user, and company from the
database. State-changing requests also validate a double-submit CSRF token.
Sessions expire after eight configurable hours and are revoked on logout or user
deactivation. Redis limits failed logins to five attempts per normalized
email/client-IP pair in fifteen configurable minutes.

Staff invitations are hashed, single-use, and expire after 72 configurable
hours. Development and test environments return a one-time simulator URL.
Production requires a real email adapter and must not expose the activation URL
as if delivery occurred.

## Consequences

### Positive

- Logout and deactivation take effect immediately.
- Browser JavaScript cannot read the session credential.
- Database disclosure does not reveal reusable session or invitation tokens.
- Role and company changes are checked against current trusted data.

### Negative or risky

- Every protected request performs a session database lookup.
- PostgreSQL session records need retention cleanup after expiration.
- Redis availability is required for protected login limiting.
- Cookie authentication requires explicit CSRF and CORS configuration.

## Validation

- Backend tests cover registration, login states, rate limiting, revocation,
  invitations, manager authorization, CSRF, and cross-company isolation.
- Frontend tests cover protected routing and role-dependent navigation.
- Migration tests create and remove the authentication tables on clean
  PostgreSQL.
- Deployment review verifies HTTPS, secure cookies, allowed origins, production
  secrets, and a configured invitation-email adapter.
