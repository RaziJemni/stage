# Decision 0010: Staff Property Scoping and Capability Flags

**Status:** Accepted
**Date:** 2026-09-14
**Related issue:** #84

## Decision

Managers retain unrestricted company access. Staff have two independently managed
capabilities: `operations` for Properties, Calendar, and Messages, and
`maintenance` for Maintenance work.

Managers may assign a staff member to one or more company properties. A staff
member with no assignment retains company-wide access, preserving existing
staff behavior after migration. A staff member with assignments is limited to
those properties in server-side queries and resource lookups.

## Consequences

- Assignments are stored in an identity-owned, company-keyed join table.
- Existing staff retain both capabilities and no assignments by default.
- Client-provided company IDs are never accepted for access decisions.
- A resource outside a scoped staff member's properties returns a
  non-disclosing 404 response.
- Manager-only Team Settings controls assignment and capabilities.
