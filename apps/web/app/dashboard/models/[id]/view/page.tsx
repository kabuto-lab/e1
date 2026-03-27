/**
 * Model View Page (Admin)
 * Shows model profile similar to public catalog view
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Star, Calendar, Ruler, Weight, Heart, Edit, Trash2, Eye } from 'lucide-react';

interface ModelProfile {
  id: string;
  displayName: string;
  slug: string;
  biography?: string;
  verificationStatus: string;
  eliteStatus: boolean;
  isPublished: boolean;
  availabilityStatus: string;
  physicalAttributes?: {
    age?: number;
    height?: number;
    weight?: number;
    bustSize?: number;
    bustType?: string;
    bodyType?: string;
    temperament?: string;
    sexuality?: string;
    hairColor?: string;
    eyeColor?: string;
  };
  rateHourly?: number;
  rateOvernight?: number;
  ratingReliability: string;
  totalMeetings: number;
  photoCount: number;
  mainPhotoUrl?: string;
  psychotypeTags?: string[];
  languages?: string[];
  createdAt: string;
  updatedAt: string;
}

export default function AdminModelViewPage() {
  const router = useRouter();
  const params = useParams();
  const modelId = params?.id as string;
  
  const [model, setModel] = useState<ModelProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModel();
  }, [modelId]);

  const loadModel = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/models/id/${modelId}`);
      if (response.ok) {
        const data = await response.json();
        setModel(data);
      }
    } catch (err) {
      console.error('Failed to load model:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Удалить эту модель?')) return;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/models/${modelId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        router.push('/dashboard/models');
      } else {
        alert('Не удалось удалить');
      }
    } catch (err) {
      alert('Ошибка при удалении');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#d4af37]/20 border-t-[#d4af37] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Модель не найдена</p>
          <Link href="/dashboard/models" className="text-[#d4af37] hover:underline">← Вернуться к списку</Link>
        </div>
      </div>
    );
  }

  const physical = model.physicalAttributes || {};
  const reliability = parseFloat(model.ratingReliability || '0');

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0f0f0f]">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 bg-[#141414]/95 backdrop-blur border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/models" className="p-2 hover:bg-[#262626] rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'Unbounded' }}>{model.displayName}</h1>
              <p className="text-xs text-gray-500">Просмотр модели</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/models/${model.slug}`}
              target="_blank"
              className="flex items-center gap-2 px-4 py-2 bg-[#262626] text-gray-300 rounded-lg hover:bg-[#333] transition-all text-sm"
            >
              <Eye className="w-4 h-4" />
              На сайте
            </Link>
            <Link
              href={`/dashboard/models/${model.id}/edit`}
              className="flex items-center gap-2 px-4 py-2 bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] rounded-lg hover:bg-[#d4af37]/20 transition-all text-sm font-medium"
            >
              <Edit className="w-4 h-4" />
              Редактировать
            </Link>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-all text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Удалить
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Left Column - Photo */}
          <div className="col-span-5">
            <div className="bg-[#141414] border border-white/[0.06] rounded-2xl overflow-hidden sticky top-24">
              <div className="relative aspect-[3/4]">
                {model.mainPhotoUrl ? (
                  <img src={model.mainPhotoUrl} alt={model.displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#0a0a0a]">
                    <div className="text-gray-700 text-6xl">👤</div>
                  </div>
                )}
                
                {/* Elite Badge */}
                {model.eliteStatus && (
                  <div className="absolute top-4 right-4 px-4 py-2 bg-gradient-to-r from-[#d4af37] to-[#f4d03f] text-black text-xs font-bold rounded-full shadow-lg">
                    👑 ELITE
                  </div>
                )}
                
                {/* Status Badge */}
                <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-black/80 backdrop-blur rounded-full">
                  <div className={`w-2 h-2 rounded-full ${
                    model.availabilityStatus === 'online' ? 'bg-green-500' :
                    model.availabilityStatus === 'in_shift' ? 'bg-yellow-500' :
                    model.availabilityStatus === 'busy' ? 'bg-red-500' : 'bg-gray-500'
                  }`} />
                  <span className="text-white text-xs font-medium">
                    {model.availabilityStatus === 'online' ? 'Свободна' :
                     model.availabilityStatus === 'in_shift' ? 'В смене' :
                     model.availabilityStatus === 'busy' ? 'Занята' : 'Оффлайн'}
                  </span>
                </div>
                
                {/* Verification Badge */}
                {model.verificationStatus === 'verified' && (
                  <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-green-500/90 text-white text-xs font-semibold rounded-full">
                    ✓ Проверена
                  </div>
                )}
              </div>
              
              {/* Photo Count */}
              <div className="p-4 border-t border-white/[0.06] flex justify-center gap-6">
                <div className="text-center">
                  <div className="text-xl font-bold text-[#d4af37]">{model.photoCount || 0}</div>
                  <div className="text-xs text-gray-500">Фото</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-[#d4af37]">{model.totalMeetings}</div>
                  <div className="text-xs text-gray-500">Встреч</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-[#d4af37]">{Math.round(reliability)}%</div>
                  <div className="text-xs text-gray-500">Рейтинг</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Info */}
          <div className="col-span-7 space-y-6">
            {/* Header */}
            <div className="bg-[#141414] border border-white/[0.06] rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Unbounded' }}>{model.displayName}</h2>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {physical.age ? `${physical.age} лет` : ''}
                    </span>
                    <span className="flex items-center gap-1 text-[#d4af37]">
                      <Star className="w-4 h-4 fill-current" />
                      {reliability.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {model.eliteStatus && (
                    <span className="px-3 py-1 bg-gradient-to-r from-[#d4af37] to-[#f4d03f] text-black text-xs font-bold rounded-full">
                      ELITE
                    </span>
                  )}
                  {model.verificationStatus === 'verified' && (
                    <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full border border-green-500/30">
                      ✓ Проверена
                    </span>
                  )}
                </div>
              </div>
              
              {/* Physical Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/[0.06]">
                <div className="flex items-center gap-2 text-sm">
                  <Ruler className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-300">{physical.height || '---'} см</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Weight className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-300">{physical.weight || '---'} кг</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Heart className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-300">{physical.bustSize ? `${physical.bustSize} (${physical.bustType === 'natural' ? 'нат' : 'сил'})` : '---'}</span>
                </div>
              </div>
            </div>

            {/* About */}
            {model.biography && (
              <div className="bg-[#141414] border border-white/[0.06] rounded-2xl p-6">
                <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase" style={{ fontFamily: 'Unbounded' }}>Обо мне</h3>
                <p className="text-gray-300 text-sm leading-relaxed" style={{ fontFamily: 'Inter' }}>{model.biography}</p>
              </div>
            )}

            {/* Tags */}
            {model.psychotypeTags && model.psychotypeTags.length > 0 && (
              <div className="bg-[#141414] border border-white/[0.06] rounded-2xl p-6">
                <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase" style={{ fontFamily: 'Unbounded' }}>Психотипы</h3>
                <div className="flex flex-wrap gap-2">
                  {model.psychotypeTags.map((tag: string, i: number) => (
                    <span key={i} className="px-3 py-1.5 bg-[#d4af37]/10 border border-[#d4af37]/20 rounded-lg text-xs text-[#d4af37] font-medium" style={{ fontFamily: 'Inter' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Rates */}
            {(model.rateHourly || model.rateOvernight) && (
              <div className="bg-[#141414] border border-white/[0.06] rounded-2xl p-6">
                <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase" style={{ fontFamily: 'Unbounded' }}>Расценки</h3>
                <div className="space-y-3">
                  {model.rateHourly && (
                    <div className="flex justify-between items-center py-2 border-b border-white/[0.06]">
                      <span className="text-sm text-gray-400" style={{ fontFamily: 'Inter' }}>1 час</span>
                      <span className="text-lg font-bold text-[#d4af37]" style={{ fontFamily: 'Inter' }}>{model.rateHourly.toLocaleString()} ₽</span>
                    </div>
                  )}
                  {model.rateOvernight && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-400" style={{ fontFamily: 'Inter' }}>Вся ночь</span>
                      <span className="text-lg font-bold text-[#d4af37]" style={{ fontFamily: 'Inter' }}>{model.rateOvernight.toLocaleString()} ₽</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Additional Info */}
            <div className="bg-[#141414] border border-white/[0.06] rounded-2xl p-6">
              <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase" style={{ fontFamily: 'Unbounded' }}>Дополнительно</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between py-2 border-b border-white/[0.06]">
                  <span className="text-gray-500" style={{ fontFamily: 'Inter' }}>Статус</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    model.isPublished ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {model.isPublished ? 'Опубликована' : 'Черновик'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/[0.06]">
                  <span className="text-gray-500" style={{ fontFamily: 'Inter' }}>Создана</span>
                  <span className="text-gray-300" style={{ fontFamily: 'Inter' }}>{new Date(model.createdAt).toLocaleDateString('ru-RU')}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500" style={{ fontFamily: 'Inter' }}>Обновлена</span>
                  <span className="text-gray-300" style={{ fontFamily: 'Inter' }}>{new Date(model.updatedAt).toLocaleDateString('ru-RU')}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500" style={{ fontFamily: 'Inter' }}>URL</span>
                  <Link href={`/models/${model.slug}`} target="_blank" className="text-[#d4af37] hover:underline truncate max-w-[150px]">
                    /models/{model.slug}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
