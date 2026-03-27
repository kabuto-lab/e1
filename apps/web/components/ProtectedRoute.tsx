'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: ('admin' | 'manager' | 'model' | 'client')[];
}

export function ProtectedRoute({
  children,
  requiredRoles = ['admin', 'manager', 'model', 'client']
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isRedirecting = useRef(false);

  useEffect(() => {
    // ✅ GUARD: Don't do anything if still loading
    if (loading) return;

    // ✅ GUARD: Prevent redirect loops
    if (isRedirecting.current) return;

    // ✅ GUARD: Don't redirect if already on login page
    if (!user && pathname !== '/login' && pathname !== '/admin-login') {
      console.log('🔒 ProtectedRoute: Redirecting to login from', pathname);
      isRedirecting.current = true;
      router.replace(`/login?redirect=${encodeURIComponent(pathname || '/')}`);
      return;
    }

    // ✅ GUARD: Check role requirements
    if (user && requiredRoles && !requiredRoles.includes(user.role as any)) {
      console.log('🔒 ProtectedRoute: Insufficient role', user.role, 'required:', requiredRoles);
      // Don't redirect to dashboard (causes loop), just show access denied
      return;
    }

    console.log('✅ ProtectedRoute: Access granted to', pathname);
  }, [user, loading, pathname, router, requiredRoles]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d4af37] mx-auto mb-4" />
          <p className="text-[#d4af37] text-sm">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Show access denied if role doesn't match
  if (user && requiredRoles && !requiredRoles.includes(user.role as any)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="text-center p-8 bg-[#141414] border border-white/[0.06] rounded-2xl max-w-md">
          <h2 className="text-2xl font-bold text-white mb-2">Доступ запрещён</h2>
          <p className="text-gray-400 mb-4">
            У вас нет прав для просмотра этой страницы.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Ваша роль: <span className="text-[#d4af37]">{user.role}</span>
          </p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#b8941f] text-black font-semibold rounded-lg hover:shadow-lg hover:shadow-[#d4af37]/30 transition-all"
          >
            Назад
          </button>
        </div>
      </div>
    );
  }

  // Show nothing while redirecting to login
  if (!user && (pathname !== '/login' && pathname !== '/admin-login')) {
    return null;
  }

  return <>{children}</>;
}
