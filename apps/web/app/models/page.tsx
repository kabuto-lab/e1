import { ModelsClientPage } from './ModelsClientPage';
import { serverFetchModelsWithTotal, serverFetchModelStats } from '@/lib/api-server';

export default async function ModelsPage() {
  const [initialCatalog, initialStats] = await Promise.all([
    serverFetchModelsWithTotal('orderBy=rating&order=desc&limit=15'),
    serverFetchModelStats(),
  ]);

  return (
    <ModelsClientPage
      initialModels={initialCatalog?.items as any}
      initialStats={initialStats}
      initialTotalCount={initialCatalog?.total}
    />
  );
}
