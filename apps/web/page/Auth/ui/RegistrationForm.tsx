import { ContactMethod, Role } from "@/enums";
import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from "react";
import { CONTACT_METHOD_ICONS, CONTACT_METHOD_LABELS, CONTACT_METHOD_PLACEHOLDERS } from "./constants";

interface IProps {
    role: Role;
    onChangeRole: (role: Role) => void;
    password: string;
    onChangePassword: (password: string) => void;
    companyName: string;
    onChangeCompanyName: (companyName: string) => void;
    contactMethod: ContactMethod;
    onChangeContactMethod: (contactMethod: ContactMethod) => void;
    contactValue: string;
    onChangeContactValue: (contactValue: string) => void;
    regLogin: string;
    onChangeRegLogin: (regLogin: string) => void;
}

export const RegfistrationForm = ({ role, onChangeRole, password, onChangePassword, companyName, onChangeCompanyName, contactMethod, onChangeContactMethod, contactValue, onChangeContactValue, regLogin, onChangeRegLogin }: IProps) => {
    const [contactMethodOpen, setContactMethodOpen] = useState(false);
    const contactMethodRef = useRef<HTMLDivElement>(null);

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

    return (
        <>
            <div className="mb-4">
                <label className="block font-body text-xs font-medium text-white/40 uppercase tracking-[0.08em] mb-2">
                    Я регистрируюсь как
                </label>
                <div className="grid grid-cols-3 gap-2">
                    {([
                        [Role.Client, 'Клиент'],
                        [Role.Model, 'Модель'],
                        [Role.Manager, 'Менеджер'],
                    ] as [Role, string][]).map(([r, label]) => (
                        <button
                            key={r}
                            type="button"
                            onClick={() => onChangeRole(r)}
                            className={`rounded-lg border py-2 font-body text-xs sm:text-sm font-medium transition-all ${role === r
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
                    Логин <span className="text-[#d4af37]">*</span>
                </label>
                <input
                    type="text"
                    value={regLogin}
                    onChange={(e) => onChangeRegLogin(e.target.value)}
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
                    onChange={(e) => onChangePassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="input"
                />
            </div>

            {(role === Role.Model || role === Role.Manager) && (
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
                                className={`input flex w-full cursor-pointer items-center justify-between gap-2 text-left transition-colors ${contactMethodOpen ? 'border-[#d4af37]/40' : ''
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
                                    className={`h-4 w-4 text-[#d4af37]/60 transition-transform duration-200 ${contactMethodOpen ? 'rotate-180' : ''
                                        }`}
                                />
                            </button>

                            {contactMethodOpen && (
                                <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-white/[0.08] bg-[#141414] shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
                                    {(['phone', 'telegram', 'email', 'whatsapp'] as ContactMethod[]).map((m) => {
                                        const Icon = CONTACT_METHOD_ICONS[m];
                                        const active = contactMethod === m;
                                        return (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={() => {
                                                    onChangeContactMethod(m);
                                                    setContactMethodOpen(false);
                                                }}
                                                className={`flex w-full items-center justify-between gap-2.5 px-3.5 py-2.5 font-body text-sm transition-colors ${active
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
                            onChange={(e) => onChangeContactValue(e.target.value)}
                            required
                            placeholder={CONTACT_METHOD_PLACEHOLDERS[contactMethod]}
                            className="input"
                        />
                    </div>
                </div>
            )}

            {role === Role.Manager && (
                <div className="mb-4">
                    <label className="block font-body text-xs font-medium text-white/40 uppercase tracking-[0.08em] mb-2">
                        Компания / агентство
                    </label>
                    <input
                        type="text"
                        value={companyName}
                        onChange={(e) => onChangeCompanyName(e.target.value)}
                        placeholder="Elite Agency"
                        className="input"
                    />
                </div>
            )}
        </>
    )
}