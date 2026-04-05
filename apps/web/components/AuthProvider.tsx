'use client';

/**
 * Глобальное состояние авторизации для клиентских компонентов.
 * Источник истины для сессии в браузере — localStorage (accessToken, refreshToken, user JSON).
 * На сервер эти данные сами по себе не отправляются; отправка только когда api-client добавляет Bearer.
 */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

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
  isAdmin: boolean;
  isManager: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Гостевое значение, если компонент оказался вне AuthProvider (не должен ронять рендер). */
const guestAuthValue: AuthContextType = {
  user: null,
  loading: false,
  login: () => {},
  logout: () => {},
  isAdmin: false,
  isManager: false,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const initAttempted = useRef(false);

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
  }, []);

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

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isManager }}>
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
