'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, Mail, MessageCircle, Phone, Send } from 'lucide-react';
import Logo from '@/components/Logo';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/components/AuthProvider';
import { apiUrl } from '@/lib/api-url';

const CONTACT_METHOD_LABELS: Record<string, string> = {
  phone: 'Телефон',
  telegram: 'Telegram',
  email: 'E-mail',
  whatsapp: 'WhatsApp',
};

const CONTACT_METHOD_PLACEHOLDERS: Record<string, string> = {
  phone: '+79001234567',
  telegram: '@username',
  email: 'your@email.com',
  whatsapp: '+79001234567',
};

const CONTACT_METHOD_ICONS: Record<string, typeof Phone> = {
  phone: Phone,
  telegram: Send,
  email: Mail,
  whatsapp: MessageCircle,
};

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'client' | 'model' | 'manager'>('client');
  const [fullName, setFullName] = useState('');
  const [regLogin, setRegLogin] = useState('');
  const [phone, setPhone] = useState('');
  const [contactMethod, setContactMethod] = useState<'phone' | 'telegram' | 'email' | 'whatsapp'>('telegram');
  const [contactValue, setContactValue] = useState('');
  const [contactMethodOpen, setContactMethodOpen] = useState(false);
  const contactMethodRef = useRef<HTMLDivElement>(null);
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [recoveryCopied, setRecoveryCopied] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState<{ role: string } | null>(null);

  useEffect(() => {
    if (!contactMethodOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (contactMethodRef.current && !contactMethodRef.current.contains(e.target as Node)) {
        setContactMethodOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContactMethodOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [contactMethodOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const response = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isLogin
          ? { identifier, password }
          : {
              login: regLogin.trim(), password, fullName: fullName.trim(), role,
              ...(role === 'client' && phone.trim() ? { phone: phone.trim() } : {}),
              ...(role === 'model' && contactValue.trim() ? { contactMethod, contactValue: contactValue.trim() } : {}),
              ...(role === 'manager' ? { companyName } : {}),
            }
        ),
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
        if (!isLogin && data.recoveryCode) {
          // Показываем код восстановления один раз, редиректим только после закрытия экрана.
          setRecoveryCode(data.recoveryCode);
          setPendingRedirect({ role: data.user.role });
          login(data.accessToken, data.refreshToken, data.user);
          return;
        }
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

  const handleRecoveryContinue = () => {
    if (!pendingRedirect) return;
    const r = pendingRedirect.role;
    if (r === 'admin' || r === 'manager') router.push('/dashboard');
    else if (r === 'model') router.push('/model');
    else router.push('/cabinet');
  };

  if (recoveryCode) {
    return (
      <div className="flex min-h-screen flex-col bg-[#0a0a0a] pt-[var(--site-header-height)]">
        <Header variant="page" segment={{ crumbs: [{ label: 'Регистрация' }] }} />
        <main className="flex flex-1 items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-md">
            <div className="card !bg-[#141414]/80 backdrop-blur-xl !border-white/[0.06] p-6 sm:p-10 hover:!translate-y-0 text-center">
              <h1 className="font-display text-xl text-white mb-3">Сохраните код восстановления</h1>
              <p className="font-body text-sm text-white/40 mb-6">
                Это единственный раз, когда мы его показываем. Если вы забудете пароль или логин —
                назовите этот код в поддержке, чтобы подтвердить, что аккаунт ваш.
              </p>
              <div className="font-mono text-2xl tracking-[0.15em] text-[#d4af37] bg-white/[0.03] border border-[#d4af37]/20 rounded-lg py-4 mb-6">
                {recoveryCode}
              </div>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(recoveryCode).catch(() => {});
                  setRecoveryCopied(true);
                }}
                className="w-full mb-3 rounded-lg border border-white/[0.08] py-2.5 font-body text-sm text-white/70 hover:border-white/20 transition-all"
              >
                {recoveryCopied ? 'Скопировано' : 'Скопировать код'}
              </button>
              <button
                type="button"
                onClick={handleRecoveryContinue}
                className="site-header-cta-enter w-full justify-center !py-3.5"
              >
                <span className="site-header-cta-enter__label">Я сохранил(а) код, продолжить</span>
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] pt-[var(--site-header-height)]">
      <Header variant="page" segment={{ crumbs: [{ label: 'Вход' }] }} />
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
            {isLogin ? (
              <>
                <div className="mb-4">
                  <label className="block font-body text-xs font-medium text-white/40 uppercase tracking-[0.08em] mb-2">
                    Логин
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    placeholder="ivan_petrov"
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
              </>
            ) : (
              <>
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
                </div>

                <div className="mb-4">
                  <label className="block font-body text-xs font-medium text-white/40 uppercase tracking-[0.08em] mb-2">
                    Имя / ФИО <span className="text-[#d4af37]">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Иван Петров"
                    className="input"
                  />
                </div>

                <div className="mb-4">
                  <label className="block font-body text-xs font-medium text-white/40 uppercase tracking-[0.08em] mb-2">
                    Логин <span className="text-[#d4af37]">*</span>
                  </label>
                  <input
                    type="text"
                    value={regLogin}
                    onChange={(e) => setRegLogin(e.target.value)}
                    required
                    minLength={3}
                    maxLength={32}
                    pattern="[a-zA-Z0-9_.]{3,32}"
                    placeholder="ivan_petrov"
                    className="input"
                  />
                </div>

                <div className="mb-4">
                  <label className="block font-body text-xs font-medium text-white/40 uppercase tracking-[0.08em] mb-2">
                    Пароль <span className="text-[#d4af37]">*</span>
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

                {role === 'client' && (
                  <div className="mb-4">
                    <label className="block font-body text-xs font-medium text-white/40 uppercase tracking-[0.08em] mb-2">
                      Телефон <span className="text-white/25 normal-case font-normal">(необязательно)</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+79001234567"
                      className="input"
                    />
                  </div>
                )}

                {role === 'model' && (
                  <div className="mb-4 space-y-3">
                    <div>
                      <label className="block font-body text-xs font-medium text-white/40 uppercase tracking-[0.08em] mb-2">
                        Способ связи <span className="text-[#d4af37]">*</span>
                      </label>
                      <div ref={contactMethodRef} className="relative">
                        <button
                          type="button"
                          onClick={() => setContactMethodOpen((v) => !v)}
                          aria-expanded={contactMethodOpen}
                          className={`input flex w-full cursor-pointer items-center justify-between gap-2 text-left transition-colors ${
                            contactMethodOpen ? 'border-[#d4af37]/40' : ''
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            {(() => {
                              const Icon = CONTACT_METHOD_ICONS[contactMethod];
                              return <Icon className="h-4 w-4 text-[#d4af37]/70" />;
                            })()}
                            {CONTACT_METHOD_LABELS[contactMethod]}
                          </span>
                          <ChevronDown
                            className={`h-4 w-4 text-[#d4af37]/60 transition-transform duration-200 ${
                              contactMethodOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {contactMethodOpen && (
                          <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-white/[0.08] bg-[#141414] shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
                            {(['phone', 'telegram', 'email', 'whatsapp'] as const).map((m) => {
                              const Icon = CONTACT_METHOD_ICONS[m];
                              const active = contactMethod === m;
                              return (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => {
                                    setContactMethod(m);
                                    setContactMethodOpen(false);
                                  }}
                                  className={`flex w-full items-center justify-between gap-2.5 px-3.5 py-2.5 font-body text-sm transition-colors ${
                                    active
                                      ? 'bg-[#d4af37]/10 text-[#d4af37]'
                                      : 'text-white/60 hover:bg-white/[0.04] hover:text-white'
                                  }`}
                                >
                                  <span className="flex items-center gap-2.5">
                                    <Icon className="h-4 w-4" />
                                    {CONTACT_METHOD_LABELS[m]}
                                  </span>
                                  {active && <Check className="h-3.5 w-3.5" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block font-body text-xs font-medium text-white/40 uppercase tracking-[0.08em] mb-2">
                        Контакт <span className="text-[#d4af37]">*</span>
                      </label>
                      <input
                        type="text"
                        value={contactValue}
                        onChange={(e) => setContactValue(e.target.value)}
                        required
                        placeholder={CONTACT_METHOD_PLACEHOLDERS[contactMethod]}
                        className="input"
                      />
                    </div>
                  </div>
                )}

                {role === 'manager' && (
                  <div className="mb-4">
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
                )}
              </>
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

            <Link href="/contacts">
              <p className='text-[#d4af37] mt-4 text-center font-body text-xs font-semibold'>Забыли пароль?</p>
            </Link>
        </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
