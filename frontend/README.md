# Vayca Frontend

React/TypeScript frontend for the Vayca operations platform.

## Current State

The current screens are an interactive prototype backed by `src/data/mockData.ts`. They demonstrate approved navigation and workflows but do not prove authentication, persistence, calendar synchronization, WhatsApp, or chatbot integration.

Every simulated or unconfigured integration must be labelled truthfully.

## Navigation

- Dashboard
- Calendar
- Messages
- Maintenance
- Properties
- Settings

Property detail and conversation thread are drill-down routes.

## Development

From the repository root, prefer Docker:

```bash
docker compose up --build frontend
```

For local frontend tooling:

```bash
npm install
npm run dev
npm run build
npm run lint
```

Before UI work, read `docs/design-system.md`, the assigned requirement, and `AGENTS.md`.
