# Vayca Design System Specifications & Guidelines

> **Project**: Vayca TN — B2B Vacation-Property Operations Platform (Tunisia)  
> **Brand Identity**: Warm Mediterranean Luxury Hospitality meets High-Efficiency B2B Operational Precision  
> **Inspired By**: Airbnb Luxe, Boutique Mediterranean Resorts, Sidi Bou Said Architectural Aesthetics  

---

## 1. Visual Identity & Mood

Vayca is designed specifically for property managers and staff running daily vacation property operations across Tunisia (Hammamet, Sidi Bou Said, Tunis, Djerba, Sousse).

* **Personality**: Calm, trustworthy, and inviting with coastal warmth, coupled with high-end operational clarity.
* **Theme Strategy**: **Light Mode Default** — bright, crisp, natural daylight feel with warm contrast.
* **Anti-Patterns (DO NOT USE)**:
  * ❌ Generic blue-to-purple gradient SaaS look
  * ❌ Default Inter font without personality
  * ❌ Heavy, blurry drop-shadows on every card
  * ❌ Dark mode default or cold sterile corporate gray

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
  --color-sand-700: #3B3735; /* SUBTLE HEADINGS */
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

## 3. Typography Hierarchy

* **Font Family**: `Plus Jakarta Sans` (Google Font: weights `400`, `500`, `600`, `700`, `800`)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

| Type Scale Level | Font Size / Weight | Tailwind Classes | Sample Usage |
| :--- | :--- | :--- | :--- |
| **Display Title (H1)** | `24px` / `700 Bold` | `text-2xl font-bold tracking-tight text-[#1C1B18]` | Main Page Titles |
| **Section Title (H2)** | `20px` / `700 Bold` | `text-xl font-bold tracking-tight text-[#1C1B18]` | Section Headers, Modals |
| **Card Title (H3)** | `16px` / `700 Bold` | `text-base font-bold text-[#1C1B18]` | Card Headers |
| **Subheading (H4)** | `14px` / `600 SemiBold` | `text-sm font-semibold text-[#3B3735]` | Form Labels, Table Headers |
| **Body Regular** | `14px` / `400 Regular` | `text-sm text-[#1C1B18] leading-relaxed` | Main paragraphs, messages |
| **Body Small** | `12px` / `500 Medium` | `text-xs font-medium text-[#78716C]` | Meta descriptions, table data |
| **Caption / Badge** | `10px - 11px` / `700 Bold` | `text-[10px] font-bold uppercase tracking-wider` | Channel tags, status pills |

---

## 4. Elevation, Borders & Geometry

* **Border Style**: Always pair cards with `border border-[#EBE6DD]` for crisp warm definition instead of heavy drop-shadows.
* **Micro Elevation**: `shadow-[0_2px_8px_rgba(28,27,24,0.02)]` for default cards; `shadow-[0_8px_30px_rgba(28,27,24,0.06)]` for elevated modals.
* **Border Radii**:
  * Outer containers / Page panels: `rounded-2xl` (`16px`)
  * Inner Cards / Modals / Columns: `rounded-xl` (`12px`)
  * Buttons / Inputs / Dropdowns: `rounded-xl` or `rounded-lg` (`8px` - `12px`)
  * Badges / Avatars: `rounded-full`

---

## 5. Visual Density Rules

* **Comfortable & Balanced Density**: Maintain consistent spacing across all screens. Avoid cramming table data or sprawling empty spaces.
* **Calendar Grid**: Sticky left column for property names (`w-60`), 14-day date column header with active date highlighted in `#0F3D5E`, and interactive booking blocks with channel color coding.
* **Kanban Board**: 4 columns (*Open*, *Assigned*, *In Progress*, *Resolved*) with distinct status dot accents (`#D96B43`, `amber-500`, `blue-500`, `emerald-500`).
* **Chat Threads**: Clear distinction between **Guest** messages (white surface), **AI Assistant** responses (`#0F3D5E` deep azure with confidence score tag), and **Staff Manual** responses (`#D96B43` terracotta).

---

## 6. Key UI Component Patterns

### AI Concierge vs Human Staff Takeover Badge
```tsx
// AI Active State
<div className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
  <Bot className="w-4 h-4 text-emerald-600" />
  <span>Vayca AI Concierge Replied</span>
</div>

// Staff Takeover Button
<button className="px-4 py-2.5 rounded-xl font-bold text-xs bg-[#D96B43] text-white">
  <UserCheck className="w-4 h-4" /> Staff Took Over (Manual)
</button>
```

### Knowledge Card (WiFi & House Rules)
```tsx
<div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EBE6DD]">
  <div className="text-xs text-[#78716C] font-semibold flex items-center gap-1.5 text-[#0F3D5E]">
    <Wifi className="w-4 h-4" /> Guest WiFi Network
  </div>
  <div className="font-mono text-xs font-bold text-[#1C1B18]">VillaYasmine_5G_Guests</div>
  <div className="text-[11px] text-[#78716C]">Key: <span className="font-mono font-semibold">HammametBeach2026!</span></div>
</div>
```

---

## 7. Responsive Navigation & Structure

All pages must render inside a fixed 2-column shell:
* **Fixed Left Sidebar**: `w-64 bg-white border-r border-[#EBE6DD] h-screen sticky top-0`
* **Main Content Area**: `flex-1 bg-[#FAF8F5] overflow-y-auto p-8`

---
*Created for Vayca TN — B2B Vacation Property Management Platform*
