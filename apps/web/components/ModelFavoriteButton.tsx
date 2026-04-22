'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { isFavoriteSlug, toggleFavoriteModel } from '@/lib/client-favorites';
import { api } from '@/lib/api-client';

export function ModelFavoriteButton({
  slug,
  displayName,
  modelId,
  className = '',
}: {
  slug: string;
  displayName: string;
  modelId?: string;
  className?: string;
}) {
  const { user } = useAuth();
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOn(isFavoriteSlug(slug));
  }, [slug]);

  const toggle = useCallback(async () => {
    if (busy) return;
    const next = !on;
    setOn(next);

    if (modelId) {
      setBusy(true);
      try {
        if (next) {
          await api.addServerFavorite(modelId);
        } else {
          await api.removeServerFavorite(modelId);
        }
      } catch {
        setOn(!next);
      } finally {
        setBusy(false);
      }
    } else {
      toggleFavoriteModel(slug, displayName);
    }
  }, [busy, on, modelId, slug, displayName]);

  if (user?.role !== 'client') return null;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`inline-flex items-center justify-center rounded-full border border-white/[0.12] bg-black/55 p-2 text-[#d4af37] backdrop-blur-sm transition-colors hover:border-[#d4af37]/45 hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/45 disabled:opacity-60 ${className}`}
      aria-label={on ? 'Убрать из избранного' : 'В избранное'}
      title={on ? 'В избранном' : 'В избранное'}
    >
      <Star className={`h-4 w-4 ${on ? 'fill-[#d4af37]' : ''}`} strokeWidth={2} aria-hidden />
    </button>
  );
}
