import type { Metadata } from 'next';
import { apiUrl } from '@/lib/api-url';
import { publicMediaUrl } from '@/lib/public-media-url';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(apiUrl(`/models/${slug}`), {
      next: { revalidate: 300 },
    });
    if (!res.ok) return {};
    const profile = await res.json();
    const title = profile.displayName ?? undefined;
    const description = profile.biography ? String(profile.biography).slice(0, 160) : undefined;
    const imageUrl = profile.mainPhotoUrl ? publicMediaUrl(profile.mainPhotoUrl) : undefined;
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: imageUrl ? [{ url: imageUrl }] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: imageUrl ? [imageUrl] : [],
      },
    };
  } catch {
    return {};
  }
}

export default function ModelSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
