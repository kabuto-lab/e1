'use client';

interface IProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** true — светлая тема wp-admin (дашборд), по умолчанию тёмная золотая тема проекта. */
  light?: boolean;
  ariaLabel?: string;
}

/** Тумблер в стиле проекта (золото на тёмной теме, синий акцент на wp-admin) — вместо нативного чекбокса. */
export function Switch({ checked, onChange, light = false, ariaLabel }: IProps) {
  const L = light;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] ${
        checked ? (L ? 'bg-[#2271b1]' : 'bg-[#d4af37]') : L ? 'bg-[#c3c4c7]' : 'bg-white/[0.14]'
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-[1.125rem]' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
