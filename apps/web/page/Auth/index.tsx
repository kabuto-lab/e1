"use client";

import { useAuth } from "@/components/AuthProvider";
import Logo from "@/components/Logo";
import { ContactMethod, Role } from "@/enums";
import { apiUrl } from "@/lib/api-url";
import { ymGoal } from "@/lib/metrika";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { LoginForm } from "./ui/LoginForm";
import { RecoveryCode } from "./ui/RecoveryCode";
import { RegfistrationForm } from "./ui/RegistrationForm";

const ROLE_PARAM_VALUES: Record<string, Role> = {
    model: Role.Model,
    manager: Role.Manager,
    client: Role.Client,
};

export const Auth = () => {
    const { login } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const roleParam = searchParams.get('role');
    const initialRole = (roleParam && ROLE_PARAM_VALUES[roleParam]) || Role.Client;

    const [isLogin, setIsLogin] = useState(searchParams.get('tab') !== 'register');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [role, setRole] = useState<Role>(initialRole);
    const [contactMethod, setContactMethod] = useState<ContactMethod>(ContactMethod.Telegram);
    const [contactValue, setContactValue] = useState('');

    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');

    const [regLogin, setRegLogin] = useState('');
    const [companyName, setCompanyName] = useState('');

    const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
    const [recoveryCopied, setRecoveryCopied] = useState(false);
    const [pendingRedirect, setPendingRedirect] = useState<{ role: string } | null>(null);

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
                        login: regLogin.trim(), password, role,
                        ...((role === Role.Model || role === Role.Manager) && contactValue.trim() ? { contactMethod, contactValue: contactValue.trim() } : {}),
                        ...(role === Role.Manager ? { companyName } : {}),
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
                ymGoal(isLogin ? 'login' : 'register', { role: data.user.role });

                if (!isLogin && data.recoveryCode) {
                    setRecoveryCode(data.recoveryCode);
                    setPendingRedirect({ role: data.user.role });
                    login(data.accessToken, data.refreshToken, data.user);
                    return;
                }

                login(data.accessToken, data.refreshToken, data.user);
                const r = data.user.role as Role;

                if (r === Role.Moderator) router.push('/dashboard/moderation');
                else if (r === Role.Admin || r === Role.Manager) router.push('/dashboard');
                else if (r === Role.Model) router.push('/model');
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

        if (r === 'moderator') router.push('/dashboard/moderation');
        else if (r === 'admin' || r === 'manager') router.push('/dashboard');
        else if (r === 'model') router.push('/model');
        else router.push('/cabinet');
    };

    if (recoveryCode) {
        return (
            <RecoveryCode
                recoveryCode={recoveryCode}
                recoveryCopied={recoveryCopied}
                setRecoveryCopied={setRecoveryCopied}
                handleRecoveryContinue={handleRecoveryContinue}
            />
        )
    }

    return (
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
                            className={`flex-1 py-2.5 rounded-md font-body text-sm font-medium transition-all ${isLogin ? 'bg-[#d4af37]/15 text-[#d4af37]' : 'text-white/30 hover:text-white/50'
                                }`}
                        >
                            Вход
                        </button>
                        <button
                            onClick={() => setIsLogin(false)}
                            className={`flex-1 py-2.5 rounded-md font-body text-sm font-medium transition-all ${!isLogin ? 'bg-[#d4af37]/15 text-[#d4af37]' : 'text-white/30 hover:text-white/50'
                                }`}
                        >
                            Регистрация
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit}>
                        {isLogin ? (
                            <LoginForm
                                identifier={identifier}
                                onChangeIdentifier={setIdentifier}
                                password={password}
                                onChangePassword={setPassword}
                            />
                        ) : (
                            <RegfistrationForm
                                role={role}
                                onChangeRole={setRole}
                                password={password}
                                onChangePassword={setPassword}
                                companyName={companyName}
                                onChangeCompanyName={setCompanyName}
                                contactMethod={contactMethod}
                                onChangeContactMethod={setContactMethod}
                                contactValue={contactValue}
                                onChangeContactValue={setContactValue}
                                regLogin={regLogin}
                                onChangeRegLogin={setRegLogin}
                            />
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
    )
};
