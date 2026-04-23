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

const STORAGE_KEY = 'dashboard-ui-theme';

export type DashboardUiTheme = 'default' | 'wp-admin';

type Ctx = {
  theme: DashboardUiTheme;
  setTheme: (t: DashboardUiTheme) => void;
  isWpAdmin: boolean;
};

const DashboardThemeContext = createContext<Ctx | null>(null);

function readStoredTheme(): DashboardUiTheme {
  if (typeof window === 'undefined') return 'wp-admin';
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'wp-admin' ? 'wp-admin' : 'default';
  } catch {
    return 'wp-admin';
  }
}

export function DashboardThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<DashboardUiTheme>('wp-admin');

  useEffect(() => {
    setThemeState(readStoredTheme());
  }, []);

  const setTheme = useCallback((t: DashboardUiTheme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      isWpAdmin: theme === 'wp-admin',
    }),
    [theme, setTheme],
  );

  return <DashboardThemeContext.Provider value={value}>{children}</DashboardThemeContext.Provider>;
}

export function useDashboardTheme(): Ctx {
  const c = useContext(DashboardThemeContext);
  if (!c) throw new Error('useDashboardTheme must be used inside DashboardThemeProvider');
  return c;
}
