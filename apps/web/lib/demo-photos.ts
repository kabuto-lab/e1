/** Deterministic seed fragments for picsum via same-origin `/pic-proxy` (matches hero-images strategy). */
const DEMO_POOL = [
  'm01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08', 'm09', 'm10',
  'm11', 'm12', 'm13', 'm14', 'm15', 'm16', 'm17', 'm18', 'm19', 'm20',
];

export function generateDemoPhotos(
  modelId: string,
  mainPhotoUrl: string | null | undefined,
  count: number,
  width = 400,
  height = 600,
): string[] {
  const urls: string[] = [];
  if (mainPhotoUrl) urls.push(mainPhotoUrl);

  const safeId = modelId.replace(/[^a-zA-Z0-9]/g, '') || 'model';
  const start = Math.abs(
    (modelId.charCodeAt(0) || 0) + (modelId.charCodeAt(1) || 0),
  ) % DEMO_POOL.length;

  let attempt = 0;
  while (urls.length < count && attempt < count * 3) {
    const idx = (start + urls.length + attempt) % DEMO_POOL.length;
    const seed = `demo-${safeId.slice(0, 24)}-${DEMO_POOL[idx]}`;
    const url = `/pic-proxy/seed/${seed}/${width}/${height}`;
    if (!urls.includes(url)) {
      urls.push(url);
    }
    attempt++;
  }

  return urls;
}
