/**
 * Классы админки: тёмная (премиум) и светлая в духе WordPress (wp-admin 5–6).
 * Используйте с useDashboardTheme().isWpAdmin
 */

export type DashboardTone = {
  page: string;
  h1: string;
  h2: string;
  h3: string;
  muted: string;
  card: string;
  cardTight: string;
  cardPad: string;
  input: string;
  select: string;
  textarea: string;
  label: string;
  btnPrimary: string;
  btnSecondary: string;
  btnDanger: string;
  tableWrap: string;
  th: string;
  td: string;
  tr: string;
  borderRow: string;
  link: string;
  noticeInfo: string;
  noticeOk: string;
  noticeErr: string;
  /** Секции форм (метабоксы) */
  formSection: string;
  inputXs: string;
  textareaXs: string;
  topBarModel: string;
  nestedPanel: string;
  quickActionTile: string;
  welcomeBanner: string;
  chipActive: string;
  chipInactive: string;
  stickyHeader: string;
  phoneOuter: string;
  phonePhotoArea: string;
  phoneToolbar: string;
  phoneThumb: string;
  sectionTitleBar: string;
  publishBox: string;
  /** Поля поверх превью «телефона» */
  phoneTitleInput: string;
  phoneNumInput: string;
  phoneCardText: string;
  phoneCardMuted: string;
  phoneRatesBar: string;
};

const dark: DashboardTone = {
  page: '',
  h1: 'text-2xl font-bold text-white font-display',
  h2: 'text-lg font-bold text-white',
  h3: 'text-base font-semibold text-white',
  muted: 'text-gray-400',
  card: 'rounded-xl border border-white/[0.06] bg-[#141414]',
  cardTight: 'rounded-lg border border-white/[0.06] bg-[#141414]',
  cardPad: 'p-5 sm:p-6',
  input:
    'w-full rounded-lg border border-white/[0.06] bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none focus:border-[#d4af37]',
  select:
    'w-full rounded-lg border border-white/[0.06] bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none focus:border-[#d4af37]',
  textarea:
    'w-full rounded-lg border border-white/[0.06] bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none focus:border-[#d4af37]',
  label: 'block text-xs font-medium uppercase tracking-wide text-gray-400',
  btnPrimary:
    'inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#d4af37] to-[#b8941f] px-4 py-2 text-sm font-semibold text-black transition-all hover:shadow-lg disabled:opacity-50',
  btnSecondary:
    'inline-flex items-center justify-center gap-2 rounded-lg border border-white/[0.1] bg-[#0a0a0a] px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:border-white/[0.18] hover:bg-white/[0.04] disabled:opacity-50',
  btnDanger:
    'inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-50',
  tableWrap: 'overflow-x-auto rounded-xl border border-white/[0.06] bg-[#141414]',
  th: 'border-b border-white/[0.06] bg-[#0a0a0a] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400',
  td: 'border-b border-white/[0.06] px-4 py-3 text-sm text-gray-300',
  tr: 'transition-colors hover:bg-white/[0.03]',
  borderRow: 'border-white/[0.06]',
  link: 'text-[#d4af37] hover:underline',
  noticeInfo: 'rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-200',
  noticeOk: 'rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-200',
  noticeErr: 'rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200',
  formSection: 'rounded-xl border border-white/[0.06] bg-[#141414] p-5',
  inputXs:
    'w-full rounded-lg border border-white/[0.06] bg-[#0a0a0a] px-3 py-2 text-xs text-white outline-none focus:border-[#d4af37]',
  textareaXs:
    'min-h-[100px] w-full resize-y rounded-lg border border-white/[0.06] bg-[#0a0a0a] px-3 py-2 text-xs text-white outline-none focus:border-[#d4af37]',
  topBarModel:
    'flex min-h-16 flex-shrink-0 flex-col gap-3 border-b border-white/[0.06] bg-[#0a0a0a] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-0',
  nestedPanel: 'rounded-lg border border-white/[0.06] bg-[#0a0a0a]',
  quickActionTile:
    'flex flex-col items-center justify-center rounded-lg border border-white/[0.06] bg-[#0a0a0a] p-6 transition-all hover:border-[#d4af37]/30 hover:bg-[#d4af37]/10 group',
  welcomeBanner: 'rounded-2xl border border-[#d4af37]/20 bg-gradient-to-r from-[#d4af37]/10 to-[#d4af37]/5 p-6',
  chipActive: 'rounded-lg bg-[#d4af37] px-4 py-2 font-medium text-black',
  chipInactive: 'rounded-lg border border-white/[0.06] bg-[#141414] px-4 py-2 font-medium text-gray-400',
  stickyHeader: 'sticky top-0 z-50 border-b border-white/[0.06] bg-[#141414]/95 backdrop-blur',
  /** Как правый блок галереи на /models/[slug]: золотая рамка + скругление; ширину задаёт колонка */
  phoneOuter:
    'mx-auto flex min-h-0 w-full flex-col overflow-hidden rounded-[2rem] border-[3px] border-[#d4af37]/40 bg-[#0a0a0a] shadow-2xl shadow-black/40',
  phonePhotoArea: 'relative min-h-[200px] shrink-0 aspect-[3/4] bg-[#141414]',
  phoneToolbar: 'shrink-0 border-t border-white/[0.08] bg-[#141414] p-4',
  /** Ячейка сетки медиатеки: квадрат, как на публичной /models/[slug] */
  phoneThumb:
    'group relative aspect-square w-full overflow-hidden bg-[#141414]',
  sectionTitleBar:
    'mb-3 border-b border-white/[0.06] pb-2 text-[11px] font-bold uppercase tracking-wide text-gray-300',
  publishBox: 'rounded-xl border border-white/[0.08] bg-[#141414] p-4 shadow-lg shadow-black/20',
  phoneTitleInput:
    'w-full rounded border border-white/20 bg-black/70 px-2 py-1.5 font-display text-lg font-bold text-white outline-none focus:border-[#d4af37]',
  phoneNumInput:
    'w-14 rounded border border-white/20 bg-black/70 px-1.5 py-0.5 text-center text-[11px] text-white outline-none focus:border-[#d4af37]',
  phoneCardText: 'font-body text-[11px] tabular-nums text-white/95',
  phoneCardMuted: 'font-body text-white/50',
  phoneRatesBar: 'shrink-0 border-t border-white/[0.08] bg-[#141414] p-4',
};

/** Светлая тема — как экраны wp-admin: #f0f0f1 снаружи уже в layout; здесь карточки и типографика */
const light: DashboardTone = {
  page: 'text-[#2c3338]',
  h1: 'text-2xl font-normal text-[#1d2327]',
  h2: 'text-lg font-semibold text-[#1d2327]',
  h3: 'text-sm font-semibold uppercase tracking-wide text-[#1d2327]',
  muted: 'text-[#646970]',
  card:
    'rounded-sm border border-[#c3c4c7] bg-white shadow-[0_1px_1px_rgba(0,0,0,0.04)]',
  cardTight: 'rounded-sm border border-[#c3c4c7] bg-white shadow-[0_1px_1px_rgba(0,0,0,0.04)]',
  cardPad: 'p-4 sm:p-5',
  input:
    'w-full rounded border border-[#8c8f94] bg-white px-2 py-1.5 text-sm text-[#2c3338] shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] outline-none focus:border-[#2271b1] focus:shadow-[0_0_0_1px_#2271b1]',
  select:
    'w-full rounded border border-[#8c8f94] bg-white px-2 py-1.5 text-sm text-[#2c3338] shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] outline-none focus:border-[#2271b1] focus:shadow-[0_0_0_1px_#2271b1]',
  textarea:
    'w-full rounded border border-[#8c8f94] bg-white px-2 py-1.5 text-sm text-[#2c3338] shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] outline-none focus:border-[#2271b1] focus:shadow-[0_0_0_1px_#2271b1]',
  label: 'mb-1 block text-sm font-semibold text-[#1d2327]',
  btnPrimary:
    'inline-flex items-center justify-center gap-2 rounded border border-[#2271b1] bg-[#2271b1] px-3 py-1.5 text-sm text-white shadow-sm hover:bg-[#135e96] hover:border-[#135e96] disabled:opacity-50',
  btnSecondary:
    'inline-flex items-center justify-center gap-2 rounded border border-[#c3c4c7] bg-[#f6f7f7] px-3 py-1.5 text-sm text-[#2c3338] hover:bg-white hover:border-[#8c8f94] disabled:opacity-50',
  btnDanger:
    'inline-flex items-center justify-center gap-2 rounded border border-[#d63638] bg-white px-3 py-1.5 text-sm text-[#d63638] hover:bg-[#fcf0f1] disabled:opacity-50',
  tableWrap: 'overflow-x-auto rounded-sm border border-[#c3c4c7] bg-white shadow-[0_1px_1px_rgba(0,0,0,0.04)]',
  th: 'border-b border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#1d2327]',
  td: 'border-b border-[#f0f0f1] px-3 py-2.5 text-sm text-[#2c3338]',
  tr: 'transition-colors hover:bg-[#f6f7f7]',
  borderRow: 'border-[#c3c4c7]',
  link: 'text-[#2271b1] hover:text-[#135e96] hover:underline',
  noticeInfo:
    'rounded-sm border-l-4 border-l-[#72aee6] border border-[#c3c4c7] bg-white p-3 text-sm text-[#2c3338] shadow-[0_1px_1px_rgba(0,0,0,0.04)]',
  noticeOk:
    'rounded-sm border-l-4 border-l-[#00a32a] border border-[#c3c4c7] bg-white p-3 text-sm text-[#2c3338] shadow-[0_1px_1px_rgba(0,0,0,0.04)]',
  noticeErr:
    'rounded-sm border-l-4 border-l-[#d63638] border border-[#c3c4c7] bg-white p-3 text-sm text-[#2c3338] shadow-[0_1px_1px_rgba(0,0,0,0.04)]',
  formSection:
    'rounded-sm border border-[#c3c4c7] bg-white p-5 shadow-[0_1px_1px_rgba(0,0,0,0.04)]',
  inputXs:
    'w-full rounded border border-[#8c8f94] bg-white px-3 py-2 text-xs text-[#2c3338] shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] outline-none focus:border-[#2271b1] focus:shadow-[0_0_0_1px_#2271b1]',
  textareaXs:
    'min-h-[100px] w-full resize-y rounded border border-[#8c8f94] bg-white px-3 py-2 text-xs text-[#2c3338] shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] outline-none focus:border-[#2271b1] focus:shadow-[0_0_0_1px_#2271b1]',
  topBarModel:
    'flex min-h-16 flex-shrink-0 flex-col gap-3 border-b border-[#c3c4c7] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-0',
  nestedPanel: 'rounded border border-[#dcdcde] bg-[#f6f7f7]',
  quickActionTile:
    'group flex flex-col items-center justify-center rounded border border-[#c3c4c7] bg-white p-6 transition-all hover:border-[#2271b1] hover:bg-[#f0f6fc]',
  welcomeBanner:
    'rounded-sm border border-[#c3c4c7] bg-[#f0f6fc] p-6 shadow-[0_1px_1px_rgba(0,0,0,0.04)]',
  chipActive: 'rounded border border-[#2271b1] bg-[#2271b1] px-4 py-2 font-medium text-white',
  chipInactive: 'rounded border border-[#c3c4c7] bg-[#f6f7f7] px-4 py-2 font-medium text-[#50575e]',
  stickyHeader: 'sticky top-0 z-50 border-b border-[#c3c4c7] bg-white',
  phoneOuter:
    'mx-auto flex min-h-0 w-full flex-col overflow-hidden rounded-[2rem] border-[3px] border-[#d4af37]/45 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]',
  phonePhotoArea: 'relative min-h-[200px] shrink-0 aspect-[3/4] bg-[#f6f7f7]',
  phoneToolbar: 'shrink-0 border-t border-[#dcdcde] bg-white p-4',
  phoneThumb:
    'group relative aspect-square w-full overflow-hidden bg-[#f6f7f7]',
  sectionTitleBar:
    'mb-3 border-b border-[#c3c4c7] pb-2 text-[11px] font-bold uppercase tracking-wide text-[#1d2327]',
  publishBox:
    'rounded-sm border border-[#c3c4c7] bg-white p-4 shadow-[0_1px_1px_rgba(0,0,0,0.04)]',
  phoneTitleInput:
    'w-full rounded border border-[#8c8f94] bg-white/95 px-2 py-1.5 font-display text-lg font-bold text-[#1d2327] outline-none focus:border-[#2271b1] focus:shadow-[0_0_0_1px_#2271b1]',
  phoneNumInput:
    'w-14 rounded border border-[#8c8f94] bg-white px-1.5 py-0.5 text-center text-[11px] text-[#1d2327] outline-none focus:border-[#2271b1] focus:shadow-[0_0_0_1px_#2271b1]',
  phoneCardText: 'font-body text-[11px] tabular-nums text-[#1d2327]',
  phoneCardMuted: 'font-body text-[#646970]',
  phoneRatesBar: 'shrink-0 border-t border-[#dcdcde] bg-white p-4',
};

export function dashboardTone(isLightWp: boolean): DashboardTone {
  return isLightWp ? light : dark;
}
