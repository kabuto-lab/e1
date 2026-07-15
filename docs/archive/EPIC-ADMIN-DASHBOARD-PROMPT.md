# EPIC ADMIN Dashboard — Ultra-High-Detailed Recreation Prompt

## Project Overview

Create a **modern, professional admin dashboard** called "EPIC ADMIN" — an all-in-one platform blueprint dashboard with dark/light theme support, collapsible sidebar navigation, widget-based layout, and interactive full-screen panels.

---

## 1. DESIGN SYSTEM & TOKENS

### 1.1 Typography

```css
/* Font Families */
--font-display: "Unbounded", system-ui, -apple-system, sans-serif;    /* Headings, titles */
--font-mono: "JetBrains Mono", ui-monospace, "Cascadia Code", "Consolas", monospace;  /* Body, code, technical */

/* Font Weights */
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
--font-weight-extrabold: 800;
```

### 1.2 Color Palette — Dark Theme (Default)

```css
/* Backgrounds */
--bg-primary: #0a0b14;        /* Main page background */
--bg-secondary: #12131f;      /* Sidebar, topbar, panels */
--bg-tertiary: #1a1c2e;       /* Input fields, elevated surfaces */
--bg-card: #161826;           /* Widget cards */
--bg-hover: #1f2238;          /* Hover states */

/* Borders */
--border-color: rgba(255, 255, 255, 0.08);     /* Primary borders */
--border-light: rgba(255, 255, 255, 0.12);     /* Secondary borders */

/* Text */
--text-primary: #f0f2f8;      /* Primary text, headings */
--text-secondary: #9ca3b8;    /* Secondary text, labels */
--text-muted: #6b728a;        /* Muted text, hints */

/* Accents */
--accent-primary: #00d9ff;    /* Cyan — primary actions, links */
--accent-secondary: #c49000;  /* Gold — secondary actions */
--accent-pink: #ff80ff;       /* Pink — highlights, badges */
--accent-orange: #ff725c;     /* Orange — warnings, progress */
--accent-green: #5cb85c;      /* Green — success, online */
--accent-red: #ef4444;        /* Red — errors, notifications */
```

### 1.3 Color Palette — Light Theme

```css
/* Backgrounds */
--bg-primary: #f4f5f8;
--bg-secondary: #ffffff;
--bg-tertiary: #e8eaef;
--bg-card: #ffffff;
--bg-hover: #f0f2f5;

/* Borders */
--border-color: rgba(0, 0, 0, 0.08);
--border-light: rgba(0, 0, 0, 0.12);

/* Text */
--text-primary: #1a1d26;
--text-secondary: #5c6370;
--text-muted: #9ca3af;
```

### 1.4 Shadows & Effects

```css
/* Shadows */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
--shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.6);

/* Glows */
--glow-cyan: 0 0 20px rgba(0, 217, 255, 0.3);
--glow-gold: 0 0 20px rgba(196, 144, 0, 0.3);

/* Background Patterns */
--grid-dot: rgba(255, 255, 255, 0.03);   /* Dark */
--grid-dot: rgba(0, 0, 0, 0.04);         /* Light */
```

### 1.5 Spacing & Layout

```css
/* Layout Dimensions */
--sidebar-width: 260px;
--sidebar-collapsed-width: 72px;
--topbar-height: 64px;
--widget-gap: 16px;

/* Border Radius */
--card-radius: 16px;      /* Widget cards, panels */
--btn-radius: 10px;       /* Buttons, inputs */

/* Transitions */
--transition-fast: 0.15s ease;
--transition-base: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: 0.4s cubic-bezier(0.16, 1, 0.3, 1);
```

---

## 2. LAYOUT ARCHITECTURE

### 2.1 Main App Structure

```
┌─────────────────────────────────────────────────────────────┐
│ .app (flex, height: 100%)                                   │
│  ┌──────────────┬─────────────────────────────────────────┐  │
│  │              │  .main-content (flex: 1)                │  │
│  │  .sidebar    │   ┌─────────────────────────────────┐   │  │
│  │  (260px)     │   │  .topbar (height: 64px)         │   │  │
│  │              │   ├─────────────────────────────────┤   │  │
│  │              │   │  .dashboard (flex: 1, scroll)   │   │  │
│  │              │   │   ┌─────────────────────────┐   │   │  │
│  │              │   │   │  .dashboard-grid        │   │   │  │
│  │              │   │   │  (12-column CSS Grid)   │   │   │  │
│  │              │   │   └─────────────────────────┘   │   │  │
│  │              │   └─────────────────────────────────┘   │  │
│  └──────────────┴─────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

### 2.2 Sidebar Component

**Structure:**
```html
<aside class="sidebar">
  <div class="sidebar-header">
    <div class="sidebar-logo">E</div>
    <div class="sidebar-title">EPIC ADMIN</div>
    <button class="sidebar-toggle">◂</button>
  </div>
  
  <nav class="sidebar-nav">
    <div class="nav-section">
      <div class="nav-section-title">Overview</div>
      <div class="nav-item active">
        <span class="nav-icon">◈</span>
        <span class="nav-label">Dashboard</span>
      </div>
      <!-- More nav items -->
    </div>
  </nav>
  
  <div class="sidebar-footer">
    <!-- Footer nav items -->
  </div>
</aside>
```

**Styling Specifications:**

| Element | Property | Value |
|---------|----------|-------|
| `.sidebar` | width | `260px` (expanded), `72px` (collapsed) |
| `.sidebar` | background | `var(--bg-secondary)` |
| `.sidebar` | border-right | `1px solid var(--border-color)` |
| `.sidebar-header` | padding | `20px 16px` |
| `.sidebar-header` | border-bottom | `1px solid var(--border-color)` |
| `.sidebar-logo` | size | `36×36px` |
| `.sidebar-logo` | background | `linear-gradient(135deg, var(--accent-primary), var(--accent-pink))` |
| `.sidebar-logo` | border-radius | `10px` |
| `.sidebar-title` | font | `var(--font-display), 16px, 700` |
| `.sidebar-toggle` | size | `32×32px` |
| `.sidebar-toggle` | border-radius | `var(--btn-radius)` |
| `.sidebar-toggle` | background | `var(--bg-tertiary)` |

**Navigation Items:**

| Element | Property | Value |
|---------|----------|-------|
| `.nav-item` | padding | `11px 12px` |
| `.nav-item` | border-radius | `var(--btn-radius)` |
| `.nav-item` | gap | `12px` |
| `.nav-item` | color | `var(--text-secondary)` |
| `.nav-item:hover` | background | `var(--bg-hover)` |
| `.nav-item.active` | background | `rgba(0, 217, 255, 0.12)` |
| `.nav-item.active` | color | `var(--accent-primary)` |
| `.nav-item.active` | box-shadow | `inset 0 0 0 1px rgba(0, 217, 255, 0.2)` |
| `.nav-icon` | size | `20×20px` |
| `.nav-label` | font | `12px, 500` |
| `.nav-section-title` | font | `9px, 600, uppercase, letter-spacing: 0.08em` |
| `.nav-section-title` | color | `var(--text-muted)` |
| `.nav-badge` | background | `var(--accent-pink)` |
| `.nav-badge` | font | `9px, 700` |
| `.nav-badge` | padding | `2px 7px` |
| `.nav-badge` | border-radius | `999px` |

**Collapsed State Behavior:**
- `.sidebar-title` → `opacity: 0, pointer-events: none`
- `.nav-label` → `display: none`
- `.nav-badge` → `display: none`
- `.nav-section-title` → `opacity: 0`
- `.sidebar-toggle` text → changes to `▸`

### 2.3 Top Bar Component

**Structure:**
```html
<header class="topbar">
  <button class="mobile-menu-btn">☰</button>
  
  <div class="topbar-left">
    <div class="breadcrumb">
      <span>Platform</span>
      <span class="breadcrumb-sep">/</span>
      <span class="breadcrumb-current">Blueprint</span>
    </div>
    
    <div class="search-box">
      <span class="search-icon">⌕</span>
      <input class="search-input" placeholder="Search..." />
      <span class="search-shortcut">⌘K</span>
    </div>
  </div>
  
  <div class="topbar-right">
    <button class="icon-btn theme-toggle">◑</button>
    <button class="icon-btn">🔔<span class="badge"></span></button>
    <button class="icon-btn">?</button>
    
    <div class="user-menu">
      <div class="user-avatar">A</div>
      <div class="user-info">
        <span class="user-name">Admin</span>
        <span class="user-role">Platform Owner</span>
      </div>
    </div>
  </div>
</header>
```

**Styling Specifications:**

| Element | Property | Value |
|---------|----------|-------|
| `.topbar` | height | `64px` |
| `.topbar` | background | `var(--bg-secondary)` |
| `.topbar` | border-bottom | `1px solid var(--border-color)` |
| `.topbar` | padding | `0 24px` |
| `.breadcrumb` | font | `12px` |
| `.breadcrumb-sep` | color | `var(--border-color)` |
| `.breadcrumb-current` | color | `var(--text-primary), 600` |
| `.search-box` | padding | `10px 16px` |
| `.search-box` | background | `var(--bg-tertiary)` |
| `.search-box` | border-radius | `999px` |
| `.search-box` | max-width | `360px` |
| `.search-box:focus-within` | border-color | `var(--accent-primary)` |
| `.search-box:focus-within` | box-shadow | `var(--glow-cyan)` |
| `.search-input` | font | `var(--font-mono), 12px` |
| `.search-shortcut` | padding | `3px 8px` |
| `.search-shortcut` | background | `var(--bg-hover)` |
| `.search-shortcut` | border-radius | `6px` |
| `.search-shortcut` | font | `10px` |
| `.icon-btn` | size | `40×40px` |
| `.icon-btn` | border-radius | `var(--btn-radius)` |
| `.icon-btn` | background | `var(--bg-tertiary)` |
| `.icon-btn .badge` | size | `8×8px` |
| `.icon-btn .badge` | background | `var(--accent-red)` |
| `.icon-btn .badge` | position | `top: 6px, right: 6px` |
| `.theme-toggle` | width | `48px` |
| `.user-menu` | padding | `6px 12px 6px 6px` |
| `.user-menu` | border-radius | `999px` |
| `.user-menu` | background | `var(--bg-tertiary)` |
| `.user-avatar` | size | `32×32px` |
| `.user-avatar` | background | `linear-gradient(135deg, var(--accent-primary), var(--accent-pink))` |
| `.user-avatar` | border-radius | `50%` |
| `.user-name` | font | `12px, 600` |
| `.user-role` | font | `10px, var(--text-muted)` |

---

## 3. DASHBOARD GRID & WIDGETS

### 3.1 Dashboard Grid System

```css
.dashboard {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: var(--bg-primary);
  background-image: radial-gradient(circle at 1px 1px, var(--grid-dot) 1px, transparent 0);
  background-size: 24px 24px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--widget-gap);
  max-width: 1800px;
  margin: 0 auto;
}
```

**Responsive Breakpoints:**

| Screen Width | Widget Behavior |
|--------------|-----------------|
| > 1400px | Default (12-column) |
| ≤ 1400px | `.widget-sm` → span 4, `.widget-md` → span 6 |
| ≤ 1100px | All widgets span 6 columns |
| ≤ 768px | All widgets span 12 columns (full width) |

### 3.2 Widget Card Component

**Structure:**
```html
<div class="widget widget-sm">
  <div class="widget-header">
    <h3 class="widget-title">
      <span class="widget-title-icon">◈</span>
      Title
    </h3>
    <div class="widget-actions">
      <button class="widget-action">⬤</button>
    </div>
  </div>
  <div class="widget-body">
    <!-- Content -->
  </div>
</div>
```

**Styling Specifications:**

| Element | Property | Value |
|---------|----------|-------|
| `.widget` | background | `var(--bg-card)` |
| `.widget` | border | `1px solid var(--border-color)` |
| `.widget` | border-radius | `var(--card-radius)` |
| `.widget` | box-shadow | `var(--shadow-md)` |
| `.widget:hover` | box-shadow | `var(--shadow-lg)` |
| `.widget-header` | padding | `16px 18px` |
| `.widget-header` | border-bottom | `1px solid var(--border-color)` |
| `.widget-header` | background | `linear-gradient(180deg, rgba(255,255,255,0.02), transparent)` |
| `.widget-title` | font | `var(--font-display), 13px, 700` |
| `.widget-title-icon` | color | `var(--accent-primary)` |
| `.widget-title-icon` | font-size | `16px` |
| `.widget-action` | size | `28×28px` |
| `.widget-action` | border-radius | `6px` |
| `.widget-action` | background | `var(--bg-tertiary)` |
| `.widget-body` | padding | `18px` |
| `.widget-body` | overflow | `auto` |

**Widget Size Classes:**

| Class | Grid Span (Desktop) |
|-------|---------------------|
| `.widget-sm` | span 3 (25%) |
| `.widget-md` | span 4 (33%) |
| `.widget-lg` | span 6 (50%) |
| `.widget-xl` | span 8 (66%) |
| `.widget-full` | span 12 (100%) |

---

## 4. WIDGET TYPES & CONTENT

### 4.1 System Status Widget

**Structure:**
```html
<div class="status-grid">
  <div class="status-item">
    <span class="status-label">API Server</span>
    <span class="status-value">
      <span class="status-indicator online"></span>
      Online
    </span>
  </div>
  <!-- More status items -->
</div>
```

**Styling:**

| Element | Property | Value |
|---------|----------|-------|
| `.status-grid` | display | `grid, grid-template-columns: repeat(2, 1fr)` |
| `.status-grid` | gap | `12px` |
| `.status-item` | padding | `14px` |
| `.status-item` | background | `var(--bg-tertiary)` |
| `.status-item` | border-radius | `12px` |
| `.status-label` | font | `10px, uppercase, letter-spacing: 0.05em` |
| `.status-label` | color | `var(--text-muted)` |
| `.status-value` | font | `18px, 700` |
| `.status-indicator` | size | `8×8px` |
| `.status-indicator` | border-radius | `50%` |
| `.status-indicator` | animation | `pulse 2s ease-in-out infinite` |
| `.status-indicator.online` | background | `var(--accent-green)` |
| `.status-indicator.warning` | background | `var(--accent-orange)` |
| `.status-indicator.offline` | background | `var(--accent-red)` |

**Pulse Animation:**
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

### 4.2 Quick Actions Widget

**Structure:**
```html
<div class="quick-actions-grid">
  <div class="quick-action-btn">
    <div class="quick-action-icon">⊕</div>
    <span class="quick-action-label">New Model</span>
  </div>
  <!-- More buttons -->
</div>
```

**Styling:**

| Element | Property | Value |
|---------|----------|-------|
| `.quick-actions-grid` | display | `grid, grid-template-columns: repeat(4, 1fr)` |
| `.quick-actions-grid` | gap | `10px` |
| `.quick-action-btn` | padding | `14px 12px` |
| `.quick-action-btn` | background | `var(--bg-tertiary)` |
| `.quick-action-btn` | border | `1px solid var(--border-color)` |
| `.quick-action-btn` | border-radius | `12px` |
| `.quick-action-btn:hover` | transform | `translateY(-2px)` |
| `.quick-action-btn:hover` | box-shadow | `var(--glow-cyan)` |
| `.quick-action-icon` | size | `36×36px` |
| `.quick-action-icon` | border-radius | `10px` |
| `.quick-action-icon` | background | `rgba(0, 217, 255, 0.12)` |
| `.quick-action-icon` | font-size | `18px` |
| `.quick-action-label` | font | `10px, var(--text-secondary)` |

### 4.3 Roadmap Widget

**Structure:**
```html
<div class="roadmap-timeline">
  <div class="roadmap-stage">
    <div class="roadmap-stage-header">
      <span class="roadmap-stage-num">0</span>
      <span class="roadmap-stage-status done">✓</span>
    </div>
    <div class="roadmap-stage-title">Foundation</div>
    <div class="roadmap-stage-weeks">Weeks 1-2</div>
  </div>
  <!-- More stages -->
</div>
```

**Styling:**

| Element | Property | Value |
|---------|----------|-------|
| `.roadmap-timeline` | display | `flex, gap: 8px` |
| `.roadmap-timeline` | overflow-x | `auto` |
| `.roadmap-stage` | flex | `0 0 140px` |
| `.roadmap-stage` | padding | `14px` |
| `.roadmap-stage` | background | `var(--bg-tertiary)` |
| `.roadmap-stage` | border-radius | `12px` |
| `.roadmap-stage:hover` | border-color | `var(--accent-primary)` |
| `.roadmap-stage:hover` | box-shadow | `var(--glow-cyan)` |
| `.roadmap-stage-num` | font | `20px, 800, var(--accent-primary)` |
| `.roadmap-stage-status` | size | `24×24px` |
| `.roadmap-stage-status` | border-radius | `50%` |
| `.roadmap-stage-status.done` | background | `var(--accent-green), color: #fff` |
| `.roadmap-stage-status.progress` | background | `var(--accent-orange), color: #fff` |
| `.roadmap-stage-status.pending` | background | `var(--bg-hover), color: var(--text-muted)` |
| `.roadmap-stage-title` | font | `11px, 600` |
| `.roadmap-stage-weeks` | font | `9px, var(--text-muted)` |

### 4.4 Activity Feed Widget

**Structure:**
```html
<div class="activity-list">
  <div class="activity-item">
    <div class="activity-icon success">✓</div>
    <div class="activity-content">
      <div class="activity-text">E2E tests passed</div>
      <div class="activity-time">2 minutes ago</div>
    </div>
  </div>
</div>
```

**Styling:**

| Element | Property | Value |
|---------|----------|-------|
| `.activity-list` | display | `flex, flex-direction: column` |
| `.activity-list` | gap | `12px` |
| `.activity-item` | display | `flex, gap: 12px` |
| `.activity-item` | padding | `12px` |
| `.activity-item` | background | `var(--bg-tertiary)` |
| `.activity-item` | border-radius | `12px` |
| `.activity-icon` | size | `36×36px` |
| `.activity-icon` | border-radius | `10px` |
| `.activity-icon.info` | background | `rgba(0, 217, 255, 0.12)` |
| `.activity-icon.success` | background | `rgba(92, 184, 92, 0.12)` |
| `.activity-icon.warning` | background | `rgba(255, 114, 92, 0.12)` |
| `.activity-text` | font | `11px, var(--text-primary)` |
| `.activity-time` | font | `9px, var(--text-muted)` |

### 4.5 Matrix Table Widget

**Structure:**
```html
<table class="matrix-table">
  <thead>
    <tr>
      <th>Resource</th>
      <th>Guest</th>
      <th>Client</th>
      <!-- More headers -->
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="text-align: left;">GET /models</td>
      <td><span class="matrix-check">✓</span></td>
      <!-- More cells -->
    </tr>
  </tbody>
</table>
```

**Styling:**

| Element | Property | Value |
|---------|----------|-------|
| `.matrix-table` | width | `100%` |
| `.matrix-table` | border-collapse | `collapse` |
| `.matrix-table` | font-size | `10px` |
| `.matrix-table th` | padding | `10px 8px` |
| `.matrix-table th` | background | `var(--bg-tertiary)` |
| `.matrix-table th` | color | `var(--text-secondary)` |
| `.matrix-table td` | padding | `8px` |
| `.matrix-table td` | border-bottom | `1px solid var(--border-color)` |
| `.matrix-check` | color | `var(--accent-green), 700` |
| `.matrix-partial` | color | `var(--accent-orange)` |
| `.matrix-no` | color | `var(--text-muted), opacity: 0.4` |

### 4.6 Finance Flow Diagram

**Structure:**
```html
<div class="flow-diagram">
  <div class="flow-node">
    <span class="flow-node-icon">👤</span>
    <span class="flow-node-label">Guest</span>
  </div>
  <!-- More nodes -->
</div>
```

**Styling:**

| Element | Property | Value |
|---------|----------|-------|
| `.flow-diagram` | display | `flex, justify-content: space-between` |
| `.flow-diagram` | position | `relative` |
| `.flow-diagram::before` | content | `gradient line (cyan→pink→orange)` |
| `.flow-diagram::before` | height | `2px` |
| `.flow-node` | size | `80×80px` |
| `.flow-node` | border-radius | `50%` |
| `.flow-node` | background | `var(--bg-tertiary)` |
| `.flow-node` | border | `2px solid var(--border-color)` |
| `.flow-node:hover` | border-color | `var(--accent-primary)` |
| `.flow-node:hover` | box-shadow | `var(--glow-cyan)` |
| `.flow-node:hover` | transform | `scale(1.05)` |
| `.flow-node-icon` | font-size | `24px` |
| `.flow-node-label` | font | `8px, var(--text-muted)` |

### 4.7 DFD Canvas Widget

**Structure:**
```html
<div class="dfd-canvas-wrap">
  <svg class="dfd-canvas" viewBox="0 0 1200 500"></svg>
</div>
```

**Styling:**

| Element | Property | Value |
|---------|----------|-------|
| `.dfd-canvas-wrap` | height | `400px` |
| `.dfd-canvas-wrap` | background | `var(--bg-tertiary)` |
| `.dfd-canvas-wrap` | border-radius | `12px` |
| `.dfd-canvas` | background-image | `radial-gradient(var(--grid-dot) 1px, transparent 0)` |
| `.dfd-canvas` | background-size | `20px 20px` |

---

## 5. FULL-SCREEN PANELS

### 5.1 Panel Structure

```html
<div class="panel-full">
  <div class="panel-full-header">
    <button class="panel-full-back">◂</button>
    <h2 class="panel-full-title">Panel Title</h2>
    <div style="margin-left: auto; display: flex; gap: 8px;">
      <button class="btn btn-secondary">Cancel</button>
      <button class="btn btn-primary">Save</button>
    </div>
  </div>
  <div class="panel-full-body">
    <!-- Panel content -->
  </div>
</div>
```

**Styling:**

| Element | Property | Value |
|---------|----------|-------|
| `.panel-full` | position | `fixed, inset: 0` |
| `.panel-full` | z-index | `200` |
| `.panel-full` | display | `none` (default), `flex` (active) |
| `.panel-full-header` | height | `64px` |
| `.panel-full-header` | background | `var(--bg-secondary)` |
| `.panel-full-header` | border-bottom | `1px solid var(--border-color)` |
| `.panel-full-header` | padding | `0 24px` |
| `.panel-full-back` | size | `40×40px` |
| `.panel-full-back` | border-radius | `var(--btn-radius)` |
| `.panel-full-back` | background | `var(--bg-tertiary)` |
| `.panel-full-title` | font | `var(--font-display), 16px, 700` |
| `.panel-full-body` | flex | `1` |
| `.panel-full-body` | padding | `24px` |
| `.panel-full-body` | overflow | `hidden` |

### 5.2 DFD Editor Panel

**Structure:**
```html
<div class="dfd-editor-shell">
  <div class="dfd-palette">
    <div class="dfd-palette-title">Node Types</div>
    <div class="dfd-palette-item" draggable="true" data-type="process">
      <div class="dfd-palette-item-name">Process</div>
      <div class="dfd-palette-item-desc">Circular node</div>
    </div>
    <!-- More palette items -->
  </div>
  
  <div class="dfd-canvas-full">
    <svg class="dfd-canvas" viewBox="0 0 1600 800"></svg>
  </div>
</div>
```

**Styling:**

| Element | Property | Value |
|---------|----------|-------|
| `.dfd-editor-shell` | display | `flex, gap: var(--widget-gap)` |
| `.dfd-editor-shell` | height | `100%` |
| `.dfd-palette` | width | `220px` |
| `.dfd-palette` | background | `var(--bg-secondary)` |
| `.dfd-palette` | border | `1px solid var(--border-color)` |
| `.dfd-palette` | border-radius | `var(--card-radius)` |
| `.dfd-palette` | padding | `16px` |
| `.dfd-palette-title` | font | `11px, 700` |
| `.dfd-palette-item` | padding | `12px` |
| `.dfd-palette-item` | background | `var(--bg-tertiary)` |
| `.dfd-palette-item` | border-radius | `10px` |
| `.dfd-palette-item` | cursor | `grab` |
| `.dfd-palette-item:hover` | border-color | `var(--accent-primary)` |
| `.dfd-palette-item:hover` | box-shadow | `var(--glow-cyan)` |
| `.dfd-palette-item-name` | font | `10px, 600, var(--accent-primary)` |
| `.dfd-palette-item-desc` | font | `8px, var(--text-muted)` |
| `.dfd-canvas-full` | flex | `1` |
| `.dfd-canvas-full` | background | `var(--bg-card)` |
| `.dfd-canvas-full` | border | `1px solid var(--border-color)` |
| `.dfd-canvas-full` | border-radius | `var(--card-radius)` |

---

## 6. BUTTON COMPONENTS

### 6.1 Base Button

```css
.btn {
  padding: 10px 18px;
  border-radius: var(--btn-radius);
  border: 1px solid var(--border-color);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
```

### 6.2 Primary Button

```css
.btn-primary {
  background: var(--accent-primary);
  color: #0a1628;
  border-color: transparent;
}

.btn-primary:hover {
  box-shadow: var(--glow-cyan);
  transform: translateY(-1px);
}
```

### 6.3 Secondary Button

```css
.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.btn-secondary:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
```

---

## 7. INTERACTIVE STATES & ANIMATIONS

### 7.1 Hover Effects

| Component | Effect |
|-----------|--------|
| `.widget:hover` | `box-shadow: var(--shadow-lg), border-color: var(--border-light)` |
| `.nav-item:hover` | `background: var(--bg-hover), color: var(--text-primary)` |
| `.icon-btn:hover` | `background: var(--bg-hover), color: var(--text-primary)` |
| `.roadmap-stage:hover` | `border-color: var(--accent-primary), box-shadow: var(--glow-cyan)` |
| `.quick-action-btn:hover` | `transform: translateY(-2px), box-shadow: var(--glow-cyan)` |
| `.flow-node:hover` | `border-color: var(--accent-primary), box-shadow: var(--glow-cyan), transform: scale(1.05)` |

### 7.2 Active States

```css
.nav-item.active {
  background: rgba(0, 217, 255, 0.12);
  color: var(--accent-primary);
  box-shadow: inset 0 0 0 1px rgba(0, 217, 255, 0.2);
}
```

### 7.3 Transitions

| Element | Transition |
|---------|------------|
| Fast (buttons, icons) | `0.15s ease` |
| Base (cards, panels) | `0.25s cubic-bezier(0.4, 0, 0.2, 1)` |
| Slow (sidebar collapse) | `0.4s cubic-bezier(0.16, 1, 0.3, 1)` |

### 7.4 Animations

```css
/* Pulse animation for status indicators */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Skeleton loading animation */
@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## 8. RESPONSIVE BEHAVIOR

### 8.1 Mobile Sidebar (≤1024px)

```css
@media (max-width: 1024px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    transform: translateX(-100%);
  }
  
  .sidebar.open {
    transform: translateX(0);
  }
  
  .mobile-menu-btn {
    display: flex;
  }
}
```

### 8.2 Responsive Adjustments

| Breakpoint | Changes |
|------------|---------|
| ≤ 1400px | Widget spans adjust (sm→4, md→6) |
| ≤ 1100px | All widgets span 6 columns |
| ≤ 768px | All widgets full width (span 12) |
| ≤ 1024px | Sidebar becomes off-canvas drawer |

---

## 9. JAVASCRIPT FUNCTIONALITY

### 9.1 State Management

```javascript
const state = {
  theme: localStorage.getItem('epic-theme') || 'dark',
  sidebarCollapsed: localStorage.getItem('epic-sidebar') === 'collapsed',
  currentPanel: 'dashboard'
};
```

### 9.2 Theme Toggle

```javascript
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('epic-theme', theme);
}

function toggleTheme() {
  const newTheme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
}
```

### 9.3 Sidebar Toggle

```javascript
function applySidebarState(collapsed) {
  if (collapsed) {
    sidebar.classList.add('collapsed');
    sidebarToggle.textContent = '▸';
  } else {
    sidebar.classList.remove('collapsed');
    sidebarToggle.textContent = '◂';
  }
  localStorage.setItem('epic-sidebar', collapsed ? 'collapsed' : 'expanded');
}
```

### 9.4 Panel Navigation

```javascript
function showPanel(panelId) {
  // Hide all panels
  panels.forEach(p => p.classList.remove('active'));
  // Remove active from nav items
  navItems.forEach(n => n.classList.remove('active'));
  // Show target panel
  const target = document.getElementById(`panel-${panelId}`);
  if (target) {
    target.classList.add('active');
    // Set nav item active
    const navItem = document.querySelector(`.nav-item[data-panel="${panelId}"]`);
    if (navItem) navItem.classList.add('active');
  }
}

function closeFullPanel() {
  showPanel('dashboard');
}
```

### 9.5 Keyboard Shortcuts

```javascript
document.addEventListener('keydown', (e) => {
  // Cmd+K for search
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    searchInput.focus();
  }
  // Escape to close panels
  if (e.key === 'Escape' && state.currentPanel !== 'dashboard') {
    closeFullPanel();
  }
});
```

---

## 10. ACCESSIBILITY & UX

### 10.1 Focus States

All interactive elements must have visible focus states:
- Buttons: `border-color: var(--accent-primary)`
- Search box: `box-shadow: var(--glow-cyan)`
- Nav items: `background: var(--bg-hover)`

### 10.2 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 10.3 Screen Reader Support

- All icons should have `aria-label` or `title` attributes
- Status indicators should have text labels
- Interactive elements should be keyboard accessible

---

## 11. SCROLLBAR STYLING

```css
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
}

::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}
```

**Dark Theme:**
```css
--scrollbar-track: rgba(255, 255, 255, 0.05);
--scrollbar-thumb: rgba(255, 255, 255, 0.15);
--scrollbar-thumb-hover: rgba(255, 255, 255, 0.25);
```

**Light Theme:**
```css
--scrollbar-track: rgba(0, 0, 0, 0.05);
--scrollbar-thumb: rgba(0, 0, 0, 0.15);
--scrollbar-thumb-hover: rgba(0, 0, 0, 0.25);
```

---

## 12. COMPLETE FILE STRUCTURE

```
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>EPIC ADMIN — Platform Blueprint Dashboard</title>
  
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Unbounded:wght@400;600;700;800&display=swap" rel="stylesheet" />
  
  <style>
    /* CSS Variables (Section 1) */
    /* Reset & Base (Section 2) */
    /* Layout Components (Section 2) */
    /* Widget Styles (Section 3-4) */
    /* Panel Styles (Section 5) */
    /* Button Styles (Section 6) */
    /* Animations (Section 7) */
    /* Responsive (Section 8) */
    /* Utility Classes (Section 9) */
  </style>
</head>
<body>
  <div class="app">
    <!-- Sidebar (Section 2.2) -->
    <aside class="sidebar">...</aside>
    
    <!-- Main Content -->
    <main class="main-content">
      <!-- Top Bar (Section 2.3) -->
      <header class="topbar">...</header>
      
      <!-- Dashboard Panel -->
      <div class="dashboard panel active">
        <div class="dashboard-grid">
          <!-- Widget 1: System Status -->
          <div class="widget widget-sm">...</div>
          <!-- Widget 2: Quick Actions -->
          <div class="widget widget-sm">...</div>
          <!-- Widget 3: Roadmap -->
          <div class="widget widget-lg">...</div>
          <!-- Widget 4: Activity Feed -->
          <div class="widget widget-md">...</div>
          <!-- Widget 5: RBAC Matrix -->
          <div class="widget widget-xl">...</div>
          <!-- Widget 6: Finance Flow -->
          <div class="widget widget-full">...</div>
          <!-- Widget 7: DFD Canvas -->
          <div class="widget widget-full">...</div>
        </div>
      </div>
      
      <!-- Full Panel: Roadmap -->
      <div class="panel-full" id="panel-roadmap">...</div>
      
      <!-- Full Panel: Matrix -->
      <div class="panel-full" id="panel-matrix">...</div>
      
      <!-- Full Panel: DFD Editor -->
      <div class="panel-full" id="panel-dfd">...</div>
      
      <!-- Full Panel: Finance -->
      <div class="panel-full" id="panel-finance">...</div>
    </main>
  </div>
  
  <script>
    // State Management (Section 9.1)
    // Theme Toggle (Section 9.2)
    // Sidebar Toggle (Section 9.3)
    // Panel Navigation (Section 9.4)
    // Keyboard Shortcuts (Section 9.5)
    // DFD Rendering
    // Initialization
  </script>
</body>
</html>
```

---

## 13. DELIVERABLE CHECKLIST

- [ ] CSS variables for dark and light themes
- [ ] Sidebar with collapsible state
- [ ] Top bar with search, theme toggle, user menu
- [ ] 12-column CSS Grid dashboard layout
- [ ] 7 widget types implemented
- [ ] 4 full-screen panels
- [ ] Responsive breakpoints (1400px, 1100px, 1024px, 768px)
- [ ] Theme persistence with localStorage
- [ ] Keyboard shortcuts (⌘K, Esc)
- [ ] Smooth transitions and animations
- [ ] Custom scrollbar styling
- [ ] Mobile menu drawer
- [ ] DFD canvas with SVG rendering
- [ ] All hover and active states
- [ ] Accessibility features

---

## 14. VISUAL REFERENCE

**Desktop Layout (1920×1080):**
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ◈ EPIC ADMIN [◂]  │  Platform / Blueprint   [⌕ Search...]   ◑  🔔  ?  [A] Admin │
├───────────────────┼─────────────────────────────────────────────────────────────┤
│                   │                                                               │
│ Overview          │  ┌──────────┐ ┌──────────┐ ┌──────────────────────────────┐  │
│ ◈ Dashboard       │  │ System   │ │ Quick    │ │ Roadmap Overview             │  │
│ ▣ Roadmap         │  │ Status   │ │ Actions  │ │ ▣ ▣ ▣ ▣ ▣ ▣                  │  │
│ ▦ Access Matrix   │  │ ⚡ ⚡ ⚡ ⚡│ │ ⊕ ⬆ ⚑ ⬇│ │ [View All]                   │  │
│                   │  └──────────┘ └──────────┘ └──────────────────────────────┘  │
│ Architecture      │                                                               │
│ ◉ DFD Editor [NEW]│  ┌──────────────────────┐ ┌───────────────────────────────┐  │
│ ◐ Finance Flow    │  │ RBAC Matrix Preview  │ │ Recent Activity               │  │
│ ⬡ API Security    │  │ ┌──┬────┬────┬────┐  │ │ ✓ E2E tests passed            │  │
│                   │  │ │  │ G  │ C  │ M  │  │ │ ⬆ Deployed v2.4.1              │  │
│ Quality           │  │ ├──┼────┼────┼────┤  │ │ ⚠ Rate limit warning           │  │
│ ☑ Checklist       │  │ └──┴────┴────┴────┘  │ └───────────────────────────────┘  │
│ ⚑ E2E Tests       │  └──────────────────────┘                                     │
│                   │                                                               │
│ ⚙ Settings        │  ┌─────────────────────────────────────────────────────────┐  │
│                   │  │ Payment & Escrow Flow                                   │  │
│                   │  │ 👤 ──── 🤖 ──── ⚡ ──── 🎫 ──── 💰                       │  │
│                   │  └─────────────────────────────────────────────────────────┘  │
│                   │                                                               │
│                   │  ┌─────────────────────────────────────────────────────────┐  │
│                   │  │ Data Flow Diagram                          [Open Editor]│  │
│                   │  │ [SVG Canvas with nodes and connections]                 │  │
│                   │  └─────────────────────────────────────────────────────────┘  │
└───────────────────┴───────────────────────────────────────────────────────────────┘
```

---

**END OF PROMPT**
