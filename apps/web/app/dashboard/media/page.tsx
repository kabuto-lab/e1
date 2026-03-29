'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { api } from '@/lib/api-client';
import {
  Image as ImageIcon, Trash2, Eye, EyeOff, Search, Filter,
  ChevronDown, ChevronRight, User, ExternalLink, RefreshCw,
} from 'lucide-react';
import { useDashboardTheme } from '@/components/DashboardThemeContext';
import { dashboardTone } from '@/lib/dashboard-tone';

interface MediaFile {
  id: string;
  ownerId: string;
  modelId: string | null;
  fileType: string;
  mimeType: string;
  fileSize: number;
  storageKey: string;
  cdnUrl: string;
  isPublicVisible: boolean;
  moderationStatus: string;
  createdAt: string;
}

interface ModelInfo {
  id: string;
  displayName: string;
  slug: string;
  mainPhotoUrl?: string;
}

export default function MediaLibraryPage() {
  const { isWpAdmin: L } = useDashboardTheme();
  const t = dashboardTone(L);
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModel, setFilterModel] = useState<string | 'all'>('all');
  const [collapsedModels, setCollapsedModels] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [mediaData, modelsData] = await Promise.all([
        api.getMyMedia(),
        api.getMyModels(),
      ]);
      setMedia(mediaData || []);
      setModels(modelsData || []);
    } catch (err) {
      console.error('Failed to load media:', err);
    } finally {
      setLoading(false);
    }
  }

  const modelMap = useMemo(() => {
    const map = new Map<string, ModelInfo>();
    models.forEach(m => map.set(m.id, m));
    return map;
  }, [models]);

  const grouped = useMemo(() => {
    const groups = new Map<string, MediaFile[]>();
    const unlinked: MediaFile[] = [];

    const filtered = media.filter(m => {
      if (filterModel !== 'all' && m.modelId !== filterModel) return false;
      if (searchTerm) {
        const model = m.modelId ? modelMap.get(m.modelId) : null;
        const haystack = [model?.displayName, model?.slug, m.storageKey, m.mimeType].join(' ').toLowerCase();
        if (!haystack.includes(searchTerm.toLowerCase())) return false;
      }
      return true;
    });

    for (const file of filtered) {
      if (file.modelId) {
        const arr = groups.get(file.modelId) || [];
        arr.push(file);
        groups.set(file.modelId, arr);
      } else {
        unlinked.push(file);
      }
    }

    return { groups, unlinked };
  }, [media, models, filterModel, searchTerm, modelMap]);

  async function handleDelete(id: string) {
    setDeletingIds(prev => new Set(prev).add(id));
    try {
      await api.deleteMedia(id);
      setMedia(prev => prev.filter(m => m.id !== id));
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    } catch (err: any) {
      console.error('Delete failed:', err);
    } finally {
      setDeletingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  }

  async function handleBulkDelete() {
    if (!selectedIds.size || !confirm(`Удалить ${selectedIds.size} файлов?`)) return;
    for (const id of selectedIds) {
      await handleDelete(id);
    }
  }

  function toggleCollapse(modelId: string) {
    setCollapsedModels(prev => {
      const n = new Set(prev);
      n.has(modelId) ? n.delete(modelId) : n.add(modelId);
      return n;
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const totalSize = media.reduce((sum, m) => sum + (m.fileSize || 0), 0);

  return (
    <ProtectedRoute requiredRoles={['admin', 'manager']}>
      <div className={`space-y-6 font-body ${t.page}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`font-display text-2xl font-bold ${L ? 'font-normal text-[#1d2327]' : 'text-white'}`}>Медиатека</h1>
            <p className={`mt-1 text-sm ${t.muted}`}>
              {media.length} файлов · {formatSize(totalSize)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={handleBulkDelete}
                className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-all ${
                  L ? 'border border-[#d63638] bg-[#fcf0f1] text-[#d63638] hover:bg-[#f5dcdc]' : 'rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20'
                }`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Удалить ({selectedIds.size})
              </button>
            )}
            <button type="button" onClick={loadData} disabled={loading} className={`${t.btnSecondary} px-3 py-1.5 text-xs`}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${L ? 'text-[#646970]' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${t.input} py-2 pl-9 ${L ? 'placeholder:text-[#646970]' : 'placeholder-gray-500'}`}
            />
          </div>
          <div className="relative">
            <Filter className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${L ? 'text-[#646970]' : 'text-gray-400'}`} />
            <select
              value={filterModel}
              onChange={(e) => setFilterModel(e.target.value)}
              className={`${t.select} cursor-pointer appearance-none py-2 pl-9 pr-8`}
            >
              <option value="all">Все модели</option>
              {models.map(m => (
                <option key={m.id} value={m.id}>{m.displayName}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div
              className={`h-10 w-10 animate-spin rounded-full border-4 border-t-transparent ${
                L ? 'border-[#2271b1]/25 border-t-[#2271b1]' : 'border-[#d4af37]/20 border-t-[#d4af37]'
              }`}
            />
          </div>
        ) : media.length === 0 ? (
          <div className="py-20 text-center">
            <ImageIcon className={`mx-auto mb-4 h-16 w-16 ${L ? 'text-[#a7aaad]' : 'text-gray-600'}`} />
            <h3 className={`mb-2 text-lg font-bold ${L ? 'text-[#1d2327]' : 'text-white'}`}>Медиатека пуста</h3>
            <p className={`mb-4 text-sm ${t.muted}`}>Загрузите фотографии через редактирование моделей</p>
            <Link href="/dashboard/models/list" className={`${t.btnPrimary} inline-flex gap-2 px-4 py-2 text-sm`}>
              К моделям
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Model groups */}
            {Array.from(grouped.groups.entries()).map(([modelId, files]) => {
              const model = modelMap.get(modelId);
              const collapsed = collapsedModels.has(modelId);
              return (
                <div key={modelId} className={`${t.card} overflow-hidden`}>
                  <button
                    type="button"
                    onClick={() => toggleCollapse(modelId)}
                    className={`flex w-full items-center gap-3 px-5 py-3 transition-colors ${
                      L ? 'hover:bg-[#f6f7f7]' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    {collapsed ? (
                      <ChevronRight className={`h-4 w-4 ${t.muted}`} />
                    ) : (
                      <ChevronDown className={`h-4 w-4 ${t.muted}`} />
                    )}
                    <div className={`h-8 w-8 flex-shrink-0 overflow-hidden rounded-full ${L ? 'bg-[#f6f7f7]' : 'bg-[#0a0a0a]'}`}>
                      {model?.mainPhotoUrl ? (
                        <img src={model.mainPhotoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><User className="w-4 h-4 text-gray-600" /></div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <span className={`text-sm font-bold ${L ? 'text-[#1d2327]' : 'text-white'}`}>
                        {model?.displayName || 'Неизвестная модель'}
                      </span>
                      {model?.slug && <span className={`ml-2 text-xs ${t.muted}`}>@{model.slug}</span>}
                    </div>
                    <span className={`text-xs ${t.muted}`}>
                      {files.length} файлов · {formatSize(files.reduce((s, f) => s + (f.fileSize || 0), 0))}
                    </span>
                    <Link
                      href={`/dashboard/models/${modelId}/edit`}
                      onClick={(e) => e.stopPropagation()}
                      className={`rounded-lg p-1.5 transition-colors ${L ? 'hover:bg-[#f0f0f1]' : 'hover:bg-white/[0.06]'}`}
                      title="Редактировать модель"
                    >
                      <ExternalLink className={`h-3.5 w-3.5 ${t.muted}`} />
                    </Link>
                  </button>

                  {/* Grid */}
                  {!collapsed && (
                    <div className="px-5 pb-5">
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                        {files.map(file => (
                          <MediaTile
                            key={file.id}
                            lightWp={L}
                            file={file}
                            selected={selectedIds.has(file.id)}
                            deleting={deletingIds.has(file.id)}
                            onToggleSelect={() => toggleSelect(file.id)}
                            onDelete={() => handleDelete(file.id)}
                            onPreview={() => setLightboxUrl(file.cdnUrl)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Unlinked files */}
            {grouped.unlinked.length > 0 && (
              <div className={`${t.card} overflow-hidden`}>
                <div className={`border-b px-5 py-3 ${L ? 'border-[#c3c4c7] bg-[#f6f7f7]' : 'border-white/[0.06]'}`}>
                  <span className={`text-xs font-bold uppercase tracking-wide ${L ? 'text-[#1d2327]' : 'text-gray-400'}`}>
                    Без привязки к модели
                  </span>
                  <span className={`ml-2 text-xs ${t.muted}`}>{grouped.unlinked.length} файлов</span>
                </div>
                <div className="px-5 pb-5 pt-3">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    {grouped.unlinked.map(file => (
                      <MediaTile
                        key={file.id}
                        lightWp={L}
                        file={file}
                        selected={selectedIds.has(file.id)}
                        deleting={deletingIds.has(file.id)}
                        onToggleSelect={() => toggleSelect(file.id)}
                        onDelete={() => handleDelete(file.id)}
                        onPreview={() => setLightboxUrl(file.cdnUrl)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lightbox */}
        {lightboxUrl && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8 cursor-pointer"
            onClick={() => setLightboxUrl(null)}
          >
            <img src={lightboxUrl} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

function MediaTile({
  file,
  lightWp,
  selected,
  deleting,
  onToggleSelect,
  onDelete,
  onPreview,
}: {
  file: MediaFile;
  lightWp: boolean;
  selected: boolean;
  deleting: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onPreview: () => void;
}) {
  const selBorder = lightWp ? 'border-[#2271b1]' : 'border-[#d4af37]';
  const idleHover = lightWp ? 'hover:border-[#8c8f94]' : 'hover:border-white/10';
  return (
    <div
      className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
        selected ? selBorder : `border-transparent ${idleHover}`
      } ${deleting ? 'pointer-events-none opacity-40' : ''}`}
    >
      <img src={file.cdnUrl} alt="" className="w-full h-full object-cover" loading="lazy" />

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
        <button onClick={onPreview} className="p-1.5 bg-black/60 rounded-full hover:bg-white/20 transition-colors">
          <Eye className="w-3.5 h-3.5 text-white" />
        </button>
        <button onClick={onDelete} className="p-1.5 bg-black/60 rounded-full hover:bg-red-500/40 transition-colors">
          <Trash2 className="w-3.5 h-3.5 text-white" />
        </button>
      </div>

      {/* Checkbox */}
      <button
        onClick={e => { e.stopPropagation(); onToggleSelect(); }}
        className={`absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded border-2 transition-all ${
          selected
            ? lightWp
              ? 'border-[#2271b1] bg-[#2271b1]'
              : 'border-[#d4af37] bg-[#d4af37]'
            : lightWp
              ? 'border-[#c3c4c7] bg-white/90 opacity-0 group-hover:opacity-100'
              : 'border-white/30 bg-black/40 opacity-0 group-hover:opacity-100'
        }`}
      >
        {selected && (
          <svg className={`h-3 w-3 ${lightWp ? 'text-white' : 'text-black'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Visibility badge */}
      {!file.isPublicVisible && (
        <div className="absolute top-1 right-1 p-1 bg-black/60 rounded-full" title="Скрыто">
          <EyeOff className="w-2.5 h-2.5 text-gray-400" />
        </div>
      )}
    </div>
  );
}
