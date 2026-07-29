# Backend Business Modules

Create module packages here as implementation issues begin:

```text
modules/
|-- identity/
|-- properties/
|-- calendar/
|-- messaging/
|-- chatbot/
|-- maintenance/
`-- dashboard/
```

Each module should keep its API schemas, application services, domain rules, and persistence code together unless an accepted decision establishes another pattern. Do not create all database entities speculatively in one feature branch.

The initial persistence models are now grouped under the module packages and
registered through `app.core.model_registry` for Alembic. The schema is created
by `backend/alembic/versions/0001_initial_schema.py`; application services and
authorization rules still need to be implemented around these tables.
