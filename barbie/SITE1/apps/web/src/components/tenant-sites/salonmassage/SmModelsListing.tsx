'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import type { PublicGirl } from '@/lib/public-girls-api';
import { SmModelCard } from './SmModelCard';

/**
 * SmModelsListing — листинг анкет реплики SalonMassage (классы .filterbar/.dd/
 * .mgrid из _style.css). Фильтр-дропдауны возраст/рост/грудь — client-side, как
 * в app.js статики. Данные (все активные модели салона) приходят server-side.
 */

type Range = [number, number] | null;

const AGE: { l: string; r: Range }[] = [
  { l: 'любой', r: null },
  { l: '18–22', r: [18, 22] },
  { l: '23–27', r: [23, 27] },
  { l: '28–34', r: [28, 34] },
  { l: '35+', r: [35, 99] },
];
const HEIGHT: { l: string; r: Range }[] = [
  { l: 'любой', r: null },
  { l: 'до 165', r: [0, 165] },
  { l: '166–172', r: [166, 172] },
  { l: 'от 173', r: [173, 300] },
];
const BREAST: { l: string; r: Range }[] = [
  { l: 'любой', r: null },
  { l: '1', r: [1, 1] },
  { l: '2', r: [2, 2] },
  { l: '3', r: [3, 3] },
  { l: '4', r: [4, 4] },
  { l: '5+', r: [5, 99] },
];

export function SmModelsListing({ girls, base = 'imperiumspa' }: { girls: PublicGirl[]; base?: string }) {
  const [age, setAge] = useState(0);
  const [height, setHeight] = useState(0);
  const [breast, setBreast] = useState(0);

  const filtered = useMemo(() => {
    const inR = (v: number | null, r: Range) => r === null || (v != null && Math.floor(v) >= r[0] && Math.floor(v) <= r[1]);
    return girls.filter(
      (g) => inR(g.age, AGE[age].r) && inR(g.height, HEIGHT[height].r) && inR(g.breast, BREAST[breast].r),
    );
  }, [girls, age, height, breast]);

  const reset = () => {
    setAge(0);
    setHeight(0);
    setBreast(0);
  };

  return (
    <>
      <div className="filterbar">
        <Dropdown label="Возраст" options={AGE.map((x) => x.l)} value={age} onChange={setAge} />
        <Dropdown label="Рост" options={HEIGHT.map((x) => x.l)} value={height} onChange={setHeight} />
        <Dropdown label="Грудь" options={BREAST.map((x) => x.l)} value={breast} onChange={setBreast} />
        <button className="freset" onClick={reset}>Сбросить</button>
      </div>

      <div className="fcount-wrap">
        Показано: <span className="fcount">{filtered.length}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="fnone">По заданным фильтрам никого нет — смягчите критерии.</div>
      ) : (
        <div className="mgrid">
          {filtered.map((g) => (
            <SmModelCard key={g.slug} girl={g} base={base} />
          ))}
        </div>
      )}
    </>
  );
}

function Dropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: number;
  onChange: (i: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div className={`dd${open ? ' open' : ''}`} ref={ref}>
      <button className="dd-btn" onClick={() => setOpen((v) => !v)}>
        <span className="dd-lab">{label}</span>
        <span className="dd-val">{options[value]}</span>
        <span className="dd-ar">▾</span>
      </button>
      <div className="dd-menu">
        {options.map((o, i) => (
          <button
            key={o}
            className={i === value ? 'on' : ''}
            onClick={() => {
              onChange(i);
              setOpen(false);
            }}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
