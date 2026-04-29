import { HomePageClient } from './HomePageClient';
import { serverFetchPreviewModels } from '@/lib/api-server';

export default async function HomePage() {
  const initialCatalog = await serverFetchPreviewModels();

  return <HomePageClient initialCatalog={initialCatalog} />;
}
