const DEMO_POOL = [
  'photo-1534528741775-53994a69daeb',
  'photo-1529626455594-4ff0802cfb7e',
  'photo-1544005313-94ddf0286df2',
  'photo-1531746020798-e6953c6e8e04',
  'photo-1488426862026-3ee34a7d66df',
  'photo-1524504388940-b1c1722653e1',
  'photo-1545912452-8b7760508a11',
  'photo-1552053831-715f03e92548',
  'photo-1554151285-5d3dc8065915',
  'photo-1551893478-d726eaf0442c',
  'photo-1552664730-d307ca884978',
  'photo-1534759846116-5799c33ce22a',
  'photo-1507003211169-0a1dd7228f2d',
  'photo-1494790108377-be9c29b29330',
  'photo-1517841905240-472988babdf9',
  'photo-1539571696357-5a69c17a67c6',
  'photo-1515886657613-9f3515b0c78f',
  'photo-1529139574466-a303027c1d8b',
  'photo-1502823403499-6ccfcf4fb453',
  'photo-1504703395950-b89145a5425b',
];

export function generateDemoPhotos(
  modelId: string,
  mainPhotoUrl: string | null | undefined,
  count: number,
  size = 'w=400&h=600',
): string[] {
  const urls: string[] = [];
  if (mainPhotoUrl) urls.push(mainPhotoUrl);

  const start = Math.abs(
    (modelId.charCodeAt(0) || 0) + (modelId.charCodeAt(1) || 0),
  ) % DEMO_POOL.length;

  let attempt = 0;
  while (urls.length < count && attempt < count * 3) {
    const idx = (start + urls.length + attempt) % DEMO_POOL.length;
    const url = `https://images.unsplash.com/${DEMO_POOL[idx]}?${size}&fit=crop`;
    const photoId = DEMO_POOL[idx];
    if (!urls.some((u) => u.includes(photoId))) {
      urls.push(url);
    }
    attempt++;
  }

  return urls;
}
