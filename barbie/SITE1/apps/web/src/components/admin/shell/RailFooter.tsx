'use client';

import type { MouseEventHandler } from 'react';
import { LogOut, Settings } from 'lucide-react';
import { RailItem } from './RailItem';

/**
 * RailFooter — низ rail'а: аватарка-тайл + (на hover'е всей зоны) Настройки + Выход.
 *
 * Дизайн полностью унифицирован с обычными RailItem:
 *   - 40×40 rounded-md tile (НЕ круг)
 *   - На hover'е pill расширяется вправо до 176px, показывая лейбл
 *   - Те же gold-active / hover-dim / danger-red state'ы
 *
 * Settings + Logout прячутся по умолчанию (hidden), появляются когда курсор
 * над всей footer-зоной (`group/footer`). Это позволяет держать rail
 * компактным, но даёт быстрый доступ к выходу/настройкам без отдельного
 * tooltip-popup'а.
 *
 * Avatar — это не RailItem (там label = role, а не клик-link), но
 * визуально использует те же tokens: 40×40, rounded-md, expand-pill,
 * label fade in при group-hover.
 */
export function RailFooter({
  initial,
  name,
  role,
  onLogout,
}: {
  initial: string;
  name: string;
  role: string;
  onLogout: MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <div
      className="border-t border-line pt-3 pb-3 flex flex-col items-center gap-1 group/footer w-full"
    >
      {/* Avatar — rail-item-shaped tile с gold gradient, letter в icon-slot. */}
      <AvatarTile initial={initial} name={name} role={role} />

      {/* Settings + Logout — скрыты до hover'а footer-зоны.
          После — каждый ведёт себя как обычный RailItem (pill expand на hover). */}
      <div
        className="opacity-0 group-hover/footer:opacity-100 transition-opacity duration-150 flex flex-col gap-1 w-10"
      >
        <RailItem
          href="/admin/settings"
          icon={<Settings />}
          label="Настройки"
        />
        <RailItem
          href="#"
          icon={<LogOut />}
          label="Выход"
          onClick={onLogout}
          danger
        />
      </div>
    </div>
  );
}

/**
 * AvatarTile — визуальный близнец RailItem'а, но:
 *   - bg = gold gradient (как раньше у круга)
 *   - "icon slot" = буква-инициал
 *   - "label slot" (видим при expand) = `name · ROLE`
 *   - НЕ кликабельный (cursor-default; меню действий — это Настройки/Выход ниже)
 */
function AvatarTile({
  initial,
  name,
  role,
}: {
  initial: string;
  name: string;
  role: string;
}) {
  // Те же класс-токены что и RailItem.pillBase, чтобы геометрия совпадала.
  const pillBase =
    'isolate absolute left-0 top-0 h-10 flex items-center gap-3 px-[11px] rounded-md overflow-hidden transition-[width,background-color] duration-200 ease-out w-10 group-hover:w-44 z-[100]';

  return (
    <div className="group relative w-10 h-10 flex-shrink-0">
      <div
        title={`${name} · ${role}`}
        aria-label={`${name} (${role})`}
        className={`${pillBase} cursor-default`}
        style={{
          background: 'linear-gradient(135deg, #7a5824, rgb(var(--gold)))',
          boxShadow: '0 0 0 1px rgb(var(--gold) / 0.28)',
        }}
      >
        <span className="flex-shrink-0 w-[18px] h-[18px] grid place-items-center font-display font-semibold text-[13px] text-bg">
          {initial}
        </span>
        <span className="flex flex-col leading-tight whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-75 text-bg">
          <span className="font-semibold text-[12px]">{name}</span>
          <span className="font-mono text-[10px] uppercase tracking-wider opacity-80">
            {role}
          </span>
        </span>
      </div>
    </div>
  );
}
