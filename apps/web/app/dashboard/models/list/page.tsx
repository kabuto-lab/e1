/**
 * Models List Page
 * Browse and manage all model profiles
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/components/AuthProvider';
import { Search, Plus, Filter, User, Star, Eye, Edit, Trash2 } from 'lucide-react';
import { api, Profile } from '@/lib/api-client';

export default function ModelsPage() {
  const { user } = useAuth();
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
      const data = await api.getModels({});
      console.log('📋 Loaded models:', data.length);
      console.log('📋 First model:', data[0] ? {
        id: data[0].id,
        displayName: data[0].displayName,
        mainPhotoUrl: data[0].mainPhotoUrl,
        hasPhoto: !!data[0].mainPhotoUrl
      } : 'No models');
      setModels(data);
    } catch (error) {
      console.error('Failed to load models:', error);
      // Fallback to empty array on error
      setModels([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredModels = models.filter(model => {
    const matchesSearch = model.displayName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'published' && model.isPublished) ||
      (filterStatus === 'draft' && !model.isPublished);
    return matchesSearch && matchesStatus;
  });

  return (
    <ProtectedRoute requiredRoles={['admin', 'manager']}>
      <div className="min-h-screen bg-[#0a0a0a] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Модели</h1>
              <p className="text-gray-400 mt-1">Управление анкетами моделей</p>
            </div>
            <Link
              href="/dashboard/models/create"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#d4af37] to-[#b8941f] text-black font-semibold rounded-lg hover:shadow-lg hover:shadow-[#d4af37]/20 transition-all"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Добавить модель</span>
            </Link>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Поиск по имени..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#1a1a1a] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#d4af37]"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-[#d4af37] text-black'
                    : 'bg-[#1a1a1a] text-gray-400 border border-[#333]'
                }`}
              >
                Все
              </button>
              <button
                onClick={() => setFilterStatus('published')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === 'published'
                    ? 'bg-[#d4af37] text-black'
                    : 'bg-[#1a1a1a] text-gray-400 border border-[#333]'
                }`}
              >
                Опубликованы
              </button>
              <button
                onClick={() => setFilterStatus('draft')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === 'draft'
                    ? 'bg-[#d4af37] text-black'
                    : 'bg-[#1a1a1a] text-gray-400 border border-[#333]'
                }`}
              >
                Черновики
              </button>
            </div>
          </div>

          {/* Models Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-[#1a1a1a] border border-[#333] rounded-xl overflow-hidden">
                  <div className="h-48 skeleton" />
                  <div className="p-4 space-y-3">
                    <div className="h-5 skeleton rounded" />
                    <div className="h-4 skeleton rounded w-2/3" />
                    <div className="h-4 skeleton rounded" />
                    <div className="flex gap-2">
                      <div className="h-6 skeleton rounded-full w-16" />
                      <div className="h-6 skeleton rounded-full w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredModels.map((model) => (
                <div
                  key={model.id}
                  className="bg-[#1a1a1a] border border-[#333] rounded-xl overflow-hidden hover:border-[#d4af37]/30 transition-all group"
                >
                  {/* Photo */}
                  <div className="relative h-48 bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] overflow-hidden">
                    {model.mainPhotoUrl ? (
                      <img
                        src={model.mainPhotoUrl}
                        alt={model.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <User className="w-16 h-16 text-gray-600" />
                      </div>
                    )}
                    {model.eliteStatus && (
                      <div className="absolute top-2 right-2 px-2 py-1 bg-gradient-to-r from-[#d4af37] to-[#b8941f] text-black text-xs font-bold rounded">
                        ELITE
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 bg-black/50 rounded hover:bg-[#d4af37] transition-colors">
                        <Eye className="w-4 h-4 text-white" />
                      </button>
                      <button className="p-1.5 bg-black/50 rounded hover:bg-[#d4af37] transition-colors">
                        <Edit className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-white">{model.displayName}</h3>
                        <p className="text-sm text-gray-400">@{model.slug}</p>
                      </div>
                      {model.verificationStatus === 'verified' && (
                        <div className="text-green-500" title="Проверена">
                          <Star className="w-5 h-5 fill-current" />
                        </div>
                      )}
                    </div>

                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                      {model.biography || 'Биография не заполнена'}
                    </p>

                    {model.physicalAttributes && (
                      <div className="flex gap-3 text-xs text-gray-500 mb-3">
                        {model.physicalAttributes.age && (
                          <span>{model.physicalAttributes.age} лет</span>
                        )}
                        {model.physicalAttributes.height && (
                          <span>{model.physicalAttributes.height} см</span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          model.isPublished
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-yellow-500/10 text-yellow-500'
                        }`}
                      >
                        {model.isPublished ? 'Опубликована' : 'Черновик'}
                      </span>
                      <div className="flex gap-2">
                        <Link
                          href={`/dashboard/models/${model.id}/edit`}
                          className="text-sm text-[#d4af37] hover:text-[#f4d03f]"
                        >
                          Редактировать
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredModels.length === 0 && (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 bg-[#1a1a1a] border border-[#333] rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Модели не найдены</h3>
              <p className="text-gray-400 mb-6">
                {searchTerm ? 'Попробуйте изменить поисковый запрос' : 'Добавьте первую модель'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => router.push('/dashboard/models/create')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#d4af37] to-[#b8941f] text-black font-semibold rounded-lg hover:shadow-lg hover:shadow-[#d4af37]/20 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
