/**
 * Upload Photos Page
 * Manage model photos after profile creation
 * Updated with Image Visibility Control
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Check, Trash2, Star, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import ImageUpload from '@/components/ImageUpload';
import { ImageVisibilityGrid } from '@/components/ImageVisibilityGrid';
import { api } from '@/lib/api-client';

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

export default function ModelPhotosPage() {
  const router = useRouter();
  const params = useParams();
  const modelId = params.id as string;

  const [media, setMedia] = useState<MediaFile[]>([]);
  const [mainPhotoId, setMainPhotoId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMedia();
  }, [modelId]);

  const loadMedia = async () => {
    try {
      const files = await api.getProfileMedia(modelId);
      setMedia(files);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadComplete = async (mediaId: string, cdnUrl: string) => {
    try {
      await api.setMainPhoto(mediaId, modelId);
      setMainPhotoId(mediaId);
      await loadMedia();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (mediaId: string) => {
    if (!confirm('Delete this photo?')) return;

    try {
      await api.deleteMedia(mediaId);
      await loadMedia();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSetMain = async (mediaId: string) => {
    try {
      await api.setMainPhoto(mediaId, modelId);
      setMainPhotoId(mediaId);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleContinue = () => {
    router.push('/dashboard/models');
  };

  const handleVisibilityChange = useCallback(async (mediaId: string, isVisible: boolean) => {
    try {
      await api.updateMediaVisibility(mediaId, { isPublicVisible: isVisible });
      await loadMedia();
    } catch (err: any) {
      setError(err.message);
    }
  }, [loadMedia]);

  const handleAlbumChange = useCallback(async (mediaId: string, album: 'portfolio' | 'vip' | 'elite' | 'verified') => {
    try {
      await api.updateMediaVisibility(mediaId, { albumCategory: album });
      await loadMedia();
    } catch (err: any) {
      setError(err.message);
    }
  }, [loadMedia]);

  const handleBulkUpdate = useCallback(async (
    mediaIds: string[],
    updates: { isPublicVisible?: boolean; albumCategory?: string }
  ) => {
    try {
      await api.bulkUpdateMediaVisibility(mediaIds, updates);
      await loadMedia();
    } catch (err: any) {
      setError(err.message);
    }
  }, [loadMedia]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/models"
            className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Фотографии</h1>
            <p className="text-gray-400 text-sm">Загрузка и управление фото</p>
          </div>
        </div>
        <button
          onClick={handleContinue}
          className="px-6 py-3 bg-gradient-to-r from-[#d4af37] to-[#b8941f] text-black font-semibold rounded-lg hover:shadow-lg hover:shadow-[#d4af37]/20 transition-all"
        >
          Продолжить
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="text-red-400 text-sm">{error}</div>
        </div>
      )}

      {/* Upload Section */}
      <section className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6">
        <h2 className="text-lg font-bold text-white mb-6">Загрузить фото</h2>
        <ImageUpload
          modelId={modelId}
          onUploadComplete={handleUploadComplete}
          onError={(err) => setError(err)}
          accept="image/jpeg,image/png,image/webp"
        />
      </section>

      {/* Gallery */}
      <section className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6">
        <h2 className="text-lg font-bold text-white mb-6">Галерея ({media.length})</h2>

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Загрузка...</div>
        ) : media.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            Нет загруженных фото
          </div>
        ) : (
          <ImageVisibilityGrid
            media={media}
            onVisibilityChange={handleVisibilityChange}
            onAlbumChange={handleAlbumChange}
            onBulkUpdate={handleBulkUpdate}
          />
        )}
      </section>

      {/* Info */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="text-blue-400 text-sm">
          <strong>Совет:</strong> Используйте фильтры "Visible" и "Hidden" для управления видимостью фото в публичном профиле.
          Альбомы (Portfolio, VIP, Elite, Verified) помогают организовать галерею.
        </div>
      </div>
    </div>
  );
}
