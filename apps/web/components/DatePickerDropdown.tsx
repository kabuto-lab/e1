'use client';

import { useState, useRef, useCallback } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useOutsideClose } from '@/lib/useOutsideClose';

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTH_LABELS_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTH_LABELS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildCalendarCells(monthDate: Date): (Date | null)[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Пн = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

interface IProps {
  /** 'YYYY-MM-DD' или '' */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Доп. дизейбл дней сверх прошедших (напр. полностью занятые даты). */
  disabledDate?: (d: Date) => boolean;
}

/** Кастомный выбор даты — кнопка + выпадающий календарь. Прошедшие дни задизейблены. */
export function DatePickerDropdown({ value, onChange, placeholder = 'Выберите дату', disabledDate }: IProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const t = startOfToday();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  useOutsideClose(open, ref, useCallback(() => setOpen(false), []));

  const openPicker = () => {
    if (value) {
      const [y, m] = value.split('-').map(Number);
      setCalendarMonth(new Date(y, m - 1, 1));
    }
    setOpen((v) => !v);
  };

  const today = startOfToday();
  const isCurrentMonth = calendarMonth.getFullYear() === today.getFullYear() && calendarMonth.getMonth() === today.getMonth();
  const cells = buildCalendarCells(calendarMonth);

  const label = value
    ? (() => {
        const [y, m, d] = value.split('-').map(Number);
        return `${d} ${MONTH_LABELS_GEN[m - 1]} ${y}`;
      })()
    : placeholder;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={openPicker}
        aria-expanded={open}
        className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-left font-body text-sm transition-colors focus:outline-none ${
          open ? 'border-[#d4af37]/40' : ''
        } ${value ? 'text-white' : 'text-white/35'}`}
      >
        <span className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-[#d4af37]/70" />
          {label}
        </span>
        <ChevronDown className={`h-4 w-4 text-[#d4af37]/60 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-full min-w-[280px] rounded-lg border border-white/[0.08] bg-[#141414] p-3 shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              disabled={isCurrentMonth}
              onClick={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              className="rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
              aria-label="Предыдущий месяц"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-body text-sm font-medium text-white">
              {MONTH_LABELS_NOM[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
            </span>
            <button
              type="button"
              onClick={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              className="rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white"
              aria-label="Следующий месяц"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAY_LABELS.map((w) => (
              <span key={w} className="flex h-7 items-center justify-center font-body text-[10px] font-medium uppercase text-white/30">
                {w}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              if (!cell) return <span key={`b-${i}`} />;
              const key = toDateInputValue(cell);
              const isPast = cell < today;
              const isDisabled = isPast || (disabledDate?.(cell) ?? false);
              const isSelected = value === key;
              const isToday = key === toDateInputValue(today);
              return (
                <button
                  key={key}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                  className={`flex h-8 items-center justify-center rounded-lg font-body text-sm transition-colors disabled:cursor-not-allowed disabled:text-white/15 ${
                    isSelected
                      ? 'bg-[#d4af37] font-semibold text-black'
                      : isToday
                        ? 'border border-[#d4af37]/40 text-white/80'
                        : 'text-white/70 hover:bg-white/[0.06]'
                  }`}
                >
                  {cell.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
