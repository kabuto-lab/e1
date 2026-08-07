import type { Metadata } from 'next';
import { ModelProfilePageClient } from './ModelProfilePageClient';
import { serverFetchModelBySlug, serverFetchModelMedia } from '@/lib/api-server';
import { publicMediaUrl } from '@/lib/public-media-url';
import { apiUrl } from '@/lib/api-url';

/** Массажный режим: тот же URL/страница, источник данных — /massage/masters, если эскорт-модель не найдена. */
async function serverFetchMassageMasterBySlug(slug: string): Promise<any | null> {
  try {
    const res = await fetch(apiUrl(`/massage/masters/${slug}`), { next: { revalidate: 30 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await serverFetchModelBySlug(slug);
  if (!profile || typeof profile !== 'object') {
    const master = await serverFetchMassageMasterBySlug(slug);
    if (master) {
      const photoUrl = master.mainPhotoUrl ? publicMediaUrl(master.mainPhotoUrl as string) : undefined;
      const description = (master.description as string | undefined)?.slice(0, 155);
      return {
        title: master.displayName,
        description,
        openGraph: { title: master.displayName, description, images: photoUrl ? [{ url: photoUrl }] : [] },
      };
    }
    return { title: 'Страница не найдена' };
  }
  const p = profile as any;
  const photoUrl = p.mainPhotoUrl ? publicMediaUrl(p.mainPhotoUrl as string) : undefined;
  const description =
    (p.biography as string | undefined)?.slice(0, 155) ??
    `Профиль ${p.displayName} на платформе My Muse`;

  return {
    title: `${p.displayName} — My Muse`,
    description,
    openGraph: {
      title: `${p.displayName} — My Muse`,
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
          fileType: m.fileType,
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
