import { publicMediaUrl } from './public-media-url';

/** Подборка Unsplash-фото женских портретов через same-origin /img-proxy/. */
const PHOTO_POOL = [
  'photo-1438761681033-6461ffad8d80',
  'photo-1494790108377-be9c29b29330',
  'photo-1531746020798-e6953c6e8e04',
  'photo-1517841905240-472988babdf9',
  'photo-1488716820095-cbe80883c496',
  'photo-1534528741775-53994a69daeb',
  'photo-1544005313-94ddf0286df2',
  'photo-1531123897727-8f129e1688ce',
  'photo-1508214751196-bcfd4ca60f91',
  'photo-1502823403499-6ccfcf4fb453',
  'photo-1569913486515-b74bf7751574',
  'photo-1580489944761-15a19d654956',
  'photo-1567532939604-b6b5b0db2604',
  'photo-1573496359142-b8d87734a5a2',
  'photo-1601412436009-d964bd02edbc',
  'photo-1598550880863-4e8aa3d0edb4',
  'photo-1593104547489-5cfb3839a3b5',
  'photo-1614204424926-196a80bf0be8',
  'photo-1508243771214-6e95d137426b',
];

export function generateDemoPhotos(
  modelId: string,
  mainPhotoUrl: string | null | undefined,
  count: number,
  width = 400,
  height = 600,
): string[] {
  const urls: string[] = [];
  const main = publicMediaUrl(mainPhotoUrl);
  if (main) urls.push(main);

  const start = Math.abs(
    (modelId.charCodeAt(0) || 0) + (modelId.charCodeAt(1) || 0),
  ) % PHOTO_POOL.length;

  let attempt = 0;
  while (urls.length < count && attempt < count * 3) {
    const idx = (start + urls.length + attempt) % PHOTO_POOL.length;
    const photo = PHOTO_POOL[idx];
    const url = `/img-proxy/${photo}?w=${width}&h=${height}&fit=crop&auto=format`;
    if (!urls.includes(url)) {
      urls.push(url);
    }
    attempt++;
  }

  return urls;
}
