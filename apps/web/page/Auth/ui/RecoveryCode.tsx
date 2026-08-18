import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

interface IProps {
    recoveryCode: string;
    recoveryCopied: boolean;
    setRecoveryCopied: (copied: boolean) => void;
    handleRecoveryContinue: () => void;
}

export const RecoveryCode = ({ recoveryCode, recoveryCopied, setRecoveryCopied, handleRecoveryContinue }: IProps) => (
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
                            await navigator.clipboard.writeText(recoveryCode).catch(() => { });
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
)