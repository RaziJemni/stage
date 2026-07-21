# VacayOps -- Architecture Reference

Read this before writing any code that touches business logic, the database,
or the UI. This is the shared source of truth -- if something here conflicts
with what you're about to build, stop and flag it rather than guessing.

## What VacayOps is

An AI-powered SaaS operations platform for vacation-property management
companies in Tunisia (Hammamet, Sousse, Djerba, Monastir), managing 20-100+
short-term rental properties across Airbnb, Booking.com, and similar platforms.

## The three problems it solves

1. **Double-bookings** -- manual calendar blocking across multiple platforms.
2. **Slow guest response** -- multilingual WhatsApp inquiries at all hours,
   more volume than a small staff can answer fast.
3. **Maintenance chaos** -- issues relayed through informal chats, no ticket,
   no tracking, no accountability.

## Actors

| Actor | Type | Role |
|---|---|---|
| Property Manager | Human, logs in | Oversees properties, dashboard, assigns tickets |
| Staff Member | Human, logs in | Guest conversations, maintenance coordination |
| Contractor | Human, logs in (limited) | Ticket assignments and status only |
| Guest | Human, never logs in | Books and stays; WhatsApp only |
| AI Assistant | System actor | Auto-replies or escalates guest messages |
| Booking Platforms | External system | Airbnb / Booking.com -- source of booking data |

Guests never use the app. This is why guest communication runs through
WhatsApp, not in-app chat -- staff and managers get a real in-app inbox;
WhatsApp is only the pipe to the guest's side.

## Core workflows

**Booking sync**: platform booking -> Booking record created via Channel ->
conflict check against every other channel for that property -> alert on
overlap -> portfolio calendar updates in real time.

**Guest messaging**: WhatsApp message -> Conversation found/created -> AI
reads message + property's knowledge card -> auto-reply if routine, escalate
to staff with full context if not -> every message logged.

**Maintenance ticket**: issue reported -> Ticket created, linked to property
and optional Booking -> assigned to a Contractor -> status updates -> guest
notified automatically -> resolved tickets stay in property history.

## Database schema

Every entity belongs to a `Company` (multi-tenant from day one).

| Table | Key fields | Relationships |
|---|---|---|
| `company` | id, name | -- |
| `app_user` | id, company_id, email, role | belongs to Company |
| `property` | id, company_id, name, city, wifi_password, house_rules | belongs to Company |
| `channel` | id, property_id, platform, ical_url | belongs to Property |
| `booking` | id, channel_id, check_in, check_out, status | belongs to Channel |
| `conversation` | id, property_id, guest_contact, status | belongs to Property |
| `message` | id, conversation_id, sender, content | belongs to Conversation |
| `ticket` | id, property_id, booking_id (nullable), priority, status | belongs to Property, optional Booking |
| `contractor` | id, company_id, specialty | belongs to Company |
| `ticket_assignment` | id, ticket_id, contractor_id, status | links Ticket + Contractor |

Note: the user table is named `app_user` in SQL -- `user` is a reserved word
in PostgreSQL. Full runnable `CREATE TABLE` statements are in
`VacayOps_Conception_and_Database_Design.pdf`; ask for them in full if you
need the exact DDL rather than this summary.

## Technology stack

- Frontend: React 18 + TypeScript + Vite, TailwindCSS + shadcn/ui
- Backend: Python 3.12 + FastAPI
- Jobs: Celery + Redis
- Database: PostgreSQL 15+
- AI: OpenAI GPT-4o + LangChain (RAG grounded in each property's knowledge card)
- Messaging: WhatsApp Business API (Meta Cloud) via 360dialog/Twilio
- Infra: Docker + Docker Compose, Railway or Fly.io
- Auth: JWT + OAuth2, role-based (multi-tenant per Company)

## MVP scope boundary

In scope: Airbnb + Booking.com sync, portfolio calendar, conflict detection,
WhatsApp inbox, AI auto-reply (French/English for MVP) + escalation,
maintenance tickets end to end, management dashboard, property setup,
auth with manager/staff roles.

Explicitly out of scope for MVP -- do not build these without a team decision
first: Expedia/Vrbo integration, dynamic pricing, owner PDF reports, Italian/
German AI language support, a direct booking website, a native mobile app,
advanced analytics, automated review requests, and 360-degree virtual tours.

## Team roles

- **Backend & Infra Lead** -- database, API, calendar sync engine, auth, deployment
- **Frontend & UI/UX Lead** -- React dashboard, all visual/UX decisions, mobile layout
- **AI & Integrations Lead** -- GPT-4o, WhatsApp Business API, RAG setup, testing
  coordination during the WhatsApp approval wait
