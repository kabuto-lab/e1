'use client';

import { Minus, Plus } from 'lucide-react';

interface Props {
  value: number | null | undefined;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  /** true — светлая тема wp-admin (дашборд), по умолчанию тёмная золотая тема проекта. */
  light?: boolean;
}

/** Числовой инпут без нативных стрелок браузера — вместо них компактные кнопки −/+. */
export function NumberStepperInput({ value, onChange, min = 0, max = 99, step = 1, placeholder, light = false }: Props) {
  const L = light;
  const current = value ?? 0;
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  return (
    <div
      className={`flex items-center overflow-hidden rounded-lg border transition-colors focus-within:border-[#d4af37]/40 ${
        L ? 'border-[#8c8f94] bg-white focus-within:border-[#2271b1]' : 'border-white/[0.08] bg-[#0a0a0a]'
      }`}
    >
      <button
        type="button"
        onClick={() => onChange(clamp(current - step))}
        className={`flex shrink-0 items-center justify-center px-2 py-2 transition-colors ${
          L ? 'text-[#646970] hover:bg-[#f6f7f7] hover:text-[#1d2327]' : 'text-white/40 hover:bg-white/[0.06] hover:text-white'
        }`}
        aria-label="Уменьшить"
      >
        <Minus className="h-3 w-3" />
      </button>
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        placeholder={placeholder}
        className={`w-full min-w-0 flex-1 border-0 bg-transparent px-1 py-2 text-center text-xs outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
          L ? 'text-[#2c3338]' : 'text-white'
        }`}
      />
      <button
        type="button"
        onClick={() => onChange(clamp(current + step))}
        className={`flex shrink-0 items-center justify-center px-2 py-2 transition-colors ${
          L ? 'text-[#646970] hover:bg-[#f6f7f7] hover:text-[#1d2327]' : 'text-white/40 hover:bg-white/[0.06] hover:text-white'
        }`}
        aria-label="Увеличить"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}
