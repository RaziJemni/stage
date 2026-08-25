# Vayca Frontend

React/TypeScript frontend for the Vayca operations platform.

## Current State

The authenticated workspace contains API-connected Properties, Calendar, Messages, Maintenance, Dashboard, and Settings workflows. Their exact persistent behavior and integration boundaries are recorded in the repository root `README.md` under **Current State**. Local WhatsApp use remains simulator-only: queued chatbot or staff messages are persisted but are not proof of external delivery.

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

The frontend is available at `http://localhost:5173`.

If `package.json` changes and Docker reports a missing package, refresh the
container-only dependency volume:

```bash
docker compose up -d --build --force-recreate --renew-anon-volumes frontend
```

For local frontend tooling:

```bash
npm install
npm run dev
npm run build
npm run lint
```

Before UI work, read `docs/design-system.md`, the assigned requirement, and `AGENTS.md`.
