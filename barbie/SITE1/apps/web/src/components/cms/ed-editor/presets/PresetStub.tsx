/**
 * PresetStub — fallback-заглушка для Section preset, когда в контексте нет
 * данных тенанта (типично — в редакторе ED без `?tenant=` или до загрузки
 * tenant-data). Рендерит lightweight-плейсхолдер с именем preset'а, чтобы
 * пользователь видел "что это будет".
 *
 * В Φ4-6 будет заменён на реальный preview с фейковыми данными.
 */
import type { ReactNode } from 'react';

export function PresetStub({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div
      style={{
        padding: '32px 24px',
        border: '2px dashed rgb(var(--line))',
        borderRadius: 8,
        background: 'rgb(var(--surface) / 0.4)',
        textAlign: 'center',
        color: 'rgb(var(--text-dim))',
        fontSize: 14,
      }}
    >
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgb(var(--accent-2))', marginBottom: 8, fontWeight: 600 }}>
        Section preset · {label}
      </div>
      {children ?? <div>Будет отрендерен с данными тенанта при публикации</div>}
    </div>
  );
}
