# Architecture and Product Decision Records

This folder stores accepted cross-cutting decisions that affect more than one issue or module. Examples include authentication strategy, tenant-key strategy, calendar date semantics, provider selection, and conversation identity.

Decision records are authoritative only after team review and acceptance. Proposed records must remain marked Proposed.

## Naming

Use sequential filenames:

```text
0001-authentication-strategy.md
0002-tenant-key-strategy.md
```

Copy `0000-template.md` when creating a record.

## Lifecycle

- **Proposed:** under discussion
- **Accepted:** current decision
- **Superseded:** replaced by a newer record
- **Rejected:** considered but not adopted

When superseding a decision, preserve the old record and link both directions.
