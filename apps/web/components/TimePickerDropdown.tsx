'use client';

import { useState, useRef, useCallback } from 'react';
import { Clock, ChevronDown, Check } from 'lucide-react';
import { useOutsideClose } from '@/lib/useOutsideClose';

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

interface IProps {
  /** 'HH:MM' или '' */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Слоты, которые нужно задизейблить (напр. занято или до "свободна с"). */
  disabledTime?: (t: string) => boolean;
}

/** Кастомный выбор времени — кнопка + скроллируемый список слотов по 30 минут. */
export function TimePickerDropdown({ value, onChange, placeholder = 'Выберите время', disabledTime }: IProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClose(open, ref, useCallback(() => setOpen(false), []));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-left font-body text-sm transition-colors focus:outline-none ${
          open ? 'border-[#d4af37]/40' : ''
        } ${value ? 'text-white' : 'text-white/35'}`}
      >
        <span className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-[#d4af37]/70" />
          {value || placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-[#d4af37]/60 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto overscroll-contain rounded-lg border border-white/[0.08] bg-[#141414] shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
          {TIME_OPTIONS.map((t) => {
            const active = value === t;
            const disabled = disabledTime?.(t) ?? false;
            return (
              <button
                key={t}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onChange(t);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2.5 px-3.5 py-2.5 font-body text-sm transition-colors disabled:cursor-not-allowed disabled:text-white/15 disabled:hover:bg-transparent ${
                  disabled ? '' : active ? 'bg-[#d4af37]/10 text-[#d4af37]' : 'text-white/60 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                {t}
                {active && !disabled && <Check className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
