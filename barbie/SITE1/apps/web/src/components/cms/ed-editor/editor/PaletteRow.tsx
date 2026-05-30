'use client';
/**
 * PaletteRow — горизонтальный тулбар категорий + folder-tab flyout.
 *
 * Φ7 polish: при наведении на тайл категории появляется flyout в виде
 * folder-tab — язычок с вогнутыми углами (inverse border radius) поднимается
 * вверх под иконку, тело таба содержит сетку виджетов. SVG-mask строится
 * динамически (W/H/tabX берутся из ResizeObserver).
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as LucideIcons from 'lucide-react';
import { useEditorStore } from './store';
import { C, categoriesData, toolTiles } from './editor-constants';
import { getBlockDef } from '../block-registry';
import type { WidgetType } from '../ed-types';
import type { CategoryKey, WidgetDef } from './editor-types';
import type { SiteType } from '@/lib/site-type-capabilities';

/**
 * Φ4 (Track H · D): виден ли элемент палитры при данном siteType тенанта.
 * Только section-preset гейтится — по `BlockDef.siteTypes` из registry. Атомы
 * (heading/text/…) всегда видны. Неизвестный siteType (fetch ещё идёт/упал) →
 * показываем всё (fail-open: палитра — UX, не authz; данные защищены на API).
 */
function itemVisible(item: WidgetDef, siteType?: SiteType | null): boolean {
  if (item.type !== 'section-preset' || !item.presetId) return true;
  if (!siteType) return true;
  const st = getBlockDef(item.presetId)?.siteTypes;
  return !st || st.length === 0 || st.includes(siteType);
}

// ── Folder-tab геометрия ──────────────────────────────────────────────────────
const PANEL_W = 320;
const TAB_W = 44;       // ширина язычка ≈ ширина тайла категории
const TAB_RISE = 22;    // насколько язычок поднимается над телом
const CONCAVE_R = 12;   // радиус вогнутых впадин у основания язычка
const TAB_R = 8;        // скругление верхних углов язычка
const CORNER_R = 16;    // скругление углов тела

function buildMaskPath(W: number, H: number, tabX: number): string {
  const bodyTop = TAB_RISE;
  const cr = CONCAVE_R;
  const r = CORNER_R;
  const tr = TAB_R;
  const tw = TAB_W;
  // clamp tabX inside drawable range
  const x = Math.max(cr, Math.min(tabX, W - tw - cr));
  return `M ${W - r} ${bodyTop}
    Q ${W} ${bodyTop} ${W} ${bodyTop + r}
    L ${W} ${H - r}
    Q ${W} ${H} ${W - r} ${H}
    L ${r} ${H}
    Q 0 ${H} 0 ${H - r}
    L 0 ${bodyTop + cr}
    Q 0 ${bodyTop} ${cr} ${bodyTop}
    L ${x} ${bodyTop}
    Q ${x + cr} ${bodyTop} ${x + cr} ${bodyTop - cr}
    L ${x + cr} ${tr}
    Q ${x + cr} 0 ${x + cr + tr} 0
    L ${x + tw - tr} 0
    Q ${x + tw} 0 ${x + tw} ${tr}
    L ${x + tw} ${bodyTop - cr}
    Q ${x + tw} ${bodyTop} ${x + tw + cr} ${bodyTop}
    L ${W - r} ${bodyTop}
    Z`.replace(/\s+/g, ' ').trim();
}

function buildMaskUrl(W: number, H: number, tabX: number): string {
  const path = buildMaskPath(W, H, tabX);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}'><path d='${path}' fill='black'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function PaletteRow({
  paletteSlot,
  isDraggingRef,
  siteType,
}: {
  paletteSlot?: HTMLElement | null;
  isDraggingRef: React.MutableRefObject<boolean>;
  /** Φ4 (Track H · D): вертикаль тенанта — фильтрует section-preset'ы в палитре. */
  siteType?: SiteType | null;
}) {
  const activeCategory = useEditorStore((s) => s.activeCategory);
  const flyoutAnchor = useEditorStore((s) => s.flyoutAnchor);
  const lastUsedByCategory = useEditorStore((s) => s.lastUsedByCategory);
  const sections = useEditorStore((s) => s.sections);
  const setActiveCategory = useEditorStore((s) => s.setActiveCategory);
  const setFlyoutAnchor = useEditorStore((s) => s.setFlyoutAnchor);
  const setDraggingWidget = useEditorStore((s) => s.setDraggingWidget);
  const setDraggingPresetId = useEditorStore((s) => s.setDraggingPresetId);
  const setDropTarget = useEditorStore((s) => s.setDropTarget);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flyoutRef = useRef<HTMLDivElement | null>(null);
  const [flyoutHeight, setFlyoutHeight] = useState(220);

  // Sliding highlight ("magic line") — один общий квадратик-индикатор
  // ездит горизонтально за активным tile вместо отдельного hover-fill у
  // каждого. Position обновляется по offsetLeft активного tile.
  const tileRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [indicatorPos, setIndicatorPos] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
  useLayoutEffect(() => {
    if (!activeCategory) return;
    const el = tileRefs.current[activeCategory];
    if (!el) return;
    setIndicatorPos({ left: el.offsetLeft, width: el.offsetWidth });
  }, [activeCategory]);

  // Gate flyout visibility — появляется только когда indicator остановился
  // (через 200ms = duration анимации). Прячется мгновенно при смене tile,
  // потом снова появляется когда новый indicator доехал. Это создаёт
  // эффект "flyout всегда под остановившимся квадратиком".
  const INDICATOR_ANIM_MS = 200;
  const [flyoutVisible, setFlyoutVisible] = useState(false);
  useEffect(() => {
    if (!activeCategory) {
      setFlyoutVisible(false);
      return;
    }
    setFlyoutVisible(false);
    const t = setTimeout(() => setFlyoutVisible(true), INDICATOR_ANIM_MS);
    return () => clearTimeout(t);
  }, [activeCategory]);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => {
      if (!isDraggingRef.current) setActiveCategory(null);
    }, 180);
  }, [cancelClose, isDraggingRef, setActiveCategory]);

  const openFlyout = useCallback(
    (key: CategoryKey, btn: HTMLElement) => {
      cancelClose();
      setActiveCategory(key);

      const r = btn.getBoundingClientRect();
      const iconCenter = r.left + r.width / 2;

      // Tab proper (между walls) = TAB_W - CONCAVE_R; центр tab proper =
      // tabX + CONCAVE_R + (TAB_W - CONCAVE_R)/2 = tabX + (TAB_W + CONCAVE_R)/2.
      // Хотим, чтобы центр tab proper был под iconCenter ⇒
      // panel.left + tabX + (TAB_W + CONCAVE_R)/2 = iconCenter.
      // Берём минимальный inset = CORNER_R + 2 — расстояние от левого края панели
      // до начала левого concave-join'а.
      const inset = CORNER_R + 2;
      let left = iconCenter - inset - (TAB_W + CONCAVE_R) / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - PANEL_W - 8));
      // tabX внутри панели — может сдвигаться если панель clamp'нулась к краю.
      const tabX = Math.round(iconCenter - left - (TAB_W + CONCAVE_R) / 2);
      // Центр язычка ровно на нижней грани tile (red-circle calibration).
      // Tongue tip pokes 11px INTO tile, 11px below tile.
      const top = r.bottom - TAB_RISE / 2;

      setFlyoutAnchor({ left, top, tabX });
    },
    [cancelClose, setActiveCategory, setFlyoutAnchor],
  );

  // Размер flyout (для пересчёта маски при смене контента).
  // flyoutVisible в deps обязателен: flyout-div монтируется ТОЛЬКО когда
  // visible=true (gate, 200ms задержка после смены activeCategory). Без
  // flyoutVisible в deps оба эффекта стреляют на activeCategory-change когда
  // flyoutRef.current ещё null → early-return → ResizeObserver не вешается,
  // flyoutHeight остаётся stale, SVG-маска растягивается неправильно →
  // verчушка folder-tab раздувается. С flyoutVisible эффекты перезапустятся
  // ПОСЛЕ монтирования и измерят правильную высоту.
  useLayoutEffect(() => {
    if (!flyoutRef.current) return;
    setFlyoutHeight(flyoutRef.current.offsetHeight);
  }, [activeCategory, flyoutAnchor, flyoutVisible]);

  useEffect(() => {
    const el = flyoutRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const h = (entries[0]?.target as HTMLDivElement).offsetHeight;
      if (h > 0) setFlyoutHeight(h);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [activeCategory, flyoutVisible]);

  const allElements = sections.flatMap((s) => s.columns.flatMap((c) => c.elements));
  const activeData = activeCategory ? categoriesData[activeCategory] : null;
  // Φ4 (Track H · D): section-preset'ы фильтруются по вертикали тенанта.
  const visibleItems = activeData ? activeData.items.filter((i) => itemVisible(i, siteType)) : [];

  const maskUrl = useMemo(() => {
    if (!flyoutAnchor) return undefined;
    return buildMaskUrl(PANEL_W, flyoutHeight, flyoutAnchor.tabX);
  }, [flyoutAnchor, flyoutHeight]);

  const paletteContent = (
    <>
      {!paletteSlot && (
        <div
          style={{
            width: 28,
            height: 28,
            background: C.accent,
            borderRadius: 7,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
            flexShrink: 0,
            userSelect: 'none',
          }}
        >
          <span style={{ color: C.bg, fontWeight: 900, fontSize: 12, letterSpacing: -1 }}>ED</span>
        </div>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* Sliding highlight indicator — едет за активным tile. Position:
            absolute внутри этого relative-контейнера; left+width берутся из
            offsetLeft/offsetWidth активного tile (через useLayoutEffect выше).
            zIndex 0 — под иконками (которые на zIndex 1). */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: indicatorPos.left,
            top: 0,
            width: indicatorPos.width,
            height: TAB_W - CONCAVE_R,
            background: C.accent,
            border: `1px solid ${C.accent}`,
            borderRadius: 6,
            opacity: activeCategory ? 1 : 0,
            transition: 'left 200ms cubic-bezier(.4,0,.2,1), width 200ms cubic-bezier(.4,0,.2,1), opacity 150ms',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        {toolTiles.map((tile) => {
          const lastType = lastUsedByCategory[tile.key];
          const allItems = Object.values(categoriesData).flatMap((c) => c.items);
          const lastWidget = lastType ? allItems.find((i) => i.type === lastType) : null;
          const displayIcon = (lastWidget?.icon ?? tile.icon) as keyof typeof LucideIcons;
          const displayName = lastWidget?.name ?? tile.name;
          const IconComp = LucideIcons[displayIcon] as React.ComponentType<{ size?: number }>;
          const isActive = activeCategory === tile.key;
          const firstItem = categoriesData[tile.key].items.find((i) => itemVisible(i, siteType));
          const dragItem = lastWidget ?? firstItem;
          const dragType = dragItem?.type as WidgetType | undefined;
          const dragPresetId = dragItem?.presetId ?? null;
          return (
            <div
              key={tile.key}
              ref={(el) => { tileRefs.current[tile.key] = el; }}
              draggable={!!dragType}
              onDragStart={() => {
                if (dragType) {
                  isDraggingRef.current = true;
                  setDraggingWidget(dragType);
                  setDraggingPresetId(dragPresetId);
                  cancelClose();
                }
              }}
              onDragEnd={() => {
                isDraggingRef.current = false;
                setDraggingWidget(null);
                setDraggingPresetId(null);
                setDropTarget(null);
              }}
              onMouseEnter={(e) => openFlyout(tile.key, e.currentTarget)}
              onMouseLeave={scheduleClose}
              title={`${displayName}${dragType ? ' · перетащи на холст' : ''}`}
              style={{
                // Tile без своего background — sliding-indicator (sibling)
                // даёт визуальное выделение. Иконка меняет цвет в зависимости
                // от isActive чтобы стать тёмной на accent-fone при hover.
                position: 'relative',
                zIndex: 1,
                width: TAB_W - CONCAVE_R,
                height: TAB_W - CONCAVE_R,
                borderRadius: 6,
                color: isActive ? C.bg : C.textMute,
                cursor: dragType ? 'grab' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 120ms',
                flexShrink: 0,
              }}
            >
              {IconComp && <IconComp size={15} />}
            </div>
          );
        })}
      </div>

      <div style={{ flex: 1 }} />

      <div
        style={{
          fontSize: 11,
          color: C.textMute,
          userSelect: 'none',
          fontFamily: 'ui-monospace, monospace',
        }}
      >
        {sections.length}s · {allElements.length}e
      </div>
    </>
  );

  return (
    <>
      {paletteSlot
        ? createPortal(paletteContent, paletteSlot)
        : (
            <div
              style={{
                height: 42,
                background: C.bg,
                borderBottom: `1px solid ${C.line}`,
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                paddingLeft: 10,
                paddingRight: 12,
                gap: 4,
                flexShrink: 0,
                zIndex: 100,
              }}
            >
              {paletteContent}
            </div>
          )}

      {activeData && flyoutAnchor && flyoutVisible && (
        <>
        <div
          ref={flyoutRef}
          className="ed-folder-tab"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          style={{
            position: 'fixed',
            // Tip язычка стоит точно на низе иконки (flyoutAnchor.top = r.bottom).
            // Tab "свисает" из-под иконки на TAB_RISE px, дальше идёт тело.
            left: flyoutAnchor.left,
            top: flyoutAnchor.top,
            width: PANEL_W,
            background: C.accent, // green/teal NAS accent — folder body
                                  // (same color as active tile → seamless merge)
            // Маска вырезает форму folder-tab с вогнутыми впадинами.
            WebkitMaskImage: maskUrl,
            maskImage: maskUrl,
            WebkitMaskSize: '100% 100%',
            maskSize: '100% 100%',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            // zIndex выше EditorHost sticky-бара (z-50). Sticky-бар имеет
            // непрозрачный bg-bg-elev — если опустить flyout ниже бара, его
            // tip скрывается за фоном. Поскольку tile активен accent-цветом
            // и язычок тоже accent — их визуальный шов невидим, выглядит
            // как один элемент.
            zIndex: 1000,
            color: C.bg,
            // filter:drop-shadow эмулирует тень с маской (box-shadow не уважает mask).
            filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.5))',
            maxHeight: '75vh',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: `${TAB_RISE + 12}px 14px 16px`,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              maxHeight: '75vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'rgba(0,0,0,0.55)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                paddingLeft: 4,
                marginBottom: 4,
              }}
            >
              {activeData.title}
            </div>
            {visibleItems.length === 0 ? (
              <div style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>
                Скоро…
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 8,
                }}
              >
                {visibleItems.map((item, idx) => {
                  const ItemIcon = LucideIcons[item.icon] as React.ComponentType<{ size?: number }>;
                  return (
                    <div
                      key={idx}
                      draggable
                      onDragStart={() => {
                        isDraggingRef.current = true;
                        setDraggingWidget(item.type);
                        setDraggingPresetId(item.presetId ?? null);
                        cancelClose();
                      }}
                      onDragEnd={() => {
                        isDraggingRef.current = false;
                        setDraggingWidget(null);
                        setDraggingPresetId(null);
                        setDropTarget(null);
                      }}
                      style={{
                        background: 'rgba(0,0,0,0.08)',
                        borderRadius: 10,
                        aspectRatio: '1',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        cursor: 'grab',
                        padding: 8,
                        transition: 'all 0.12s',
                        color: 'rgba(0,0,0,0.78)',
                        userSelect: 'none',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.16)';
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.08)';
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                      }}
                      title="Перетащи на холст"
                    >
                      {ItemIcon && <ItemIcon size={22} />}
                      <div style={{ fontSize: 10, textAlign: 'center', lineHeight: 1.2, fontWeight: 600 }}>
                        {item.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        </>
      )}
    </>
  );
}
