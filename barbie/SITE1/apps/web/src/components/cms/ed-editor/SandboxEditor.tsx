'use client';

/**
 * SandboxEditor — ED-редактор. Φ1: тонкий orchestrator поверх Zustand-store.
 *
 * Что делает этот файл:
 *  - Принимает props (embedded / initialSections / onChange / deviceMode /
 *    onDeviceModeChange / onHistoryChange / paletteSlot) — публичный контракт
 *    с EditorHost и admin-страницами не изменился.
 *  - При маунте грузит initialSections в Zustand-store, чистит undo-стек.
 *  - Подписывается на изменения sections → onChange callback (vanilla subscribe,
 *    вне React-рендера — поэтому загрузка initial-state не вызывает onChange).
 *  - Подписывается на temporal store (zundo) → onHistoryChange callback.
 *  - Экспонирует imperative undo()/redo() через forwardRef → внешний toolbar.
 *  - Глобальные клавиши: Esc, Ctrl+Z, Ctrl+Y, Delete; click-outside для
 *    закрытия floating-panel.
 *  - Рендерит PaletteRow + Canvas + StatusBar + FloatingPropsPanel +
 *    MediaPickerModal — вся UI-логика вынесена в editor/* модули.
 *
 * Документ-модель (Section/Column/CanvasElement/*Props/ElStyle) — re-export
 * из ./ed-types, как раньше.
 */

import React, { useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { MediaPickerModal } from './MediaPicker';
import { useEditorStore } from './editor/store';
import { C } from './editor/editor-constants';
import { PaletteRow } from './editor/PaletteRow';
import { Canvas } from './editor/Canvas';
import { StatusBar } from './editor/StatusBar';
import { FloatingPropsPanel } from './editor/FloatingPropsPanel';
import type { Section } from './ed-types';
import type { DeviceMode, SandboxEditorHandle } from './editor/editor-types';

export type { SandboxEditorHandle } from './editor/editor-types';
export * from './ed-types';

export const SandboxEditor = forwardRef<
  SandboxEditorHandle,
  {
    embedded?: boolean;
    initialSections?: Section[];
    onChange?: (sections: Section[]) => void;
    deviceMode?: DeviceMode;
    onDeviceModeChange?: (mode: DeviceMode) => void;
    onHistoryChange?: (state: { canUndo: boolean; canRedo: boolean }) => void;
    /** Если задан — палитра рендерится туда через portal, внутренний 42px тулбар скрывается. */
    paletteSlot?: HTMLElement | null;
  }
>(function SandboxEditor(
  {
    embedded,
    initialSections,
    onChange,
    deviceMode: deviceModeProp,
    onDeviceModeChange,
    onHistoryChange,
    paletteSlot,
  },
  ref,
) {
  const sections = useEditorStore((s) => s.sections);
  const mediaPickerTarget = useEditorStore((s) => s.mediaPickerTarget);
  const internalDeviceMode = useEditorStore((s) => s.internalDeviceMode);

  const deviceMode = deviceModeProp ?? internalDeviceMode;

  const floatingRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Latest callback refs (subscribers below capture refs, not closures).
  const onChangeRef = useRef(onChange);
  const onHistoryChangeRef = useRef(onHistoryChange);
  const onDeviceModeChangeRef = useRef(onDeviceModeChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    onHistoryChangeRef.current = onHistoryChange;
  }, [onHistoryChange]);
  useEffect(() => {
    onDeviceModeChangeRef.current = onDeviceModeChange;
  }, [onDeviceModeChange]);

  // Mount: prime store from initialSections; install store subscriptions.
  // Init runs once — matches legacy useState(initialSections) one-shot behavior.
  useEffect(() => {
    useEditorStore.getState().loadSections(initialSections ?? []);

    const unsubMain = useEditorStore.subscribe((state, prev) => {
      if (state.sections !== prev.sections) {
        onChangeRef.current?.(state.sections);
      }
    });
    const unsubTemporal = useEditorStore.temporal.subscribe((state) => {
      onHistoryChangeRef.current?.({
        canUndo: state.pastStates.length > 0,
        canRedo: state.futureStates.length > 0,
      });
    });
    return () => {
      unsubMain();
      unsubTemporal();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Imperative undo/redo handle for external toolbar.
  const undo = useCallback(() => useEditorStore.temporal.getState().undo(), []);
  const redo = useCallback(() => useEditorStore.temporal.getState().redo(), []);
  useImperativeHandle(ref, () => ({ undo, redo }), [undo, redo]);

  // Sync internal deviceMode from controlled prop, if parent uses controlled mode.
  useEffect(() => {
    if (deviceModeProp !== undefined) {
      useEditorStore.getState().setInternalDeviceMode(deviceModeProp);
    }
  }, [deviceModeProp]);

  // Keep onDeviceModeChange ref live (no internal toolbar invokes it in Φ1; parent does).
  void onDeviceModeChangeRef;

  // Global keyboard shortcuts + click-outside for floating panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const store = useEditorStore.getState();
      // Не перехватываем shortcuts когда пользователь печатает в input/textarea/contenteditable.
      const inTextField =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable);

      if (e.key === 'Escape') {
        store.setActiveCategory(null);
        store.setSelectedId(null);
        store.setFloatingPanel(null);
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        useEditorStore.temporal.getState().undo();
      }
      // Φ5: Ctrl+Shift+Z = redo (в дополнение к Ctrl+Y).
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && (e.key === 'Z' || e.key === 'z')))) {
        e.preventDefault();
        useEditorStore.temporal.getState().redo();
      }
      // Φ5: Ctrl+C / Ctrl+V (только если есть selected element и не в input)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'c' && store.selectedId && !inTextField) {
        e.preventDefault();
        store.copyElement(store.selectedId);
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'v' && store.clipboardElement && !inTextField) {
        e.preventDefault();
        store.pasteElement(store.selectedId);
      }
      if (e.key === 'Delete' && store.selectedId && !inTextField) {
        store.deleteElement(store.selectedId);
        store.setFloatingPanel(null);
      }
    };
    const onMouseDown = (e: MouseEvent) => {
      if (floatingRef.current && !floatingRef.current.contains(e.target as Node)) {
        useEditorStore.getState().setFloatingPanel(null);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: embedded ? '100%' : '100vh',
        overflow: 'hidden',
        background: C.bgElev,
        color: C.text,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <PaletteRow paletteSlot={paletteSlot} isDraggingRef={isDraggingRef} />
        <Canvas deviceMode={deviceMode} isDraggingRef={isDraggingRef} />
      </div>

      {!embedded && <StatusBar deviceMode={deviceMode} />}

      <FloatingPropsPanel ref={floatingRef} />

      <MediaPickerModal
        open={mediaPickerTarget !== null}
        onClose={() => useEditorStore.getState().setMediaPickerTarget(null)}
        onSelect={(url: string) => {
          const state = useEditorStore.getState();
          if (!state.mediaPickerTarget) return;
          const el = state.sections
            .flatMap((s) => s.columns.flatMap((c) => c.elements))
            .find((e) => e.id === state.mediaPickerTarget);
          if (el) state.updateElement({ ...el, image: { ...(el.image ?? {}), url } });
          state.setMediaPickerTarget(null);
        }}
      />

      {/* sections referenced for type-narrowing; React optimizer keeps it. */}
      {sections.length < 0 && null}
    </div>
  );
});
