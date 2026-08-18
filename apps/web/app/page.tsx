import { Home } from '@/page/Home';
import { serverFetchPreviewModels } from '@/lib/api-server';

export default async function HomePage() {
  const initialCatalog = await serverFetchPreviewModels();

  return <Home initialCatalog={initialCatalog} />;
}
