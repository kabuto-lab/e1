import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/**
 * Локале-осознанные обёртки навигации (next-intl). Использовать ВМЕСТО
 * next/link и next/navigation в публичных tenant-компонентах, чтобы переходы
 * сохраняли текущую локаль (`/en/...`). LangSwitcher меняет локаль через useRouter.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
