# Vayca Design System Specifications & Guidelines

> **Project**: Vayca TN — B2B Vacation-Property Operations Platform (Tunisia)  
> **Brand Identity**: Warm Mediterranean Luxury Hospitality meets Senior-Friendly Operational Simplicity  
> **Target Audience**: Older, traditional property owners & staff in Tunisia — requires zero cognitive friction, high legibility, large touch targets, and crystal-clear plain language.  

---

## 1. Accessibility & Senior-Friendly Core Directives

To accommodate older property managers and non-tech-savvy staff, all UI components and layouts must follow these strict accessibility rules:

1. **Large, High-Legibility Type**: Body text minimum `15px` - `16px` (never smaller than `13px` even for meta labels). High font contrast (`#1C1B18` text on `#FAF8F5`/`#FFFFFF`).
2. **Generous Touch & Click Targets**: Buttons and interactive controls must be at least `44px` in height with comfortable padding (`px-4 py-3`).
3. **Explicit Action Labels**: Never rely on standalone ambiguous icons. Always include text labels alongside icons (e.g., `"Click to Copy Password"` instead of just a raw copy icon).
4. **Plain Language & Helper Subtitles**: Every page and form section must have a simple 1-sentence explanation of what it does.
5. **Icon + Text + Color Indicators**: Status indicators must use all three signals (an icon, a high-contrast text badge, and a distinct background color) so older users immediately recognize state without guessing.

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
  --color-sand-500: #655E59; /* MUTED TEXT (HIGH CONTRAST) */
  --color-sand-700: #292524; /* HEADINGS */
  --color-sand-900: #111827; /* MAIN HIGH CONTRAST DARK TEXT */
}
```

### Senior-Friendly Color Usage Matrix
| Role | Hex | Tailwind Utility Class | Usage |
| :--- | :--- | :--- | :--- |
| **App Background** | `#FAF8F5` | `bg-[#FAF8F5]` | Warm natural daylight page background |
| **Card Surface** | `#FFFFFF` | `bg-white` | Surfaces, modals, panels, dropdowns |
| **Primary Brand** | `#0F3D5E` | `bg-[#0F3D5E]` / `text-[#0F3D5E]` | Sidebar active state, primary buttons, headers |
| **Action Accent** | `#D96B43` | `bg-[#D96B43]` / `text-[#D96B43]` | Highlights, callouts, warning badges, secondary actions |
| **Gold Highlight** | `#E8A838` | `text-[#E8A838]` | Ratings, brand star accents, AI mode indicators |
| **Subtle Border** | `#EBE6DD` | `border-[#EBE6DD]` | Crisp warm card borders & dividers |
| **Main Text** | `#111827` | `text-[#111827]` | Maximum-contrast body text & titles |
| **Muted Text** | `#655E59` | `text-[#655E59]` | High-legibility captions & metadata |

---

## 3. Senior-Friendly Typography Scale

* **Font Family**: `Plus Jakarta Sans` (Google Font: weights `400`, `500`, `600`, `700`, `800`)

| Type Scale Level | Font Size / Weight | Tailwind Classes | Sample Usage |
| :--- | :--- | :--- | :--- |
| **Display Title (H1)** | `26px` / `800 ExtraBold` | `text-2xl font-extrabold tracking-tight text-[#111827]` | Main Page Titles |
| **Section Title (H2)** | `22px` / `700 Bold` | `text-xl font-bold tracking-tight text-[#111827]` | Section Headers, Modals |
| **Card Title (H3)** | `18px` / `700 Bold` | `text-lg font-bold text-[#111827]` | Card Headers |
| **Subheading (H4)** | `15px` / `600 SemiBold` | `text-sm font-semibold text-[#292524]` | Form Labels, Table Headers |
| **Body Regular** | `15px - 16px` / `400 Regular` | `text-base text-[#111827] leading-relaxed` | Main paragraphs, messages |
| **Body Small** | `13px - 14px` / `500 Medium` | `text-xs md:text-sm font-medium text-[#655E59]` | Meta descriptions, table data |
| **Caption / Badge** | `12px` / `700 Bold` | `text-xs font-bold uppercase tracking-wider` | Channel tags, status pills |

---

## 4. Elevation, Borders & Geometry

* **Card Borders**: `border-2 border-[#EBE6DD]` for clear card boundary separation.
* **Large Buttons**: Minimum height `44px` with `py-3 px-5 rounded-xl font-bold text-sm`.
* **Border Radii**:
  * Containers & Modals: `rounded-2xl` (`16px`)
  * Inner Cards & Form Elements: `rounded-xl` (`12px`)
  * Buttons & Badges: `rounded-xl` (`12px`)

---

## 5. Layout Simplicity Guidelines

* **Sidebar Navigation**: `w-64` or `w-72` with large icons (`w-5 h-5`), text size `14px`, and distinct active background color (`bg-[#0F3D5E]` with white text).
* **Calendar Grid**: Large date numbers, explicit guest names, and simple color-coded booking blocks with full words (*Airbnb*, *Booking.com*, *Direct*).
* **Kanban Board**: Large column headers with count pills and big movement buttons (*"Move Forward &rarr;"*, *"Move Back &larr;"*).
* **Chat Thread**: Uncluttered chat bubbles with plain label banners (*"Vayca AI Answered Guest"*, *"Staff Control Active"*).

---

## 6. Key Accessible UI Component Patterns

### Large Interactive Takeover Button
```tsx
<button className="px-5 py-3 rounded-xl font-bold text-sm bg-[#D96B43] text-white shadow-md flex items-center gap-2">
  <UserCheck className="w-5 h-5 text-white" />
  <span>Click to Switch to Staff Manual Control</span>
</button>
```

### High-Visibility WiFi & Password Card
```tsx
<div className="p-5 rounded-xl bg-[#FAF8F5] border-2 border-[#EBE6DD] space-y-3">
  <div className="text-sm font-bold text-[#0F3D5E] flex items-center gap-2">
    <Wifi className="w-5 h-5" /> Guest WiFi Network Name
  </div>
  <div className="font-mono text-base font-bold text-[#111827] bg-white p-2.5 rounded-lg border border-[#EBE6DD]">
    VillaYasmine_5G_Guests
  </div>
  <button className="w-full py-2.5 px-4 rounded-xl bg-[#0F3D5E] text-white font-bold text-xs flex items-center justify-center gap-2">
    <Copy className="w-4 h-4 text-[#E8A838]" /> Click Here to Copy Password
  </button>
</div>
```

---
*Created for Vayca TN — Senior-Friendly B2B Vacation Property Management Platform*
