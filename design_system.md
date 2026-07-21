# Vayca Design System Specifications & Guidelines

> **Project**: Vayca TN — B2B Vacation-Property Operations Platform (Tunisia)  
> **Brand Identity**: Warm Mediterranean Luxury Hospitality meets Modern B2B Operational Clarity  
> **Inspired By**: Airbnb Luxe, Sidi Bou Said Architectural Elegance, Stripe/Linear Precision  
> **Core Principle**: Sleek, premium, and refined for modern teams — yet universally intuitive and clutter-free for traditional property managers.  

---

## 1. Design Vision & Universal Clarity Directives

Vayca strikes the perfect balance between **considered, premium visual design** and **universal operational simplicity**:

1. **Refined Mediterranean Identity**: Sidi Bou Said Azure (`#0F3D5E`) anchored with Terracotta Clay (`#D96B43`) and Warm Sand (`#FAF8F5`). Warm, inviting, and professional — never cold or generic corporate gray.
2. **Intuitive & Uncluttered Layouts**: Complex operations (multi-channel iCal sync, double-booking conflicts, AI chat takeover) are simplified into clear, logical workflows with minimal cognitive friction.
3. **High Legibility & Strong Hierarchy**: High-contrast dark espresso text (`#1C1B18`) on warm daylight surfaces (`#FAF8F5`/`#FFFFFF`) with `Plus Jakarta Sans` typography.
4. **Multi-Signal Status Cues**: Statuses use explicit color tags, icons, and clear text labels (e.g. *AI Concierge Replied*, *Staff Attention Needed*, *Conflict Alert*) so state is obvious to everyone at a glance.
5. **No Templated SaaS Bloat**: Avoid generic purple-to-blue gradients, unnecessary drop-shadows on every card, or confusing multi-nested menus.

---

## 2. Color Palette (Tailwind CSS Tokens)

```css
@theme {
  /* Brand Typography */
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

### Color Usage Matrix
| Role | Hex | Tailwind Utility Class | Usage |
| :--- | :--- | :--- | :--- |
| **App Background** | `#FAF8F5` | `bg-[#FAF8F5]` | Warm natural daylight page background |
| **Card Surface** | `#FFFFFF` | `bg-white` | Surfaces, modals, panels, dropdowns |
| **Primary Brand** | `#0F3D5E` | `bg-[#0F3D5E]` / `text-[#0F3D5E]` | Sidebar active state, primary buttons, headers |
| **Action Accent** | `#D96B43` | `bg-[#D96B43]` / `text-[#D96B43]` | Highlights, callouts, warning badges, secondary actions |
| **Gold Highlight** | `#E8A838` | `text-[#E8A838]` | Ratings, brand star accents, AI mode indicators |
| **Subtle Border** | `#EBE6DD` | `border-[#EBE6DD]` | Crisp warm card borders & dividers |
| **Main Text** | `#1C1B18` | `text-[#1C1B18]` | High-contrast body text & titles |
| **Muted Text** | `#78716C` | `text-[#78716C]` | Captions, dates, meta info |

### Channel Brand Colors
* **Airbnb**: `#FF5A5F`
* **Booking.com**: `#003580`
* **Direct Booking**: `#0F3D5E` (with `#E8A838` text)
* **VRBO**: `#196B24`

---

## 3. Typography Scale & Hierarchy

* **Font Family**: `Plus Jakarta Sans` (Google Font: weights `400`, `500`, `600`, `700`, `800`)

| Type Scale Level | Font Size / Weight | Tailwind Classes | Sample Usage |
| :--- | :--- | :--- | :--- |
| **Display Title (H1)** | `24px` / `700 Bold` | `text-2xl font-bold tracking-tight text-[#1C1B18]` | Main Page Titles |
| **Section Title (H2)** | `20px` / `700 Bold` | `text-xl font-bold tracking-tight text-[#1C1B18]` | Section Headers, Modals |
| **Card Title (H3)** | `16px` / `700 Bold` | `text-base font-bold text-[#1C1B18]` | Card Headers |
| **Subheading (H4)** | `14px` / `600 SemiBold` | `text-sm font-semibold text-[#3B3735]` | Form Labels, Table Headers |
| **Body Regular** | `14px` / `400 Regular` | `text-sm text-[#1C1B18] leading-relaxed` | Main paragraphs, messages |
| **Body Small** | `12px` / `500 Medium` | `text-xs font-medium text-[#78716C]` | Meta descriptions, table data |
| **Caption / Badge** | `11px` / `700 Bold` | `text-[11px] font-bold uppercase tracking-wider` | Channel tags, status pills |

---

## 4. Elevation, Geometry & Spacing

* **Card Definition**: Crisp warm borders (`border border-[#EBE6DD]`) for visual structure.
* **Micro Elevation**: `shadow-[0_2px_8px_rgba(28,27,24,0.02)]` for default cards; `shadow-[0_8px_30px_rgba(28,27,24,0.06)]` for overlays.
* **Border Radii**:
  * Main Containers / Panels: `rounded-2xl` (`16px`)
  * Cards / Modals: `rounded-xl` (`12px`)
  * Buttons / Inputs / Badges: `rounded-xl` or `rounded-lg` (`8px` - `12px`)

---

## 5. UI Layout Principles

* **Persistent Navigation**: Fixed left sidebar (`w-64`) with active state highlights, notification badge pills, and clean profile status.
* **Multi-Calendar Grid**: 14-day date grid with sticky property headers, conflict highlights, and interactive booking drawers.
* **Kanban Operations**: 4 columns (*Open*, *Assigned*, *In Progress*, *Resolved*) with priority badges and quick state controls.
* **Guest Chat Thread**: Full message history with clear distinction between guest queries, AI automated answers, and staff manual takeovers.

---
*Created for Vayca TN — B2B Vacation Property Management Platform*
