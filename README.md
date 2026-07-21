# Vayca

AI-powered operations platform for vacation property management companies in Tunisia.

> This setup guide is written for **Windows only**. If you're on Mac or Linux, say so before following it — the install steps differ and this version will not work as-is.

---

## 🤖 What to Feed Your AI (Crucial for Teammates & AI Coding Agents)

When using AI assistants (Cursor, GitHub Copilot, Antigravity, ChatGPT, Claude, Gemini, etc.) to generate or modify code for **Vayca**, **ALWAYS instruct your AI to read the following Markdown files first** before writing any frontend or component code:

### 📑 Key Instruction Files to Feed Your AI:
1. **`design_system.md`** (located at root `d:\stage\design_system.md` or `./design_system.md`)  
   *Contains the locked color palette tokens, senior-friendly typography rules, large touch targets, component patterns, elevation guidelines, and B2B visual identity.*
2. **`README.md`**  
   *Contains project structure, tech constraints, and workflow rules.*

### 🎯 Senior Audience & UX Directive:
> **Target Audience**: Older, traditional property owners & staff in Tunisia.  
> **Rule**: Keep UI layouts **simple, uncluttered, and effortless to navigate**. Use large readable text (15px-16px body min), high contrast text (`#111827`), generous 44px+ button targets, explicit text labels alongside icons, and clear 1-sentence explanations on every page. Avoid complex multi-layered menus or confusing jargon.

### 💬 Prompt Template to give your AI:
> *"I'm working on Vayca, a B2B vacation-property operations app in Tunisia designed for non-tech-savvy/older staff. Please read `design_system.md` in the project root before writing or editing any UI components. Ensure all UI elements use large readable text, simple uncluttered layouts, generous button padding (min 44px height), clear text labels on every button, and the locked Sidi Bou Said Azure (`#0F3D5E`), Terracotta Clay (`#D96B43`), and Warm Sand (`#FAF8F5`) color palette in Light Mode."*

---

## 1. Install these once

| Tool | Download | Verify it worked |
|---|---|---|
| Git for Windows | https://git-scm.com/downloads | `git --version` |
| Docker Desktop | https://www.docker.com/products/docker-desktop/ | `docker --version` |
| Python 3.12 | https://www.python.org/downloads/ | `python --version` |
| Node.js LTS | https://nodejs.org/ | `node --version` |
| VS Code (recommended editor) | https://code.visualstudio.com/ | -- |
| GitHub Desktop (optional, visual Git) | https://desktop.github.com/ | -- |

Notes:

- **Docker Desktop** needs WSL2 turned on first. Either accept the prompt during Docker's install, or open PowerShell as Administrator, run `wsl --install`, restart your machine, then install Docker.
- **Python**: run the official installer above and choose the Python install manager during setup. Check **"Add python.exe to PATH"** during install -- this is the step people forget, and then `python` isn't recognized afterward. Once installed, `py install 3.12` also works from a terminal.
- **Terminal**: use **Git Bash** for every command in this guide, not Command Prompt or PowerShell. It comes bundled with Git for Windows and understands Unix-style commands like `cp`. Right-click any folder in File Explorer -> "Git Bash Here" to open it there.
- None of this Python/Node install actually runs the app -- the backend and frontend run inside Docker. Local installs exist so your code editor can read and autocomplete your code correctly.

---

## 2. Clone the repo and get your environment running

All commands below assume Git Bash.

1. Clone it:
   ```bash
   git clone <repo-url>
   cd vayca
   ```

2. Create your local environment file from the template:
   ```bash
   cp .env.example .env
   ```
   If you're using Command Prompt instead of Git Bash: `copy .env.example .env`

   Open `.env` and fill in your own API keys where it says `replace-with-your-own-key`. Never put real keys into `.env.example` -- that file is the shared template and gets committed.

3. First time only -- scaffold the frontend. Skip this if `frontend/package.json` already exists in the repo (a teammate already did it and pushed it):
   ```bash
   npm create vite@latest frontend -- --template react-ts
   ```
   Then follow Tailwind's Vite setup guide inside `frontend/` before committing, since the dashboard UI depends on it: https://tailwindcss.com/docs/guides/vite

4. Build and start everything:
   ```bash
   docker compose up --build
   ```
   First run downloads images and installs dependencies inside the containers -- expect a few minutes. After that it's fast.

5. Verify it actually worked -- everyone on the team should see the exact same result:
   - Containers running: `docker compose ps` -- you should see `backend`, `frontend`, `db`, `redis`, `worker`, all `Up`.
   - Backend: open http://localhost:8000/health -- should show `{"status": "ok"}`
   - Frontend: open http://localhost:5173
   - If something looks wrong: `docker compose logs -f backend` (swap `backend` for whichever service is failing)

If any of this differs between teammates, fix it before anyone starts writing feature code -- different environments waste more time later than fixing this now costs.

---

## 3. Daily workflow: branch, push, pull, review, test

### Starting a new feature

1. Make sure you're on `testing` and it's up to date. Never branch off `main` directly:
   ```bash
   git checkout testing
   git pull origin testing
   ```

2. Create your feature branch:
   ```bash
   git checkout -b feature/short-task-name
   ```
   Examples: `feature/airbnb-ical-sync`, `feature/whatsapp-webhook`, `feature/ticket-board-ui`

3. Work, then commit in small chunks with a clear prefix:
   ```bash
   git add .
   git commit -m "feat: add Airbnb calendar sync endpoint"
   ```
   Prefixes: `feat:` new feature, `fix:` bug fix, `docs:` documentation, `test:` tests, `chore:` config/setup.

### Pushing and opening a Pull Request

4. Push your branch:
   ```bash
   git push -u origin feature/short-task-name
   ```

5. On GitHub, open a Pull Request from your branch **into `testing`** (not `main`). Describe what the PR does and which Issue it closes, e.g. `Closes #14`.

6. Assign one teammate as reviewer.

---

## 4. Project structure

```
vayca/
|-- design_system.md  Locked Vayca Design System Rules (Feed this to AI!)
|-- backend/          FastAPI + Celery worker
|-- frontend/         React + TypeScript + Tailwind CSS
|-- docs/             Architecture and API contract docs
|-- docker-compose.yml
|-- .env.example
`-- Makefile
```
