/**
 * Settings Page
 * Full configuration for platform settings
 */

'use client';

import { useState, useEffect } from 'react';
import { Save, Upload, X, Check, AlertCircle, Globe, Mail, CreditCard, Bell, Shield, Palette, Database } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useDashboardTheme } from '@/components/DashboardThemeContext';

interface Settings {
  // General
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  adminEmail: string;
  supportEmail: string;
  
  // Branding
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  
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
  siteDescription: 'Премиальная платформа сопровождения',
  siteUrl: 'http://localhost:3001',
  adminEmail: 'admin@lovnge.com',
  supportEmail: 'support@lovnge.com',
  
  // Branding
  logoUrl: '',
  faviconUrl: '/favicon.svg',
  primaryColor: '#d4af37',
  secondaryColor: '#f4d03f',
  
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

export default function SettingsPage() {
  const { isWpAdmin, theme, setTheme } = useDashboardTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [activeTab, setActiveTab] = useState('general');
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const sectionTitleClass = `text-lg font-semibold mb-4 ${isWpAdmin ? 'text-[#1d2327]' : 'text-white'}`;

  const tabs = [
    { id: 'general', label: 'Общие', icon: Globe },
    { id: 'branding', label: 'Брендинг', icon: Palette },
    { id: 'features', label: 'Функции', icon: Check },
    { id: 'payments', label: 'Платежи', icon: CreditCard },
    { id: 'notifications', label: 'Уведомления', icon: Bell },
    { id: 'security', label: 'Безопасность', icon: Shield },
    { id: 'limits', label: 'Лимиты', icon: Database },
  ];

  const TabIcon = ({ icon: Icon, active }: { icon: any, active: boolean }) => (
    <Icon className={`w-4 h-4 ${active ? 'text-[#d4af37]' : 'text-gray-500'}`} />
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center font-body">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#d4af37]/20 border-t-[#d4af37] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Загрузка настроек...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex-1 font-body ${isWpAdmin ? '[&_h2]:text-[#1d2327] [&_h3]:text-[#1d2327] [&_label]:text-[#50575e] [&_input]:border-[#8c8f94] [&_input]:bg-white [&_input]:text-[#2c3338] [&_textarea]:border-[#8c8f94] [&_textarea]:bg-white [&_textarea]:text-[#2c3338] [&_select]:border-[#8c8f94] [&_select]:bg-white [&_select]:text-[#2c3338]' : ''}`}
    >
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1
            className={`text-2xl font-semibold ${isWpAdmin ? 'text-[#1d2327]' : 'font-display text-white'}`}
          >
            Настройки
          </h1>
          <p className={`text-sm ${isWpAdmin ? 'text-[#646970]' : 'text-gray-400'}`}>
            Управление конфигурацией платформы
          </p>
        </div>
        <button
          onClick={saveSettings}
          disabled={isSaving}
          className={`flex items-center gap-2 rounded-lg px-6 py-2.5 font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
            isWpAdmin
              ? 'border border-[#2271b1] bg-[#2271b1] text-white shadow-sm hover:bg-[#135e96]'
              : 'bg-gradient-to-r from-[#d4af37] to-[#b8941f] text-black hover:shadow-lg hover:shadow-[#d4af37]/20'
          }`}
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              Сохранение...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Сохранить
            </>
          )}
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3 mb-6">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-red-500 font-medium">Ошибка</div>
            <div className="text-red-400 text-sm">{error}</div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-start gap-3 mb-6">
          <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-green-500 font-medium">Успешно</div>
            <div className="text-green-400 text-sm">{success}</div>
          </div>
        </div>
      )}

      {/* Внешний вид админ-панели */}
      <div
        className={`mb-6 rounded-lg border p-4 ${
          isWpAdmin ? 'border-[#c3c4c7] bg-[#f6f7f7]' : 'border-white/[0.08] bg-[#141414]'
        }`}
      >
        <div className="mb-1 flex items-center gap-2">
          <Palette className={`h-4 w-4 ${isWpAdmin ? 'text-[#2271b1]' : 'text-[#d4af37]'}`} />
          <h2 className={`text-sm font-semibold ${isWpAdmin ? 'text-[#1d2327]' : 'text-white'}`}>
            Внешний вид админки
          </h2>
        </div>
        <p className={`mb-4 text-xs leading-relaxed ${isWpAdmin ? 'text-[#646970]' : 'text-gray-500'}`}>
          Светлая тема повторяет визуальный язык WordPress: тёмная верхняя панель и боковое меню (#23282d),
          серая рабочая область (#f0f0f1), белые метабоксы, системный шрифт и синие акценты (#2271b1).
        </p>
        <label className="flex cursor-pointer items-center gap-3 select-none">
          <button
            type="button"
            role="switch"
            aria-checked={theme === 'wp-admin'}
            onClick={() => setTheme(theme === 'wp-admin' ? 'default' : 'wp-admin')}
            className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors ${
              theme === 'wp-admin' ? 'bg-[#2271b1]' : isWpAdmin ? 'bg-[#c3c4c7]' : 'bg-[#3c3c3c]'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                theme === 'wp-admin' ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <span className={`text-sm ${isWpAdmin ? 'text-[#2c3338]' : 'text-gray-300'}`}>
            Светлая тема
          </span>
        </label>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? isWpAdmin
                    ? 'bg-[#2271b1] text-white shadow-sm'
                    : 'bg-[#d4af37] text-black'
                  : isWpAdmin
                    ? 'border border-[#c3c4c7] bg-white text-[#2c3338] hover:border-[#2271b1] hover:text-[#2271b1]'
                    : 'bg-[#141414] text-gray-400 hover:bg-[#262626] hover:text-white'
              }`}
            >
              <Icon
                className={`h-4 w-4 ${
                  activeTab === tab.id
                    ? isWpAdmin
                      ? 'text-white'
                      : 'text-black'
                    : isWpAdmin
                      ? 'text-[#646970]'
                      : 'text-gray-500'
                }`}
              />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div
        className={`rounded-xl border p-6 ${
          isWpAdmin ? 'border-[#c3c4c7] bg-white shadow-[0_1px_1px_rgba(0,0,0,0.04)]' : 'border-white/[0.06] bg-[#141414]'
        }`}
      >
        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="space-y-4">
            <h2 className={sectionTitleClass}>Общие настройки</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Название сайта
                </label>
                <input
                  type="text"
                  value={settings.siteName}
                  onChange={(e) => updateSetting('siteName', e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-all"
                />
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
            <h2 className={sectionTitleClass}>Брендинг и дизайн</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Логотип (URL)
                </label>
                <input
                  type="url"
                  value={settings.logoUrl}
                  onChange={(e) => updateSetting('logoUrl', e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-all"
                  placeholder="/logo.svg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Фавикон (URL)
                </label>
                <input
                  type="url"
                  value={settings.faviconUrl}
                  onChange={(e) => updateSetting('faviconUrl', e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-all"
                  placeholder="/favicon.svg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Основной цвет
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => updateSetting('primaryColor', e.target.value)}
                    className="w-12 h-10 rounded-lg border border-white/[0.06] bg-[#0a0a0a] cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.primaryColor}
                    onChange={(e) => updateSetting('primaryColor', e.target.value)}
                    className="flex-1 bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Дополнительный цвет
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={settings.secondaryColor}
                    onChange={(e) => updateSetting('secondaryColor', e.target.value)}
                    className="w-12 h-10 rounded-lg border border-white/[0.06] bg-[#0a0a0a] cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.secondaryColor}
                    onChange={(e) => updateSetting('secondaryColor', e.target.value)}
                    className="flex-1 bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="mt-6 p-4 bg-[#0a0a0a] rounded-xl border border-white/[0.06]">
              <h3
                className={`mb-3 text-sm font-medium ${isWpAdmin ? 'text-[#50575e]' : 'text-gray-400'}`}
              >
                Предпросмотр цветов
              </h3>
              <div className="flex gap-4">
                <div
                  className="w-24 h-24 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  Primary
                </div>
                <div
                  className="w-24 h-24 rounded-lg flex items-center justify-center text-black font-bold"
                  style={{ backgroundColor: settings.secondaryColor }}
                >
                  Secondary
                </div>
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
  );
}
