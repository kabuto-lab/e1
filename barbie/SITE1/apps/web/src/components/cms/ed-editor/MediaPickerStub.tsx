'use client';

/**
 * MediaPickerStub — заглушка для встроенного ED-editor.
 *
 * Оригинальный escort-platform `MediaPickerModal` использует `api.getMyMedia()` /
 * `api.generatePresignedUrl()` / `api.uploadToMinIO()` — внутренний API того
 * проекта, которого в NAS нет (у нас `/v1/media` с другой shape).
 *
 * Phase 0 интеграции — image-picker отключён: вместо вставки картинок
 * пользователь использует placeholder в виджете Image. Когда будет готов
 * настоящий picker над NAS `/v1/media`, заменим импорт в SandboxEditor.tsx
 * на реальный компонент с тем же интерфейсом `{ open, onClose, onSelect }`.
 */
import { X } from 'lucide-react';

interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

export function MediaPickerModal({ open, onClose }: MediaPickerProps) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#252525',
          border: '1px solid #484848',
          borderRadius: 12,
          padding: 24,
          maxWidth: 420,
          color: '#ccc',
          fontFamily: "'Inter', system-ui, sans-serif",
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: 'transparent',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
          }}
        >
          <X size={16} />
        </button>
        <h3 style={{ margin: '0 0 12px', color: '#00ffcc', fontSize: 14 }}>Media picker</h3>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
          NAS media-picker для ED-editor пока не интегрирован. В Phase 0 загружай
          картинки через <code style={{ background: '#1a1a1a', padding: '2px 6px', borderRadius: 3 }}>/admin/media</code> (когда будет), а сюда вставляй S3 URL вручную.
        </p>
      </div>
    </div>
  );
}
