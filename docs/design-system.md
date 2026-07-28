# Vayca / VacayOps -- Design System Specification

Status: **APPROVED BASELINE** -- changes require team review and documentation updates.

> **Identity**: Sidi Bou Said Azure & Warm Sand — B2B Vacation Property Management Platform for Tunisia.  
> **Aesthetic**: Warm Mediterranean Luxury Hospitality (inspired by Airbnb Luxe & Sidi Bou Said coastal architecture) meets modern B2B operational clarity.  
> **Usability**: Universally simple and intuitive for all property managers — tech-savvy and traditional staff alike.

---

## Color Palette (Tailwind Tokens)

```css
@theme {
  --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

  /* Primary: Sidi Bou Said Azure */
  --color-azure-50: #F0F6FA;
  --color-azure-100: #DCEDF5;
  --color-azure-200: #B6DAEA;
  --color-azure-500: #1E517B;
  --color-azure-600: #0F3D5E; /* MAIN BRAND PRIMARY */
  --color-azure-700: #0C324E;
  --color-azure-900: #082033;

  /* Accent: Terracotta Clay */
  --color-terracotta-50: #FDF4F0;
  --color-terracotta-100: #FBE6DC;
  --color-terracotta-500: #D96B43; /* MAIN ACTION ACCENT */
  --color-terracotta-600: #C25730;

  /* Highlight: Warm Sun Amber */
  --color-amber-500: #E8A838; /* RATINGS & DIRECT BADGES */
  --color-amber-600: #CF9024;

  /* Warm Sand Neutrals */
  --color-sand-50: #FAF8F5;  /* APP DAYLIGHT BACKGROUND */
  --color-sand-100: #FFFFFF; /* SURFACE CARD WHITE */
  --color-sand-200: #EBE6DD; /* WARM SUBTLE BORDER */
  --color-sand-300: #DDD7CC;
  --color-sand-400: #B5AFA4;
  --color-sand-500: #78716C; /* MUTED TEXT */
  --color-sand-700: #3B3735; /* HEADINGS */
  --color-sand-900: #1C1B18; /* MAIN ESPRESSO DARK TEXT */
}
```

* **Primary**: Sidi Bou Said Azure (`#0F3D5E`)
* **Secondary / Action Accent**: Terracotta Clay (`#D96B43`)
* **Highlight / Rating**: Warm Sun Amber (`#E8A838`)
* **Neutral Scale**: Warm Sand Background (`#FAF8F5`), Surface White (`#FFFFFF`), Warm Border (`#EBE6DD`), Muted Text (`#78716C`), Main Text (`#1C1B18`)
* **Channel Badges**: Airbnb (`#FF5A5F`), Booking.com (`#003580`), Direct (`#0F3D5E`), VRBO (`#196B24`)
* **Status**: Success (`#16A34A`), Warning (`#D97706`), Error / Conflict (`#DC2626`)

---

## Typography

* **Font family**: `'Plus Jakarta Sans'`, sans-serif (Google Font)
* **Scale**:
  * **H1**: `24px` / `700 Bold` (`text-2xl font-bold tracking-tight text-[#1C1B18]`)
  * **H2**: `20px` / `700 Bold` (`text-xl font-bold tracking-tight text-[#1C1B18]`)
  * **H3**: `16px` / `700 Bold` (`text-base font-bold text-[#1C1B18]`)
  * **Body**: `14px` - `15px` / `400 Regular` (`text-sm text-[#1C1B18] leading-relaxed`)
  * **Caption / Badge**: `11px` / `700 Bold` (`text-[11px] font-bold uppercase tracking-wider`)

---

## Spacing, Radius, Shadow Conventions

* **Border Style**: Crisp warm borders (`border border-[#EBE6DD]`) for clear card boundaries.
* **Micro Elevation**: `shadow-[0_2px_8px_rgba(28,27,24,0.02)]` for cards; `shadow-[0_8px_30px_rgba(28,27,24,0.06)]` for modals/drawers.
* **Border Radii**:
  * Outer Containers: `rounded-2xl` (`16px`)
  * Cards & Modals: `rounded-xl` (`12px`)
  * Buttons & Inputs: `rounded-xl` or `rounded-lg` (`8px` - `12px`)

---

## Component Library

* **TailwindCSS v4**: For custom layouts (calendar multi-property grid, kanban board, chat thread, dashboard cards).
* **Lucide React**: For explicit visual icons paired with text labels.

---

## Page Structure (9 Pages Implemented in `frontend/src/pages/`)

| Page | Purpose | Key elements |
|---|---|---|
| **Login** | Authenticate | Email/password form; prototype may expose a clearly labelled manager/staff demo selector; no agency code |
| **Dashboard** | Portfolio command center | Occupancy %, Revenue TND, active guests, open maintenance, conflict alert banner |
| **Calendar** | All bookings, all channels | 14-day multi-property grid, overlap alerts, channel badges, reservation drawer |
| **Property Detail** | Manage one property | Specs, upcoming bookings, WiFi and property-information editor |
| **Properties** | Add/manage properties | Directory grid, city filters (Hammamet, Sidi Bou Said, Tunis, Djerba, Sousse), Add Property modal |
| **Messages** | Guest conversations | Unified inbox, status filters (Automatic Reply, Staff Attention, Unread) |
| **Conversation Thread** | Full history, one guest | Guest chat history, chatbot source, Reply Manually control |
| **Maintenance** | Maintenance work | Open / Assigned / In Progress / Resolved views, priority badges, new ticket modal |
| **Settings** | Team & account | Staff roles, company profile, booking-channel connection health |

* **Sidebar navigation**: Dashboard, Calendar, Messages, Maintenance, Properties, and Settings only. Property Detail and Conversation Thread are drill-down routes and must not appear as permanent sidebar items.

## Responsive Behavior

* At desktop widths, use the persistent left sidebar in the approved navigation order.
* Below the `md` breakpoint, replace the sidebar with a fixed bottom navigation containing the same six destinations.
* Page padding reduces from `32px` to `16px` on small screens.
* Wide operational content, such as the portfolio calendar, must scroll inside its own labelled container rather than forcing the entire page wider than the viewport.
* Primary actions and status text must remain readable without hover interactions.

## Prototype Truthfulness

* Prototype screens must display a visible mock or simulator notice.
* Do not describe mock data as real-time, live, connected, trained, or automatically sent.
* Integration cards must distinguish unconfigured, simulator, test, healthy, stale, and failed states.
