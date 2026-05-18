'use client';

import { PageHeader } from '@/components/admin/primitives/PageHeader';
import { BootstrapWizard } from '@/components/admin/sections/projects/BootstrapWizard';

/**
 * /admin/projects/new — мастер импорта тенанта из существующего URL.
 *
 * Flow: URL → site-analyzer → edit design+menu+favicon → submit /bootstrap.
 *
 * Доступ — только platform-admin (RolesGuard на бэке режет 403 для остальных).
 * UI здесь не дублирует role-check; если у текущего юзера нет прав, submit
 * вернёт 403 с ApiError, и wizard покажет error message.
 */
export default function NewProjectPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Импорт тенанта"
        sub="из существующего URL → готовый design + меню + favicon"
      />
      <BootstrapWizard />
    </div>
  );
}
