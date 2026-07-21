# AGENTS.md -- Instructions for AI Coding Agents

This is the canonical instruction file for this repository. GitHub Copilot
(Chat, code review, and coding agent), Cursor, Gemini CLI, and VS Code Copilot
Chat all discover this file directly. Claude Code imports it via `CLAUDE.md`.

Read this file, `docs/architecture.md`, and `docs/design-system.md` in full
before making any code change -- even if the task looks simple.

## 1. What this project is

VacayOps -- an AI-powered operations platform for vacation property management
companies in Tunisia. Full context, actors, workflows, and module boundaries
live in `docs/architecture.md`. Read it before writing any code that touches
business logic, the database, or the UI.

## 2. Before you write any code

1. Identify the exact feature or issue you are working on -- the GitHub Issue
   you were assigned, or the task you were explicitly given. If it's
   ambiguous, stop and ask. Do not guess and start writing code.

2. Check your current branch:
   ```
   git branch --show-current
   ```
   - Already on a `feature/*` branch matching this task? Continue.
   - On `testing`, `main`, or the wrong branch? Create the right one first:
     ```
     git checkout testing
     git pull origin testing
     git checkout -b feature/<short-task-name>
     ```
   - Name it after the task: `feature/airbnb-ical-sync`,
     `feature/ticket-board-ui`. Never commit directly to `testing` or `main`.

3. Sync before starting, and again if the session runs long (more than a
   couple of hours):
   ```
   git fetch origin
   git merge origin/testing
   ```
   Sync from `testing`, not `main`. `main` is only updated once a week from
   `testing` and will be stale for anything built this week.

## 3. Stay inside the boundary of the assigned feature

- Touch only the files the assigned issue actually requires. Notice something
  unrelated that looks broken? Note it in the PR under "Noticed but out of
  scope" -- do not fix it inline. Scope creep in one PR is the fastest way to
  make a 3-person team's reviews unreviewable.
- If a task needs a decision that isn't already settled in
  `docs/architecture.md` or `docs/design-system.md` (a new database column, a
  new page, a new external dependency) -- stop and flag it instead of
  deciding alone. These are team decisions, not agent decisions.

## 4. Commit messages

Prefix every commit: `feat:`, `fix:`, `docs:`, `test:`, `chore:`.
Example: `feat: add Airbnb calendar sync endpoint`.
Small, frequent commits, not one giant commit at the end -- that's what makes
a PR reviewable by a teammate who wasn't watching you build it.

## 5. Opening a Pull Request

Open the PR from your feature branch into `testing` -- never directly into
`main`. Use `.github/PULL_REQUEST_TEMPLATE.md` (auto-fills on GitHub). Fill in
every section for real:

- **What changed and why** -- understandable by a teammate who's never seen
  this code, and by you, next week, with no memory of writing it.
- **Which issue this closes** -- write `Closes #<number>` to auto-close on merge.
- **How it was tested** -- exactly what you ran and what you saw, not just
  "tested locally."

## 6. What never to do

- Never push directly to `testing` or `main`.
- Never commit `.env` or any real API key, token, or credential.
- Never add a new dependency or architectural pattern without flagging it
  clearly in the PR -- a reviewer needs to know it's new.
- Never mark something "done" without actually running it and checking: does
  it work on a small screen (if UI), does it handle a failed API call, does
  it handle an empty state.
