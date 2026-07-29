# Backend Tests

Run the isolated API and PostgreSQL suite from the repository root:

```bash
docker compose --profile test run --rm --build backend_test
docker compose --profile test down
```

The test profile uses a temporary PostgreSQL filesystem and a database name
ending in `_test`. Database tests refuse any other database name before running
upgrade or downgrade operations.

Add tests alongside implementation using the strategy in
`docs/academic/14_testing_and_validation.md`.

Critical early coverage:

- authentication and role authorization
- cross-company isolation
- database migration from a clean PostgreSQL instance
- booking date and overlap rules
- external-event idempotency
- chatbot escalation policy
