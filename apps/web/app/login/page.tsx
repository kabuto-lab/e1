'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { useAuth } from '@/components/AuthProvider';
import { apiUrl } from '@/lib/api-url';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'client' | 'model' | 'manager'>('client');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [telegramContact, setTelegramContact] = useState('');
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
        body: JSON.stringify(isLogin ? { email, password } : {
          email, password, role,
          ...(fullName.trim() ? { fullName: fullName.trim() } : {}),
          ...(role === 'manager' ? { companyName, phone, telegramContact } : {}),
        }),
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
        const r = data.user.role as string;
        if (r === 'admin' || r === 'manager') router.push('/dashboard');
        else if (r === 'model') router.push('/model');
        else router.push('/cabinet');
      } else {
        throw new Error('Неверный ответ сервера');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] pt-[var(--site-header-height)]">
      <SiteHeader variant="page" segment={{ crumbs: [{ label: 'Вход' }] }} />
      <main className="flex flex-1 items-center justify-center p-3 sm:p-6">
        <div className="w-full max-w-md">
        <div className="card !bg-[#141414]/80 backdrop-blur-xl !border-white/[0.06] p-6 sm:p-10 hover:!translate-y-0">
          {/* Logo */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-3xl mb-2"><Logo /></h1>
            <p className="font-body text-sm text-white/30">Премиальная платформа сопровождения</p>
          </div>

          {/* Tabs */}
          <div className="flex mb-5 bg-white/[0.03] rounded-lg p-1">
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
            <div className="mb-4">
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

            <div className="mb-4">
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

            {!isLogin && (
              <div className="mb-4">
                <label className="block font-body text-xs font-medium text-white/40 uppercase tracking-[0.08em] mb-2">
                  Я регистрируюсь как
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    ['client', 'Клиент'],
                    ['model', 'Модель'],
                    ['manager', 'Менеджер'],
                  ] as const).map(([r, label]) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`rounded-lg border py-2 font-body text-xs sm:text-sm font-medium transition-all ${
                        role === r
                          ? 'border-[#d4af37]/40 bg-[#d4af37]/10 text-[#d4af37]'
                          : 'border-white/[0.08] text-white/35 hover:border-white/20 hover:text-white/60'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="mt-3">
                  <label className="block font-body text-xs font-medium text-white/40 uppercase tracking-[0.08em] mb-2">
                    Имя / ФИО{role === 'manager' && <span className="text-[#d4af37]"> *</span>}
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={role === 'manager'}
                    placeholder="Иван Петров"
                    className="input"
                  />
                </div>

                {role === 'manager' && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="block font-body text-xs font-medium text-white/40 uppercase tracking-[0.08em] mb-2">
                        Телефон <span className="text-[#d4af37]">*</span>
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        placeholder="+79001234567"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block font-body text-xs font-medium text-white/40 uppercase tracking-[0.08em] mb-2">
                        Компания / агентство
                      </label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Elite Agency"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block font-body text-xs font-medium text-white/40 uppercase tracking-[0.08em] mb-2">
                        Telegram для связи
                      </label>
                      <input
                        type="text"
                        value={telegramContact}
                        onChange={(e) => setTelegramContact(e.target.value)}
                        placeholder="@username"
                        className="input"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/[0.08] border border-red-500/20 rounded-lg font-body text-sm text-red-400 mb-5">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="site-header-cta-enter w-full justify-center !py-3.5 disabled:cursor-not-allowed"
            >
              <span className="site-header-cta-enter__label">
                {loading ? 'Загрузка...' : isLogin ? 'Войти' : 'Создать аккаунт'}
              </span>
            </button>
          </form>

        </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
