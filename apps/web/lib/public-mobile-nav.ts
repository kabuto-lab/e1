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
): PublicMobileNavItem[] {
  const core: PublicMobileNavItem[] = [
    { href: '/', label: 'О нас', icon: 'about' },
    { href: '/models', label: 'Модели', icon: 'models' },
    { href: '/contacts', label: 'Контакты', icon: 'contacts' },
    { href: '/help', label: 'Помощь', icon: 'help' },
  ];
  if (user) {
    const staff = user.role === 'admin' || user.role === 'manager';
    core.push({
      href: staff ? '/dashboard' : '/cabinet',
      label: staff ? 'Панель' : 'Кабинет',
      icon: 'dashboard',
    });
  } else {
    core.push({ href: '/login', label: 'Войти', icon: 'login' });
  }
  return core;
}
