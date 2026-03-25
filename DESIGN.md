# Design System — Lovnge Platform

**Version:** 1.0.0
**Created:** March 25, 2026
**Direction:** Luxury/Refined (Modern Luxury)
**Status:** Active

---

## Product Context

- **What this is:** Premium escort agency management platform
- **Who it's for:** Agency owners, managers, and high-net-worth clients
- **Space/industry:** Luxury hospitality, premium companionship
- **Project type:** Web app (CMS + public profiles + booking system)

---

## Aesthetic Direction

- **Direction:** Luxury/Refined — Modern luxury with restrained elegance
- **Decoration level:** Intentional (subtle grain texture, minimal ornamentation)
- **Mood:** Sophisticated, exclusive, intimate without being explicit. Wealth whispers.
- **Reference sites:** High-end hotel lobbies, private members clubs, luxury watch brands

### Design Principles

1. **Restraint over excess** — Gold is rare and meaningful, used only for what matters
2. **Warmth over coldness** — Grain texture, warm gold tones, not sterile flat design
3. **Structure over chaos** — Grid-disciplined layouts, predictable alignment
4. **Clarity over cleverness** — Typography first, decoration second

---

## Typography

### Font Stack (Google Fonts — Free, Fast)

| Role | Font | Weights | Usage |
|------|------|---------|-------|
| **Display/Hero** | Satoshi | 700, 900 | Page titles, hero headings, model names |
| **Body** | DM Sans | 400, 500, 700 | Body copy, descriptions, labels |
| **Data/Tables** | DM Sans (tabular-nums) | 400, 500 | Prices, stats, dates |
| **Code** | JetBrains Mono | 400, 700 | API docs, debug panels (rare) |

### Why These Fonts

- **Satoshi:** Geometric precision with warmth — luxury without stuffiness. Less generic than Inter, more contemporary than Playfair.
- **DM Sans:** Highly readable, elegant x-height, works beautifully at small sizes. Tabular figures for aligned numbers.

### Loading

Add to `apps/web/app/layout.tsx`:

```tsx
<link
  rel="preconnect"
  href="https://fonts.googleapis.com"
/>
<link
  rel="preconnect"
  href="https://fonts.gstatic.com"
  crossOrigin="anonymous"
/>
<link
  href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;500;700&family=Satoshi:wght@500;700;900&display=swap"
  rel="stylesheet"
/>
```

### Type Scale (Modular — 1.25 ratio)

| Name | Size | Line Height | Usage |
|------|------|-------------|-------|
| xs | 12px (0.75rem) | 16px | Overlabels, badges, timestamps |
| sm | 14px (0.875rem) | 20px | Captions, helper text, metadata |
| base | 16px (1rem) | 24px | Body copy, form inputs |
| lg | 20px (1.25rem) | 28px | Lead paragraphs, large body |
| xl | 24px (1.5rem) | 32px | H3, section titles |
| 2xl | 30px (1.875rem) | 36px | H2, card titles |
| 3xl | 38px (2.375rem) | 44px | H1, page titles |
| 4xl | 48px (3rem) | 56px | Hero headings, display |

### CSS Variables

```css
:root {
  --font-display: 'Satoshi', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-body: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-code: 'JetBrains Mono', monospace;
}
```

---

## Color

### Approach: Restrained

Single gold accent used sparingly. Color is rare and meaningful — only for:
- Primary CTAs
- Active states
- Status indicators (success, warning, error)
- VIP/Elite badges

### Backgrounds

| Name | Hex | Usage |
|------|-----|-------|
| Primary | `#0A0A0A` | Page background |
| Surface | `#1A1A1A` | Cards, panels, inputs |
| Elevated | `#242424` | Hover states, modals, dropdowns |

### Text

| Name | Hex | Usage |
|------|-----|-------|
| Primary | `#FFFFFF` | Headings, primary CTAs |
| Secondary | `#A0A0A0` | Body copy, labels, icons |
| Muted | `#666666` | Placeholders, disabled states, metadata |

### Gold Accent (Restrained)

| Name | Hex | Usage |
|------|-----|-------|
| Primary | `#D4AF37` | Primary CTAs, active states, VIP badges |
| Light | `#F4D03F` | Hover states, highlights |
| Dark | `#B8941F` | Active/pressed states, borders |

### Semantic Colors

| Name | Hex | Usage |
|------|-----|-------|
| Success | `#22C55E` | Available status, confirmed bookings |
| Warning | `#EAB308` | Pending status, limited availability |
| Error | `#EF4444` | Errors, unavailable, declined |
| Info | `#3B82F6` | Informational messages (rare) |

### CSS Variables

```css
:root {
  /* Backgrounds */
  --bg-primary: #0a0a0a;
  --bg-surface: #1a1a1a;
  --bg-elevated: #242424;
  
  /* Text */
  --text-primary: #ffffff;
  --text-secondary: #a0a0a0;
  --text-muted: #666666;
  
  /* Gold */
  --gold-primary: #d4af37;
  --gold-light: #f4d03f;
  --gold-dark: #b8941f;
  
  /* Semantic */
  --success: #22c55e;
  --warning: #eab308;
  --error: #ef4444;
  --info: #3b82f6;
}
```

### Dark Mode Strategy

Already dark-theme only. No light mode planned — platform is premium/nightlife focused.

---

## Spacing

### Base Unit: 8px

All spacing aligns to a 4px grid (half-unit for fine adjustments).

| Name | Size | Usage |
|------|------|-------|
| 2xs | 2px (0.125rem) | Icon-label gaps |
| xs | 4px (0.25rem) | Tight internal spacing |
| sm | 8px (0.5rem) | Form field gaps, badge padding |
| md | 16px (1rem) | Card internal padding |
| lg | 24px (1.5rem) | Card gaps, section padding |
| xl | 32px (2rem) | Section gaps |
| 2xl | 48px (3rem) | Page sections |
| 3xl | 64px (4rem) | Major page divisions |

### Density: Comfortable

- Cards: `p-6` (24px)
- Sections: `py-12` (48px)
- Pages: `py-16` (64px)

### CSS Variables

```css
:root {
  --space-2xs: 2px;
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  --space-3xl: 64px;
}
```

---

## Layout

### Grid System

- **Columns:** 12 columns (desktop), 4 columns (tablet), 1 column (mobile)
- **Gutters:** 24px
- **Max content width:** 1200px
- **Container padding:** 24px (mobile), 48px (desktop)

### Border Radius (Hierarchical)

| Name | Size | Usage |
|------|------|-------|
| sm | 4px | Small badges, icons, tags |
| md | 8px | Cards, buttons, inputs |
| lg | 12px | Large cards, modals |
| xl | 16px | Hero sections, feature cards |
| full | 9999px | Pills, avatars, circular badges |

### CSS Variables

```css
:root {
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
}
```

### Shadows (Subtle)

```css
.card {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.card-hover:hover {
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4);
}

.gold-glow {
  box-shadow: 0 8px 24px rgba(212, 175, 55, 0.3);
}
```

---

## Motion

### Approach: Intentional

Only animate when it aids comprehension. No gratuitous motion.

### Easing

| Name | Value | Usage |
|------|-------|-------|
| Enter | `cubic-bezier(0.25, 0.1, 0.25, 1)` | Smooth ease-out for entrances |
| Exit | `cubic-bezier(0.25, 0.1, 0.25, 1)` | Smooth ease-in for exits |
| Move | `cubic-bezier(0.4, 0, 0.2, 1)` | Smooth ease-in-out for transitions |

### Duration

| Name | Range | Usage |
|------|-------|-------|
| Micro | 50-100ms | Hover states, toggles, switches |
| Short | 150-250ms | Button presses, small transitions |
| Medium | 250-400ms | Card hovers, panel slides |
| Long | 400-700ms | Page transitions, modals, fade slider |

### CSS Variables

```css
:root {
  --ease-enter: cubic-bezier(0.25, 0.1, 0.25, 1);
  --ease-exit: cubic-bezier(0.25, 0.1, 0.25, 1);
  --ease-move: cubic-bezier(0.4, 0, 0.2, 1);
  
  --duration-micro: 100ms;
  --duration-short: 200ms;
  --duration-medium: 300ms;
  --duration-long: 500ms;
}
```

### Principles

1. **Respect `prefers-reduced-motion`** — Disable non-essential animation
2. **Purpose over decoration** — Animate to aid understanding, not to impress
3. **Performance first** — Use `transform` and `opacity` only (GPU-accelerated)

---

## Components

### Buttons

```tsx
// Primary CTA
<button className="btn btn-primary">Book Now</button>

// Secondary action
<button className="btn btn-secondary">View Profile</button>

// Tertiary/Ghost
<button className="btn btn-ghost">Cancel</button>
```

**Specs:**
- Padding: `md xl` (16px 32px)
- Radius: `md` (8px)
- Font: Satoshi Bold (700)
- Transition: 200ms ease

### Cards

```tsx
<div className="card">
  <div className="card-image">👤</div>
  <div className="card-content">
    <h3 className="card-title">Alexandra, 24</h3>
    <p className="card-description">Elegant companion...</p>
    <div className="badges">
      <span className="badge badge-gold">VIP</span>
      <span className="badge badge-success">Available</span>
    </div>
  </div>
</div>
```

**Specs:**
- Background: `--bg-surface`
- Border: 1px solid `rgba(212, 175, 55, 0.1)`
- Radius: `lg` (12px)
- Hover: translateY(-4px) + border glow

### Badges

```tsx
<span className="badge badge-gold">VIP</span>
<span className="badge badge-success">Available</span>
<span className="badge badge-warning">Pending</span>
<span className="badge badge-error">Unavailable</span>
```

**Specs:**
- Font: Satoshi Bold (700), 12px
- Padding: 6px 12px
- Radius: `full` (9999px)
- Text transform: uppercase
- Letter spacing: 0.05em

### Form Inputs

```tsx
<div className="form-group">
  <label className="form-label">Email</label>
  <input type="email" className="form-input" placeholder="you@example.com" />
</div>
```

**Specs:**
- Background: `--bg-elevated`
- Border: 1px solid `--bg-surface`
- Focus: Border color `--gold-primary`
- Radius: `md` (8px)
- Padding: `md` (16px)

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-25 | Satoshi + DM Sans font stack | Modern luxury feel, Google Fonts (free, fast), better than generic system fonts |
| 2026-03-25 | Restrained gold (single accent) | Scarcity makes gold meaningful — only for what matters. Prevents tacky/flashy feel. |
| 2026-03-25 | Subtle grain texture | Adds tactile warmth without visual noise. Film-like, not digital-flat. |
| 2026-03-25 | Grid-disciplined layout | Predictable, professional. Luxury expects structure. |
| 2026-03-25 | Dark theme only | Platform is nightlife/premium focused. Light mode unnecessary. |

---

## Files to Update

Once this design system is implemented:

1. **`apps/web/app/globals.css`** — Add CSS variables, font imports
2. **`apps/web/app/layout.tsx`** — Add Google Fonts links
3. **`apps/web/components/ui/`** — Create component library (Button, Card, Badge, Input)
4. **`CLAUDE.md`** — Reference this file for all design decisions

---

## Preview

Open in browser: `C:\tmp\design-preview.html`

---

**Generated by:** gstack `/design-consultation`
**Date:** March 25, 2026
**Next Steps:** Implement in code, create component library
