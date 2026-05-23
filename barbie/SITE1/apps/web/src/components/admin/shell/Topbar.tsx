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
    <header className="flex items-center justify-end gap-3.5 py-1.5">
      <Clock />
      <SettingsGooMenu notificationCount={3} />
    </header>
  );
}
