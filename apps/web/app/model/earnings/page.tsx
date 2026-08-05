'use client';

import { EarningsPanel } from '@/components/EarningsPanel';

export default function ModelEarningsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-white">Заработок</h1>
      <EarningsPanel />
    </div>
  );
}
