# Project Overview

**Status:** Draft for team and supervisor review

## Project Identity

**Name:** Vayca
**Former working name:** VacayOps
**Domain:** Property technology, hospitality operations, and applied artificial intelligence
**Primary market:** Tunisia
**Delivery context:** Three-person internship project

## Executive Summary

Vayca is a B2B web platform intended for vacation-property management agencies and independent property owners. Its purpose is to reduce operational fragmentation by bringing booking visibility, property knowledge, guest communication, chatbot assistance, and maintenance follow-up into one workspace.

The project addresses three recurring operational problems:

1. Booking information is distributed across multiple channels, creating delayed updates and conflict risk.
2. Guest questions arrive through messaging channels in several languages and require rapid, property-specific answers.
3. Maintenance issues are frequently coordinated through informal messages without structured assignment or status tracking.

The proposed MVP provides a portfolio calendar, automated calendar imports, conflict alerts, a unified guest-message workspace, a multilingual chatbot with controlled escalation, property records, maintenance tickets, and a management dashboard.

## Product Positioning

Vayca is not a public accommodation marketplace. Guests discover and reserve properties through existing channels such as Airbnb, Booking.com, or direct contact with the owner. Vayca operates behind the scenes as the owner's or agency's operational workspace.

The same architecture supports both agencies and independent owners:

- An agency is represented as a company with multiple users and properties.
- An independent owner is represented as a company with one or a small number of users and properties.
- Subscription pricing may vary later without requiring a second product architecture.

## Project Objectives

### Academic Objectives

- Apply requirements engineering and UML-based conception to a real operational problem.
- Design and implement a multi-module web application as a coordinated team.
- Practice database modeling, API design, asynchronous processing, AI integration, security, testing, and deployment.
- Produce traceable documentation connecting needs, requirements, modules, implementation, and tests.

### Functional Objectives

- Centralize properties, bookings, conversations, and maintenance work.
- Import calendar data and identify overlapping reservations.
- Answer safe guest questions using verified property and availability data.
- Escalate uncertain or sensitive conversations to staff.
- Structure maintenance issues as tickets with assignment and status history.
- Provide managers with a concise view of work requiring attention.

### Quality Objectives

- Keep the interface understandable to users with different levels of technical experience.
- Isolate each company's information in a multi-tenant database.
- Avoid duplicate records when integrations resend the same event.
- Keep external-integration failures visible and recoverable.
- Ensure AI-generated output is grounded, controlled, and auditable.

## Expected Contribution

The project's value is the integration of several operational workflows into a localized and accessible workspace. Its contribution is not the invention of calendar, messaging, or ticketing technology individually. It is the coherent combination of these capabilities around the daily work of small vacation-property operators in Tunisia.

## Current Maturity

At this documentation baseline, the repository includes project governance, a
Docker-oriented skeleton, a migrated PostgreSQL domain, manager/staff
authentication APIs, protected frontend routes, architecture notes, a design
system, and a GitHub backlog. Operational feature APIs, external integrations,
and end-to-end MVP validation remain implementation work. Prototype behavior
and mock operational data must not be reported as completed production
functionality.
