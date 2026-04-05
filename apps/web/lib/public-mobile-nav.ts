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

export function buildPublicMobileNavItems(user: { email: string } | null): PublicMobileNavItem[] {
  const core: PublicMobileNavItem[] = [
    { href: '/#hero', label: 'Главная', icon: 'home' },
    { href: '/#about', label: 'О нас', icon: 'about' },
    { href: '/models', label: 'Модели', icon: 'models' },
    { href: '/contacts', label: 'Контакты', icon: 'contacts' },
    { href: '/help', label: 'Помощь', icon: 'help' },
  ];
  if (user) {
    core.push({ href: '/dashboard', label: 'Вход', icon: 'dashboard' });
  } else {
    core.push({ href: '/login', label: 'Войти', icon: 'login' });
  }
  return core;
}
