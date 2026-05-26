'use client';
import React, { useState, useCallback } from 'react';
import * as LucideIcons from 'lucide-react';
import { useEditorStore } from './store';
import { WidgetView } from '../WidgetView';
import { C } from './editor-constants';
import { newElement, newSection, computePanelPos } from './editor-helpers';
import { defaultElStyle, type CanvasElement, type Column, type Section } from '../ed-types';
import type { DeviceMode, DropTarget } from './editor-types';

function DropZone({
  isActive,
  isEmpty,
  onDragOver,
  onDrop,
}: {
  isActive?: boolean;
  isEmpty?: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        height: isActive ? 44 : isEmpty ? 64 : 6,
        background: isActive ? 'rgb(var(--accent-2) / 0.12)' : 'transparent',
        border: isActive
          ? `2px dashed ${C.accent}`
          : isEmpty
          ? `2px dashed ${C.line}`
          : 'none',
        borderRadius: 6,
        margin: '2px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.12s',
        color: isActive ? C.accent : C.textMute,
        fontSize: 12,
      }}
    >
      {isEmpty && !isActive && '+ перетащи виджет'}
      {isActive && '↓ отпустить здесь'}
    </div>
  );
}

function ElementView({
  el,
  selected,
  onSelect,
  onRightClick,
  onElementChange,
}: {
  el: CanvasElement;
  selected: boolean;
  onSelect: () => void;
  onRightClick: (e: React.MouseEvent) => void;
  onElementChange?: (updated: CanvasElement) => void;
}) {
  const [hov, setHov] = useState(false);
  const s = el.elStyle ?? defaultElStyle();
  const inlineEditable = el.type === 'heading' || el.type === 'text';
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect();
        onRightClick(e);
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative',
        outline: selected
          ? `2px solid ${C.accent}`
          : hov
          ? `2px dashed ${C.textMute}`
          : '2px solid transparent',
        borderRadius: s.borderRadius || 6,
        margin: '2px 0',
        // Φ4: для редактируемых текстов курсор = text (контент-editable хочет text);
        // для прочих — pointer (выбор/dnd).
        cursor: inlineEditable ? 'text' : 'pointer',
        transition: 'outline 0.1s',
        background: selected
          ? `${s.background || 'rgb(var(--accent-2) / 0.04)'}`
          : s.background || 'transparent',
        padding: `${s.paddingTop}px ${s.paddingRight}px ${s.paddingBottom}px ${s.paddingLeft}px`,
        opacity: s.opacity / 100,
      }}
    >
      {selected && (
        <div
          style={{
            position: 'absolute',
            top: -20,
            left: 0,
            background: C.accent,
            color: C.bg,
            fontSize: 9,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '4px 4px 0 0',
            zIndex: 5,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          {el.type}
        </div>
      )}
      <WidgetView el={el} mode="editor" onElementChange={onElementChange} />
    </div>
  );
}

function ColumnView({
  column,
  section,
  selectedId,
  dropTarget,
  isDragging,
  onSelect,
  onRightClick,
  onDragOver,
  onDrop,
  onElementChange,
}: {
  column: Column;
  section: Section;
  selectedId: string | null;
  dropTarget: DropTarget | null;
  isDragging: boolean;
  onSelect: (id: string) => void;
  onRightClick: (e: React.MouseEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, s: string, c: string, i: number) => void;
  onDrop: (e: React.DragEvent, s: string, c: string, i: number) => void;
  onElementChange?: (updated: CanvasElement) => void;
}) {
  const isTarget = dropTarget?.columnId === column.id;
  return (
    <div
      style={{
        flex: column.span,
        minHeight: 80,
        border: isDragging ? `2px dashed ${C.line}` : '2px solid transparent',
        borderRadius: 8,
        transition: 'border-color 0.15s',
      }}
    >
      {column.elements.map((el, idx) => (
        <React.Fragment key={el.id}>
          <DropZone
            isActive={isTarget && dropTarget?.index === idx}
            onDragOver={(e) => onDragOver(e, section.id, column.id, idx)}
            onDrop={(e) => onDrop(e, section.id, column.id, idx)}
          />
          <ElementView
            el={el}
            selected={selectedId === el.id}
            onSelect={() => onSelect(el.id)}
            onRightClick={(e) => onRightClick(e, el.id)}
            onElementChange={onElementChange}
          />
        </React.Fragment>
      ))}
      <DropZone
        isActive={isTarget && dropTarget?.index === column.elements.length}
        isEmpty={column.elements.length === 0}
        onDragOver={(e) => onDragOver(e, section.id, column.id, column.elements.length)}
        onDrop={(e) => onDrop(e, section.id, column.id, column.elements.length)}
      />
    </div>
  );
}

function SectionView({
  section,
  selectedId,
  dropTarget,
  isDragging,
  onSelect,
  onRightClick,
  onSectionContext,
  onDragOver,
  onDrop,
  onDelete,
  onElementChange,
}: {
  section: Section;
  selectedId: string | null;
  dropTarget: DropTarget | null;
  isDragging: boolean;
  onSelect: (id: string) => void;
  onRightClick: (e: React.MouseEvent, id: string) => void;
  onSectionContext: (e: React.MouseEvent, sectionId: string) => void;
  onDragOver: (e: React.DragEvent, s: string, c: string, i: number) => void;
  onDrop: (e: React.DragEvent, s: string, c: string, i: number) => void;
  onDelete: () => void;
  onElementChange?: (updated: CanvasElement) => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSectionContext(e, section.id);
      }}
      style={{
        position: 'relative',
        padding: section.padding,
        borderTop: `1px solid ${C.line}`,
        outline: hov ? `2px dashed ${C.textMute}` : '2px solid transparent',
        outlineOffset: '-2px',
        transition: 'outline-color 0.12s',
      }}
    >
      {hov && (
        <div
          style={{
            position: 'absolute',
            top: 6,
            right: 10,
            display: 'flex',
            gap: 4,
            zIndex: 10,
          }}
        >
          <div
            style={{
              background: C.surface2,
              border: `1px solid ${C.line}`,
              borderRadius: 6,
              padding: '3px 10px',
              fontSize: 10,
              color: C.textDim,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <LucideIcons.LayoutTemplate size={10} /> Секция · ПКМ — свойства
          </div>
          <button
            onClick={onDelete}
            style={{
              background: C.surface2,
              border: `1px solid ${C.line}`,
              borderRadius: 6,
              color: C.textMute,
              cursor: 'pointer',
              padding: '3px 8px',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <LucideIcons.Trash2 size={11} />
          </button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 16 }}>
        {section.columns.map((col) => (
          <ColumnView
            key={col.id}
            column={col}
            section={section}
            selectedId={selectedId}
            dropTarget={dropTarget}
            isDragging={isDragging}
            onSelect={onSelect}
            onRightClick={onRightClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onElementChange={onElementChange}
          />
        ))}
      </div>
    </div>
  );
}

export function Canvas({
  deviceMode,
  isDraggingRef,
}: {
  deviceMode: DeviceMode;
  isDraggingRef: React.MutableRefObject<boolean>;
}) {
  const sections = useEditorStore((s) => s.sections);
  const selectedId = useEditorStore((s) => s.selectedId);
  const dropTarget = useEditorStore((s) => s.dropTarget);
  const draggingWidget = useEditorStore((s) => s.draggingWidget);
  const draggingPresetId = useEditorStore((s) => s.draggingPresetId);
  const showAddSection = useEditorStore((s) => s.showAddSection);
  const activeCategory = useEditorStore((s) => s.activeCategory);
  const previewMode = useEditorStore((s) => s.previewMode);

  const setSelectedId = useEditorStore((s) => s.setSelectedId);
  const setActiveCategory = useEditorStore((s) => s.setActiveCategory);
  const setDropTarget = useEditorStore((s) => s.setDropTarget);
  const setDraggingWidget = useEditorStore((s) => s.setDraggingWidget);
  const setDraggingPresetId = useEditorStore((s) => s.setDraggingPresetId);
  const setFloatingPanel = useEditorStore((s) => s.setFloatingPanel);
  const setPanelTab = useEditorStore((s) => s.setPanelTab);
  const setShowAddSection = useEditorStore((s) => s.setShowAddSection);
  const insertElement = useEditorStore((s) => s.insertElement);
  const addSection = useEditorStore((s) => s.addSection);
  const deleteSection = useEditorStore((s) => s.deleteSection);
  const rememberLastUsed = useEditorStore((s) => s.rememberLastUsed);
  // Φ4: inline edit — heading/text коммитят прямо в стор без открытия Properties.
  const updateElement = useEditorStore((s) => s.updateElement);

  const handleDragOver = useCallback(
    (e: React.DragEvent, sId: string, cId: string, idx: number) => {
      e.preventDefault();
      setDropTarget({ sectionId: sId, columnId: cId, index: idx });
    },
    [setDropTarget],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, sId: string, cId: string, idx: number) => {
      e.preventDefault();
      if (!draggingWidget) return;
      // Φ3: для section-preset нужен presetId — пробрасываем в фабрику.
      const el = newElement(
        draggingWidget,
        draggingPresetId ? { presetId: draggingPresetId } : undefined,
      );
      insertElement(sId, cId, idx, el);
      isDraggingRef.current = false;
      setDraggingWidget(null);
      setDraggingPresetId(null);
      setDropTarget(null);
      if (activeCategory) rememberLastUsed(activeCategory, draggingWidget);
    },
    [
      draggingWidget,
      draggingPresetId,
      activeCategory,
      insertElement,
      isDraggingRef,
      setDraggingWidget,
      setDraggingPresetId,
      setDropTarget,
      rememberLastUsed,
    ],
  );

  const openPanel = useCallback(
    (e: React.MouseEvent, id: string) => {
      setFloatingPanel({ ...computePanelPos(e), kind: 'element', id });
      setPanelTab('content');
    },
    [setFloatingPanel, setPanelTab],
  );

  const openSectionPanel = useCallback(
    (e: React.MouseEvent, id: string) => {
      setFloatingPanel({ ...computePanelPos(e), kind: 'section', id });
    },
    [setFloatingPanel],
  );

  const deviceWidths: Record<DeviceMode, string> = {
    desktop: '100%',
    tablet: '768px',
    mobile: '390px',
  };

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        background: C.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '0 0 40px',
      }}
      onClick={(e) => {
        if ((e.target as HTMLElement).dataset.canvasBg) {
          setSelectedId(null);
          setActiveCategory(null);
        }
      }}
    >
      <div
        data-canvas-bg="1"
        style={{
          width: deviceWidths[deviceMode],
          maxWidth: '100%',
          minHeight: '100%',
          background: C.bgElev,
          transition: 'width 0.3s',
          boxShadow: deviceMode !== 'desktop' ? '0 0 60px rgba(0,0,0,0.6)' : 'none',
        }}
      >
        {sections.length === 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 360,
              color: C.textMute,
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <LucideIcons.LayoutTemplate size={52} strokeWidth={1} />
            <div style={{ fontSize: 15 }}>Холст пуст — добавь секцию ниже</div>
          </div>
        )}

        {sections.map((section) => (
          <SectionView
            key={section.id}
            section={section}
            // В preview-mode выключаем visual chrome (selection outline, drop zones).
            selectedId={previewMode ? null : selectedId}
            dropTarget={previewMode ? null : dropTarget}
            isDragging={previewMode ? false : !!draggingWidget}
            onSelect={setSelectedId}
            onRightClick={openPanel}
            onSectionContext={openSectionPanel}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDelete={() => deleteSection(section.id)}
            onElementChange={updateElement}
          />
        ))}

        {!previewMode && <div style={{ padding: '20px 24px' }}>
          {showAddSection ? (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  onClick={() => {
                    addSection(newSection(n));
                    setShowAddSection(false);
                  }}
                  style={{
                    background: C.surface,
                    border: `2px dashed ${C.line}`,
                    borderRadius: 12,
                    padding: '14px 22px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    minWidth: 90,
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = C.accent)}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = C.line)}
                >
                  <div style={{ display: 'flex', gap: 4 }}>
                    {Array.from({ length: n }, (_, i) => (
                      <div
                        key={i}
                        style={{
                          width: 22,
                          height: 34,
                          background: C.surface2,
                          borderRadius: 3,
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: C.textDim }}>
                    {n} {n === 1 ? 'колонка' : 'колонки'}
                  </div>
                </div>
              ))}
              <div
                onClick={() => setShowAddSection(false)}
                style={{
                  border: `2px dashed ${C.line}`,
                  borderRadius: 12,
                  padding: '14px 22px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: C.textMute,
                  fontSize: 12,
                }}
              >
                Отмена
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddSection(true)}
              style={{
                width: '100%',
                background: 'transparent',
                border: `2px dashed ${C.line}`,
                color: C.textMute,
                borderRadius: 10,
                padding: '12px 0',
                cursor: 'pointer',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = C.accent;
                (e.currentTarget as HTMLElement).style.color = C.accent;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = C.line;
                (e.currentTarget as HTMLElement).style.color = C.textMute;
              }}
            >
              <LucideIcons.Plus size={16} /> Добавить секцию
            </button>
          )}
        </div>}
      </div>
    </div>
  );
}
