import type { Metadata } from 'next';
import { ModelProfilePageClient } from './ModelProfilePageClient';
import { serverFetchModelBySlug, serverFetchModelMedia } from '@/lib/api-server';
import { publicMediaUrl } from '@/lib/public-media-url';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await serverFetchModelBySlug(slug);
  if (!profile || typeof profile !== 'object') {
    return { title: 'Модель не найдена — Lovnge' };
  }
  const p = profile as any;
  const photoUrl = p.mainPhotoUrl ? publicMediaUrl(p.mainPhotoUrl as string) : undefined;
  const description =
    (p.biography as string | undefined)?.slice(0, 155) ??
    `Профиль ${p.displayName} на платформе Lovnge`;

  return {
    title: `${p.displayName} — Lovnge`,
    description,
    openGraph: {
      title: `${p.displayName} — Lovnge`,
      description,
      images: photoUrl ? [{ url: photoUrl }] : [],
      type: 'profile',
    },
  };
}

export default async function ModelSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const rawProfile = await serverFetchModelBySlug(slug);

  let initialProfile: any = null;
  let initialMedia: any[] = [];

  if (rawProfile && typeof rawProfile === 'object') {
    initialProfile = { ...(rawProfile as any) };
    if (typeof initialProfile.mainPhotoUrl === 'string' && initialProfile.mainPhotoUrl) {
      initialProfile.mainPhotoUrl = publicMediaUrl(initialProfile.mainPhotoUrl);
    }

    try {
      const media = await serverFetchModelMedia(initialProfile.id);
      initialMedia = media
        .filter((m: any) => m.cdnUrl)
        .map((m: any) => ({
          id: m.id,
          url: publicMediaUrl(m.cdnUrl as string),
          isVisible: m.isPublicVisible,
          albumCategory: m.albumCategory,
          sortOrder: m.sortOrder,
        }));
    } catch {
      // non-critical: client will fetch media if not available
    }
  }

  return (
    <ModelProfilePageClient
      slug={slug}
      initialProfile={initialProfile}
      initialMedia={initialMedia}
    />
  );
}
