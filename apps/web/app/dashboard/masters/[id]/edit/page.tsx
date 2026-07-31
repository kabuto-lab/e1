'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, type MassageMaster } from '@/lib/api-client';
import { MasterEditorForm } from '../../MasterEditorForm';

export default function EditMasterPage() {
  const { id } = useParams<{ id: string }>();
  const [master, setMaster] = useState<MassageMaster | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getMassageMasterById(id)
      .then(setMaster)
      .catch(() => setError('Мастер не найден'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d4af37]/20 border-t-[#d4af37]" />
      </div>
    );
  }

  if (error || !master) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
        <p className="text-sm text-gray-500">{error || 'Мастер не найден'}</p>
        <Link href="/dashboard/masters" className="text-sm text-[#d4af37] hover:underline">
          Вернуться к списку мастеров
        </Link>
      </div>
    );
  }

  return <MasterEditorForm initialMaster={master} />;
}
