/**
 * ImageVisibilityGrid Component
 * Manage photo visibility, albums, and sort order
 */

'use client';

import { useState, useCallback } from 'react';
import { Eye, EyeOff, Grid, List, ChevronUp, ChevronDown, Video, Check, Trash2, Star } from 'lucide-react';

function SelectCheckbox({ checked, onChange, className = '' }: { checked: boolean; onChange: () => void; className?: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border backdrop-blur-sm transition-colors ${
        checked
          ? 'border-[#d4af37] bg-[#d4af37] text-black'
          : 'border-white/20 bg-black/50 text-transparent hover:border-[#d4af37]/50'
      } ${className}`}
    >
      <Check className="h-3.5 w-3.5" strokeWidth={3} />
    </button>
  );
}

function getAlbumBadgeClass(album?: string) {
  switch (album) {
    case 'vip': return 'badge-gold';
    case 'elite': return 'badge-gold';
    case 'verified': return 'badge-success';
    default: return 'badge-secondary';
  }
}

/** Подписи альбомов в UI (значения value для API — portfolio | vip | elite | verified). */
const ALBUM_LABEL_RU: Record<'portfolio' | 'vip' | 'elite' | 'verified', string> = {
  portfolio: 'Портфолио',
  vip: 'VIP',
  elite: 'Элит',
  verified: 'Проверено',
};

function albumLabel(album?: string): string {
  if (album === 'vip') return ALBUM_LABEL_RU.vip;
  if (album === 'elite') return ALBUM_LABEL_RU.elite;
  if (album === 'verified') return ALBUM_LABEL_RU.verified;
  return ALBUM_LABEL_RU.portfolio;
}

interface MediaFile {
  id: string;
  cdnUrl: string;
  fileType: 'photo' | 'video';
  moderationStatus: 'pending' | 'approved' | 'rejected';
  isVerified: boolean;
  sortOrder: number;
  isPublicVisible?: boolean;
  albumCategory?: 'portfolio' | 'vip' | 'elite' | 'verified';
}

interface ImageVisibilityGridProps {
  media: MediaFile[];
  mainPhotoId?: string | null;
  onVisibilityChange: (mediaId: string, isVisible: boolean) => Promise<void>;
  onAlbumChange: (mediaId: string, album: 'portfolio' | 'vip' | 'elite' | 'verified') => Promise<void>;
  onBulkUpdate?: (mediaIds: string[], updates: { isPublicVisible?: boolean; albumCategory?: string }) => Promise<void>;
  onDelete?: (mediaId: string) => Promise<void>;
  onSetMain?: (mediaId: string) => Promise<void>;
}

type FilterType = 'all' | 'visible' | 'hidden';
type ViewMode = 'grid' | 'list';

export function ImageVisibilityGrid({
  media,
  mainPhotoId,
  onVisibilityChange,
  onAlbumChange,
  onBulkUpdate,
  onDelete,
  onSetMain,
}: ImageVisibilityGridProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter media
  const filteredMedia = media.filter((item) => {
    if (filter === 'visible') return item.isPublicVisible !== false;
    if (filter === 'hidden') return item.isPublicVisible === false;
    return true;
  });

  // Toggle selection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Select all visible
  const selectAll = () => {
    setSelectedIds(new Set(filteredMedia.map(m => m.id)));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Bulk visibility toggle
  const handleBulkVisibility = async (visible: boolean) => {
    if (selectedIds.size === 0 || !onBulkUpdate) return;
    await onBulkUpdate(Array.from(selectedIds), { isPublicVisible: visible });
    clearSelection();
  };

  // Bulk album change
  const handleBulkAlbum = async (album: 'portfolio' | 'vip' | 'elite' | 'verified') => {
    if (selectedIds.size === 0 || !onBulkUpdate) return;
    await onBulkUpdate(Array.from(selectedIds), { albumCategory: album });
    clearSelection();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-[#141414] border border-white/[0.06] rounded-xl p-4">
        <div className="flex items-center gap-4">
          {/* Filter */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-[#d4af37] text-[#0a0a0a]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              All ({media.length})
            </button>
            <button
              onClick={() => setFilter('visible')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'visible'
                  ? 'bg-[#d4af37] text-[#0a0a0a]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Eye className="w-4 h-4 inline mr-1" />
              Visible ({media.filter(m => m.isPublicVisible !== false).length})
            </button>
            <button
              onClick={() => setFilter('hidden')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'hidden'
                  ? 'bg-[#d4af37] text-[#0a0a0a]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <EyeOff className="w-4 h-4 inline mr-1" />
              Hidden ({media.filter(m => m.isPublicVisible === false).length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Select All / Clear */}
          {filteredMedia.length > 0 && (
            selectedIds.size === filteredMedia.length ? (
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Снять выбор
              </button>
            ) : (
              <button
                onClick={selectAll}
                className="px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Выбрать все ({filteredMedia.length})
              </button>
            )
          )}
          {/* View mode toggle */}
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-[#d4af37] text-[#0a0a0a]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-[#d4af37] text-[#0a0a0a]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bulk actions toolbar */}
      {selectedIds.size > 0 && (
        <div className="bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-[#d4af37]">
              {selectedIds.size} photo{selectedIds.size > 1 ? 's' : ''} selected
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkVisibility(true)}
                className="px-3 py-1.5 bg-[#d4af37] text-[#0a0a0a] rounded-lg text-sm font-medium hover:bg-[#f4d03f] transition-colors"
              >
                <Eye className="w-4 h-4 inline mr-1" />
                Show
              </button>
              <button
                onClick={() => handleBulkVisibility(false)}
                className="px-3 py-1.5 bg-[#141414] text-white rounded-lg text-sm font-medium hover:bg-[#242424] transition-colors"
              >
                <EyeOff className="w-4 h-4 inline mr-1" />
                Hide
              </button>
              <select
                onChange={(e) => handleBulkAlbum(e.target.value as any)}
                className="px-3 py-1.5 bg-[#141414] text-white rounded-lg text-sm font-medium border border-white/[0.06] focus:border-[#d4af37] outline-none"
                defaultValue=""
              >
                <option value="" disabled>Album</option>
                <option value="portfolio">{ALBUM_LABEL_RU.portfolio}</option>
                <option value="vip">{ALBUM_LABEL_RU.vip}</option>
                <option value="elite">{ALBUM_LABEL_RU.elite}</option>
                <option value="verified">{ALBUM_LABEL_RU.verified}</option>
              </select>
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 text-gray-400 hover:text-white text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid/List View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMedia.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              isSelected={selectedIds.has(item.id)}
              isMain={item.id === mainPhotoId}
              onSelect={() => toggleSelection(item.id)}
              onVisibilityChange={onVisibilityChange}
              onAlbumChange={onAlbumChange}
              onDelete={onDelete}
              onSetMain={onSetMain}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMedia.map((item) => (
            <MediaListItem
              key={item.id}
              item={item}
              isSelected={selectedIds.has(item.id)}
              isMain={item.id === mainPhotoId}
              onSelect={() => toggleSelection(item.id)}
              onVisibilityChange={onVisibilityChange}
              onAlbumChange={onAlbumChange}
              onDelete={onDelete}
              onSetMain={onSetMain}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Grid Card Component
function MediaCard({
  item,
  isSelected,
  isMain,
  onSelect,
  onVisibilityChange,
  onAlbumChange,
  onDelete,
  onSetMain,
}: {
  item: MediaFile;
  isSelected: boolean;
  isMain?: boolean;
  onSelect: () => void;
  onVisibilityChange: (id: string, visible: boolean) => Promise<void>;
  onAlbumChange: (id: string, album: 'portfolio' | 'vip' | 'elite' | 'verified') => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onSetMain?: (id: string) => Promise<void>;
}) {
  const isVisible = item.isPublicVisible !== false;

  return (
    <div
      className={`relative group bg-[#141414] border rounded-xl overflow-hidden transition-all ${
        isSelected
          ? 'border-[#d4af37] border-2'
          : 'border-white/[0.06] hover:border-[#d4af37]/30'
      }`}
    >
      {/* Selection checkbox */}
      <div className="absolute top-2 left-2 z-20">
        <SelectCheckbox checked={isSelected} onChange={onSelect} />
      </div>

      {/* Main badge */}
      {isMain && (
        <div className="absolute left-9 top-2 z-20 flex items-center gap-1 rounded-full bg-[#d4af37] px-2 py-0.5 text-[10px] font-bold text-black">
          <Star className="h-2.5 w-2.5 fill-black" />
          Главное
        </div>
      )}

      {/* Image */}
      <div className="relative aspect-[3/4] bg-[#0a0a0a]">
        {item.fileType === 'video' ? (
          <video src={item.cdnUrl} className="w-full h-full object-cover" muted preload="metadata" controls />
        ) : (
          <img
            src={item.cdnUrl}
            alt={`Model photo`}
            className="w-full h-full object-cover"
          />
        )}
        {item.fileType === 'video' && (
          <div className="pointer-events-none absolute bottom-2 left-2 z-20 rounded-full bg-black/60 p-1" title="Видео">
            <Video className="w-3 h-3 text-white" />
          </div>
        )}

        {/* Visibility overlay */}
        {!isVisible && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
            <EyeOff className="w-8 h-8 text-gray-400" />
          </div>
        )}

        {/* Quick actions */}
        <div className="absolute top-2 right-2 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {onSetMain && !isMain && item.fileType === 'photo' && (
            <button
              onClick={() => onSetMain(item.id)}
              className="p-2 rounded-lg backdrop-blur-sm bg-black/50 text-white transition-colors hover:bg-[#d4af37] hover:text-black"
              title="Сделать главным"
            >
              <Star className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onVisibilityChange(item.id, !isVisible)}
            className={`p-2 rounded-lg backdrop-blur-sm transition-colors ${
              isVisible
                ? 'bg-black/50 text-white hover:bg-black/70'
                : 'bg-[#d4af37]/80 text-[#0a0a0a] hover:bg-[#d4af37]'
            }`}
            title={isVisible ? 'Hide from profile' : 'Show on profile'}
          >
            {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete(item.id)}
              className="p-2 rounded-lg backdrop-blur-sm bg-black/50 text-white transition-colors hover:bg-red-600/90"
              title="Удалить"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        {/* Album badge */}
        <div className="flex items-center justify-between">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${getAlbumBadgeClass(item.albumCategory)}`}>
            {albumLabel(item.albumCategory)}
          </span>
          <select
            value={item.albumCategory || 'portfolio'}
            onChange={(e) => onAlbumChange(item.id, e.target.value as 'portfolio' | 'vip' | 'elite' | 'verified')}
            className="text-xs bg-[#0a0a0a] border border-white/[0.06] rounded px-2 py-1 text-gray-400 focus:border-[#d4af37] outline-none"
          >
            <option value="portfolio">{ALBUM_LABEL_RU.portfolio}</option>
            <option value="vip">{ALBUM_LABEL_RU.vip}</option>
            <option value="elite">{ALBUM_LABEL_RU.elite}</option>
            <option value="verified">{ALBUM_LABEL_RU.verified}</option>
          </select>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between text-xs">
          <span className={item.isVerified ? 'text-green-500' : 'text-gray-500'}>
            {item.isVerified ? '✓ Verified' : '○ Pending'}
          </span>
          <span className="text-gray-500">
            {item.moderationStatus}
          </span>
        </div>
      </div>
    </div>
  );
}

// List Item Component
function MediaListItem({
  item,
  isSelected,
  isMain,
  onSelect,
  onVisibilityChange,
  onAlbumChange,
  onDelete,
  onSetMain,
}: {
  item: MediaFile;
  isSelected: boolean;
  isMain?: boolean;
  onSelect: () => void;
  onVisibilityChange: (id: string, visible: boolean) => Promise<void>;
  onAlbumChange: (id: string, album: 'portfolio' | 'vip' | 'elite' | 'verified') => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onSetMain?: (id: string) => Promise<void>;
}) {
  const isVisible = item.isPublicVisible !== false;

  return (
    <div
      className={`flex items-center gap-4 bg-[#141414] border rounded-xl p-4 transition-all ${
        isSelected
          ? 'border-[#d4af37] border-2'
          : 'border-white/[0.06] hover:border-[#d4af37]/30'
      }`}
    >
      {/* Selection checkbox */}
      <SelectCheckbox checked={isSelected} onChange={onSelect} />

      {/* Thumbnail */}
      <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-[#0a0a0a] flex-shrink-0">
        {item.fileType === 'video' ? (
          <video src={item.cdnUrl} className="w-full h-full object-cover" muted preload="metadata" />
        ) : (
          <img
            src={item.cdnUrl}
            alt={`Model photo`}
            className="w-full h-full object-cover"
          />
        )}
        {item.fileType === 'video' && (
          <div className="pointer-events-none absolute bottom-1 left-1 rounded-full bg-black/60 p-0.5" title="Видео">
            <Video className="w-2.5 h-2.5 text-white" />
          </div>
        )}
        {!isVisible && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <EyeOff className="w-6 h-6 text-gray-400" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          {isMain && (
            <span className="flex items-center gap-1 rounded-full bg-[#d4af37] px-2 py-0.5 text-[10px] font-bold text-black">
              <Star className="h-2.5 w-2.5 fill-black" />
              Главное
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${getAlbumBadgeClass(item.albumCategory)}`}>
            {albumLabel(item.albumCategory)}
          </span>
          <span className={item.isVerified ? 'text-green-500 text-xs' : 'text-gray-500 text-xs'}>
            {item.isVerified ? '✓ Verified' : '○ Pending'}
          </span>
          <span className="text-gray-500 text-xs">{item.moderationStatus}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <select
          value={item.albumCategory || 'portfolio'}
          onChange={(e) => onAlbumChange(item.id, e.target.value as 'portfolio' | 'vip' | 'elite' | 'verified')}
          className="text-sm bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2 text-gray-400 focus:border-[#d4af37] outline-none"
        >
          <option value="portfolio">{ALBUM_LABEL_RU.portfolio}</option>
            <option value="vip">{ALBUM_LABEL_RU.vip}</option>
            <option value="elite">{ALBUM_LABEL_RU.elite}</option>
            <option value="verified">{ALBUM_LABEL_RU.verified}</option>
        </select>
        {onSetMain && !isMain && item.fileType === 'photo' && (
          <button
            onClick={() => onSetMain(item.id)}
            className="p-2 rounded-lg bg-[#141414] text-gray-400 border border-white/[0.06] transition-colors hover:border-[#d4af37]/40 hover:text-[#d4af37]"
            title="Сделать главным"
          >
            <Star className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={() => onVisibilityChange(item.id, !isVisible)}
          className={`p-2 rounded-lg transition-colors ${
            isVisible
              ? 'bg-[#141414] text-gray-400 hover:text-white border border-white/[0.06]'
              : 'bg-[#d4af37] text-[#0a0a0a] hover:bg-[#f4d03f]'
          }`}
          title={isVisible ? 'Hide from profile' : 'Show on profile'}
        >
          {isVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
        {onDelete && (
          <button
            onClick={() => onDelete(item.id)}
            className="p-2 rounded-lg bg-[#141414] text-gray-400 border border-white/[0.06] transition-colors hover:border-red-500/40 hover:text-red-400"
            title="Удалить"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
