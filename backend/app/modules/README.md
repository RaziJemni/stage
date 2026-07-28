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
