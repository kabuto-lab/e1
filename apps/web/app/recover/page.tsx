"use client";

import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Recover } from '@/page/Recover';
import { Suspense } from 'react';

export default function RecoverPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] pt-[var(--site-header-height)]">
      <Header variant="page" segment={{ crumbs: [{ label: 'Восстановление доступа' }] }} />
      <Suspense fallback={null}>
        <Recover />
      </Suspense>
      <Footer />
    </div>
  );
}
