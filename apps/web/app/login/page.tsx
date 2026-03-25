'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveAuth } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function LoginPage() {
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
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: 'client' }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.accessToken && data.user) {
        saveAuth({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
        });
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
      setTimeout(() => {
        feedback.style.opacity = '0';
      }, 2000);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0f0f0f] p-6">
      <div className="w-full max-w-md bg-[#1a1a1a]/80 backdrop-blur-xl border border-[#d4af37]/20 rounded-2xl p-10 shadow-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#d4af37] to-[#f4d03f] bg-clip-text text-transparent mb-2">
            Lovnge
          </h1>
          <p className="text-gray-500 text-sm">Премиальная платформа сопровождения</p>
        </div>

        {/* Tabs */}
        <div className="flex mb-6 bg-black/30 rounded-lg p-1">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2.5 rounded-md font-semibold transition-all ${
              isLogin
                ? 'bg-[#d4af37]/20 text-[#d4af37]'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Вход
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2.5 rounded-md font-semibold transition-all ${
              !isLogin
                ? 'bg-[#d4af37]/20 text-[#d4af37]'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Регистрация
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="block text-gray-400 text-sm font-medium mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              className="w-full px-4 py-3 bg-black/30 border border-[#d4af37]/20 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#d4af37]/50 transition-colors"
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-400 text-sm font-medium mb-2">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-black/30 border border-[#d4af37]/20 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#d4af37]/50 transition-colors"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm mb-5">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-[#d4af37] to-[#b8941f] text-black font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-[#d4af37]/20 transition-all disabled:hover:shadow-none"
          >
            {loading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Создать аккаунт')}
          </button>
        </form>

        {/* Demo credentials */}
        <div className="mt-6 p-4 bg-[#d4af37]/5 border border-[#d4af37]/10 rounded-lg relative">
          <div
            id="copyFeedback"
            className="absolute top-2 right-3 text-green-400 text-xs font-semibold opacity-0 transition-opacity"
          />
          <p className="text-gray-500 text-xs mb-3 text-center">
            🔑 Демо доступ (нажми чтобы скопировать):
          </p>
          <div className="space-y-2">
            <div
              onClick={() => copyToClipboard('test@test.com', 'Email')}
              className="py-2.5 px-4 bg-black/40 border border-[#d4af37]/20 rounded-md text-[#d4af37] text-sm font-mono text-center cursor-pointer hover:bg-[#d4af37]/10 hover:border-[#d4af37]/50 transition-all"
            >
              📧 test@test.com
            </div>
            <div
              onClick={() => copyToClipboard('password123', 'Пароль')}
              className="py-2.5 px-4 bg-black/40 border border-[#d4af37]/20 rounded-md text-[#d4af37] text-sm font-mono text-center cursor-pointer hover:bg-[#d4af37]/10 hover:border-[#d4af37]/50 transition-all"
            >
              🔑 password123
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
