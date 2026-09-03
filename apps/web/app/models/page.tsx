import { ModelsClientPage } from './ModelsClientPage';
import { serverFetchModelsWithTotal, serverFetchModelStats } from '@/lib/api-server';

export default async function ModelsPage() {
  const [{ items: initialModels, total: initialTotalCount }, initialStats] = await Promise.all([
    serverFetchModelsWithTotal('orderBy=rating&order=desc&limit=15'),
    serverFetchModelStats(),
  ]);

  return (
    <ModelsClientPage
      initialModels={initialModels as any}
      initialStats={initialStats}
      initialTotalCount={initialTotalCount}
    />
  );
}
