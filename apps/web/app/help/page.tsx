'use client';

import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { useMassageMode } from '@/hooks/useMassageMode';
import { Help } from '@/page/Help';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HelpPage() {
  const isMassageMode = useMassageMode();
  const router = useRouter();

  useEffect(() => {
    if (isMassageMode.enabled) router.replace('/');
  }, [isMassageMode.enabled, router]);

  if (isMassageMode.enabled) return null;

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] pt-[var(--site-header-height)]">
      <Header variant="page" segment={{ crumbs: [{ label: 'Помощь' }] }} />
      <Help />
      <Footer />
    </div>
  );
}
