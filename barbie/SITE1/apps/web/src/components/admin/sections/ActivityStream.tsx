'use client';

import { Card } from '@/components/admin/primitives/Card';
import { LiveDot } from '@/components/admin/primitives/LiveDot';

/**
 * ActivityStream — поток событий тенанта. Phase 1: визуальный демо-mock
 * с реалистичными примерами; в Phase 2 заменится на SSE из BotModule / wsCore.
 *
 * Цветовая палитра event-tag'ов соответствует мокапу:
 *  cyan=book / green=pay / amber=rev / red=alert / gold=done.
 */
interface Evt {
  time: string;
  body: React.ReactNode;
  tag: 'book' | 'pay' | 'rev' | 'alert' | 'done';
}

const MOCK_EVENTS: Evt[] = [
  {
    time: '14:22',
    body: (
      <>
        <strong>Анна С.</strong> бронь <em>Классический массаж 90′</em> · PENTAGON
      </>
    ),
    tag: 'book',
  },
  {
    time: '14:21',
    body: (
      <>
        Платёж <strong>₽8,200</strong> от <em>Виктор Л.</em>
      </>
    ),
    tag: 'pay',
  },
  {
    time: '14:18',
    body: (
      <>
        5★ отзыв · <em>Maria K.</em> «Лучший массаж в Москве»
      </>
    ),
    tag: 'rev',
  },
  {
    time: '14:15',
    body: (
      <>
        Низкий остаток · <strong>масло Бергамот</strong> · DACHA
      </>
    ),
    tag: 'alert',
  },
  {
    time: '14:11',
    body: (
      <>
        <em>Maria K.</em> завершила <strong>Spa Day</strong> · ₽18,500
      </>
    ),
    tag: 'done',
  },
];

export function ActivityStream() {
  return (
    <Card
      title="Поток событий"
      sub={
        <span className="flex items-center gap-2">
          <LiveDot color="green" /> REAL-TIME · DEMO MOCK
        </span>
      }
    >
      <div className="flex flex-col gap-3.5 max-h-[260px] overflow-hidden">
        {MOCK_EVENTS.map((e, i) => (
          <div
            key={i}
            className="grid grid-cols-[46px_1fr_auto] gap-3 items-start"
          >
            <span className="font-mono text-[11px] text-text-mute tracking-wider pt-0.5">
              {e.time}
            </span>
            <span className="text-[13px] text-text-dim leading-snug [&_strong]:text-text [&_strong]:font-semibold [&_em]:text-gold [&_em]:not-italic [&_em]:font-medium">
              {e.body}
            </span>
            <EvtTag tag={e.tag} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function EvtTag({ tag }: { tag: Evt['tag'] }) {
  const map: Record<Evt['tag'], { cls: string; text: string }> = {
    book: { cls: 'text-cyan bg-cyan/10 border-cyan/30', text: 'BOOK' },
    pay: { cls: 'text-green bg-green/10 border-green/30', text: 'PAY' },
    rev: { cls: 'text-amber bg-amber/10 border-amber/30', text: 'REV' },
    alert: { cls: 'text-red bg-red/10 border-red/30', text: 'LOW' },
    done: { cls: 'text-gold bg-gold/10 border-gold/30', text: 'DONE' },
  };
  const m = map[tag];
  return (
    <span
      className={`font-mono text-[11.5px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border self-start ${m.cls}`}
    >
      {m.text}
    </span>
  );
}
