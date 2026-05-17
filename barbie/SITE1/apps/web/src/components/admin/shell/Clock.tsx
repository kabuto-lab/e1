'use client';

import { useEffect, useState } from 'react';

const DAYS = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
const MONTHS = ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК'];

/**
 * Clock — JetBrains-Mono цифровые часы. Тикает раз в секунду на клиенте,
 * SSR-safe (стартует с null → суффикс монтируется в useEffect).
 */
export function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return <div className="font-mono w-[120px]" aria-hidden="true" />;
  }

  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const mon = MONTHS[now.getMonth()];
  const day = DAYS[now.getDay()];

  return (
    <div className="ml-auto flex flex-col items-end font-mono leading-tight">
      <div className="text-[18px] font-semibold text-gold tracking-wider tabular-nums">
        {hh}:{mm}
        <span className="text-text-mute">:{ss}</span>
      </div>
      <div className="text-[11.5px] text-text-mute tracking-widest mt-0.5">
        {day} {dd} {mon}
      </div>
    </div>
  );
}
