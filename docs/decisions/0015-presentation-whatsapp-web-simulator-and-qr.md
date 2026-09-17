# Decision 0015: Presentation WhatsApp Web Simulator and Dynamic QR Code

**Status:** Accepted  
**Date:** 2026-09-17  
**Related requirements/issues:** FR-MSG-001, FR-AI-001, FR-AI-002, NFR-UX-001, PR #106  

## Context

Vayca integrates guest communication through WhatsApp, combining grounded AI assistance (answering availability, house rules, WiFi, check-in policies) with real-time staff takeover and maintenance ticket escalation.

During academic defense presentations, stakeholder reviews, and offline grading sessions, proving that guest messaging and grounded AI interactions work in real time poses practical constraints:
1. **Third-Party Bureaucracy & Cost:** Connecting to official Meta WhatsApp Business Cloud API or Twilio WhatsApp requires verified business accounts, approved message templates, international phone numbers, and active credit cards, which are inaccessible or inappropriate for academic evaluation.
2. **Developer & Evaluator Friction:** The existing local simulator adapter (Decision 0006) required crafting raw JSON payloads signed with HMAC-SHA256 via terminal PowerShell/cURL scripts. Evaluators and jury members cannot easily interact with a terminal command during a 15-minute live defense.
3. **Realistic Demonstration Experience:** Evaluators should be able to experience the workflow from their own smartphones as a real guest, observing the live conversation synchronize with the manager's workstation inbox in real time.

## Decision

1. **Zero-Dependency ISO/IEC 18004 QR Code Matrix Generator (`frontend/src/utils/qrCode.ts`):**
   - Implement a lightweight, pure TypeScript QR code matrix generator with Byte Mode encoding and Reed-Solomon Error Correction (ECC Level L/M).
   - Reject third-party npm packages (`qrcode.react`, `qr-code-styling`) in accordance with `AGENTS.md` Rule 6 to prevent bundle bloat, external licensing risk, and security vulnerabilities.
   - Render crisp, responsive SVG elements directly into the DOM.

2. **Workstation Presentation QR Modal (`frontend/src/components/SimulatorQrModal.tsx`):**
   - Provide a persistent "Démo WhatsApp" button in the sticky workstation header (`WorkstationHeader`).
   - Clicking the button opens a presentation modal containing the dynamic QR code, a 1-click clipboard copy button, and an editable URL field (allowing local LAN IP configuration when presenting over WiFi).

3. **Unauthenticated WhatsApp Web Guest Simulator Client (`frontend/src/pages/GuestWhatsAppSimulatorPage.tsx`):**
   - Mount an unauthenticated mobile route at `/simulator/whatsapp` outside protected session routes.
   - Deliver an authentic WhatsApp Web mobile layout with `#075E54` dark-green header, villa selection modal, configurable guest phone number modal (stored in `localStorage`), and speech bubbles with source badges (`🤖 IA Vayca` vs `👤 Équipe Vayca`).
   - Provide 1-tap quick-prompt chips (*WiFi*, *Piscine*, *Check-out*, *Panne Clim*) to streamline testing.
   - Poll conversation updates every 1.5 seconds to synchronize live staff takeover replies and maintenance status updates.

4. **Public Backend Simulator Chat Endpoints (`backend/app/modules/messaging/router.py`):**
   - Introduce dedicated simulator chat routes under `/api/v1/integrations/whatsapp/simulator/chat/*`:
     - `GET .../properties`: Lists active company villas for guest selection.
     - `GET .../messages`: Retrieves the conversation history for a given property and guest telephone.
     - `POST .../send`: Records inbound guest messages via the idempotent messaging service and enqueues Celery background chatbot processing (`process_chatbot_inbound_message`).
   - Guard all simulator chat endpoints with `check_simulator_mode()`, raising `HTTP 403 Forbidden` if `WHATSAPP_ADAPTER` is configured for production.

## Consequences

### Positive

- **Interactive Defense Experience:** Evaluators and jury members can scan the QR code from their personal smartphone camera and chat live with the grounded AI assistant in under 10 seconds.
- **Full Operational Parity:** Inbound simulator messages use the exact same backend service, database models, grounding pipeline, staff inbox, manual takeover, and maintenance suggestion workflows as live production webhooks.
- **Zero New Dependencies:** Implemented cleanly in pure TypeScript and native Web APIs without adding external npm libraries.
- **Production Isolation:** Public simulator routes are strictly disabled in production environments.

### Negative or Risky

- Public endpoints are unauthenticated to allow phone access without staff login, but risk abuse if exposed publicly in simulator mode. Guarding via `check_simulator_mode()` ensures they are disabled in production deployments.
- QR code generator is scoped to alphanumeric and byte URLs under 108 characters (Versions 1 to 4), which is ideal for localhost or short presentation URLs, but may require higher versions for deeply nested URLs.

## Validation

- **Backend Pytest (`test_whatsapp_simulator_chat.py`):** Verified property retrieval, message querying, inbound message dispatch, and Celery scheduling.
- **Frontend Vitest (`qrCode.test.ts`, `SimulatorQrModal.test.tsx`, `GuestWhatsAppSimulatorPage.test.tsx`):** Verified SVG rendering, clipboard copying, property switching, message submission, and quick-prompt interaction (11 dedicated tests passed).
- **CI & Build:** Clean oxlint (0 errors) and TypeScript build (`tsc -b && vite build`) passed.
