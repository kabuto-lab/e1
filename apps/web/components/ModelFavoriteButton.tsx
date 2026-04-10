'use client';

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { isFavoriteSlug, toggleFavoriteModel } from '@/lib/client-favorites';

export function ModelFavoriteButton({
  slug,
  displayName,
  className = '',
}: {
  slug: string;
  displayName: string;
  className?: string;
}) {
  const { user } = useAuth();
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(isFavoriteSlug(slug));
  }, [slug]);

  if (user?.role !== 'client') return null;

  return (
    <button
      type="button"
      onClick={() => {
        const next = toggleFavoriteModel(slug, displayName);
        setOn(next);
      }}
      className={`inline-flex items-center justify-center rounded-full border border-white/[0.12] bg-black/55 p-2 text-[#d4af37] backdrop-blur-sm transition-colors hover:border-[#d4af37]/45 hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/45 ${className}`}
      aria-label={on ? 'Убрать из избранного' : 'В избранное'}
      title={on ? 'В избранном' : 'В избранное'}
    >
      <Star className={`h-4 w-4 ${on ? 'fill-[#d4af37]' : ''}`} strokeWidth={2} aria-hidden />
    </button>
  );
}
