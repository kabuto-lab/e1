/**
 * Moderation Page
 * Review and approve model profiles, photos, and reviews
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Check, X, Eye, AlertTriangle, User, Image as ImageIcon, Star, Filter } from 'lucide-react';

interface ModerationItem {
  id: string;
  type: 'profile' | 'photo' | 'review';
  modelName?: string;
  modelId?: string;
  clientName?: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  imageUrl?: string;
}

const MOCK_ITEMS: ModerationItem[] = [
  {
    id: 'MOD-001',
    type: 'profile',
    modelName: 'Елена',
    modelId: '6',
    description: 'Новая анкета модели на проверке',
    status: 'pending',
    submittedAt: '2026-03-22',
  },
  {
    id: 'MOD-002',
    type: 'photo',
    modelName: 'Дарья',
    modelId: '11',
    description: 'Новое фото загружено (IMG_2345.jpg)',
    status: 'pending',
    submittedAt: '2026-03-22',
    imageUrl: '/images_tst/2.jpg',
  },
  {
    id: 'MOD-003',
    type: 'review',
    clientName: 'Александр М.',
    modelName: 'Юлианна',
    modelId: '1',
    description: 'Отзыв: "Отличная встреча, рекомендую!"',
    status: 'pending',
    submittedAt: '2026-03-21',
  },
  {
    id: 'MOD-004',
    type: 'photo',
    modelName: 'Ксения',
    modelId: '9',
    description: 'Фото на проверке (IMG_8901.jpg)',
    status: 'pending',
    submittedAt: '2026-03-21',
    imageUrl: '/images_tst/photo-1534528741775-53994a69daeb.jpg',
  },
];

export default function ModerationPage() {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    // Load moderation items from API
    setItems(MOCK_ITEMS);
    setIsLoading(false);
  }, []);

  const filteredItems = items.filter((item) => {
    if (typeFilter === 'all') return true;
    return item.type === typeFilter;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'profile': return <User className="w-4 h-4" />;
      case 'photo': return <ImageIcon className="w-4 h-4" />;
      case 'review': return <Star className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'profile': return 'Анкета';
      case 'photo': return 'Фото';
      case 'review': return 'Отзыв';
      default: return type;
    }
  };

  const handleApprove = async (itemId: string) => {
    // TODO: API call to approve item
    setItems(items.map(i => 
      i.id === itemId ? { ...i, status: 'approved' as const } : i
    ));
  };

  const handleReject = async (itemId: string) => {
    // TODO: API call to reject item
    setItems(items.map(i => 
      i.id === itemId ? { ...i, status: 'rejected' as const } : i
    ));
  };

  return (
    <div className="flex-1 font-body">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Модерация</h1>
          <p className="text-gray-400 text-sm">Проверка анкет, фото и отзывов</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#141414] border border-white/[0.06] rounded-xl px-4 py-2 text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-all"
          >
            <option value="all">Все типы</option>
            <option value="profile">Анкеты</option>
            <option value="photo">Фото</option>
            <option value="review">Отзывы</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#d4af37] to-[#b8941f] text-black font-semibold rounded-lg hover:shadow-lg transition-all">
            <Check className="w-4 h-4" />
            Одобрить все
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <span className="text-gray-400 text-sm">Ожидают</span>
          </div>
          <div className="text-2xl font-bold text-white">{items.filter(i => i.status === 'pending').length}</div>
        </div>
        <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <User className="w-5 h-5 text-blue-400" />
            <span className="text-gray-400 text-sm">Анкеты</span>
          </div>
          <div className="text-2xl font-bold text-white">{items.filter(i => i.type === 'profile').length}</div>
        </div>
        <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <ImageIcon className="w-5 h-5 text-purple-400" />
            <span className="text-gray-400 text-sm">Фото</span>
          </div>
          <div className="text-2xl font-bold text-white">{items.filter(i => i.type === 'photo').length}</div>
        </div>
        <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <Star className="w-5 h-5 text-yellow-400" />
            <span className="text-gray-400 text-sm">Отзывы</span>
          </div>
          <div className="text-2xl font-bold text-white">{items.filter(i => i.type === 'review').length}</div>
        </div>
      </div>

      {/* Moderation Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredItems.map((item) => (
          <div key={item.id} className="bg-[#141414] border border-white/[0.06] rounded-xl p-5 hover:border-[#d4af37]/30 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  item.type === 'profile' ? 'bg-blue-500/20 text-blue-400' :
                  item.type === 'photo' ? 'bg-purple-500/20 text-purple-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {getTypeIcon(item.type)}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{getTypeText(item.type)}</div>
                  <div className="text-xs text-gray-500">{item.id}</div>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                item.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                item.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {item.status === 'pending' ? '⏳ На проверке' :
                 item.status === 'approved' ? '✓ Одобрено' : '✗ Отклонено'}
              </span>
            </div>

            {/* Content Preview */}
            <div className="mb-4">
              {item.imageUrl && (
                <div className="mb-3 rounded-lg overflow-hidden">
                  <img src={item.imageUrl} alt="Preview" className="w-full h-48 object-cover" />
                </div>
              )}
              
              <div className="mb-2">
                {item.modelName && (
                  <Link href={`/dashboard/models/${item.modelId}`} className="text-sm text-[#d4af37] hover:underline">
                    {item.modelName}
                  </Link>
                )}
                {item.clientName && (
                  <div className="text-sm text-gray-400">{item.clientName}</div>
                )}
              </div>
              
              <p className="text-sm text-gray-300">{item.description}</p>
            </div>

            {/* Meta */}
            <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
              <span>Загружено: {item.submittedAt}</span>
              <Link href={`/dashboard/moderation/${item.id}`} className="text-[#d4af37] hover:underline flex items-center gap-1">
                <Eye className="w-3 h-3" />
                Подробнее
              </Link>
            </div>

            {/* Actions */}
            {item.status === 'pending' && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleApprove(item.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-500/30 transition-all font-semibold"
                >
                  <Check className="w-4 h-4" />
                  Одобрить
                </button>
                <button
                  onClick={() => handleReject(item.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/30 transition-all font-semibold"
                >
                  <X className="w-4 h-4" />
                  Отклонить
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <AlertTriangle className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Нет элементов на проверке</h3>
          <p className="text-gray-400 text-sm">Все элементы проверены</p>
        </div>
      )}
    </div>
  );
}
