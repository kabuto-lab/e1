"use client";

import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { useMassageMode } from '@/lib/useMassageMode';
import { Auth } from '@/page/Auth';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';

export default function LoginPage() {
  const isMassageMode = useMassageMode();
  const router = useRouter();

  useEffect(() => {
    if (isMassageMode.enabled) router.replace('/');
  }, [isMassageMode.enabled, router]);
  
  if (isMassageMode.enabled) return null;
  
  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] pt-[var(--site-header-height)]">
      <Header variant="page" segment={{ crumbs: [{ label: 'Вход' }] }} />
      <Suspense fallback={null}>
        <Auth />
      </Suspense>
      <Footer />
    </div>
  );
}
