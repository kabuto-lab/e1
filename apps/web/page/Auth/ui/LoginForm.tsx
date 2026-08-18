interface IProps {
    identifier: string;
    onChangeIdentifier: (identifier: string) => void;
    password: string;
    onChangePassword: (password: string) => void;
}

export const LoginForm = ({ identifier, onChangeIdentifier, password, onChangePassword }: IProps) => {
    return (
        <>
            <div className="mb-4">
                <label className="block font-body text-xs font-medium text-white/40 uppercase tracking-[0.08em] mb-2">
                    Логин
                </label>
                <input
                    type="text"
                    value={identifier}
                    onChange={(e) => onChangeIdentifier(e.target.value)}
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
                    onChange={(e) => onChangePassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="input"
                />
            </div>
        </>
    )
}