# Decision 0012: Direct-Booking Pricing Recommendations

**Status:** Accepted
**Date:** 2026-09-14
**Related issue:** #21

## Decision

Vayca offers manager-configured pricing only for direct reservations. A profile
contains a base nightly rate, Friday/Saturday adjustment, and minimum stay;
optional seasonal rules override the nightly rate and minimum stay for their
date range. The backend returns an itemized quote. Staff explicitly approve a
quote when creating a direct booking, or provide a reason when approving a
different amount. That immutable decision stores the current rule-derived
quote, actor, approved amount, and override reason. Vayca does not publish
rates or alter bookings on any OTA.

## Guardrails

- Managers alone configure pricing and all configuration is company-scoped.
- Quotes are calculated from persisted rules; no client-supplied rate is trusted.
- A configured profile requires a current quote decision for a direct reservation;
  a changed profile invalidates a stale quote and a failed minimum stay cannot be approved.
- A missing profile is an explicit, retryable configuration state, not a zero-price quote.
- No demand, occupancy, competitor, or last-minute automatic adjustment is included.
- Airbnb, Booking.com, Vrbo, and Expedia iCalendar feeds remain read-only.
