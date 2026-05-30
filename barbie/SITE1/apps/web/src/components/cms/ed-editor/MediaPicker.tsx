'use client';

/**
 * MediaPicker — реальный picker над NAS `/v1/media` для ED-editor (Image-виджет).
 *
 * Заменил Phase-0 заглушку (MediaPickerStub). Контракт прежний —
 * `{ open, onClose, onSelect(url) }` — поэтому SandboxEditor не меняет логику,
 * только импорт.
 *
 * Listing tenant-scoped: `/v1/media` резолвит тенант из JWT-контекста (apiFetch
 * шлёт Bearer). Показываем только `status=ready` и `mime` image/*. Загрузка
 * новых файлов — через /admin/media (отдельный экран, Phase F); здесь — выбор
 * уже загруженного.
 */
import { useEffect, useState } from 'react';
import { X, ImageOff, Loader2 } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';

interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

interface MediaItem {
  id: string;
  key: string;
  url: string;
  mime: string;
  alt: string | null;
}

interface ListMediaResponse {
  data: MediaItem[];
  total: number;
}

export function MediaPickerModal({ open, onClose, onSelect }: MediaPickerProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiFetch<ListMediaResponse>('/v1/media?status=ready&limit=200')
      .then((res) => {
        if (cancelled) return;
        setItems(res.data.filter((m) => m.mime.startsWith('image/')));
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(
          e instanceof ApiError ? (e.body.message ?? `HTTP ${e.status}`) : String(e),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Esc закрывает.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

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
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgb(var(--bg-elev))',
          border: '1px solid rgb(var(--line-strong))',
          borderRadius: 12,
          width: 'min(720px, 92vw)',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          color: 'rgb(var(--text))',
          fontFamily: "'Inter', system-ui, sans-serif",
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid rgb(var(--line))',
          }}
        >
          <h3 style={{ margin: 0, fontSize: 14, color: 'rgb(var(--accent-2))', fontWeight: 700 }}>
            Выбор изображения
          </h3>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            style={{ background: 'transparent', border: 'none', color: 'rgb(var(--text-mute))', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 16, overflowY: 'auto' }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgb(var(--text-mute))', fontSize: 13, padding: '24px 0', justifyContent: 'center' }}>
              <Loader2 size={16} className="animate-spin" /> Загрузка медиа…
            </div>
          )}

          {error && (
            <div style={{ color: 'rgb(var(--red))', fontSize: 13, fontFamily: 'monospace', padding: '12px 0' }}>
              Ошибка загрузки медиа: {error}
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div style={{ textAlign: 'center', color: 'rgb(var(--text-mute))', fontSize: 13, padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <ImageOff size={28} />
              <div>Нет загруженных изображений у этого тенанта.</div>
              <div style={{ fontSize: 11, fontStyle: 'italic' }}>
                Загрузите файлы через <code style={{ fontFamily: 'monospace' }}>/admin/media</code> (Phase F).
              </div>
            </div>
          )}

          {!loading && items.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
              {items.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onSelect(m.url);
                    onClose();
                  }}
                  title={m.alt ?? m.key.split('/').pop() ?? m.key}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: '2px solid transparent',
                    background: 'rgb(var(--surface))',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'border-color 120ms',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgb(var(--accent-2))';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.url}
                    alt={m.alt ?? ''}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
