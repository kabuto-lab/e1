'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Image as ImageIcon, Upload, Loader2, RefreshCw } from 'lucide-react';
import { api, resolveUploadMimeType } from '@/lib/api-client';

interface MediaItem {
  id: string;
  cdnUrl: string;
  fileType: string;
  mimeType: string;
  createdAt: string;
}

interface MediaPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

export function MediaPickerModal({ open, onClose, onSelect }: MediaPickerModalProps) {
  const [tab, setTab] = useState<'library' | 'upload'>('library');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMedia = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMyMedia();
      const images = (data as MediaItem[]).filter(
        (m) => m.fileType === 'image' || m.mimeType?.startsWith('image/'),
      );
      setMedia(images);
    } catch {
      setError('Не удалось загрузить медиатеку');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setTab('library');
      loadMedia();
    }
  }, [open, loadMedia]);

  const handleUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/') && !file.name.match(/\.(jpg|jpeg|png|webp|gif|avif)$/i)) {
      setError('Поддерживаются только изображения');
      return;
    }
    setUploading(true);
    setError(null);
    setUploadStep('Получение ссылки…');
    try {
      const mimeType = resolveUploadMimeType(file);
      const presign = await api.generatePresignedUrl({
        fileName: file.name,
        mimeType: mimeType as any,
        fileSize: file.size,
      });
      setUploadStep('Загрузка файла…');
      await api.uploadToMinIO(presign.uploadUrl, file, mimeType);
      setUploadStep('Сохранение…');
      await api.confirmUpload(presign.mediaId, { cdnUrl: presign.cdnUrl });
      setUploadStep(null);
      onSelect(presign.cdnUrl);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      setUploadStep(null);
    } finally {
      setUploading(false);
    }
  }, [onSelect, onClose]);

  if (!open) return null;

  const s = {
    overlay: {
      position: 'fixed', inset: 0, zIndex: 3000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
    },
    modal: {
      width: 700, maxWidth: '95vw', maxHeight: '82vh',
      background: '#1a1a1a', border: '1px solid #333',
      borderRadius: 14, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', boxShadow: '0 32px 96px rgba(0,0,0,0.9)',
    },
    header: {
      padding: '14px 18px', borderBottom: '1px solid #2a2a2a',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
    },
    tab: (active: boolean): React.CSSProperties => ({
      padding: '10px 22px', background: 'none', border: 'none',
      borderBottom: active ? '2px solid #00ffcc' : '2px solid transparent',
      color: active ? '#00ffcc' : '#777',
      cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400,
      transition: 'all 0.15s',
    }),
    iconBtn: {
      background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 4,
      display: 'flex', alignItems: 'center', borderRadius: 4, transition: 'color 0.12s',
    },
  };

  return (
    <div style={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={s.modal}>
        {/* Header */}
        <div style={s.header}>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#eee' }}>Медиатека</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={loadMedia} title="Обновить" style={s.iconBtn}>
              <RefreshCw size={14} />
            </button>
            <button onClick={onClose} style={s.iconBtn}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #2a2a2a', flexShrink: 0 }}>
          <button style={s.tab(tab === 'library')} onClick={() => setTab('library')}>Медиатека</button>
          <button style={s.tab(tab === 'upload')} onClick={() => setTab('upload')}>Загрузить</button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: '8px 16px', background: 'rgba(248,113,113,0.1)', color: '#f87171', fontSize: 12, flexShrink: 0 }}>
            {error}
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {tab === 'library' && (
            loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220, color: '#555', gap: 10 }}>
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 13 }}>Загрузка…</span>
              </div>
            ) : media.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 220, color: '#555', gap: 12 }}>
                <ImageIcon size={40} strokeWidth={1} />
                <span style={{ fontSize: 13 }}>Медиатека пуста</span>
                <button onClick={() => setTab('upload')}
                  style={{ color: '#00ffcc', background: 'none', border: '1px solid #00ffcc44', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: 12 }}>
                  Загрузить изображение
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                {media.map((m) => (
                  <div key={m.id}
                    onClick={() => { onSelect(m.cdnUrl); onClose(); }}
                    style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', border: '2px solid transparent', transition: 'border-color 0.12s, transform 0.1s', background: '#2a2a2a', position: 'relative' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#00ffcc'; (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                  >
                    <img src={m.cdnUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                ))}
              </div>
            )
          )}

          {tab === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleUpload(f); }}
                style={{
                  border: `2px dashed ${dragOver ? '#00ffcc' : '#333'}`,
                  borderRadius: 12, padding: '48px 24px', textAlign: 'center',
                  cursor: uploading ? 'wait' : 'pointer',
                  transition: 'border-color 0.15s, background 0.15s',
                  background: dragOver ? 'rgba(0,255,204,0.05)' : 'transparent',
                  color: '#666',
                }}
              >
                {uploading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: '#00ffcc' }} />
                    <span style={{ fontSize: 13, color: '#00ffcc' }}>{uploadStep}</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <Upload size={36} style={{ opacity: 0.4 }} />
                    <div style={{ fontSize: 14, color: '#aaa' }}>Перетащите файл или кликните</div>
                    <div style={{ fontSize: 12 }}>JPG, PNG, WebP, GIF · до 20 МБ</div>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
