/**
 * Projects (визитки тенантов) — данные для страницы /admin/projects.
 *
 * Источник правды: `barbie/SITE1/dashboard-2077.html` PROJECTS const
 * (lines 2157-2218). Это бренд-идентика 10 тенантов: bg + 3-фонтовая
 * палитра (head/acc/body) + домен/контакты для preview-карточки.
 *
 * Per-тенант токены сохраняются в localStorage (см. projects-storage.ts).
 * Когда появится PUT /v1/tenants/:id/design-tokens — переключим на API.
 */

export interface ProjectTokens {
  /** background color (hex) */
  bg: string;
  /** heading color (hex) */
  headColor: string;
  /** heading font family */
  headFont: string;
  /** accent (tagline) color */
  accColor: string;
  /** accent font family */
  accFont: string;
  /** body (phones) color */
  bodyColor: string;
  /** body font family */
  bodyFont: string;
}

export interface Project extends ProjectTokens {
  /** stable id = slug в tenants table */
  id: string;
  /** domain для domain-pill в карточке */
  domain: string;
  /** display name */
  name: string;
  /** tagline под именем */
  tagline: string;
  /** 2 contact phones */
  phones: [string, string];
  /** preview URL для iframe (relative path в репо) */
  site: string;
}

export const PROJECTS: ReadonlyArray<Project> = [
  {
    id: 'pentagon',
    domain: 'pentagon.ru',
    name: 'PENTAGON',
    tagline: 'Тактический эскорт · 24/7',
    phones: ['+7 (495) 921-04-07', '+7 (903) 121-04-07'],
    bg: '#0A0A0C',
    headColor: '#FFFFFF',
    headFont: 'Montserrat Alternates',
    accColor: '#DC2626',
    accFont: 'Space Grotesk',
    bodyColor: '#9CA3AF',
    bodyFont: 'Space Grotesk',
    site: '/pentagon',
  },
  {
    id: 'dacha',
    domain: 'dachaspa.ru',
    name: 'DACHA',
    tagline: 'Wellness retreat · Истра',
    phones: ['+7 (495) 308-22-19', '+7 (916) 308-22-19'],
    bg: '#FAFAF7',
    headColor: '#3A3A3A',
    headFont: 'Cormorant Garamond',
    accColor: '#B8634D',
    accFont: 'Cormorant Garamond',
    bodyColor: '#5A5651',
    bodyFont: 'Inter',
    site: '/dachaspa',
  },
  {
    id: 'barbie',
    domain: 'barbiespa.ru',
    name: 'BARBIE SPA',
    tagline: 'Luxury feminine glamour',
    phones: ['+7 (495) 740-19-90', '+7 (925) 740-19-90'],
    bg: '#FFB6D9',
    headColor: '#FF1493',
    headFont: 'Outfit',
    accColor: '#FFFFFF',
    accFont: 'Playfair Display',
    bodyColor: '#3A1F2C',
    bodyFont: 'Outfit',
    site: '/barbiespa',
  },
  {
    id: 'nebesa',
    domain: 'nebesaspa.com',
    name: 'NEBESA',
    tagline: 'Воздушный массаж · 25-й этаж',
    phones: ['+7 (495) 411-08-25', '+7 (915) 411-08-25'],
    bg: '#F4F8FC',
    headColor: '#3A3A3A',
    headFont: 'Cormorant Garamond',
    accColor: '#7090B0',
    accFont: 'Cormorant Garamond',
    bodyColor: '#6A737D',
    bodyFont: 'Inter',
    site: '/nebesaspa',
  },
  {
    id: 'imperiumspa',
    domain: 'salonmassage.ru',
    name: 'SalonMassage',
    tagline: 'Искусство массажа для истинных ценителей',
    phones: ['+7 (495) 000-00-00', '+7 (903) 000-00-00'],
    bg: '#0B0A09',
    headColor: '#F5F1E8',
    headFont: 'Playfair Display',
    accColor: '#C9A86A',
    accFont: 'Playfair Display',
    bodyColor: '#D8D4CC',
    bodyFont: 'Jost',
    site: '/imperiumspa',
  },
  {
    id: 'etalon',
    domain: 'etalonspa.ru',
    name: 'ETALON',
    tagline: 'Performance · Discretion · 24/7',
    phones: ['+7 (495) 717-11-01', '+7 (985) 717-11-01'],
    bg: '#000000',
    headColor: '#FFFFFF',
    headFont: 'Bebas Neue',
    accColor: '#E11D2C',
    accFont: 'Space Mono',
    bodyColor: '#A8AAB0',
    bodyFont: 'Oswald',
    site: '/etalonspa',
  },
  {
    id: 'vanilia',
    domain: '5massage.ru',
    name: 'VANILIA',
    tagline: 'Тёплый дом для особенных вечеров',
    phones: ['+7 (495) 565-05-05', '+7 (916) 565-05-05'],
    bg: '#FAF3E6',
    headColor: '#7A5B3A',
    headFont: 'Quicksand',
    accColor: '#C89B6B',
    accFont: 'Caveat',
    bodyColor: '#4A3826',
    bodyFont: 'Varela Round',
    site: '/5massage',
  },
  {
    id: 'podium',
    domain: 'eroticmassaj.ru',
    name: 'PODIUM',
    tagline: 'Театр желания · с 1999',
    phones: ['+7 (495) 690-18-86', '+7 (905) 690-18-86'],
    bg: '#3D0F1A',
    headColor: '#F0E6D2',
    headFont: 'Playfair Display',
    accColor: '#D4A856',
    accFont: 'Cormorant Garamond',
    bodyColor: '#C9B89A',
    bodyFont: 'Cormorant Garamond',
    site: '/eroticmassaj',
  },
  {
    id: 'roxy',
    domain: 'roxy-spa.ru',
    name: 'ROXY',
    tagline: 'Cyberpunk nights · 2077',
    phones: ['+7 (495) 230-77-77', '+7 (909) 230-77-77'],
    bg: '#0A0F2C',
    headColor: '#22D3EE',
    headFont: 'Orbitron',
    accColor: '#EC4899',
    accFont: 'Orbitron',
    bodyColor: '#A5B4C9',
    bodyFont: 'Exo 2',
    site: '/roxy-spa',
  },
  {
    id: 'soho',
    domain: 'soho-spa.com',
    name: 'SOHO',
    tagline: 'Артистический бутик-лофт',
    phones: ['+7 (495) 624-08-08', '+7 (916) 624-08-08'],
    bg: '#2A2724',
    headColor: '#EFE9DF',
    headFont: 'Inter',
    accColor: '#B26A3F',
    accFont: 'Cormorant Garamond',
    bodyColor: '#A8A29D',
    bodyFont: 'Inter',
    site: '/soho-spa',
  },
];

export const TOKEN_FONTS: ReadonlyArray<string> = [
  'Inter',
  'Manrope',
  'Outfit',
  'Unbounded',
  'Quicksand',
  'Varela Round',
  'Space Grotesk',
  'Space Mono',
  'JetBrains Mono',
  'Montserrat Alternates',
  'Cormorant Garamond',
  'Playfair Display',
  'Bodoni Moda',
  'Bebas Neue',
  'Oswald',
  'Orbitron',
  'Exo 2',
  'Caveat',
];
