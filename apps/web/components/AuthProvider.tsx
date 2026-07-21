'use client';

/**
 * Глобальное состояние авторизации для клиентских компонентов.
 * Источник истины для сессии в браузере — localStorage (accessToken, refreshToken, user JSON).
 * На сервер эти данные сами по себе не отправляются; отправка только когда api-client добавляет Bearer.
 */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiUrl } from '@/lib/api-url';

interface User {
  id: string;
  email: string;
  role: string;
  status: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, refreshToken: string, userData: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  isClient: boolean;
  isModel: boolean;
  /** Доступ к консоли `/dashboard` (admin, manager). */
  isStaffDashboardUser: boolean;
  /** Куда вести авторизованного пользователя из публичной шапки. */
  privateAreaHref: string;
  privateAreaLabel: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Гостевое значение, если компонент оказался вне AuthProvider (не должен ронять рендер). */
const guestAuthValue: AuthContextType = {
  user: null,
  loading: false,
  login: () => {},
  logout: () => {},
  refreshUser: async () => {},
  isAdmin: false,
  isManager: false,
  isClient: false,
  isModel: false,
  isStaffDashboardUser: false,
  privateAreaHref: '/login',
  privateAreaLabel: 'Войти',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const initAttempted = useRef(false);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    try {
      const raw = token.replace(/^"|"$/g, '');
      const res = await fetch(apiUrl('/auth/me'), {
        headers: { Authorization: `Bearer ${raw}` },
      });
      if (!res.ok) return;
      const fresh = await res.json();
      const updated: User = {
        id: fresh.userId ?? fresh.id,
        email: fresh.email,
        role: fresh.role,
        status: fresh.status,
      };
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
    } catch {
      // silent — stale cache is better than crashing
    }
  }, []);

  // ✅ STABLE: Only runs once on mount (initAttempted гасит второй прогон Strict Mode)
  useEffect(() => {
    if (initAttempted.current) return;
    initAttempted.current = true;

    try {
      const token = localStorage.getItem('accessToken');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        // Hydrate fresh status/role from server without blocking render
        refreshUser();
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      }
    } catch (error) {
      console.error('AuthProvider init error:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [refreshUser]);

  // ✅ STABLE: useCallback prevents recreation
  const login = useCallback((token: string, refreshToken: string, userData: User) => {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('authTimestamp', Date.now().toString());
    setUser(userData);
  }, []);

  // ✅ STABLE: useCallback prevents recreation
  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('authTimestamp');
    setUser(null);
    router.push('/login');
  }, [router]);

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'admin' || user?.role === 'manager';
  const isClient = user?.role === 'client';
  const isModel = user?.role === 'model';
  const isStaffDashboardUser = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'moderator';
  const privateAreaHref = user
    ? isStaffDashboardUser
      ? '/dashboard'
      : isModel
        ? '/model'
        : '/cabinet'
    : '/login';
  const privateAreaLabel = user ? (isStaffDashboardUser ? 'Панель' : 'Кабинет') : 'Войти';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser,
        isAdmin,
        isManager,
        isClient,
        isModel,
        isStaffDashboardUser,
        privateAreaHref,
        privateAreaLabel,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

/** Для шапки и публичного меню: никогда не бросает, при отсутствии провайдера — гость. */
export function useAuthOrGuest(): AuthContextType {
  return useContext(AuthContext) ?? guestAuthValue;
}
