'use client';

/**
 * Topbar — после refactor'а 2026-05-23:
 *   - TenantSwitcher переехал в Rail.Brand (hover-popover у буквы N).
 *   - GlobalSearch — внутри SettingsGooMenu (item «Поиск», открывает диалог).
 *   - Bell IconBtn убран; счётчик уведомлений — бейдж над SettingsGooMenu.
 * Остаются: Clock + Settings (gooey).
 */
import { Clock } from './Clock';
import { SettingsGooMenu } from './SettingsGooMenu';

export function Topbar() {
  return (
    <header className="flex items-center gap-3.5 py-1.5">
      {/* Слот под заголовок+действия активного раздела. Страницы порталят сюда
          через <TopbarSlot> — так высота контента не тратится на отдельную
          полосу заголовка (см. admin/shell/TopbarSlot.tsx). */}
      <div id="nas-topbar-left" className="flex-1 min-w-0 flex items-center gap-3" />
      <Clock />
      <SettingsGooMenu notificationCount={3} />
    </header>
  );
}
