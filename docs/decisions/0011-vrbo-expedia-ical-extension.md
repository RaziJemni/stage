# Decision 0011: Vrbo and Expedia iCalendar Feed Extension

**Status:** Accepted
**Date:** 2026-09-14
**Related issue:** #20

## Context

Vayca already imports RFC 5545 iCalendar feeds asynchronously for Airbnb and
Booking.com-compatible channels. The team confirmed that the next extension is
Vrbo and Expedia calendar synchronization through their exported `.ics` feed
URLs, rather than private or enterprise channel APIs.

## Decision

Add `vrbo` and `expedia` as explicit calendar channel and imported-booking
source types. They use the existing manager-configured, HTTP(S), read-only
iCalendar feed workflow, Celery worker, idempotent upsert key, synchronization
health, conflict reconciliation, and tenant scope.

The Settings UI identifies the two providers, while retaining the existing
generic `other` option for unrecognized RFC 5545 sources.

## Consequences

- No provider credentials, private APIs, webhooks, listing publication, booking
  writes, or real-time synchronization are added.
- A configured URL is an unverified external feed until its worker run succeeds;
  the UI must continue to show persisted health rather than claim connection.
- Imported bookings retain their provider source for calendar filtering,
  conflict context, and reporting.
- The PostgreSQL enum migration is reversible only when no Vrbo or Expedia
  channel or booking rows remain; downgrade refuses to discard such data.
