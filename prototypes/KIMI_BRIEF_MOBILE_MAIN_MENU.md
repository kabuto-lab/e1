# Agent brief: Lovnge mobile main menu (design exploration)

Copy everything below into Kimi (or any design agent). **Scope: phone only** — no tablet/desktop layouts.

---

## Product & brand

**Lovnge** is a premium companionship / agency platform. Visual language: **Modern Luxury** — restrained, expensive, intimate without being explicit. Think private members’ club, not startup SaaS.

## Non-negotiable design tokens (match the live design system)

- **Backgrounds:** `#0A0A0A` (page), `#1A1A1A` / `#242424` for surfaces/elevation.
- **Accent:** gold `#D4AF37` — **sparingly** (primary actions, active nav, key lines — not everywhere).
- **Typography:** **Unbounded** (display — menu titles, logo wordmark feel), **Inter** (labels, secondary).
- **Texture:** very subtle **film grain / noise** overlay (~2–4% opacity) on dark areas.
- **Motion:** intentional, **200–500ms**, ease-out or custom cubic-bezier — no bouncy cartoon easing unless clearly ironic.

## Technical constraints

- **Viewport:** mobile first; respect `safe-area-inset-*` (notch / home indicator).
- **Touch targets:** minimum **44×44px** for any tappable control.
- **Accessibility:** visible focus for keyboard (if spec includes focus rings); `prefers-reduced-motion: reduce` must **disable or simplify** large transitions.
- **Language:** UI copy may be **Russian** (e.g. Главная, Модели, Бронирование, Вход) — keep strings short.

## Your deliverable

Propose **one** cohesive **main navigation** concept for the **public/guest** mobile site, including:

1. **Closed state** — how the menu is hinted (hamburger, word “Меню”, icon + label, etc.) and where it sits (header, bottom bar, floating).
2. **Open state** — layout, hierarchy (max 5–7 primary links), optional secondary block (legal, language).
3. **Behavior spec** — step-by-step: open trigger, focus trap (if modal), scroll lock, close actions (X, overlay tap, back gesture if applicable), animation sequence (what moves first).
4. **Differentiation** — one paragraph on why this pattern fits **Lovnge** specifically (luxury + clarity), not a generic app drawer.

**Do not** implement production code unless asked; **structured spec + ASCII/wireframe description** is enough. If you sketch states, describe them in text or simple diagrams.

## Reference in repo (for human designers)

Static prototypes live in `prototypes/mobile-main-menu-*.html` — use them as **style reference only**; Kimi may propose alternatives that diverge if justified.

---

_End of brief._
