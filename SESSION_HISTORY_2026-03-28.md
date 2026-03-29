# Session history — 2026-03-28

Saved snapshot of what shipped in this chat thread (for your notes; Cursor’s own chat history stays in the app).

## Platform blueprint (`apps/web/public/platform-blueprint.html`)

- **Матрица доступа** (`scenarios.access`): отдельный холст как у вкладки «Движок» — рёбра (легенда→роли, роль→фича по pills), зум колёсиком, ПКМ-панорама, перетаскивание узлов, hover на исходящих рёбрах.
- Классический граф обёрнут в `#graph-classic-board-wrap`; матрица — `#access-matrix-view`.

## Riply (`riply/`)

- **`core/riply-slider.js` + `.css`**: vanilla WebGL порт `RippleSurface` + оверлей заголовка с тем же преломлением; расширенный «живой воды» рендер (хроматика, Френель, глубина, каустики, два блика, виньетка, кэш uniform’ов, `pickSimSize` / `_simSize`).
- **`wordpress/riply-elementor/`**: плагин **Riply for Elementor** (loremtotem.com), виджет **Riply**, галерея медиатеки, волны hover/click/none, заголовок с позицией и типографикой, **Стиль → Симуляция волн** и **Вода: преломление, блики, реализм** (полный набор параметров).
- **`INSTALL.txt`** — установка и синк `assets` из `core/`.

## App reference

- `apps/web/components/RippleSurface.tsx` — комментарий со ссылкой на `riply/`.

## Plugin version

- Riply for Elementor: **1.2.0** (на момент сохранения).

---

Sleep well.
