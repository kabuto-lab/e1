'use client';

import { useState, useRef, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useOutsideClose } from '@/hooks/useOutsideClose';

interface Option {
  value: string;
  label: string;
}

interface IProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  /** true — светлая тема wp-admin (дашборд), по умолчанию тёмная золотая тема проекта. */
  light?: boolean;
}

/** Кастомный select — тот же паттерн/размер, что «Способ связи» на странице логина. */
export function SelectDropdown({ value, onChange, options, placeholder = '-', light = false }: IProps) {
  const L = light;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClose(open, ref, useCallback(() => setOpen(false), []));

  const currentLabel = options.find((o) => o.value === value)?.label ?? placeholder;

  const buttonBase = L
    ? 'w-full rounded border border-[#8c8f94] bg-white px-2 py-1.5 text-sm text-[#2c3338] shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] outline-none focus:border-[#2271b1] focus:shadow-[0_0_0_1px_#2271b1]'
    : 'w-full rounded-lg border border-white/[0.06] bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none focus:border-[#d4af37]';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`${buttonBase} flex w-full cursor-pointer items-center justify-between gap-2 text-left transition-colors ${
          open ? (L ? 'border-[#2271b1]' : 'border-[#d4af37]/40') : ''
        }`}
      >
        <span className="truncate">{currentLabel}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''} ${
            L ? 'text-[#2271b1]/60' : 'text-[#d4af37]/60'
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute z-20 mt-2 max-h-56 w-full overflow-y-auto overscroll-contain rounded-lg border shadow-[0_16px_40px_rgba(0,0,0,0.5)] max-[640px]:max-h-48 ${
            L ? 'border-[#c3c4c7] bg-white' : 'border-white/[0.08] bg-[#141414]'
          }`}
        >
          {options.map((opt) => {
            const active = value === opt.value;
            return (
              <button
                key={opt.value || '_empty'}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2.5 px-3.5 py-2.5 text-sm transition-colors ${
                  active
                    ? L ? 'bg-[#f0f6fc] text-[#2271b1]' : 'bg-[#d4af37]/10 text-[#d4af37]'
                    : L ? 'text-[#2c3338] hover:bg-[#f6f7f7]' : 'text-white/60 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                {opt.label}
                {active && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
