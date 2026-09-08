# Decision 0004: iCalendar Feed Import and Scheduling

**Status:** Accepted
**Date:** 2026-08-03
**Owners:** Vayca project team
**Related requirements/issues:** FR-CAL-01..03, NFR-REL-01..03, NFR-PERF-03, #3, #4

## Context

Vayca needs booking availability from existing channel calendars without claiming
official two-way platform integrations. The implementation must accept feeds from
multiple sources, avoid blocking HTTP requests, preserve tenant isolation, and
allow later synchronization-health work to inspect outcomes.

## Decision Drivers

- RFC 5545-compatible parsing without custom ad-hoc parsing.
- Asynchronous imports that do not block manager requests.
- Idempotent database writes and recoverable failures.
- Safe handling of manager-provided external URLs.
- A simple Docker development workflow for the three-person team.

## Options Considered

### Option A: Hand-written parser and synchronous import

This avoids a dependency but would support only a fragile subset of iCalendar
syntax and would make a manager wait for the remote feed request.

### Option B: `icalendar` parser with Celery, Redis, and Celery Beat

This adds a maintained RFC 5545-compatible parser and reuses the existing
background-worker baseline. Beat periodically queues active feeds while workers
perform the slow download and persistence work.

## Decision

Use Option B.

- `icalendar` parses supported RFC 5545 feeds into normalized event data.
- A manager configures a feed against a company-owned property channel through
  versioned API endpoints.
- Celery queues individual imports and Celery Beat schedules active feeds at
  `CALENDAR_SYNC_INTERVAL_SECONDS`, defaulting to 900 seconds.
- Calendar URLs must use HTTP or HTTPS and must not resolve to private or local
  network addresses. Redirects are rejected.
- Each imported event is upserted using the existing company/channel/external
  event unique index. Same-day all-day events are normalized to one day.
- An explicit cancelled event updates its existing record to `cancelled`. An
  event missing from a successful complete feed is also cancelled. A partial or
  failed feed preserves every earlier booking.
- Every attempt records a `CalendarSyncRun`; partial and failed imports store a
  sanitized error summary, while only successful complete imports update the
  channel's last-success timestamp.

## Consequences

### Positive

- Feed imports are isolated from request latency and support deterministic
  fixtures and real public-feed validation.
- Existing bookings remain stable when the same event is imported again.
- The later synchronization-health and portfolio-calendar issues can use
  persisted feed and run data.

### Negative or risky

- The current MVP does not expand recurring events; unsupported recurrence behavior must be designed before claiming it as supported. Feed configuration UI is available to managers in Settings Integrations.
- DNS checks reduce, but cannot alone eliminate, all SSRF risks. Production deployment requires network egress controls as a further layer.

## Validation

- Focused fixture tests cover configuration, authorization, CSRF, idempotency,
  failures, same-day all-day normalization, task queuing, and private URL
  rejection.
- Full backend regression suite: `70 passed`.
- A manual local-stack import from a public iCalendar feed completed with 27
  persisted events and a succeeded sync run.
