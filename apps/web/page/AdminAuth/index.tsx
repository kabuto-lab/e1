"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { apiUrl } from '@/lib/api-url';
import { useAuth } from '@/components/AuthProvider';

export const AdminAuth = () => {
    const { login } = useAuth();
    const router = useRouter();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(apiUrl('/auth/login'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    identifier: username,
                    password: password
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.message && data.errors) {
                    setError(`${data.message}: ${JSON.stringify(data.errors)}`);
                } else {
                    setError(data.message || 'Login failed');
                }

                return;
            }

            if (data.user.role !== 'admin') {
                throw new Error('Access denied. Admin role required.');
            }

            login(data.accessToken, data.refreshToken, data.user);

            router.push('/dashboard');
        } catch (err: any) {
            console.error('❌ Admin Login: Error', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Logo */}
            <div className="mb-8 text-center">
                <h1 className="mb-2 bg-gradient-to-br from-gold to-gold-light bg-clip-text text-4xl font-bold text-transparent">
                    My Muse Admin
                </h1>
                <p className="text-sm text-[#6b6b6b]">
                    Панель администратора
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-5 flex items-center gap-2.5 rounded-[10px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit}>
                <div className="mb-5">
                    <label className="mb-2 block text-[13px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
                        Логин
                    </label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        placeholder=""
                        className="w-full rounded-[10px] border border-gold/20 bg-black/40 px-4 py-3.5 text-[15px] text-[#e0e0e0] outline-none transition-all duration-200 focus:border-gold/50 focus:bg-black/60"
                    />
                </div>

                <div className="mb-6">
                    <label className="mb-2 block text-[13px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
                        Пароль
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder=""
                        className="w-full rounded-[10px] border border-gold/20 bg-black/40 px-4 py-3.5 text-[15px] text-[#e0e0e0] outline-none transition-all duration-200 focus:border-gold/50 focus:bg-black/60"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full rounded-[10px] p-4 text-[15px] font-bold uppercase tracking-wider transition-all duration-200 ${loading
                        ? 'cursor-not-allowed bg-gold/50 text-[#666]'
                        : 'cursor-pointer bg-gradient-to-br from-gold to-gold-dark text-[#0a0a0a] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(212,175,55,0.3)]'
                        }`}
                >
                    {loading ? 'Вход...' : 'Войти'}
                </button>
            </form>

            {/* Back to Site */}
            <div className="mt-5 text-center">
                <a
                    href="/"
                    className="text-[13px] text-[#6b6b6b] no-underline transition-colors duration-200 hover:text-gold"
                >
                    ← Вернуться на сайт
                </a>
            </div>
        </>
    )
}