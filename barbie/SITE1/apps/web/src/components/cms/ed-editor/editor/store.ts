/**
 * ED-editor Zustand store — single source of truth for editor state.
 *
 * Document tree (`sections`) tracked by zundo temporal middleware →
 * undo/redo. UI state (selection, drag, palette, floating panel) lives
 * here too but is excluded from undo via `partialize`.
 *
 * Pause/resume conventions:
 *  - `loadSections` pauses temporal during the initial set, then clears
 *    history so first-load doesn't appear as an undoable step.
 *  - `updateElement` pauses temporal so per-keystroke property edits do
 *    not flood undo stack (matches behavior of the legacy editor; finer
 *    grouping arrives in Φ5).
 */
import { create } from 'zustand';
import { temporal } from 'zundo';
import type { Section, CanvasElement, WidgetType } from '../ed-types';
import type {
  CategoryKey,
  DeviceMode,
  PanelTab,
  FloatingPanel,
  DropTarget,
} from './editor-types';

interface EditorState {
  // Document — zundo-tracked via partialize
  sections: Section[];

  // Selection / drag / palette UI state (NOT in undo stack)
  selectedId: string | null;
  dropTarget: DropTarget | null;
  draggingWidget: WidgetType | null;
  /** Φ3: при перетаскивании section-preset тайла — конкретный presetId. */
  draggingPresetId: string | null;
  activeCategory: CategoryKey | null;
  flyoutAnchor: { left: number; top: number; tabX: number } | null;
  lastUsedByCategory: Partial<Record<CategoryKey, WidgetType>>;
  floatingPanel: FloatingPanel | null;
  panelTab: PanelTab;
  hoveredPanelTab: PanelTab | null;
  showAddSection: boolean;
  mediaPickerTarget: string | null;
  internalDeviceMode: DeviceMode;
  /** Φ5: clipboard для Ctrl+C/V — копия CanvasElement без id (id регенерируется при paste). */
  clipboardElement: CanvasElement | null;
  /** Φ5: режим превью — скрывает drop-zones и outlines, чтобы видеть финальный вид. */
  previewMode: boolean;

  // Lifecycle
  loadSections: (sections: Section[]) => void;

  // UI setters
  setSelectedId: (id: string | null) => void;
  setDropTarget: (t: DropTarget | null) => void;
  setDraggingWidget: (w: WidgetType | null) => void;
  setDraggingPresetId: (id: string | null) => void;
  setActiveCategory: (c: CategoryKey | null) => void;
  setFlyoutAnchor: (a: { left: number; top: number; tabX: number } | null) => void;
  rememberLastUsed: (cat: CategoryKey, w: WidgetType) => void;
  setFloatingPanel: (p: FloatingPanel | null) => void;
  setPanelTab: (t: PanelTab) => void;
  setHoveredPanelTab: (t: PanelTab | null) => void;
  setShowAddSection: (v: boolean) => void;
  setMediaPickerTarget: (id: string | null) => void;
  setInternalDeviceMode: (m: DeviceMode) => void;
  setClipboardElement: (el: CanvasElement | null) => void;
  setPreviewMode: (v: boolean) => void;
  /** Φ5: copy selected → store.clipboardElement. */
  copyElement: (elementId: string) => void;
  /** Φ5: paste clipboardElement после указанного element (или в конец первой колонки первой секции). */
  pasteElement: (afterElementId?: string | null) => void;

  // Document mutations (track in undo unless noted)
  insertElement: (sectionId: string, columnId: string, index: number, element: CanvasElement) => void;
  deleteElement: (elementId: string) => void;
  /** Property edits — NOT pushed to undo (legacy parity). */
  updateElement: (updated: CanvasElement) => void;
  addSection: (s: Section) => void;
  deleteSection: (sectionId: string) => void;
  updateSectionPadding: (sectionId: string, padding: string) => void;
}

export const useEditorStore = create<EditorState>()(
  temporal(
    (set, get) => ({
      sections: [],
      selectedId: null,
      dropTarget: null,
      draggingWidget: null,
      draggingPresetId: null,
      activeCategory: null,
      flyoutAnchor: null,
      lastUsedByCategory: {},
      floatingPanel: null,
      panelTab: 'content',
      hoveredPanelTab: null,
      showAddSection: false,
      mediaPickerTarget: null,
      internalDeviceMode: 'desktop',
      clipboardElement: null,
      previewMode: false,

      loadSections: (sections) => {
        useEditorStore.temporal.getState().pause();
        set({
          sections,
          selectedId: null,
          dropTarget: null,
          draggingWidget: null,
          draggingPresetId: null,
          floatingPanel: null,
          activeCategory: null,
          flyoutAnchor: null,
          showAddSection: false,
          mediaPickerTarget: null,
          previewMode: false,
        });
        useEditorStore.temporal.getState().resume();
        useEditorStore.temporal.getState().clear();
      },

      setSelectedId: (selectedId) => set({ selectedId }),
      setDropTarget: (dropTarget) => set({ dropTarget }),
      setDraggingWidget: (draggingWidget) => set({ draggingWidget }),
      setDraggingPresetId: (draggingPresetId) => set({ draggingPresetId }),
      setActiveCategory: (activeCategory) => set({ activeCategory }),
      setFlyoutAnchor: (flyoutAnchor) => set({ flyoutAnchor }),
      rememberLastUsed: (cat, w) =>
        set((s) => ({ lastUsedByCategory: { ...s.lastUsedByCategory, [cat]: w } })),
      setFloatingPanel: (floatingPanel) => set({ floatingPanel }),
      setPanelTab: (panelTab) => set({ panelTab }),
      setHoveredPanelTab: (hoveredPanelTab) => set({ hoveredPanelTab }),
      setShowAddSection: (showAddSection) => set({ showAddSection }),
      setMediaPickerTarget: (mediaPickerTarget) => set({ mediaPickerTarget }),
      setInternalDeviceMode: (internalDeviceMode) => set({ internalDeviceMode }),
      setClipboardElement: (clipboardElement) => set({ clipboardElement }),
      setPreviewMode: (previewMode) => set({ previewMode }),

      copyElement: (elementId) => {
        const found = get()
          .sections.flatMap((s) => s.columns.flatMap((c) => c.elements))
          .find((e) => e.id === elementId);
        if (found) set({ clipboardElement: { ...found } });
      },

      pasteElement: (afterElementId) => {
        const clip = get().clipboardElement;
        if (!clip) return;
        const newId = Math.random().toString(36).slice(2, 9);
        const cloned: CanvasElement = { ...clip, id: newId };

        // Если afterElementId задан — вставляем сразу после; иначе в конец первой колонки первой секции.
        if (afterElementId) {
          const next = get().sections.map((s) => ({
            ...s,
            columns: s.columns.map((c) => {
              const idx = c.elements.findIndex((e) => e.id === afterElementId);
              if (idx < 0) return c;
              const arr = [...c.elements];
              arr.splice(idx + 1, 0, cloned);
              return { ...c, elements: arr };
            }),
          }));
          set({ sections: next, selectedId: cloned.id });
          return;
        }
        const first = get().sections[0];
        if (!first) return;
        const next = get().sections.map((s, sIdx) =>
          sIdx !== 0
            ? s
            : {
                ...s,
                columns: s.columns.map((c, cIdx) =>
                  cIdx !== 0 ? c : { ...c, elements: [...c.elements, cloned] },
                ),
              },
        );
        set({ sections: next, selectedId: cloned.id });
      },

      insertElement: (sectionId, columnId, index, element) => {
        const next = get().sections.map((s) =>
          s.id !== sectionId
            ? s
            : {
                ...s,
                columns: s.columns.map((c) =>
                  c.id !== columnId
                    ? c
                    : {
                        ...c,
                        elements: (() => {
                          const arr = [...c.elements];
                          arr.splice(index, 0, element);
                          return arr;
                        })(),
                      },
                ),
              },
        );
        set({ sections: next, selectedId: element.id });
      },

      deleteElement: (elementId) => {
        const next = get().sections.map((s) => ({
          ...s,
          columns: s.columns.map((c) => ({
            ...c,
            elements: c.elements.filter((e) => e.id !== elementId),
          })),
        }));
        set({ sections: next, selectedId: null });
      },

      updateElement: (updated) => {
        useEditorStore.temporal.getState().pause();
        const next = get().sections.map((s) => ({
          ...s,
          columns: s.columns.map((c) => ({
            ...c,
            elements: c.elements.map((e) => (e.id === updated.id ? updated : e)),
          })),
        }));
        set({ sections: next });
        useEditorStore.temporal.getState().resume();
      },

      addSection: (newS) => set({ sections: [...get().sections, newS] }),

      deleteSection: (sectionId) =>
        set({
          sections: get().sections.filter((s) => s.id !== sectionId),
          selectedId: null,
          floatingPanel: null,
        }),

      updateSectionPadding: (sectionId, padding) =>
        set({
          sections: get().sections.map((s) =>
            s.id === sectionId ? { ...s, padding } : s,
          ),
        }),
    }),
    {
      partialize: (state) => ({ sections: state.sections }),
      limit: 100,
    },
  ),
);
