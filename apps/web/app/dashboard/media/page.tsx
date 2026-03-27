'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { api } from '@/lib/api-client';
import {
  Image as ImageIcon, Trash2, Eye, EyeOff, Search, Filter,
  ChevronDown, ChevronRight, User, ExternalLink, RefreshCw,
} from 'lucide-react';

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
      <div className="space-y-6 font-body">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Медиатека</h1>
            <p className="text-sm text-white/30 mt-1">
              {media.length} файлов · {formatSize(totalSize)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-xs font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Удалить ({selectedIds.size})
              </button>
            )}
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] text-gray-400 hover:text-white hover:border-white/20 transition-all text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#141414] border border-white/[0.06] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#d4af37]"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={filterModel}
              onChange={e => setFilterModel(e.target.value)}
              className="pl-9 pr-8 py-2 bg-[#141414] border border-white/[0.06] rounded-lg text-sm text-white focus:outline-none focus:border-[#d4af37] appearance-none cursor-pointer"
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
            <div className="w-10 h-10 border-4 border-[#d4af37]/20 border-t-[#d4af37] rounded-full animate-spin" />
          </div>
        ) : media.length === 0 ? (
          <div className="text-center py-20">
            <ImageIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Медиатека пуста</h3>
            <p className="text-gray-400 text-sm mb-4">Загрузите фотографии через редактирование моделей</p>
            <Link
              href="/dashboard/models/list"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#d4af37]/10 text-[#d4af37] rounded-lg hover:bg-[#d4af37]/20 transition-all text-sm"
            >
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
                <div key={modelId} className="rounded-xl border border-white/[0.06] bg-[#141414] overflow-hidden">
                  {/* Group header */}
                  <button
                    onClick={() => toggleCollapse(modelId)}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors"
                  >
                    {collapsed
                      ? <ChevronRight className="w-4 h-4 text-gray-500" />
                      : <ChevronDown className="w-4 h-4 text-gray-500" />
                    }
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-[#0a0a0a] flex-shrink-0">
                      {model?.mainPhotoUrl ? (
                        <img src={model.mainPhotoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><User className="w-4 h-4 text-gray-600" /></div>
                      )}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <span className="text-sm font-bold text-white">{model?.displayName || 'Неизвестная модель'}</span>
                      {model?.slug && <span className="text-xs text-gray-500 ml-2">@{model.slug}</span>}
                    </div>
                    <span className="text-xs text-gray-500">{files.length} файлов · {formatSize(files.reduce((s, f) => s + (f.fileSize || 0), 0))}</span>
                    <Link
                      href={`/dashboard/models/${modelId}/edit`}
                      onClick={e => e.stopPropagation()}
                      className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors"
                      title="Редактировать модель"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                    </Link>
                  </button>

                  {/* Grid */}
                  {!collapsed && (
                    <div className="px-5 pb-5">
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                        {files.map(file => (
                          <MediaTile
                            key={file.id}
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
              <div className="rounded-xl border border-white/[0.06] bg-[#141414] overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.06]">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Без привязки к модели</span>
                  <span className="text-xs text-gray-500 ml-2">{grouped.unlinked.length} файлов</span>
                </div>
                <div className="px-5 pb-5 pt-3">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    {grouped.unlinked.map(file => (
                      <MediaTile
                        key={file.id}
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

function MediaTile({ file, selected, deleting, onToggleSelect, onDelete, onPreview }: {
  file: MediaFile;
  selected: boolean;
  deleting: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onPreview: () => void;
}) {
  return (
    <div className={`relative aspect-square rounded-lg overflow-hidden group border-2 transition-all ${
      selected ? 'border-[#d4af37]' : 'border-transparent hover:border-white/10'
    } ${deleting ? 'opacity-40 pointer-events-none' : ''}`}>
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
        className={`absolute top-1 left-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
          selected
            ? 'bg-[#d4af37] border-[#d4af37]'
            : 'bg-black/40 border-white/30 opacity-0 group-hover:opacity-100'
        }`}
      >
        {selected && <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
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
