# VacayOps

AI-powered operations platform for vacation property management companies in Tunisia.

## Prerequisites (install once, on every machine)

- Docker Desktop (Windows: enable WSL2 first)
- Git
- Python 3.12 -- local editor support only, the backend actually runs inside Docker
- Node.js LTS -- same, local editor support only

## First-time setup

1. Clone the repo:
   ```
   git clone <repo-url>
   cd vacayops
   ```

2. Copy the environment file and fill in your own keys:
   ```
   cp .env.example .env
   ```
   Windows without Git Bash: `copy .env.example .env`

3. Scaffold the frontend -- only needed the very first time, on whoever's
   machine does this first. Skip it if `frontend/package.json` already exists
   (meaning a teammate already did this and pushed it):
   ```
   npm create vite@latest frontend -- --template react-ts
   ```
   Then install Tailwind inside `frontend/` per Tailwind's Vite guide before
   committing, since the dashboard UI depends on it.

4. Build and start everything:
   ```
   docker compose up --build
   ```

5. Confirm it worked -- everyone should see the exact same result:
   - Backend health check: http://localhost:8000/health -> `{"status": "ok"}`
   - Frontend: http://localhost:5173

## Every time after that

```
git pull origin main
docker compose up --build
```

If you're on Mac, Linux, WSL, or Git Bash with `make` installed, this is the
same thing:
```
make pull-latest
```

Note for Windows: Git Bash does NOT include `make` by default even though it
comes with Git. Either install it separately or just run the two commands
above directly -- they work everywhere with no extra install.

## Stopping everything

```
docker compose down
```

## Project structure

```
vacayops/
|-- backend/      FastAPI + Celery worker
|-- frontend/     React + TypeScript
|-- docs/         Architecture and API contract docs
|-- docker-compose.yml
|-- .env.example
`-- Makefile
```
