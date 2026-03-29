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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const initAttempted = useRef(false);

  // ✅ STABLE: Only runs once on mount
  useEffect(() => {
    // Prevent double-run in React StrictMode and multiple init attempts
    if (initialized || initAttempted.current) return;
    initAttempted.current = true;

    console.log('🔐 AuthProvider: Initializing auth...');
    
    const initAuth = () => {
      try {
        const token = localStorage.getItem('accessToken');
        const storedUser = localStorage.getItem('user');

        console.log('🔐 AuthProvider: Token exists:', !!token);
        console.log('🔐 AuthProvider: User exists:', !!storedUser);

        if (token && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          console.log('🔐 AuthProvider: User loaded:', parsedUser.email, 'Role:', parsedUser.role);
        } else {
          console.log('🔐 AuthProvider: No auth data found');
          // Clear any partial data
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error('❌ AuthProvider: Init error:', error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
        setInitialized(true);
        console.log('✅ AuthProvider: Initialization complete');
      }
    };

    // Add timeout safeguard - force stop loading after 2 seconds
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ AuthProvider: Init timeout - forcing loading state to false');
        setLoading(false);
        setInitialized(true);
      }
    }, 2000);

    initAuth();

    return () => clearTimeout(timeoutId);
  }, []); // ✅ EMPTY dependency array = run once only

  // ✅ STABLE: useCallback prevents recreation
  const login = useCallback((token: string, refreshToken: string, userData: User) => {
    console.log('🔐 AuthProvider: Login called for', userData.email, 'Role:', userData.role);
    localStorage.setItem('accessToken', token);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('authTimestamp', Date.now().toString());
    setUser(userData);
  }, []);

  // ✅ STABLE: useCallback prevents recreation
  const logout = useCallback(() => {
    console.log('🔐 AuthProvider: Logout called');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('authTimestamp');
    setUser(null);
    router.push('/login');
  }, [router]);

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'admin' || user?.role === 'manager';

  // Debug logging - will show ONCE after fix
  useEffect(() => {
    console.log('📊 AuthProvider render:', {
      user: user?.email,
      role: user?.role,
      loading,
      initialized,
    });
  }, [user, loading, initialized]);

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
}
