/**
 * StatCard — плашка «подпись + число» для ЛК (заработок, статистика анкеты и т.д.).
 * Вынесен из EarningsPanel.tsx, чтобы не плодить копии в новых секциях.
 */

interface IProps {
  label: string;
  value: string;
  /** По умолчанию " ₽" (исходное поведение в EarningsPanel) — передайте '' для не-денежных значений. */
  suffix?: string;
  accent?: boolean;
}

export function StatCard({
  label,
  value,
  suffix = ' ₽',
  accent,
}: IProps) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-white/[0.06] bg-[#141414] px-4 py-3 sm:px-5 sm:py-4">
      <span className="font-body text-xs uppercase tracking-wide text-white/40">{label}</span>
      <span className={`break-words font-display text-lg font-bold sm:text-xl ${accent ? 'text-[#d4af37]' : 'text-white'}`}>
        {value}{suffix}
      </span>
    </div>
  );
}
