/**
 * Модалка выбора медиа в духе WordPress: «Загрузить» или «Медиатека».
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, ImageIcon, Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';

type LibraryRow = { id: string; url: string; name?: string };

export type ModelProfileMediaModalProps = {
  open: boolean;
  onClose: () => void;
  /** Тема wp-admin (светлая) — палитра как в WordPress */
  isWpAdmin: boolean;
  modelId: string | null;
  /** Слот сетки 0..35 */
  slotIndex: number;
  busy?: boolean;
  onUpload: (file: File) => Promise<void>;
  onAssignFromLibrary: (mediaId: string) => Promise<void>;
};

type TabId = 'upload' | 'library';

function normalizeLibraryItem(row: Record<string, unknown>): LibraryRow | null {
  const id = typeof row.id === 'string' ? row.id : '';
  if (!id) return null;
  const url =
    (typeof row.cdnUrl === 'string' && row.cdnUrl) ||
    (typeof row.cdn_url === 'string' && row.cdn_url) ||
    '';
  if (!url.trim()) return null;
  const ft = row.fileType ?? row.file_type;
  const mime = String(row.mimeType || row.mime_type || '');
  if (ft && ft !== 'photo' && !mime.startsWith('image/')) return null;
  if (!ft && !mime.startsWith('image/')) return null;
  const meta = row.metadata as { originalName?: string } | undefined;
  const name =
    (typeof meta?.originalName === 'string' && meta.originalName) ||
    (typeof row.storageKey === 'string' && row.storageKey.split('/').pop()) ||
    id.slice(0, 8);
  return { id, url, name };
}

export function ModelProfileMediaModal({
  open,
  onClose,
  isWpAdmin,
  modelId,
  slotIndex,
  busy = false,
  onUpload,
  onAssignFromLibrary,
}: ModelProfileMediaModalProps) {
  const [tab, setTab] = useState<TabId>('upload');
  const [libraryItems, setLibraryItems] = useState<LibraryRow[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const loadLibrary = useCallback(async () => {
    setLibraryLoading(true);
    setLibraryError(null);
    try {
      const raw = await api.getMyMedia();
      if (!Array.isArray(raw)) {
        setLibraryItems([]);
        return;
      }
      const items: LibraryRow[] = [];
      for (const row of raw) {
        const n = normalizeLibraryItem(row as Record<string, unknown>);
        if (n) items.push(n);
      }
      setLibraryItems(items);
    } catch (e: unknown) {
      setLibraryError(e instanceof Error ? e.message : 'Не удалось загрузить медиатеку');
      setLibraryItems([]);
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    // Как в WP: сначала медиатека; загрузка с ПК — отдельная вкладка и явная кнопка (не клик по всей зоне).
    setTab(modelId ? 'library' : 'upload');
    setSelectedId(null);
    setLibraryError(null);
    setDragOver(false);
  }, [open, slotIndex, modelId]);

  useEffect(() => {
    if (open && tab === 'library' && modelId) void loadLibrary();
  }, [open, tab, modelId, loadLibrary]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  const handleFile = async (file: File | undefined | null) => {
    if (!file || busy) return;
    await onUpload(file);
  };

  const handleInsertLibrary = async () => {
    if (!selectedId || !modelId || busy) return;
    await onAssignFromLibrary(selectedId);
  };

  const canUse = Boolean(modelId);

  const shell = isWpAdmin
    ? {
        overlay: 'bg-black/60',
        frame: 'bg-white text-[#2c3338] shadow-[0_5px_15px_rgba(0,0,0,0.2)]',
        header: 'border-b border-[#dcdcde] bg-[#fcfcfc]',
        title: 'text-[#1d2327]',
        close: 'text-[#646970] hover:text-[#1d2327] hover:bg-[#f0f0f1]',
        sidebar: 'w-[152px] shrink-0 border-r border-[#dcdcde] bg-[#f6f7f7]',
        navItem: 'block w-full border-0 px-3 py-2.5 text-left text-[13px] transition-colors',
        navInactive: 'text-[#50575e] hover:bg-[#f0f0f1] hover:text-[#1d2327]',
        navActive: 'border-l-[3px] border-l-[#2271b1] bg-white font-semibold text-[#2271b1]',
        content: 'bg-white',
        dropBorder: 'border-[#c3c4c7] bg-[#f6f7f7]',
        dropActive: 'border-[#2271b1] bg-[#f0f6fc]',
        btnPrimary:
          'rounded border border-[#2271b1] bg-[#2271b1] px-3 py-1.5 text-xs font-normal text-white shadow-sm hover:bg-[#135e96] disabled:opacity-45',
        btnSecondary:
          'rounded border border-[#c3c4c7] bg-[#f6f7f7] px-3 py-1.5 text-xs text-[#2c3338] hover:bg-white disabled:opacity-45',
        muted: 'text-[#646970]',
        thumbRing: 'ring-[#2271b1]',
        notice: 'rounded-sm border border-[#c3c4c7] bg-[#f6f7f7] p-3 text-xs text-[#50575e]',
      }
    : {
        overlay: 'bg-black/75',
        frame: 'border border-white/[0.08] bg-[#1a1a1a] text-gray-200 shadow-2xl',
        header: 'border-b border-white/[0.08] bg-[#141414]',
        title: 'text-white',
        close: 'text-gray-500 hover:bg-white/[0.06] hover:text-white',
        sidebar: 'w-[152px] shrink-0 border-r border-white/[0.08] bg-[#0f0f0f]',
        navItem: 'block w-full border-0 px-3 py-2.5 text-left text-[13px] transition-colors',
        navInactive: 'text-gray-500 hover:bg-white/[0.04] hover:text-gray-200',
        navActive: 'border-l-[3px] border-l-[#d4af37] bg-[#1a1a1a] font-semibold text-[#d4af37]',
        content: 'bg-[#141414]',
        dropBorder: 'border-white/[0.12] bg-[#0a0a0a]',
        dropActive: 'border-[#d4af37]/60 bg-[#d4af37]/5',
        btnPrimary:
          'rounded border border-[#d4af37] bg-gradient-to-r from-[#d4af37] to-[#b8941f] px-3 py-1.5 text-xs font-semibold text-black hover:brightness-105 disabled:opacity-45',
        btnSecondary:
          'rounded border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-xs text-gray-300 hover:bg-white/[0.08] disabled:opacity-45',
        muted: 'text-gray-500',
        thumbRing: 'ring-[#d4af37]',
        notice: 'rounded-lg border border-white/[0.08] bg-[#0a0a0a] p-3 text-xs text-gray-500',
      };

  if (typeof document === 'undefined' || !open) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 ${shell.overlay}`}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        className={`flex max-h-[min(90vh,720px)] w-full max-w-4xl flex-col overflow-hidden rounded-sm ${shell.frame}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="model-media-modal-title"
      >
        <div className={`flex h-11 flex-shrink-0 items-center justify-between px-3 ${shell.header}`}>
          <h2 id="model-media-modal-title" className={`font-body text-[13px] font-semibold ${shell.title}`}>
            Вставить медиафайл
            <span className={`ml-2 font-normal ${shell.muted}`}>— слот {slotIndex + 1}</span>
          </h2>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            className={`rounded p-1.5 ${shell.close}`}
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <nav className={`flex flex-col py-2 ${shell.sidebar}`} aria-label="Разделы медиа">
            <button
              type="button"
              className={`${shell.navItem} ${tab === 'upload' ? shell.navActive : shell.navInactive}`}
              style={tab === 'upload' && isWpAdmin ? { borderLeftWidth: 3 } : undefined}
              onClick={() => setTab('upload')}
            >
              <span className="flex items-center gap-2">
                <Upload className="h-3.5 w-3.5 shrink-0 opacity-80" />
                Загрузить файлы
              </span>
            </button>
            <button
              type="button"
              className={`${shell.navItem} ${tab === 'library' ? shell.navActive : shell.navInactive}`}
              style={tab === 'library' && isWpAdmin ? { borderLeftWidth: 3 } : undefined}
              onClick={() => setTab('library')}
            >
              <span className="flex items-center gap-2">
                <ImageIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                Медиатека
              </span>
            </button>
          </nav>

          <div className={`relative flex min-h-0 flex-1 flex-col overflow-hidden ${shell.content}`}>
            {busy ? (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/25 backdrop-blur-[1px]">
                <Loader2 className={`h-8 w-8 animate-spin ${isWpAdmin ? 'text-[#2271b1]' : 'text-[#d4af37]'}`} />
              </div>
            ) : null}

            {tab === 'upload' ? (
              <div className="flex min-h-0 flex-1 flex-col p-5">
                {!canUse ? (
                  <p className={shell.notice}>Сначала создайте или сохраните анкету — без неё загрузка недоступна.</p>
                ) : (
                  <>
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        const f = e.dataTransfer.files?.[0];
                        void handleFile(f);
                      }}
                      className={`flex flex-1 flex-col items-center justify-center rounded-sm border-2 border-dashed px-4 py-8 text-center transition-colors ${
                        dragOver ? shell.dropActive : shell.dropBorder
                      }`}
                    >
                      <Upload className={`mb-3 h-10 w-10 ${shell.muted}`} />
                      <div className={`mx-auto max-w-sm text-[13px] ${shell.muted}`}>
                        Перетащите изображение сюда или выберите файл:
                      </div>
                      <p className={`mt-3 text-[11px] ${shell.muted}`}>JPEG, PNG или WebP.</p>
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className={`mt-4 ${shell.btnPrimary}`}
                      >
                        Выбрать файлы…
                      </button>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        tabIndex={-1}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = '';
                          void handleFile(f);
                        }}
                      />
                    </div>
                    <p className={`mt-3 text-center text-[11px] ${shell.muted}`}>
                      Файл будет загружен в текущий слот сетки (как в медиатеке WordPress).
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                {!canUse ? (
                  <div className="p-5">
                    <p className={shell.notice}>Медиатека доступна после сохранения анкеты.</p>
                  </div>
                ) : libraryLoading ? (
                  <div className="flex flex-1 items-center justify-center p-8">
                    <Loader2 className={`h-7 w-7 animate-spin ${isWpAdmin ? 'text-[#2271b1]' : 'text-[#d4af37]'}`} />
                  </div>
                ) : libraryError ? (
                  <div className="p-5">
                    <p
                      className={
                        isWpAdmin
                          ? 'rounded-sm border border-red-200 bg-red-50 p-3 text-xs text-red-800'
                          : 'rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300'
                      }
                    >
                      {libraryError}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="min-h-0 flex-1 overflow-y-auto p-4">
                      {libraryItems.length === 0 ? (
                        <p className={`text-center text-[13px] ${shell.muted}`}>В медиатеке пока нет изображений.</p>
                      ) : (
                        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                          {libraryItems.map((item) => (
                            <li key={item.id}>
                              <button
                                type="button"
                                onClick={() => setSelectedId(item.id)}
                                className={`relative aspect-square w-full overflow-hidden rounded-sm border-2 bg-black/40 outline-none transition-shadow ${
                                  selectedId === item.id
                                    ? `border-transparent ring-2 ${shell.thumbRing} ring-offset-2 ${
                                        isWpAdmin ? 'ring-offset-white' : 'ring-offset-[#141414]'
                                      }`
                                    : isWpAdmin
                                      ? 'border-[#dcdcde] hover:border-[#2271b1]/50'
                                      : 'border-white/[0.08] hover:border-[#d4af37]/40'
                                }`}
                                title={item.name}
                              >
                                <img src={item.url} alt="" className="h-full w-full object-cover" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div
                      className={`flex flex-shrink-0 items-center justify-end gap-2 border-t px-4 py-3 ${
                        isWpAdmin ? 'border-[#dcdcde] bg-[#fcfcfc]' : 'border-white/[0.08] bg-[#141414]'
                      }`}
                    >
                      <button type="button" className={shell.btnSecondary} onClick={() => !busy && onClose()}>
                        Отмена
                      </button>
                      <button
                        type="button"
                        className={shell.btnPrimary}
                        disabled={!selectedId || busy}
                        onClick={() => void handleInsertLibrary()}
                      >
                        Вставить в анкету
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {tab === 'upload' && canUse ? (
          <div
            className={`flex flex-shrink-0 justify-end gap-2 border-t px-4 py-3 ${
              isWpAdmin ? 'border-[#dcdcde] bg-[#fcfcfc]' : 'border-white/[0.08] bg-[#141414]'
            }`}
          >
            <button type="button" className={shell.btnSecondary} onClick={() => !busy && onClose()}>
              Отмена
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
