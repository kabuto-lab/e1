/**
 * Пункты мобильного меню публичного сайта (реальные маршруты).
 */

export type MobileNavIcon =
  | 'home'
  | 'about'
  | 'models'
  | 'contacts'
  | 'help'
  | 'dashboard'
  | 'login';

export interface PublicMobileNavItem {
  href: string;
  label: string;
  icon: MobileNavIcon;
}

export function buildPublicMobileNavItems(
  user: { email: string; role: string } | null,
  massageMode = false,
  catalogClosed = false,
): PublicMobileNavItem[] {
  const core: PublicMobileNavItem[] = massageMode
    ? [
        { href: '/', label: 'О нас', icon: 'about' },
        { href: '/models', label: 'Мастера', icon: 'models' },
        { href: '/contacts', label: 'Контакты', icon: 'contacts' },
      ]
    : [
        { href: '/models', label: 'Модели', icon: 'models' },
        { href: '/#steps', label: 'Как это работает', icon: 'about' },
        { href: '/for-models', label: 'Для моделей', icon: 'dashboard' },
        { href: '/help', label: 'Вопросы и ответы', icon: 'help' },
        { href: '/contacts', label: 'Поддержка', icon: 'contacts' },
      ];
  if (massageMode) {
    if (catalogClosed) core.push({ href: '/contacts', label: 'Запросить доступ', icon: 'login' });
    return core;
  }
  if (user) {
    const staff = user.role === 'admin' || user.role === 'manager';
    if (staff) {
      core.push({ href: '/dashboard', label: 'Панель', icon: 'dashboard' });
      core.push({ href: '/cabinet', label: 'Кабинет', icon: 'home' });
    } else {
      core.push({ href: '/cabinet', label: 'Кабинет', icon: 'dashboard' });
    }
  } else {
    core.push({ href: '/login', label: 'Войти', icon: 'login' });
  }
  return core;
}
