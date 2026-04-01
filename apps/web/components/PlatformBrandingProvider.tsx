'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiUrl } from '@/lib/api-url';

export type PlatformBranding = {
  textLogo: string;
  textLogoBlink: boolean;
};

export type PlatformBrandingContextValue = PlatformBranding & {
  refetchPublicBranding: () => void;
  /** Сразу подставить текст/мигание (после сохранения настроек), пока не пришёл ответ GET /settings/public */
  patchBranding: (p: Partial<PlatformBranding>) => void;
};

const defaultBranding: PlatformBranding = {
  textLogo: 'Lovnge',
  textLogoBlink: true,
};

const PlatformBrandingContext = createContext<PlatformBrandingContextValue>({
  ...defaultBranding,
  refetchPublicBranding: () => {},
  patchBranding: () => {},
});

export function PlatformBrandingProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<PlatformBranding>(defaultBranding);
  const [fetchNonce, setFetchNonce] = useState(0);

  const refetchPublicBranding = useCallback(() => setFetchNonce((n) => n + 1), []);

  const patchBranding = useCallback((p: Partial<PlatformBranding>) => {
    setValue((v) => ({
      textLogo:
        typeof p.textLogo === 'string' && p.textLogo.trim().length > 0
          ? p.textLogo.trim()
          : v.textLogo,
      textLogoBlink: p.textLogoBlink !== undefined ? p.textLogoBlink !== false : v.textLogoBlink,
    }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const base = apiUrl('/settings/public');
    const url = `${base}${base.includes('?') ? '&' : '?'}_=${fetchNonce}`;
    fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Partial<PlatformBranding> | null) => {
        if (cancelled || !data) return;
        setValue({
          textLogo:
            typeof data.textLogo === 'string' && data.textLogo.trim().length > 0
              ? data.textLogo.trim()
              : defaultBranding.textLogo,
          textLogoBlink: data.textLogoBlink !== false,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fetchNonce]);

  const ctx = useMemo<PlatformBrandingContextValue>(
    () => ({ ...value, refetchPublicBranding, patchBranding }),
    [value, refetchPublicBranding, patchBranding],
  );

  return <PlatformBrandingContext.Provider value={ctx}>{children}</PlatformBrandingContext.Provider>;
}

export function usePlatformBranding(): PlatformBrandingContextValue {
  return useContext(PlatformBrandingContext);
}
