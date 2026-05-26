'use client';
import React from 'react';
import { useEditorStore } from './store';
import { C } from './editor-constants';
import type { DeviceMode } from './editor-types';

export function StatusBar({ deviceMode }: { deviceMode: DeviceMode }) {
  const sections = useEditorStore((s) => s.sections);
  const selectedId = useEditorStore((s) => s.selectedId);
  const allElements = sections.flatMap((s) => s.columns.flatMap((c) => c.elements));
  const selectedType = selectedId ? allElements.find((e) => e.id === selectedId)?.type ?? '' : '';
  return (
    <div
      style={{
        height: 26,
        background: C.bgElev,
        borderTop: `1px solid ${C.line}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        justifyContent: 'space-between',
        fontSize: 11,
        color: C.textMute,
        flexShrink: 0,
      }}
    >
      <div>NAS · ED</div>
      <div>
        {deviceMode} •{' '}
        {selectedId ? `выбран: ${selectedType}` : 'ПКМ по элементу → свойства'} • Ctrl+Z • Del
      </div>
    </div>
  );
}
