/**
 * Settings Page
 * Full configuration for platform settings
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Upload, X, Check, AlertCircle, Globe, Mail, CreditCard, Bell, Shield, Palette, Database } from 'lucide-react';

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
  const router = useRouter();
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
      // Try to load from API (if endpoint exists)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/settings`);
      if (response.ok) {
        const data = await response.json();
        setSettings({ ...defaultSettings, ...data });
      } else {
        setSettings(defaultSettings);
      }
    } catch (err) {
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
      // Save to API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
      
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
    <div className="flex-1 font-body">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Настройки</h1>
          <p className="text-gray-400 text-sm">Управление конфигурацией платформы</p>
        </div>
        <button
          onClick={saveSettings}
          disabled={isSaving}
          className="px-6 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#b8941f] text-black font-semibold rounded-lg hover:shadow-lg hover:shadow-[#d4af37]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap flex items-center gap-2 transition-all ${
                activeTab === tab.id
                  ? 'bg-[#d4af37] text-black'
                  : 'bg-[#141414] text-gray-400 hover:text-white hover:bg-[#262626]'
              }`}
            >
              <Icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-black' : 'text-gray-500'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-6">
        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white mb-4">Общие настройки</h2>
            
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
            <h2 className="text-lg font-bold text-white mb-4">Брендинг и дизайн</h2>
            
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
              <h3 className="text-sm font-medium text-gray-400 mb-3">Предпросмотр цветов</h3>
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
            <h2 className="text-lg font-bold text-white mb-4">Функции платформы</h2>
            
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
            <h2 className="text-lg font-bold text-white mb-4">Платежи и финансы</h2>
            
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
            <h2 className="text-lg font-bold text-white mb-4">Уведомления</h2>
            
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
            <h2 className="text-lg font-bold text-white mb-4">Безопасность</h2>
            
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
            <h2 className="text-lg font-bold text-white mb-4">Лимиты и ограничения</h2>
            
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
