/**
 * Settings Page
 * Full configuration for platform settings
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Save, Check, AlertCircle, Globe, CreditCard, Bell, Shield, Palette, Database, Upload, X } from 'lucide-react';
import { api, resolveUploadMimeType } from '@/lib/api-client';
import { useDashboardTheme } from '@/components/DashboardThemeContext';
import { usePlatformBranding } from '@/components/PlatformBrandingProvider';

interface Settings {
  // General
  siteName: string;
  /** Текстовое слово в компоненте Logo (мигание букв) */
  textLogo: string;
  /** Поочерёдное подсвечивание букв */
  textLogoBlink: boolean;
  siteDescription: string;
  siteUrl: string;
  adminEmail: string;
  supportEmail: string;
  
  // Branding (публичный сайт + общие)
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  /** Админка: светлая тема */
  brandingLightFontUi: string;
  brandingLightFontBody: string;
  brandingLightAccent: string;
  /** Админка: тёмная тема (премиум) */
  brandingDarkFontDisplay: string;
  brandingDarkFontBody: string;
  brandingDarkGold: string;
  brandingDarkGoldDeep: string;
  /** Публичный сайт: стеклянные капсулы (как на герое); иначе сплошное золото */
  publicGlassButtons: boolean;
  
  // Features
  enableRegistration: boolean;
  requireEmailVerification: boolean;
  enableReviews: boolean;
  enableMessaging: boolean;
  
  // Payments
  currency: string;
  commissionRate: number;
  minWithdrawal: number;
  
  // Notifications
  enableEmailNotifications: boolean;
  enableSmsNotifications: boolean;
  enablePushNotifications: boolean;
  
  // Security
  sessionTimeout: number;
  maxLoginAttempts: number;
  requireTwoFactor: boolean;
  
  // Limits
  maxPhotosPerModel: number;
  maxVideosPerModel: number;
  maxBioLength: number;
}

const defaultSettings: Settings = {
  // General
  siteName: 'Lovnge Platform',
  textLogo: 'Lovnge',
  textLogoBlink: true,
  siteDescription: 'Премиальная платформа сопровождения',
  siteUrl: 'http://localhost:3001',
  adminEmail: 'admin@lovnge.com',
  supportEmail: 'support@lovnge.com',
  
  // Branding
  logoUrl: '',
  faviconUrl: '/favicon.svg',
  primaryColor: '#d4af37',
  secondaryColor: '#f4d03f',
  brandingLightFontUi: 'system-ui',
  brandingLightFontBody: 'Inter',
  brandingLightAccent: '#2271b1',
  brandingDarkFontDisplay: 'Unbounded',
  brandingDarkFontBody: 'Inter',
  brandingDarkGold: '#d4af37',
  brandingDarkGoldDeep: '#b8941f',
  publicGlassButtons: false,

  // Features
  enableRegistration: true,
  requireEmailVerification: false,
  enableReviews: true,
  enableMessaging: true,
  
  // Payments
  currency: 'RUB',
  commissionRate: 10,
  minWithdrawal: 1000,
  
  // Notifications
  enableEmailNotifications: true,
  enableSmsNotifications: false,
  enablePushNotifications: true,
  
  // Security
  sessionTimeout: 7,
  maxLoginAttempts: 5,
  requireTwoFactor: false,
  
  // Limits
  maxPhotosPerModel: 20,
  maxVideosPerModel: 5,
  maxBioLength: 2000,
};

const BRANDING_FONT_OPTIONS = [
  { value: 'Unbounded', label: 'Unbounded (display / герой)' },
  { value: 'Inter', label: 'Inter (интерфейс, текст)' },
  { value: 'system-ui', label: 'Системный (Segoe UI, SF Pro, Roboto…)' },
] as const;

function fontStack(name: string) {
  if (name === 'system-ui') return 'system-ui, -apple-system, Segoe UI, sans-serif';
  return `'${name}', sans-serif`;
}

const MODEL_MOCK_THUMB_KEYS = [0, 1, 2, 3, 4] as const;

/** Увеличенное мини-превью мобильной страницы модели (светлый «хром» + акцент админки) */
function LightModelPagePhoneMock({
  accent,
  fontUi,
  fontBody,
}: {
  accent: string;
  fontUi: string;
  fontBody: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <p className={`mb-1.5 text-[9px] font-semibold uppercase tracking-wider`}>Страница модели</p>
      <div className="w-[200px] rounded-[26px] border-[3px] border-[#6b6b6b] bg-[#1e1e1e] p-[5px] shadow-xl">
        <div className="flex h-[312px] flex-col overflow-hidden rounded-[20px] bg-[#0a0a0a] shadow-inner ring-1 ring-black/30">
          <div className="flex h-[26px] shrink-0 items-center justify-between gap-1 border-b border-[#dcdcde] bg-[#f6f7f7] px-2.5">
            <span style={{ fontFamily: fontStack(fontBody) }} className="text-[6px] font-medium text-[#646970]">
              ← Модели
            </span>
            <span
              style={{ fontFamily: fontStack(fontUi), color: '#1d2327' }}
              className="max-w-[45%] truncate text-center text-[7px] font-semibold"
            >
              Анна
            </span>
            <span style={{ fontFamily: fontStack(fontBody) }} className="text-[5px] tabular-nums text-[#646970]">
              1/5
            </span>
          </div>
          <div className="relative min-h-[132px] flex-1 bg-gradient-to-b from-[#4a4034] via-[#1a1510] to-[#0a0a0a]">
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/75 to-transparent px-2.5 pb-2 pt-10">
              <div style={{ fontFamily: fontStack(fontUi) }} className="text-[9px] font-bold leading-tight text-white">
                Анна
              </div>
              <div style={{ fontFamily: fontStack(fontBody) }} className="mt-0.5 text-[5px] leading-tight text-white/50">
                Возраст: 24 · Рост: 172
              </div>
            </div>
          </div>
          <div className="flex gap-1 border-t border-[#dcdcde] bg-[#f0f0f1] px-2 py-1.5">
            {MODEL_MOCK_THUMB_KEYS.map((i) => (
              <div
                key={i}
                className={`h-[26px] w-[18px] shrink-0 rounded-[3px] bg-gradient-to-b from-[#d0d0d0] to-[#9a9a9a] ${
                  i === 0 ? '' : 'opacity-55'
                }`}
                style={i === 0 ? { boxShadow: `0 0 0 2px ${accent}` } : undefined}
              />
            ))}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-[#dcdcde] bg-[#f6f7f7] px-2.5 py-2">
            <div style={{ fontFamily: fontStack(fontBody) }} className="text-[5px] leading-tight text-[#50575e]">
              <span className="block text-[4px] uppercase text-[#8c8f94]">Час</span>
              <span className="font-semibold tabular-nums text-[#1d2327]">15 000 ₽</span>
            </div>
            <span
              style={{ fontFamily: fontStack(fontUi), backgroundColor: accent }}
              className="rounded-md px-2 py-1 text-[6px] font-bold text-white shadow-sm"
            >
              Связаться
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Увеличенное мини-превью мобильной страницы модели (тёмная тема + золото) */
function DarkModelPagePhoneMock({
  gold,
  goldDeep,
  fontDisplay,
  fontBody,
}: {
  gold: string;
  goldDeep: string;
  fontDisplay: string;
  fontBody: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-gray-500">Страница модели</p>
      <div className="w-[200px] rounded-[26px] border-[3px] border-[#d4af37]/45 bg-[#0a0a0a] p-[5px] shadow-xl shadow-black/40">
        <div className="flex h-[312px] flex-col overflow-hidden rounded-[20px] bg-[#0a0a0a] ring-1 ring-white/[0.08]">
          <div className="flex h-[26px] shrink-0 items-center justify-between gap-1 border-b border-white/[0.06] bg-[#0a0a0a]/95 px-2.5">
            <span style={{ fontFamily: fontStack(fontBody) }} className="text-[6px] font-medium text-white/45">
              ← Модели
            </span>
            <span
              style={{ fontFamily: fontStack(fontDisplay), color: '#fff' }}
              className="max-w-[45%] truncate text-center text-[8px] font-bold"
            >
              Анна
            </span>
            <span style={{ fontFamily: fontStack(fontBody) }} className="text-[5px] tabular-nums text-white/30">
              1/5
            </span>
          </div>
          <div className="relative min-h-[132px] flex-1 bg-gradient-to-b from-[#3d3428] via-[#15120e] to-black">
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent px-2.5 pb-2 pt-10">
              <div style={{ fontFamily: fontStack(fontDisplay) }} className="text-[9px] font-bold leading-tight text-white">
                Анна
              </div>
              <div style={{ fontFamily: fontStack(fontBody) }} className="mt-0.5 text-[5px] leading-tight text-white/45">
                Возраст: 24 · Рост: 172
              </div>
            </div>
          </div>
          <div className="flex gap-1 border-t border-white/[0.06] bg-[#0a0a0a] px-2 py-1.5">
            {MODEL_MOCK_THUMB_KEYS.map((i) => (
              <div
                key={i}
                className={`h-[26px] w-[18px] shrink-0 rounded-[3px] bg-gradient-to-b from-white/25 to-white/10 ${
                  i === 0 ? 'opacity-100' : 'opacity-40'
                }`}
                style={
                  i === 0
                    ? { boxShadow: `0 0 0 2px ${gold}` }
                    : undefined
                }
              />
            ))}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] bg-[#0a0a0a] px-2.5 py-2">
            <div style={{ fontFamily: fontStack(fontBody) }} className="text-[5px] leading-tight text-white/40">
              <span className="block text-[4px] uppercase tracking-wide text-white/25">Час</span>
              <span style={{ color: gold }} className="font-display text-[7px] font-bold tabular-nums">
                15 000 ₽
              </span>
            </div>
            <span
              style={{
                fontFamily: fontStack(fontDisplay),
                background: `linear-gradient(135deg, ${gold}, ${goldDeep})`,
              }}
              className="rounded-md px-2 py-1 text-[6px] font-bold text-black shadow-sm"
            >
              Связаться
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { refetchPublicBranding, patchBranding } = usePlatformBranding();
  const { isWpAdmin, theme, setTheme } = useDashboardTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [activeTab, setActiveTab] = useState('general');
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await api.getPlatformSettings();
      setSettings({ ...defaultSettings, ...(data as Partial<Settings>) });
    } catch {
      setSettings(defaultSettings);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      await api.savePlatformSettings(settings as unknown as Record<string, unknown>);
      patchBranding({
        textLogo: settings.textLogo,
        textLogoBlink: settings.textLogoBlink,
        publicGlassButtons: settings.publicGlassButtons,
      });
      refetchPublicBranding();
      setSuccess('Настройки успешно сохранены');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key: keyof Settings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const onLogoFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsLogoUploading(true);
    setError(null);
    try {
      const mimeType = resolveUploadMimeType(file);
      const { uploadUrl, cdnUrl } = await api.presignPlatformLogo({
        fileName: file.name,
        mimeType,
        fileSize: file.size,
      });
      await api.uploadToMinIO(uploadUrl, file, mimeType);
      updateSetting('logoUrl', cdnUrl);
    } catch (err: any) {
      setError(err?.message || 'Не удалось загрузить логотип');
    } finally {
      setIsLogoUploading(false);
    }
  };

  const sectionTitleClass = `text-base font-semibold mb-2 ${isWpAdmin ? 'text-[#1d2327]' : 'text-white'}`;

  const tabs = [
    { id: 'general', label: 'Общие', icon: Globe },
    { id: 'branding', label: 'Брендинг', icon: Palette },
    { id: 'features', label: 'Функции', icon: Check },
    { id: 'payments', label: 'Платежи', icon: CreditCard },
    { id: 'notifications', label: 'Уведомления', icon: Bell },
    { id: 'security', label: 'Безопасность', icon: Shield },
    { id: 'limits', label: 'Лимиты', icon: Database },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center font-body">
        <div className="text-center">
          <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-[#d4af37]/20 border-t-[#d4af37]" />
          <p className="text-xs text-gray-400">Загрузка…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex-1 font-body ${isWpAdmin ? '[&_h2]:text-[#1d2327] [&_h3]:text-[#1d2327] [&_label]:text-[#50575e] [&_input]:border-[#8c8f94] [&_input]:bg-white [&_input]:text-[#2c3338] [&_textarea]:border-[#8c8f94] [&_textarea]:bg-white [&_textarea]:text-[#2c3338] [&_select]:border-[#8c8f94] [&_select]:bg-white [&_select]:text-[#2c3338]' : ''}`}
    >
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1
            className={`text-xl font-semibold leading-tight ${isWpAdmin ? 'text-[#1d2327]' : 'font-display text-white'}`}
          >
            Настройки
          </h1>
          <p className={`mt-0.5 text-xs ${isWpAdmin ? 'text-[#646970]' : 'text-gray-500'}`}>
            Внешний вид админки
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <label className="flex cursor-pointer items-center gap-2 select-none">
            <span className={`whitespace-nowrap text-xs ${isWpAdmin ? 'text-[#646970]' : 'text-gray-500'}`}>
              {theme === 'wp-admin' ? 'Светлая' : 'Тёмная'}
            </span>
            <button
              type="button"
              role="switch"
              aria-label="Переключить светлую тему"
              aria-checked={theme === 'wp-admin'}
              onClick={() => setTheme(theme === 'wp-admin' ? 'default' : 'wp-admin')}
              className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                theme === 'wp-admin' ? 'bg-[#2271b1]' : isWpAdmin ? 'bg-[#c3c4c7]' : 'bg-[#3c3c3c]'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  theme === 'wp-admin' ? 'translate-x-[1.125rem]' : 'translate-x-0'
                }`}
              />
            </button>
          </label>
          <button
            type="button"
            onClick={saveSettings}
            disabled={isSaving}
            className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
              isWpAdmin
                ? 'border border-[#2271b1] bg-[#2271b1] text-white shadow-sm hover:bg-[#135e96]'
                : 'bg-gradient-to-r from-[#d4af37] to-[#b8941f] text-black hover:shadow-md hover:shadow-[#d4af37]/15'
            }`}
          >
            {isSaving ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                …
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Сохранить
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div className="min-w-0 text-xs">
            <div className="font-medium text-red-500">Ошибка</div>
            <div className="text-red-400">{error}</div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-3 flex items-start gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
          <div className="text-xs">
            <div className="font-medium text-green-500">Сохранено</div>
            <div className="text-green-400/90">{success}</div>
          </div>
        </div>
      )}

      {/* Вкладки + контент */}
      <div
        className={`overflow-hidden rounded-lg border ${
          isWpAdmin ? 'border-[#c3c4c7] bg-white shadow-[0_1px_1px_rgba(0,0,0,0.04)]' : 'border-white/[0.06] bg-[#141414]'
        }`}
      >
        <div
          className={`flex flex-wrap gap-0 border-b ${isWpAdmin ? 'border-[#c3c4c7] bg-[#f6f7f7]' : 'border-white/[0.06] bg-black/25'}`}
          role="tablist"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                  active
                    ? isWpAdmin
                      ? '-mb-px border-[#2271b1] text-[#1d2327]'
                      : '-mb-px border-[#d4af37] text-white'
                    : isWpAdmin
                      ? 'border-transparent text-[#646970] hover:text-[#2271b1]'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                <Icon className="h-3.5 w-3.5 opacity-80" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-3 sm:p-4">
        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="space-y-3">
            <h2 className={sectionTitleClass}>Общие настройки</h2>
            
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-400">Название сайта</label>
                <input
                  type="text"
                  value={settings.siteName}
                  onChange={(e) => updateSetting('siteName', e.target.value)}
                  className="w-full rounded-md border border-white/[0.06] bg-[#0a0a0a] px-2.5 py-2 text-sm text-white outline-none transition-all focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-400">Логотип</label>
                <input
                  ref={logoFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif"
                  className="hidden"
                  onChange={onLogoFileSelected}
                  disabled={isLogoUploading}
                  aria-hidden
                />
                <div
                  className={`flex flex-wrap items-stretch gap-3 rounded-md border p-2 ${
                    isWpAdmin ? 'border-[#c3c4c7] bg-[#fcfcfc]' : 'border-white/[0.06] bg-[#0a0a0a]'
                  }`}
                >
                  <div
                    className={`relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border ${
                      isWpAdmin ? 'border-[#dcdcde] bg-white' : 'border-white/[0.08] bg-black/40'
                    }`}
                  >
                    {settings.logoUrl?.trim() ? (
                      <img src={settings.logoUrl.trim()} alt="" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <Upload className={`h-6 w-6 ${isWpAdmin ? 'text-[#a7aaad]' : 'text-gray-600'}`} aria-hidden />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isLogoUploading}
                        onClick={() => logoFileInputRef.current?.click()}
                        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                          isWpAdmin
                            ? 'border border-[#c3c4c7] bg-white text-[#2c3338] hover:border-[#2271b1] hover:text-[#2271b1]'
                            : 'border border-white/[0.1] bg-white/[0.06] text-gray-200 hover:border-[#d4af37]/50 hover:text-white'
                        }`}
                      >
                        {isLogoUploading ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Загрузка…
                          </span>
                        ) : (
                          <>
                            <Upload className="h-3.5 w-3.5" />
                            Выбрать изображение
                          </>
                        )}
                      </button>
                      {settings.logoUrl?.trim() ? (
                        <button
                          type="button"
                          disabled={isLogoUploading}
                          onClick={() => updateSetting('logoUrl', '')}
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium disabled:opacity-50 ${
                            isWpAdmin ? 'text-[#b32d2e] hover:bg-[#fcf0f1]' : 'text-red-400 hover:bg-red-500/10'
                          }`}
                          aria-label="Убрать логотип"
                        >
                          <X className="h-3.5 w-3.5" />
                          Убрать
                        </button>
                      ) : null}
                    </div>
                    <div>
                      <label className={`mb-0.5 block text-[10px] font-medium ${isWpAdmin ? 'text-[#646970]' : 'text-gray-500'}`}>
                        Или URL
                      </label>
                      <input
                        type="url"
                        value={settings.logoUrl}
                        onChange={(e) => updateSetting('logoUrl', e.target.value)}
                        className={`w-full rounded border px-2 py-1 text-xs outline-none ${
                          isWpAdmin
                            ? 'border-[#8c8f94] bg-white text-[#2c3338] focus:border-[#2271b1]'
                            : 'border-white/[0.08] bg-[#0a0a0a] text-white focus:border-[#d4af37]'
                        }`}
                        placeholder="https://…/logo.svg"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-1 sm:col-span-2">
                <label className={`mb-1 block text-xs font-medium ${isWpAdmin ? 'text-[#50575e]' : 'text-gray-400'}`}>
                  Текстовый логотип
                </label>
                <p className={`mb-2 text-[10px] leading-snug ${isWpAdmin ? 'text-[#646970]' : 'text-gray-500'}`}>
                  Слово в шапке и на сайте; буквы по очереди подсвечиваются. Чтобы применить на сайте, нажмите «Сохранить» вверху страницы.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={settings.textLogo}
                    onChange={(e) => updateSetting('textLogo', e.target.value.slice(0, 64))}
                    maxLength={64}
                    className={`w-full min-w-0 flex-1 rounded-md border px-2.5 py-2 text-sm outline-none transition-all sm:max-w-md ${
                      isWpAdmin
                        ? 'border-[#8c8f94] bg-white text-[#2c3338] focus:border-[#2271b1] focus:shadow-[0_0_0_1px_#2271b1]'
                        : 'border-white/[0.06] bg-[#0a0a0a] text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]'
                    }`}
                    placeholder="Lovnge"
                    autoComplete="off"
                  />
                  <label
                    className={`flex cursor-pointer select-none items-center gap-2 shrink-0 text-xs ${
                      isWpAdmin ? 'text-[#50575e]' : 'text-gray-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={settings.textLogoBlink}
                      onChange={(e) => updateSetting('textLogoBlink', e.target.checked)}
                      className={`h-4 w-4 rounded border ${
                        isWpAdmin
                          ? 'border-[#8c8f94] text-[#2271b1] focus:ring-[#2271b1]'
                          : 'border-white/20 bg-[#0a0a0a] text-[#d4af37] focus:ring-[#d4af37]'
                      }`}
                    />
                    Мигание букв
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  URL сайта
                </label>
                <input
                  type="url"
                  value={settings.siteUrl}
                  onChange={(e) => updateSetting('siteUrl', e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-all"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Описание
                </label>
                <textarea
                  value={settings.siteDescription}
                  onChange={(e) => updateSetting('siteDescription', e.target.value)}
                  rows={3}
                  className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Email администратора
                </label>
                <input
                  type="email"
                  value={settings.adminEmail}
                  onChange={(e) => updateSetting('adminEmail', e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Email поддержки
                </label>
                <input
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => updateSetting('supportEmail', e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* Branding Settings */}
        {activeTab === 'branding' && (
          <div className="space-y-4">
            <div>
              <h2 className={sectionTitleClass}>Брендинг и дизайн</h2>
              <p
                className={`mt-0.5 max-w-3xl text-[11px] leading-snug ${isWpAdmin ? 'text-[#646970]' : 'text-gray-500'}`}
              >
                Светлая/тёмная тема переключается в шапке. Шрифты и акценты сохраняются; остальные токены — в{' '}
                <code className="rounded px-0.5 text-[10px] opacity-90">dashboard-tone.ts</code>.
              </p>
            </div>

            <div>
              <h3 className={`mb-2 text-xs font-semibold uppercase tracking-wide ${isWpAdmin ? 'text-[#1d2327]' : 'text-white/90'}`}>
                Публичный сайт
              </h3>
              <p className={`mb-2 text-[10px] ${isWpAdmin ? 'text-[#646970]' : 'text-gray-500'}`}>
                Логотип — во вкладке «Общие».
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <label className="mb-0.5 block text-[11px] font-medium text-gray-400">Фавикон (URL)</label>
                  <input
                    type="url"
                    value={settings.faviconUrl}
                    onChange={(e) => updateSetting('faviconUrl', e.target.value)}
                    className="w-full rounded-md border border-white/[0.06] bg-[#0a0a0a] px-2 py-1.5 text-xs text-white outline-none focus:border-[#d4af37]"
                    placeholder="/favicon.svg"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-medium text-gray-400">Основной цвет бренда</label>
                  <div className="flex gap-1.5">
                    <input
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => updateSetting('primaryColor', e.target.value)}
                      className="h-8 w-9 cursor-pointer rounded border border-white/[0.06] bg-[#0a0a0a]"
                    />
                    <input
                      type="text"
                      value={settings.primaryColor}
                      onChange={(e) => updateSetting('primaryColor', e.target.value)}
                      className="min-w-0 flex-1 rounded-md border border-white/[0.06] bg-[#0a0a0a] px-2 py-1.5 font-mono text-xs text-white outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-medium text-gray-400">Доп. цвет</label>
                  <div className="flex gap-1.5">
                    <input
                      type="color"
                      value={settings.secondaryColor}
                      onChange={(e) => updateSetting('secondaryColor', e.target.value)}
                      className="h-8 w-9 cursor-pointer rounded border border-white/[0.06] bg-[#0a0a0a]"
                    />
                    <input
                      type="text"
                      value={settings.secondaryColor}
                      onChange={(e) => updateSetting('secondaryColor', e.target.value)}
                      className="min-w-0 flex-1 rounded-md border border-white/[0.06] bg-[#0a0a0a] px-2 py-1.5 font-mono text-xs text-white outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>
              </div>
              <label
                className={`mt-3 flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 ${
                  isWpAdmin ? 'border-[#c3c4c7] bg-white' : 'border-white/[0.08] bg-[#141414]'
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={settings.publicGlassButtons}
                  onChange={(e) => updateSetting('publicGlassButtons', e.target.checked)}
                />
                <span>
                  <span className={`block text-xs font-semibold ${isWpAdmin ? 'text-[#1d2327]' : 'text-white'}`}>
                    Стеклянные кнопки на сайте
                  </span>
                  <span className={`mt-0.5 block text-[10px] leading-snug ${isWpAdmin ? 'text-[#646970]' : 'text-gray-500'}`}>
                    Выкл: основные кнопки — сплошное золото (#d4af37), капсула. Вкл: как на герое — neuromorphic glass и
                    прозрачные вторичные.
                  </span>
                </span>
              </label>
            </div>

            <div>
              <h3 className={`mb-2 text-xs font-semibold uppercase tracking-wide ${isWpAdmin ? 'text-[#1d2327]' : 'text-white/90'}`}>
                Админ-панель
              </h3>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
                {/* Светлая тема */}
                <div
                  className={`flex min-h-0 flex-col rounded-md border p-3 ${
                    isWpAdmin ? 'border-[#c3c4c7] bg-[#fcfcfc]' : 'border-white/[0.1] bg-[#1a1a1a]'
                  }`}
                >
                  <h4 className={`text-sm font-semibold ${isWpAdmin ? 'text-[#1d2327]' : 'text-white'}`}>Светлая тема</h4>
                  <p className={`text-[10px] leading-tight ${isWpAdmin ? 'text-[#646970]' : 'text-gray-500'}`}>
                    Светлая зона контента, тёмная боковая колонка, синий акцент.
                  </p>
                  <div className="mt-2 grid min-w-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
                    <div className="min-w-0 space-y-2 sm:pr-2">
                      <div>
                        <label className={`mb-0.5 block text-[11px] font-medium ${isWpAdmin ? 'text-[#50575e]' : 'text-gray-400'}`}>
                          Шрифт UI / меток
                        </label>
                        <select
                          value={settings.brandingLightFontUi}
                          onChange={(e) => updateSetting('brandingLightFontUi', e.target.value)}
                          className="w-full rounded border border-[#8c8f94] bg-white px-1.5 py-1 text-xs text-[#2c3338] outline-none focus:border-[#2271b1] focus:shadow-[0_0_0_1px_#2271b1]"
                        >
                          {BRANDING_FONT_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={`mb-0.5 block text-[11px] font-medium ${isWpAdmin ? 'text-[#50575e]' : 'text-gray-400'}`}>
                          Шрифт body
                        </label>
                        <select
                          value={settings.brandingLightFontBody}
                          onChange={(e) => updateSetting('brandingLightFontBody', e.target.value)}
                          className="w-full rounded border border-[#8c8f94] bg-white px-1.5 py-1 text-xs text-[#2c3338] outline-none focus:border-[#2271b1] focus:shadow-[0_0_0_1px_#2271b1]"
                        >
                          {BRANDING_FONT_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={`mb-0.5 block text-[11px] font-medium ${isWpAdmin ? 'text-[#50575e]' : 'text-gray-400'}`}>
                          Акцент
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="color"
                            value={settings.brandingLightAccent}
                            onChange={(e) => updateSetting('brandingLightAccent', e.target.value)}
                            className="h-7 w-8 cursor-pointer rounded border border-[#c3c4c7] bg-white"
                          />
                          <input
                            type="text"
                            value={settings.brandingLightAccent}
                            onChange={(e) => updateSetting('brandingLightAccent', e.target.value)}
                            className="min-w-0 flex-1 rounded border border-[#8c8f94] bg-white px-1.5 py-1 font-mono text-[11px] text-[#2c3338]"
                          />
                        </div>
                      </div>
                      <div className={`border-t pt-2 ${isWpAdmin ? 'border-[#dcdcde]' : 'border-white/10'}`}>
                        <p className={`mb-1 text-[9px] font-bold uppercase tracking-wide ${isWpAdmin ? 'text-[#646970]' : 'text-gray-500'}`}>
                          Токены в коде
                        </p>
                        <ul className={`max-h-[5.5rem] space-y-0.5 overflow-y-auto font-mono text-[9px] leading-tight ${isWpAdmin ? 'text-[#50575e]' : 'text-gray-400'}`}>
                          <li>#f0f0f1 фон области</li>
                          <li>#fff карточки, #c3c4c7 рамка</li>
                          <li>#23282d меню / бар</li>
                          <li>#1d2327 заголовки</li>
                          <li>#646970 вторичный</li>
                          <li>#8c8f94 поля</li>
                        </ul>
                      </div>
                    </div>
                    <div
                      className={`flex min-w-0 flex-col items-center justify-start sm:items-end sm:border-l sm:pt-0 sm:pl-3 ${isWpAdmin ? 'sm:border-[#dcdcde]' : 'sm:border-white/10'}`}
                    >
                      <LightModelPagePhoneMock
                        accent={settings.brandingLightAccent}
                        fontUi={settings.brandingLightFontUi}
                        fontBody={settings.brandingLightFontBody}
                      />
                    </div>
                  </div>
                </div>

                {/* Тёмная тема */}
                <div className="flex min-h-0 flex-col rounded-md border border-white/[0.08] bg-[#141414] p-3 text-gray-300">
                  <h4 className="text-sm font-semibold text-white">Тёмная тема</h4>
                  <p className="text-[10px] leading-tight text-gray-500">Золото, тёмные карточки, display для крупных заголовков.</p>
                  <div className="mt-2 grid min-w-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
                    <div className="min-w-0 space-y-2 sm:pr-2">
                      <div>
                        <label className="mb-0.5 block text-[11px] font-medium text-gray-400">Шрифт display</label>
                        <select
                          value={settings.brandingDarkFontDisplay}
                          onChange={(e) => updateSetting('brandingDarkFontDisplay', e.target.value)}
                          className="w-full rounded border border-white/[0.1] bg-[#0a0a0a] px-1.5 py-1 text-xs text-white outline-none focus:border-[#d4af37]"
                        >
                          {BRANDING_FONT_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-0.5 block text-[11px] font-medium text-gray-400">Шрифт body</label>
                        <select
                          value={settings.brandingDarkFontBody}
                          onChange={(e) => updateSetting('brandingDarkFontBody', e.target.value)}
                          className="w-full rounded border border-white/[0.1] bg-[#0a0a0a] px-1.5 py-1 text-xs text-white outline-none focus:border-[#d4af37]"
                        >
                          {BRANDING_FONT_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-0.5 block text-[11px] font-medium text-gray-400">Золото</label>
                        <div className="flex gap-1.5">
                          <input
                            type="color"
                            value={settings.brandingDarkGold}
                            onChange={(e) => updateSetting('brandingDarkGold', e.target.value)}
                            className="h-7 w-8 cursor-pointer rounded border border-white/10 bg-[#0a0a0a]"
                          />
                          <input
                            type="text"
                            value={settings.brandingDarkGold}
                            onChange={(e) => updateSetting('brandingDarkGold', e.target.value)}
                            className="min-w-0 flex-1 rounded border border-white/[0.08] bg-[#0a0a0a] px-1.5 py-1 font-mono text-[11px] text-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-0.5 block text-[11px] font-medium text-gray-400">Золото (тёмнее)</label>
                        <div className="flex gap-1.5">
                          <input
                            type="color"
                            value={settings.brandingDarkGoldDeep}
                            onChange={(e) => updateSetting('brandingDarkGoldDeep', e.target.value)}
                            className="h-7 w-8 cursor-pointer rounded border border-white/10 bg-[#0a0a0a]"
                          />
                          <input
                            type="text"
                            value={settings.brandingDarkGoldDeep}
                            onChange={(e) => updateSetting('brandingDarkGoldDeep', e.target.value)}
                            className="min-w-0 flex-1 rounded border border-white/[0.08] bg-[#0a0a0a] px-1.5 py-1 font-mono text-[11px] text-white"
                          />
                        </div>
                      </div>
                      <div className="border-t border-white/[0.06] pt-2">
                        <p className="mb-1 text-[9px] font-bold uppercase tracking-wide text-gray-500">Токены в коде</p>
                        <ul className="max-h-[5.5rem] space-y-0.5 overflow-y-auto font-mono text-[9px] leading-tight text-gray-400">
                          <li>#0a0a0a фон</li>
                          <li>#141414 карточки</li>
                          <li>Белые заголовки</li>
                          <li>gray-400 вторичный</li>
                          <li>Фокус #d4af37</li>
                          <li>Градиент кнопки</li>
                        </ul>
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-col items-center justify-start sm:items-end sm:border-l sm:border-white/10 sm:pl-3 sm:pt-0">
                      <DarkModelPagePhoneMock
                        gold={settings.brandingDarkGold}
                        goldDeep={settings.brandingDarkGoldDeep}
                        fontDisplay={settings.brandingDarkFontDisplay}
                        fontBody={settings.brandingDarkFontBody}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`flex flex-wrap items-center gap-2 rounded-md border px-2 py-2 ${isWpAdmin ? 'border-[#c3c4c7] bg-[#f6f7f7]' : 'border-white/[0.06] bg-[#0a0a0a]'}`}
            >
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${isWpAdmin ? 'text-[#50575e]' : 'text-gray-500'}`}>
                Бренд сайта
              </span>
              <div
                className="flex h-10 w-10 items-center justify-center rounded text-[9px] font-bold text-white"
                style={{ backgroundColor: settings.primaryColor }}
              >
                A
              </div>
              <div
                className="flex h-10 w-10 items-center justify-center rounded text-[9px] font-bold text-black"
                style={{ backgroundColor: settings.secondaryColor }}
              >
                B
              </div>
            </div>
          </div>
        )}

        {/* Features Settings */}
        {activeTab === 'features' && (
          <div className="space-y-4">
            <h2 className={sectionTitleClass}>Функции платформы</h2>
            
            <div className="space-y-3">
              <label className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-lg border border-white/[0.06] cursor-pointer hover:border-[#d4af37]/30 transition-colors">
                <div>
                  <div className="text-white font-medium text-sm">Регистрация пользователей</div>
                  <div className="text-gray-500 text-xs mt-1">Разрешить новым пользователям регистрироваться</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableRegistration}
                  onChange={(e) => updateSetting('enableRegistration', e.target.checked)}
                  className="w-5 h-5 rounded border-white/[0.06] bg-[#0a0a0a] text-[#d4af37] focus:ring-[#d4af37] focus:ring-offset-0"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-lg border border-white/[0.06] cursor-pointer hover:border-[#d4af37]/30 transition-colors">
                <div>
                  <div className="text-white font-medium text-sm">Подтверждение email</div>
                  <div className="text-gray-500 text-xs mt-1">Требовать подтверждение email при регистрации</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.requireEmailVerification}
                  onChange={(e) => updateSetting('requireEmailVerification', e.target.checked)}
                  className="w-5 h-5 rounded border-white/[0.06] bg-[#0a0a0a] text-[#d4af37] focus:ring-[#d4af37] focus:ring-offset-0"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-lg border border-white/[0.06] cursor-pointer hover:border-[#d4af37]/30 transition-colors">
                <div>
                  <div className="text-white font-medium text-sm">Отзывы</div>
                  <div className="text-gray-500 text-xs mt-1">Разрешить пользователям оставлять отзывы</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableReviews}
                  onChange={(e) => updateSetting('enableReviews', e.target.checked)}
                  className="w-5 h-5 rounded border-white/[0.06] bg-[#0a0a0a] text-[#d4af37] focus:ring-[#d4af37] focus:ring-offset-0"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-lg border border-white/[0.06] cursor-pointer hover:border-[#d4af37]/30 transition-colors">
                <div>
                  <div className="text-white font-medium text-sm">Сообщения</div>
                  <div className="text-gray-500 text-xs mt-1">Включить систему внутренних сообщений</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableMessaging}
                  onChange={(e) => updateSetting('enableMessaging', e.target.checked)}
                  className="w-5 h-5 rounded border-white/[0.06] bg-[#0a0a0a] text-[#d4af37] focus:ring-[#d4af37] focus:ring-offset-0"
                />
              </label>
            </div>
          </div>
        )}

        {/* Payments Settings */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <h2 className={sectionTitleClass}>Платежи и финансы</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Валюта
                </label>
                <select
                  value={settings.currency}
                  onChange={(e) => updateSetting('currency', e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-all"
                >
                  <option value="RUB">₽ RUB - Российский рубль</option>
                  <option value="USD">$ USD - Доллар США</option>
                  <option value="EUR">€ EUR - Евро</option>
                  <option value="AED">د.إ AED - Дирхам ОАЭ</option>
                  <option value="GBP">£ GBP - Британский фунт</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Комиссия платформы (%)
                </label>
                <input
                  type="number"
                  value={settings.commissionRate}
                  onChange={(e) => updateSetting('commissionRate', parseInt(e.target.value))}
                  className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-all"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Минимальный вывод ({settings.currency})
                </label>
                <input
                  type="number"
                  value={settings.minWithdrawal}
                  onChange={(e) => updateSetting('minWithdrawal', parseInt(e.target.value))}
                  className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* Notifications Settings */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <h2 className={sectionTitleClass}>Уведомления</h2>
            
            <div className="space-y-3">
              <label className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-lg border border-white/[0.06] cursor-pointer hover:border-[#d4af37]/30 transition-colors">
                <div>
                  <div className="text-white font-medium text-sm">Email уведомления</div>
                  <div className="text-gray-500 text-xs mt-1">Отправлять уведомления на email</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableEmailNotifications}
                  onChange={(e) => updateSetting('enableEmailNotifications', e.target.checked)}
                  className="w-5 h-5 rounded border-white/[0.06] bg-[#0a0a0a] text-[#d4af37] focus:ring-[#d4af37] focus:ring-offset-0"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-lg border border-white/[0.06] cursor-pointer hover:border-[#d4af37]/30 transition-colors">
                <div>
                  <div className="text-white font-medium text-sm">SMS уведомления</div>
                  <div className="text-gray-500 text-xs mt-1">Отправлять уведомления по SMS</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableSmsNotifications}
                  onChange={(e) => updateSetting('enableSmsNotifications', e.target.checked)}
                  className="w-5 h-5 rounded border-white/[0.06] bg-[#0a0a0a] text-[#d4af37] focus:ring-[#d4af37] focus:ring-offset-0"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-lg border border-white/[0.06] cursor-pointer hover:border-[#d4af37]/30 transition-colors">
                <div>
                  <div className="text-white font-medium text-sm">Push уведомления</div>
                  <div className="text-gray-500 text-xs mt-1">Отправлять push-уведомления в браузере</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enablePushNotifications}
                  onChange={(e) => updateSetting('enablePushNotifications', e.target.checked)}
                  className="w-5 h-5 rounded border-white/[0.06] bg-[#0a0a0a] text-[#d4af37] focus:ring-[#d4af37] focus:ring-offset-0"
                />
              </label>
            </div>
          </div>
        )}

        {/* Security Settings */}
        {activeTab === 'security' && (
          <div className="space-y-4">
            <h2 className={sectionTitleClass}>Безопасность</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Таймаут сессии (дней)
                </label>
                <input
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value))}
                  className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Максимум попыток входа
                </label>
                <input
                  type="number"
                  value={settings.maxLoginAttempts}
                  onChange={(e) => updateSetting('maxLoginAttempts', parseInt(e.target.value))}
                  className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-all"
                />
              </div>

              <label className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-lg border border-white/[0.06] cursor-pointer hover:border-[#d4af37]/30 transition-colors">
                <div>
                  <div className="text-white font-medium text-sm">Двухфакторная аутентификация</div>
                  <div className="text-gray-500 text-xs mt-1">Требовать 2FA для всех пользователей</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.requireTwoFactor}
                  onChange={(e) => updateSetting('requireTwoFactor', e.target.checked)}
                  className="w-5 h-5 rounded border-white/[0.06] bg-[#0a0a0a] text-[#d4af37] focus:ring-[#d4af37] focus:ring-offset-0"
                />
              </label>
            </div>
          </div>
        )}

        {/* Limits Settings */}
        {activeTab === 'limits' && (
          <div className="space-y-4">
            <h2 className={sectionTitleClass}>Лимиты и ограничения</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Макс. фото на модель
                </label>
                <input
                  type="number"
                  value={settings.maxPhotosPerModel}
                  onChange={(e) => updateSetting('maxPhotosPerModel', parseInt(e.target.value))}
                  className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Макс. видео на модель
                </label>
                <input
                  type="number"
                  value={settings.maxVideosPerModel}
                  onChange={(e) => updateSetting('maxVideosPerModel', parseInt(e.target.value))}
                  className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-all"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Макс. длина биографии (символов)
                </label>
                <input
                  type="number"
                  value={settings.maxBioLength}
                  onChange={(e) => updateSetting('maxBioLength', parseInt(e.target.value))}
                  className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-all"
                />
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
