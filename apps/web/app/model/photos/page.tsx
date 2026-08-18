'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api, resolveUploadMimeType } from '@/lib/api-client';
import { AlertCircle, Loader2, Upload, Trash2, Eye, EyeOff, Star, Video } from 'lucide-react';
import { ModelProfile } from '@/types/model';

interface MediaItem {
  id: string;
  cdnUrl: string;
  isPublicVisible: boolean;
  sortOrder: number;
  createdAt?: string;
  fileType: 'photo' | 'video' | 'document';
}

export default function ModelPhotosPage() {
  const [profile, setProfile] = useState<ModelProfile | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // mediaId currently being acted on
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const photos = media.filter((m) => m.fileType !== 'video');
  const videos = media.filter((m) => m.fileType === 'video');

  const loadMedia = useCallback(async (profileId: string) => {
    const raw = await api.getProfileMedia(profileId);
    const sorted = raw
      .filter((m: any) => m.cdnUrl?.trim())
      .sort((a: any, b: any) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
    setMedia(sorted.map((m: any) => ({
      id: m.id,
      cdnUrl: m.cdnUrl,
      isPublicVisible: m.isPublicVisible !== false,
      sortOrder: m.sortOrder ?? 0,
      createdAt: m.createdAt ?? m.created_at,
      fileType: m.fileType ?? 'photo',
    })));
  }, []);

  useEffect(() => {
    api.getMyModelProfile().then(async (p) => {
      setProfile(p);
      if (p) await loadMedia(p.id);
    }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [loadMedia]);

  const handleUpload = async (file: File, kind: 'photo' | 'video') => {
    if (!profile) return;
    const setBusyUpload = kind === 'video' ? setUploadingVideo : setUploading;
    setBusyUpload(true);
    setError(null);
    try {
      const mimeType = resolveUploadMimeType(file);
      const { uploadUrl, cdnUrl, mediaId } = await api.generatePresignedUrl({
        fileName: file.name,
        mimeType: mimeType as any,
        fileSize: file.size,
        modelId: profile.id,
      });
      await api.uploadToMinIO(uploadUrl, file, mimeType);
      await api.confirmUpload(mediaId, {
        cdnUrl,
        modelId: profile.id,
        metadata: { originalName: file.name },
        sortOrder: media.length,
      });
      if (kind === 'photo' && photos.length === 0 && !profile.mainPhotoUrl) {
        await api.setMainPhoto(mediaId, profile.id);
        setProfile((p) => p ? { ...p, mainPhotoUrl: cdnUrl } : p);
      }
      await loadMedia(profile.id);
    } catch (err: any) {
      setError(err.message ?? 'Ошибка загрузки');
    } finally {
      setBusyUpload(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file, 'photo');
    e.target.value = '';
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file, 'video');
    e.target.value = '';
  };

  const handleSetMain = async (item: MediaItem) => {
    if (!profile || busy) return;
    setBusy(item.id);
    try {
      await api.setMainPhoto(item.id, profile.id);
      setProfile((p) => p ? { ...p, mainPhotoUrl: item.cdnUrl } : p);
    } catch (err: any) {
      setError(err.message ?? 'Ошибка');
    } finally {
      setBusy(null);
    }
  };

  const handleToggleVisibility = async (item: MediaItem) => {
    if (busy) return;
    setBusy(item.id);
    const next = !item.isPublicVisible;
    setMedia((prev) => prev.map((m) => m.id === item.id ? { ...m, isPublicVisible: next } : m));
    try {
      await api.updateMediaVisibility(item.id, { isPublicVisible: next });
    } catch (err: any) {
      setMedia((prev) => prev.map((m) => m.id === item.id ? { ...m, isPublicVisible: !next } : m));
      setError(err.message ?? 'Ошибка');
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (item: MediaItem) => {
    if (!profile || busy) return;
    setBusy(item.id);
    try {
      await api.deleteMedia(item.id);
      if (profile.mainPhotoUrl === item.cdnUrl) {
        setProfile((p) => p ? { ...p, mainPhotoUrl: null } : p);
      }
      await loadMedia(profile.id);
    } catch (err: any) {
      setError(err.message ?? 'Ошибка удаления');
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 font-body text-sm text-white/40">
        <Loader2 className="h-4 w-4 animate-spin" />
        Загрузка…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        <div className="font-body text-sm text-amber-200/80">
          <p className="font-medium">Анкета не привязана к аккаунту</p>
          <p className="mt-0.5 text-amber-200/50">Обратитесь к менеджеру.</p>
        </div>
      </div>
    );
  }

  const isUnverified = profile.verificationStatus !== 'verified';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Фото и видео</h1>
          <p className="mt-1 font-body text-sm text-white/35">
            Портфолио анкеты. Первое фото — главное на карточке.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || isUnverified}
          title={isUnverified ? 'Доступно после верификации' : undefined}
          className="flex items-center gap-2 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-2 font-body text-sm font-medium text-[#d4af37] transition-colors hover:bg-[#d4af37]/15 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? 'Загрузка…' : 'Добавить фото'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {isUnverified && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 font-body text-sm text-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Загрузка фото и видео будет доступна после верификации анкеты.
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 font-body text-sm text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-red-400/50 hover:text-red-400">✕</button>
        </div>
      )}

      {photos.length === 0 && !uploading ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUnverified}
          title={isUnverified ? 'Доступно после верификации' : undefined}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/[0.08] bg-white/[0.02] py-16 transition-colors hover:border-[#d4af37]/30 hover:bg-[#d4af37]/[0.03] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/[0.08] disabled:hover:bg-white/[0.02]"
        >
          <Upload className="h-10 w-10 text-white/15" />
          <div className="text-center">
            <p className="font-display text-sm font-semibold text-white/30">Нет фотографий</p>
            <p className="mt-0.5 font-body text-xs text-white/20">Нажмите, чтобы загрузить первое</p>
          </div>
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((item) => {
            const isMain = profile.mainPhotoUrl === item.cdnUrl;
            const isBusy = busy === item.id;

            return (
              <div key={item.id} className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-white/[0.06] bg-[#111]">
                <img
                  src={item.cdnUrl}
                  alt=""
                  className={`h-full w-full object-cover transition-opacity ${item.isPublicVisible ? '' : 'opacity-40'}`}
                />

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/40" />

                {/* Main badge */}
                {isMain && (
                  <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-[#d4af37] px-2 py-0.5 font-body text-[10px] font-bold text-black">
                    <Star className="h-2.5 w-2.5 fill-black" />
                    Главное
                  </div>
                )}

                {/* Hidden badge */}
                {!item.isPublicVisible && (
                  <div className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 font-body text-[10px] text-white/60">
                    Скрыто
                  </div>
                )}

                {/* Action buttons */}
                {isBusy ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                ) : (
                  <div className="absolute bottom-2 right-2 flex flex-col gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                    {!isMain && (
                      <button
                        type="button"
                        onClick={() => handleSetMain(item)}
                        title="Сделать главным"
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d4af37] text-black shadow-lg transition-opacity hover:bg-[#c9a830]"
                      >
                        <Star className="h-4 w-4 fill-black" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(item)}
                      title={item.isPublicVisible ? 'Скрыть' : 'Показать'}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/70 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-black/90"
                    >
                      {item.isPublicVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      title="Удалить"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/70 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-red-600/90"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Upload cell */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isUnverified}
            title={isUnverified ? 'Доступно после верификации' : undefined}
            className="aspect-[3/4] flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/[0.06] text-white/20 transition-colors hover:border-[#d4af37]/30 hover:text-[#d4af37]/50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/[0.06] disabled:hover:text-white/20"
          >
            {uploading
              ? <Loader2 className="h-6 w-6 animate-spin" />
              : <Upload className="h-6 w-6" />
            }
            <span className="font-body text-xs">{uploading ? 'Загрузка…' : 'Добавить'}</span>
          </button>
        </div>
      )}

      {photos.length > 0 && (
        <p className="font-body text-xs text-white/20">
          Наведите на фото, чтобы увидеть действия. Скрытые фото не показываются клиентам.
        </p>
      )}

      {/* ── Видео ── */}
      <div className="flex flex-wrap items-start justify-between gap-3 pt-4">
        <div>
          <h2 className="font-display text-lg font-bold text-white">Видео</h2>
          <p className="mt-1 font-body text-sm text-white/35">
            Ролики для анкеты — проходят ту же модерацию, что и фото.
          </p>
        </div>
        <button
          type="button"
          onClick={() => videoInputRef.current?.click()}
          disabled={uploadingVideo || isUnverified}
          title={isUnverified ? 'Доступно после верификации' : undefined}
          className="flex items-center gap-2 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-2 font-body text-sm font-medium text-[#d4af37] transition-colors hover:bg-[#d4af37]/15 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {uploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
          {uploadingVideo ? 'Загрузка…' : 'Добавить видео'}
        </button>
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm"
          className="hidden"
          onChange={handleVideoFileChange}
        />
      </div>

      {videos.length === 0 && !uploadingVideo ? (
        <button
          type="button"
          onClick={() => videoInputRef.current?.click()}
          disabled={isUnverified}
          title={isUnverified ? 'Доступно после верификации' : undefined}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/[0.08] bg-white/[0.02] py-16 transition-colors hover:border-[#d4af37]/30 hover:bg-[#d4af37]/[0.03] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/[0.08] disabled:hover:bg-white/[0.02]"
        >
          <Video className="h-10 w-10 text-white/15" />
          <div className="text-center">
            <p className="font-display text-sm font-semibold text-white/30">Нет видео</p>
            <p className="mt-0.5 font-body text-xs text-white/20">Нажмите, чтобы загрузить первое</p>
          </div>
        </button>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((item) => {
            const isBusy = busy === item.id;
            return (
              <div key={item.id} className="group relative aspect-video overflow-hidden rounded-xl border border-white/[0.06] bg-[#111]">
                <video
                  src={item.cdnUrl}
                  controls
                  className={`h-full w-full object-cover transition-opacity ${item.isPublicVisible ? '' : 'opacity-40'}`}
                />

                {!item.isPublicVisible && (
                  <div className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 font-body text-[10px] text-white/60">
                    Скрыто
                  </div>
                )}

                {isBusy ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                ) : (
                  <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(item)}
                      title={item.isPublicVisible ? 'Скрыть' : 'Показать'}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/70 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-black/90"
                    >
                      {item.isPublicVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      title="Удалить"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/70 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-red-600/90"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {videos.length > 0 && (
        <p className="font-body text-xs text-white/20">
          Скрытые видео не показываются клиентам.
        </p>
      )}
    </div>
  );
}
