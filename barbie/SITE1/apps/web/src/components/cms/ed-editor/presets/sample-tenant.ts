/**
 * SAMPLE_TENANT — фейковые данные тенанта для предпросмотра tenant-coupled
 * section-preset'ов В РЕДАКТОРЕ (Track H · C). В публичном рендере presets
 * получают настоящий tenant; здесь — заглушечные данные, чтобы пользователь
 * видел реальную вёрстку секции вместо пустого PresetStub.
 *
 * Бренд намеренно «Демо-…», чтобы образец не путали с данными тенанта.
 */
import type { Tenant } from '@/lib/tenants';

export const SAMPLE_TENANT: Tenant = {
  id: 'sample',
  slug: 'sample',
  name: 'Демо-салон',
  siteType: 'salon-detail',
  primaryDomain: null,
  domain: 'sample.local',
  brand: 'Демо-салон «Образец»',
  tagline: 'Так секция выглядит с данными тенанта',
  positioning: 'Предпросмотр в редакторе — реальные данные подставятся при публикации.',
  address: {
    city: 'Москва',
    street: 'ул. Пример, 1',
    metro: 'Демонстрационная',
  },
  phones: ['+7 (000) 000-00-00'],
  workingHours: 'Ежедневно 10:00–22:00',
  programs: [
    { name: 'Классический массаж', duration: '60 мин', price: '5 000 ₽', description: 'Расслабляющая программа для всего тела.' },
    { name: 'Спа-ритуал', duration: '90 мин', price: '8 000 ₽', description: 'Пилинг, обёртывание и массаж.' },
    { name: 'Стоун-терапия', duration: '75 мин', price: '7 000 ₽', description: 'Массаж горячими камнями.' },
  ],
  rooms: [
    { name: 'Кабинет «Сакура»', description: 'Уютная комната с приглушённым светом.' },
    { name: 'Кабинет «Лотос»', description: 'Просторный кабинет для парных программ.' },
  ],
  staff: [
    { name: 'Анна', tag: 'Старший мастер', age: 29 },
    { name: 'Мария', tag: 'Спа-терапевт', age: 26 },
    { name: 'Елена', tag: 'Массажист', age: 32 },
  ],
  designTokens: {
    bg: '#0A0A0B',
    headColor: '#F2EBD9',
    headFont: 'Unbounded',
    accColor: '#D4AF37',
    accFont: 'Unbounded',
    bodyColor: '#C9C2B0',
    bodyFont: 'Inter',
    navTemplate: 'top-classic',
  },
  navigation: ['Главная', 'Услуги', 'Кабинеты', 'Контакты'],
  social: {
    telegram: 'https://t.me/example',
    instagram: 'https://instagram.com/example',
    whatsapp: '+70000000000',
  },
  aesthetic: 'cozy',
};
