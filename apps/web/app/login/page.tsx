'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { SiteHeader } from '@/components/SiteHeader';
import { useAuth } from '@/components/AuthProvider';
import { apiUrl } from '@/lib/api-url';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const response = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: 'client' }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({} as { message?: string | string[] }));
        const msgRaw = errorData.message;
        const msg =
          typeof msgRaw === 'string'
            ? msgRaw
            : Array.isArray(msgRaw)
              ? msgRaw.join('; ')
              : `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(msg);
      }

      const data = await response.json();

      if (data.accessToken && data.user) {
        login(data.accessToken, data.refreshToken, data.user);
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    const feedback = document.getElementById('copyFeedback');
    if (feedback) {
      feedback.textContent = `${label} скопирован!`;
      feedback.style.opacity = '1';
      setTimeout(() => { feedback.style.opacity = '0'; }, 2000);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] pt-[var(--site-header-height)]">
      <SiteHeader variant="page" segment={{ crumbs: [{ label: 'Вход' }] }} />
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
        <div className="card !bg-[#141414]/80 backdrop-blur-xl !border-white/[0.06] p-10 hover:!translate-y-0">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-3xl mb-2"><Logo /></h1>
            <p className="font-body text-sm text-white/30">Премиальная платформа сопровождения</p>
          </div>

          {/* Tabs */}
          <div className="flex mb-6 bg-white/[0.03] rounded-lg p-1">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 rounded-md font-body text-sm font-medium transition-all ${
                isLogin ? 'bg-[#d4af37]/15 text-[#d4af37]' : 'text-white/30 hover:text-white/50'
              }`}
            >
              Вход
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 rounded-md font-body text-sm font-medium transition-all ${
                !isLogin ? 'bg-[#d4af37]/15 text-[#d4af37]' : 'text-white/30 hover:text-white/50'
              }`}
            >
              Регистрация
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label className="block font-body text-xs font-medium text-white/40 uppercase tracking-[0.08em] mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="input"
              />
            </div>

            <div className="mb-6">
              <label className="block font-body text-xs font-medium text-white/40 uppercase tracking-[0.08em] mb-2">
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="input"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/[0.08] border border-red-500/20 rounded-lg font-body text-sm text-red-400 mb-5">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full !py-3.5 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Создать аккаунт')}
            </button>
          </form>

          {/* Demo creds */}
          <div className="mt-6 p-4 bg-[#d4af37]/[0.03] border border-[#d4af37]/10 rounded-lg relative">
            <div id="copyFeedback" className="absolute top-2 right-3 font-body text-xs text-green-400 font-medium opacity-0 transition-opacity" />
            <p className="font-body text-xs text-white/25 mb-3 text-center">
              Демо доступ (нажми чтобы скопировать):
            </p>
            <div className="space-y-2">
              <div
                onClick={() => copyToClipboard('test@test.com', 'Email')}
                className="py-2.5 px-4 bg-white/[0.03] border border-[#d4af37]/15 rounded-md font-body text-sm text-[#d4af37] text-center cursor-pointer hover:bg-[#d4af37]/[0.06] hover:border-[#d4af37]/30 transition-all"
              >
                test@test.com
              </div>
              <div
                onClick={() => copyToClipboard('password123', 'Пароль')}
                className="py-2.5 px-4 bg-white/[0.03] border border-[#d4af37]/15 rounded-md font-body text-sm text-[#d4af37] text-center cursor-pointer hover:bg-[#d4af37]/[0.06] hover:border-[#d4af37]/30 transition-all"
              >
                password123
              </div>
            </div>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}
