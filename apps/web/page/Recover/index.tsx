"use client";

import { useAuth } from "@/components/AuthProvider";
import Logo from "@/components/Logo";
import { Role } from "@/enums";
import { apiUrl } from "@/lib/api-url";
import { ymGoal } from "@/lib/metrika";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export const Recover = () => {
    const { login } = useAuth();
    const router = useRouter();

    const [loginValue, setLoginValue] = useState('');
    const [recoveryCode, setRecoveryCodeInput] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [newRecoveryCode, setNewRecoveryCode] = useState<string | null>(null);
    const [recoveryCopied, setRecoveryCopied] = useState(false);
    const [pendingAuth, setPendingAuth] = useState<{ accessToken: string; refreshToken: string; user: any } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(apiUrl('/auth/recover'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login: loginValue.trim(), recoveryCode: recoveryCode.trim(), newPassword }),
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
            ymGoal('recover_password');

            setPendingAuth({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user });
            setNewRecoveryCode(data.recoveryCode);
        } catch (err: any) {
            setError(err.message || 'Не удалось восстановить доступ');
        } finally {
            setLoading(false);
        }
    };

    const handleContinue = () => {
        if (!pendingAuth) return;
        login(pendingAuth.accessToken, pendingAuth.refreshToken, pendingAuth.user);
        const r = pendingAuth.user.role as Role;

        if (r === Role.Moderator) router.push('/dashboard/moderation');
        else if (r === Role.Admin || r === Role.Manager) router.push('/dashboard');
        else if (r === Role.Model) router.push('/model');
        else router.push('/cabinet');
    };

    if (newRecoveryCode) {
        return (
            <main className="flex flex-1 items-center justify-center p-3 sm:p-6">
                <div className="w-full max-w-md">
                    <div className="card !bg-[#141414]/80 backdrop-blur-xl !border-white/[0.06] p-6 sm:p-10 hover:!translate-y-0 text-center">
                        <h1 className="font-display text-xl text-white mb-3">Новый код восстановления</h1>
                        <p className="font-body text-sm text-white/40 mb-6">
                            Старый код больше не действует. Сохраните этот — он понадобится при следующей потере пароля.
                        </p>
                        <div className="font-mono text-2xl tracking-[0.15em] text-[#d4af37] bg-white/[0.03] border border-[#d4af37]/20 rounded-lg py-4 mb-6">
                            {newRecoveryCode}
                        </div>
                        <button
                            type="button"
                            onClick={async () => {
                                await navigator.clipboard.writeText(newRecoveryCode).catch(() => { });
                                setRecoveryCopied(true);
                            }}
                            className="w-full mb-3 rounded-lg border border-white/[0.08] py-2.5 font-body text-sm text-white/70 hover:border-white/20 transition-all"
                        >
                            {recoveryCopied ? 'Скопировано' : 'Скопировать код'}
                        </button>
                        <button
                            type="button"
                            onClick={handleContinue}
                            className="site-header-cta-enter w-full justify-center !py-3.5"
                        >
                            <span className="site-header-cta-enter__label">Я сохранил(а) код — перейти в кабинет</span>
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="flex flex-1 items-center justify-center p-3 sm:p-6">
            <div className="w-full max-w-md">
                <div className="card !bg-[#141414]/80 backdrop-blur-xl !border-white/[0.06] p-6 sm:p-10 hover:!translate-y-0">
                    <div className="text-center mb-6 sm:mb-8">
                        <h1 className="text-3xl mb-2"><Logo /></h1>
                        <p className="font-body text-sm text-white/30">Восстановление доступа</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="block font-body text-xs font-medium text-white/40 uppercase tracking-[0.08em] mb-2">
                                Логин
                            </label>
                            <input
                                type="text"
                                value={loginValue}
                                onChange={(e) => setLoginValue(e.target.value)}
                                required
                                placeholder="ivan_petrov"
                                className="input"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block font-body text-xs font-medium text-white/40 uppercase tracking-[0.08em] mb-2">
                                Код восстановления
                            </label>
                            <input
                                type="text"
                                value={recoveryCode}
                                onChange={(e) => setRecoveryCodeInput(e.target.value)}
                                required
                                placeholder="XXXX-XXXX"
                                className="input font-mono uppercase"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block font-body text-xs font-medium text-white/40 uppercase tracking-[0.08em] mb-2">
                                Новый пароль
                            </label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={8}
                                placeholder="Минимум 8 символов"
                                className="input"
                            />
                        </div>

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
                                {loading ? 'Восстанавливаем...' : 'Восстановить доступ'}
                            </span>
                        </button>
                    </form>

                    <Link href="/login">
                        <p className="text-[#d4af37] mt-4 text-center font-body text-xs font-semibold">Вспомнили пароль? Войти</p>
                    </Link>
                </div>
            </div>
        </main>
    );
};
