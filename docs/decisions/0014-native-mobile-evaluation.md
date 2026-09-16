# Decision 0014: Evaluation of Native Mobile Application vs. PWA Architecture

**Status:** Accepted  
**Date:** 2026-09-16  
**Related issue:** #25  

## Context

Vayca is a B2B operations platform tailored for independent property owners and boutique hospitality agencies in Tunisia. Operational actors (Managers and Staff) frequently access the platform on mobile devices while conducting on-site property inspections, coordinating maintenance contractors, checking arriving guests, and triaging communications.

Issue #25 outlines four explicit entry criteria before introducing a separate native mobile application:
1. *Mobile web usability tests identify needs that cannot be solved responsively.*
2. *Target platform and device capabilities are defined.*
3. *API stability is sufficient for a second client.*
4. *Team capacity and long-term ownership are approved.*

Furthermore, `AGENTS.md` Section 6 and `docs/academic/04_scope_and_assumptions.md` mandate that adding a major technology or secondary client must be justified against maintenance burden, security boundaries, deployment complexity, and team ownership.

## Technology Options Evaluated

### Option 1: Dual-Client Native Cross-Platform (Flutter / React Native)
- **Architecture:** Maintain a separate mobile repository or workspace (`/mobile`) with dedicated Dart or TypeScript/JSX code, native build pipelines (Gradle, Xcode), and mobile release workflows.
- **Advantages:** Direct access to native iOS/Android SDKs, native background services, Apple Push Notification service (APNs), and Google Play / App Store listing.
- **Drawbacks:**
  - Doubles frontend maintenance surface area: every new operational feature (calendar pricing, ticket workflows, owner statements) must be implemented, tested, and synchronized across two codebases.
  - Mandatory App Store and Play Store review delays (24–72 hours per release), impeding rapid deployment of critical bug fixes.
  - Annual Apple Developer Enterprise/Organization fees ($99/year) and Google Play Console registrations.
  - Substantial CI/CD complexity: requires macOS runners for iOS builds, code signing certificates, provisioning profiles, and mobile emulator testing suites.

### Option 2: Native Hybrid Wrapper (Capacitor / Ionic)
- **Architecture:** Package the existing React + Vite web build inside a native WebView wrapper with native plugins for hardware features.
- **Advantages:** Reuses existing React code; provides an installable `.apk` and `.ipa`.
- **Drawbacks:**
  - Still incurs store submission overhead, native build toolchains (Android Studio, Xcode), and mobile OS release deprecations.
  - High risk of WebView rendering quirks, memory constraints, and performance degradation without offering meaningful native UI advantages.

### Option 3: Progressive Web App (PWA) & Mobile-First Responsive Web (Selected)
- **Architecture:** Enhance the existing React + Vite application with a standard Web App Manifest (`manifest.webmanifest`), standalone viewport configuration, safe-area mobile layout adjustments, and standard HTML5 device API integrations (Camera/Media capture).
- **Advantages:**
  - **Zero Code Duplication:** Single unified codebase, single deployment pipeline, zero drift between desktop and mobile capabilities.
  - **Instant Deployment:** Bug fixes, security patches, and features deploy instantaneously without store review delays.
  - **Native-Like Standalone Experience:** On both iOS (Safari) and Android (Chrome), users can install Vayca directly to their Home Screen with an app icon, splash screen, and full-screen display without browser address bars.
  - **Full Device Capability Coverage for MVP & Phase 2:**
    - *Camera Capture:* Standard HTML5 `<input type="file" accept="image/*" capture="environment">` triggers native camera capture on both iOS and Android for maintenance damage photos and receipts.
    - *Responsive Mobile Ergonomics:* Tailwind CSS mobile drawer sheets, sticky workstations, touch-action manipulation, and safe-area insets already provide smooth mobile interaction.
    - *Security:* Inherits Vayca's secure cookie-based session and CSRF architecture without requiring token re-engineering.

## Evaluation Against Entry Criteria

| Criterion | Evaluation & Findings |
|---|---|
| **1. Usability Needs Unsolvable Responsively** | **Not Found.** Mobile usability testing of current responsive views (Dashboard, Calendar, Maintenance, Inbox, Properties) demonstrated that all operational workflows (marking tickets, replying to guests, checking arrivals, sharing owner links) perform efficiently on mobile screens with bottom sheets and responsive tables. |
| **2. Device Capabilities Defined** | **Sufficient via Web APIs.** The primary hardware need is camera capture for maintenance receipts and damage photos, which is fully supported by standard mobile browser file inputs. Bluetooth lock hardware or background geofencing are not part of Vayca's approved roadmap. |
| **3. API Stability for Second Client** | **Premature.** The backend REST API is actively evolving across Phase 2 modules (pricing quotes, review sequences, owner portals). Supporting a second native client would introduce versioning complexity and backwards-compatibility overhead prematurely. |
| **4. Team Capacity & Ownership** | **Unfavorable.** Maintaining dual store releases and platform-specific builds exceeds current team capacity and adds disproportionate maintenance friction for a B2B operations tool. |

## Decision

1. **Defer Native Mobile Application:**
   - A dedicated native or wrapped mobile application (Flutter, React Native, or Capacitor) is formally deferred for Phase 2.
2. **Adopt PWA & Mobile-First Responsive Web as Primary Mobile Strategy:**
   - Equip the Vayca frontend with a Web App Manifest (`manifest.webmanifest`), standalone mobile display mode, theme colors (`#0F3D5E`), and mobile viewport safe-area insets.
   - Provide an in-app mobile installation guide (`MobilePwaPrompt`) enabling staff and managers to install Vayca to their device home screens in one step.
   - Standardize on HTML5 device APIs for on-site camera capture.

## Re-evaluation Triggers

This decision may be revisited in Phase 3 or later if any of the following conditions emerge:
- Hard requirement for background Bluetooth / NFC hardware integration (e.g. direct smart lock provisioning).
- Requirement for persistent background geolocation tracking for field maintenance staff.
- Critical demand from enterprise agency clients for distribution via Apple Business Manager or private MDM app catalogs.
