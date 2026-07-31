'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiUrl } from '@/lib/api-url';

export type MassageMode = {
  enabled: boolean;
  catalogMode: 'open' | 'closed';
  siteName: string;
  /** Всегда false, если провайдер получил initial с сервера — нет вспышки эскорт-контента. */
  loading: boolean;
};

export type MassageModeInitial = { enabled: boolean; catalogMode: 'open' | 'closed'; siteName: string };

const DEFAULT_MASSAGE_MODE: MassageMode = {
  enabled: false,
  catalogMode: 'open',
  siteName: 'Название проекта',
  loading: true,
};

const MassageModeContext = createContext<MassageMode>(DEFAULT_MASSAGE_MODE);

/**
 * Серверный fetch в apps/web/app/layout.tsx (см. serverFetchMassageMode) передаётся сюда как
 * `initial` — первый клиентский рендер сразу совпадает с SSR-разметкой, без переключения контента
 * постфактум. Клиентский повторный fetch держит значение свежим, пока вкладка открыта.
 */
export function MassageModeProvider({ initial, children }: { initial: MassageModeInitial; children: ReactNode }) {
  const [value, setValue] = useState<MassageMode>({ ...initial, loading: false });

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl('/massage/settings/public'), { cache: 'no-store', headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Partial<MassageModeInitial> | null) => {
        if (cancelled || !data) return;
        setValue({
          enabled: data.enabled === true,
          catalogMode: data.catalogMode === 'closed' ? 'closed' : 'open',
          siteName:
            typeof data.siteName === 'string' && data.siteName.trim() ? data.siteName : initial.siteName,
          loading: false,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <MassageModeContext.Provider value={value}>{children}</MassageModeContext.Provider>;
}

export function useMassageModeContext(): MassageMode {
  return useContext(MassageModeContext);
}
