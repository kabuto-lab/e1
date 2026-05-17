/**
 * RailSection — в compact-rail'е текстовые лейблы убраны, секции
 * разделяются тонким горизонтальным divider'ом.
 *
 * Сам label-текст компонент сохраняет для accessibility (aria-label),
 * но визуально не показывает — место сэкономлено для иконок.
 */
export function RailSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const label = typeof children === 'string' ? children : '';
  return (
    <div
      role="separator"
      aria-label={label}
      className={`mx-2 my-2 h-px bg-line ${className ?? ''}`}
    />
  );
}
