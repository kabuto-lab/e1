/**
 * ED-editor internal types — UI/state-only.
 * Persistent document model is in `../ed-types.ts`.
 */
import type * as LucideIcons from 'lucide-react';
import type { WidgetType } from '../ed-types';

export type CategoryKey =
  | 'sections'
  | 'textual'
  | 'buttons'
  | 'media'
  | 'icons'
  | 'structure'
  | 'interactive';

export type DeviceMode = 'desktop' | 'tablet' | 'mobile';
export type PanelTab = 'content' | 'style' | 'css';

export interface FloatingPanel {
  x: number;
  y: number;
  kind: 'element' | 'section';
  id: string;
}

export interface DropTarget {
  sectionId: string;
  columnId: string;
  index: number;
}

export interface WidgetDef {
  type: WidgetType;
  icon: keyof typeof LucideIcons;
  name: string;
  /** Φ3: для type='section-preset' — конкретный id из BLOCK_REGISTRY. */
  presetId?: string;
}

// Imperative handle exposed by SandboxEditor via forwardRef.
export interface SandboxEditorHandle {
  undo: () => void;
  redo: () => void;
}
