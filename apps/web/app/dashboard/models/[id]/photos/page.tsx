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
import { useDashboardTheme } from '@/components/DashboardThemeContext';
import { dashboardTone } from '@/lib/dashboard-tone';

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
  const modelId = params?.id as string;
  const { isWpAdmin: L } = useDashboardTheme();
  const t = dashboardTone(L);

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
      const files = await api.getProfileMedia(modelId);
      setMedia(files);
      setIsLoading(false);
      if (files.length <= 1 && !mainPhotoId) {
        await api.setMainPhoto(mediaId, modelId);
        setMainPhotoId(mediaId);
      }
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
    <div className={`mx-auto max-w-4xl space-y-8 font-body ${t.page}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/models" className={`rounded-lg p-2 transition-colors ${L ? 'hover:bg-[#f0f0f1]' : 'hover:bg-[#141414]'}`}>
            <ArrowLeft className={`h-5 w-5 ${t.muted}`} />
          </Link>
          <div>
            <h1 className={`font-display text-2xl font-bold ${L ? 'text-[#1d2327]' : 'text-white'}`}>Фотографии</h1>
            <p className={`text-sm ${t.muted}`}>Загрузка и управление фото</p>
          </div>
        </div>
        <button type="button" onClick={handleContinue} className={L ? `${t.btnPrimary} px-6 py-3` : 'rounded-lg bg-gradient-to-r from-[#d4af37] to-[#b8941f] px-6 py-3 font-semibold text-black transition-all hover:shadow-lg hover:shadow-[#d4af37]/20'}>
          Продолжить
        </button>
      </div>

      {error && (
        <div className={L ? 'rounded-sm border border-[#d63638] bg-[#fcf0f1] p-4' : 'rounded-xl border border-red-500/30 bg-red-500/10 p-4'}>
          <div className={`text-sm ${L ? 'text-[#d63638]' : 'text-red-400'}`}>{error}</div>
        </div>
      )}

      <section className={`${t.formSection}`}>
        <h2 className={`mb-6 text-lg font-bold ${L ? 'text-[#1d2327]' : 'text-white'}`}>Загрузить фото</h2>
        <ImageUpload
          modelId={modelId}
          onUploadComplete={handleUploadComplete}
          onError={(err) => setError(err)}
          accept="image/jpeg,image/png,image/webp"
        />
      </section>

      {/* Gallery */}
      <section className={t.formSection}>
        <h2 className={`mb-6 text-lg font-bold ${L ? 'text-[#1d2327]' : 'text-white'}`}>Галерея ({media.length})</h2>

        {isLoading ? (
          <div className={`py-12 text-center ${t.muted}`}>Загрузка...</div>
        ) : media.length === 0 ? (
          <div className={`py-12 text-center ${t.muted}`}>
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
      <div className={L ? 'rounded-sm border border-[#72aee6] bg-[#f0f6fc] p-4' : 'rounded-xl border border-blue-500/30 bg-blue-500/10 p-4'}>
        <div className={`text-sm ${L ? 'text-[#2271b1]' : 'text-blue-400'}`}>
          <strong>Совет:</strong> Используйте фильтры "Visible" и "Hidden" для управления видимостью фото в публичном профиле.
          Альбомы (портфолио, VIP, элит, проверенные) помогают организовать галерею.
        </div>
      </div>
    </div>
  );
}
