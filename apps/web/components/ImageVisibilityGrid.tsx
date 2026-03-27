/**
 * ImageVisibilityGrid Component
 * Manage photo visibility, albums, and sort order
 */

'use client';

import { useState, useCallback } from 'react';
import { Eye, EyeOff, Grid, List, ChevronUp, ChevronDown } from 'lucide-react';

function getAlbumBadgeClass(album?: string) {
  switch (album) {
    case 'vip': return 'badge-gold';
    case 'elite': return 'badge-gold';
    case 'verified': return 'badge-success';
    default: return 'badge-secondary';
  }
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
  onVisibilityChange: (mediaId: string, isVisible: boolean) => Promise<void>;
  onAlbumChange: (mediaId: string, album: 'portfolio' | 'vip' | 'elite' | 'verified') => Promise<void>;
  onBulkUpdate?: (mediaIds: string[], updates: { isPublicVisible?: boolean; albumCategory?: string }) => Promise<void>;
}

type FilterType = 'all' | 'visible' | 'hidden';
type ViewMode = 'grid' | 'list';

export function ImageVisibilityGrid({
  media,
  onVisibilityChange,
  onAlbumChange,
  onBulkUpdate,
}: ImageVisibilityGridProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);

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
                <option value="portfolio">Portfolio</option>
                <option value="vip">VIP</option>
                <option value="elite">Elite</option>
                <option value="verified">Verified</option>
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
              onSelect={() => toggleSelection(item.id)}
              onVisibilityChange={onVisibilityChange}
              onAlbumChange={onAlbumChange}
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
              onSelect={() => toggleSelection(item.id)}
              onVisibilityChange={onVisibilityChange}
              onAlbumChange={onAlbumChange}
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
  onSelect,
  onVisibilityChange,
  onAlbumChange,
}: {
  item: MediaFile;
  isSelected: boolean;
  onSelect: () => void;
  onVisibilityChange: (id: string, visible: boolean) => Promise<void>;
  onAlbumChange: (id: string, album: 'portfolio' | 'vip' | 'elite' | 'verified') => Promise<void>;
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
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="w-5 h-5 rounded border-white/[0.06] bg-[#0a0a0a]/80 text-[#d4af37] focus:ring-[#d4af37] focus:ring-offset-0"
        />
      </div>

      {/* Image */}
      <div className="relative aspect-[3/4] bg-[#0a0a0a]">
        <img
          src={item.cdnUrl}
          alt={`Model photo`}
          className="w-full h-full object-cover"
        />
        
        {/* Visibility overlay */}
        {!isVisible && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
            <EyeOff className="w-8 h-8 text-gray-400" />
          </div>
        )}

        {/* Quick actions */}
        <div className="absolute top-2 right-2 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        {/* Album badge */}
        <div className="flex items-center justify-between">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${getAlbumBadgeClass(item.albumCategory)}`}>
            {item.albumCategory || 'portfolio'}
          </span>
          <select
            value={item.albumCategory || 'portfolio'}
            onChange={(e) => onAlbumChange(item.id, e.target.value as 'portfolio' | 'vip' | 'elite' | 'verified')}
            className="text-xs bg-[#0a0a0a] border border-white/[0.06] rounded px-2 py-1 text-gray-400 focus:border-[#d4af37] outline-none"
          >
            <option value="portfolio">Portfolio</option>
            <option value="vip">VIP</option>
            <option value="elite">Elite</option>
            <option value="verified">Verified</option>
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
  onSelect,
  onVisibilityChange,
  onAlbumChange,
}: {
  item: MediaFile;
  isSelected: boolean;
  onSelect: () => void;
  onVisibilityChange: (id: string, visible: boolean) => Promise<void>;
  onAlbumChange: (id: string, album: 'portfolio' | 'vip' | 'elite' | 'verified') => Promise<void>;
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
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onSelect}
        className="w-5 h-5 rounded border-white/[0.06] bg-[#0a0a0a] text-[#d4af37] focus:ring-[#d4af37] focus:ring-offset-0"
      />

      {/* Thumbnail */}
      <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-[#0a0a0a] flex-shrink-0">
        <img
          src={item.cdnUrl}
          alt={`Model photo`}
          className="w-full h-full object-cover"
        />
        {!isVisible && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <EyeOff className="w-6 h-6 text-gray-400" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${getAlbumBadgeClass(item.albumCategory)}`}>
            {item.albumCategory || 'portfolio'}
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
          <option value="portfolio">Portfolio</option>
          <option value="vip">VIP</option>
          <option value="elite">Elite</option>
          <option value="verified">Verified</option>
        </select>
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
      </div>
    </div>
  );
}
