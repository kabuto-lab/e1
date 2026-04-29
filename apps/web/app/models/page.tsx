import { ModelsClientPage } from './ModelsClientPage';
import { serverFetchModels, serverFetchModelStats } from '@/lib/api-server';

export default async function ModelsPage() {
  const [initialModels, initialStats] = await Promise.all([
    serverFetchModels(),
    serverFetchModelStats(),
  ]);

  return (
    <ModelsClientPage
      initialModels={initialModels as any}
      initialStats={initialStats}
    />
  );
}
