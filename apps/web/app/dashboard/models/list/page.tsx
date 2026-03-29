/**
 * Models List Page
 * Browse and manage all model profiles
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useDashboardTheme } from '@/components/DashboardThemeContext';
import { dashboardTone } from '@/lib/dashboard-tone';
import { Search, Plus, User, Star, Edit, ExternalLink } from 'lucide-react';
import { api, Profile } from '@/lib/api-client';

export default function ModelsPage() {
  const router = useRouter();
  const { isWpAdmin: L } = useDashboardTheme();
  const t = dashboardTone(L);
  const [models, setModels] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');

  useEffect(() => {
    loadModels();
  }, []);

  async function loadModels() {
    try {
      setLoading(true);
      const data = await api.getMyModels();
      setModels(data);
    } catch (error) {
      console.error('Failed to load models:', error);
      setModels([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredModels = models.filter((model) => {
    const matchesSearch = model.displayName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'published' && model.isPublished) ||
      (filterStatus === 'draft' && !model.isPublished);
    return matchesSearch && matchesStatus;
  });

  const cardGrid = `${t.card} overflow-hidden transition-all ${L ? 'hover:border-[#2271b1]/40' : 'hover:border-[#d4af37]/30'} group`;

  return (
    <ProtectedRoute requiredRoles={['admin', 'manager']}>
      <div className={`py-6 font-body sm:px-0 ${t.page}`}>
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold font-display ${L ? 'font-normal text-[#1d2327]' : 'text-white'}`}>
                Модели
              </h1>
              <p className={`mt-1 ${t.muted}`}>Управление анкетами моделей</p>
            </div>
            <Link href="/dashboard/models/create" className={t.btnPrimary + ' px-4 py-2'}>
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">Добавить модель</span>
            </Link>
          </div>

          <div className="mb-6 flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 ${L ? 'text-[#646970]' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Поиск по имени..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${t.input} pl-10 ${L ? 'placeholder:text-[#646970]' : 'placeholder-gray-500'}`}
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'published', 'draft'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilterStatus(key)}
                  className={filterStatus === key ? t.chipActive : t.chipInactive}
                >
                  {key === 'all' ? 'Все' : key === 'published' ? 'Опубликованы' : 'Черновики'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className={`${t.card} overflow-hidden rounded-xl`}>
                  <div className="h-48 skeleton" />
                  <div className="space-y-3 p-4">
                    <div className="h-5 skeleton rounded" />
                    <div className="h-4 skeleton w-2/3 rounded" />
                    <div className="h-4 skeleton rounded" />
                    <div className="flex gap-2">
                      <div className="h-6 w-16 skeleton rounded-full" />
                      <div className="h-6 w-20 skeleton rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredModels.map((model) => (
                <div key={model.id} className={cardGrid}>
                  <div
                    className={`relative h-48 overflow-hidden ${
                      L ? 'bg-gradient-to-br from-[#f6f7f7] to-[#dcdcde]' : 'bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a]'
                    }`}
                  >
                    {model.mainPhotoUrl ? (
                      <img src={model.mainPhotoUrl} alt={model.displayName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <User className={`h-16 w-16 ${L ? 'text-[#a7aaad]' : 'text-gray-600'}`} />
                      </div>
                    )}
                    {model.eliteStatus && (
                      <div
                        className={`absolute right-2 top-2 rounded px-2 py-1 text-xs font-bold ${
                          L ? 'border border-[#c3c4c7] bg-[#f6f7f7] text-[#1d2327]' : 'bg-gradient-to-r from-[#d4af37] to-[#b8941f] text-black'
                        }`}
                      >
                        ELITE
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <a
                        href={`/models/${model.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`rounded p-1.5 transition-colors ${
                          L ? 'bg-white/90 text-[#2271b1] hover:bg-[#f0f6fc]' : 'bg-black/50 hover:bg-[#d4af37]'
                        }`}
                        title="Открыть профиль"
                      >
                        <ExternalLink className={`h-4 w-4 ${L ? '' : 'text-white'}`} />
                      </a>
                      <Link
                        href={`/dashboard/models/${model.id}/edit`}
                        className={`rounded p-1.5 transition-colors ${
                          L ? 'bg-white/90 text-[#2271b1] hover:bg-[#f0f6fc]' : 'bg-black/50 hover:bg-[#d4af37]'
                        }`}
                        title="Редактировать"
                      >
                        <Edit className={`h-4 w-4 ${L ? '' : 'text-white'}`} />
                      </Link>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <h3 className={`text-lg font-bold ${L ? 'text-[#1d2327]' : 'text-white'}`}>{model.displayName}</h3>
                        <p className={`text-sm ${t.muted}`}>@{model.slug}</p>
                      </div>
                      {model.verificationStatus === 'verified' && (
                        <div className="text-green-600" title="Проверена">
                          <Star className="h-5 w-5 fill-current" />
                        </div>
                      )}
                    </div>

                    <p className={`mb-3 line-clamp-2 text-sm ${t.muted}`}>
                      {model.biography || 'Биография не заполнена'}
                    </p>

                    {model.physicalAttributes && (
                      <div className={`mb-3 flex gap-3 text-xs ${L ? 'text-[#646970]' : 'text-gray-500'}`}>
                        {model.physicalAttributes.age && <span>{model.physicalAttributes.age} лет</span>}
                        {model.physicalAttributes.height && <span>{model.physicalAttributes.height} см</span>}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          model.isPublished
                            ? L
                              ? 'border border-[#00a32a] bg-[#edfaef] text-[#00a32a]'
                              : 'bg-green-500/10 text-green-500'
                            : L
                              ? 'border border-[#dba617] bg-[#fcf9e8] text-[#996800]'
                              : 'bg-yellow-500/10 text-yellow-500'
                        }`}
                      >
                        {model.isPublished ? 'Опубликована' : 'Черновик'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filteredModels.length === 0 && (
            <div className="py-20 text-center">
              <div
                className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border ${
                  L ? 'border-[#c3c4c7] bg-white' : 'border-white/[0.06] bg-[#141414]'
                }`}
              >
                <svg className={`h-10 w-10 ${L ? 'text-[#a7aaad]' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className={`mb-2 text-xl font-bold ${L ? 'text-[#1d2327]' : 'text-white'}`}>Модели не найдены</h3>
              <p className={`mb-6 ${t.muted}`}>
                {searchTerm ? 'Попробуйте изменить поисковый запрос' : 'Добавьте первую модель'}
              </p>
              {!searchTerm && (
                <button type="button" onClick={() => router.push('/dashboard/models/create')} className={t.btnPrimary + ' px-6 py-3'}>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Добавить модель
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
