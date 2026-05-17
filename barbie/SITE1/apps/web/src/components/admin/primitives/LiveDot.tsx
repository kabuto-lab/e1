/**
 * LiveDot — пульсирующая точка для real-time секций (Activity stream, и т.п.).
 *
 * Использует keyframes `nas-pulse` из globals.css.
 */
export function LiveDot({ color = 'green' }: { color?: 'green' | 'gold' }) {
  const bg = color === 'green' ? 'rgb(var(--green))' : 'rgb(var(--gold))';
  return (
    <span
      aria-hidden="true"
      className="inline-block w-2 h-2 rounded-full"
      style={{
        background: bg,
        animation: `${color === 'gold' ? 'nas-pulse-gold' : 'nas-pulse'} 1.8s cubic-bezier(.4,0,.2,1) infinite`,
      }}
    />
  );
}
