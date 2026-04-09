/**
 * Model View Page (Admin)
 * Shows model profile similar to public catalog view
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiUrl } from '@/lib/api-url';
import { parsePgTextArray } from '@/lib/parse-pg-text-array';
import { ArrowLeft, MapPin, Star, Calendar, Ruler, Weight, Heart, Edit, Trash2, Eye } from 'lucide-react';
import { useDashboardTheme } from '@/components/DashboardThemeContext';
import { dashboardTone } from '@/lib/dashboard-tone';

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
  const { isWpAdmin: L } = useDashboardTheme();
  const t = dashboardTone(L);
  const accent = L ? 'text-[#2271b1]' : 'text-[#d4af37]';
  const cardBox = `${t.card} overflow-hidden rounded-2xl`;

  const [model, setModel] = useState<ModelProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModel();
  }, [modelId]);

  const loadModel = async () => {
    try {
      const response = await fetch(apiUrl(`/models/id/${modelId}`));
      if (response.ok) {
        const data = await response.json();
        setModel({
          ...data,
          psychotypeTags: parsePgTextArray(data.psychotypeTags),
          languages: parsePgTextArray(data.languages),
        });
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
      const response = await fetch(apiUrl(`/models/${modelId}`), {
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
      <div className={`flex min-h-[50vh] items-center justify-center ${L ? '' : 'min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0f0f0f]'}`}>
        <div className="text-center">
          <div
            className={`mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-t-transparent ${
              L ? 'border-[#2271b1]/25 border-t-[#2271b1]' : 'border-[#d4af37]/20 border-t-[#d4af37]'
            }`}
          />
          <p className={t.muted}>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!model) {
    return (
      <div className={`flex min-h-[50vh] items-center justify-center ${L ? '' : 'min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0f0f0f]'}`}>
        <div className="text-center">
          <p className={`mb-4 ${t.muted}`}>Модель не найдена</p>
          <Link href="/dashboard/models" className={t.link}>
            ← Вернуться к списку
          </Link>
        </div>
      </div>
    );
  }

  const physical = model.physicalAttributes || {};
  const reliability = parseFloat(model.ratingReliability || '0');

  return (
    <div className={`min-h-full pb-8 ${L ? t.page : 'min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0f0f0f]'}`}>
      <header className={`sticky top-0 z-50 border-b ${L ? 'border-[#c3c4c7] bg-white' : 'border-white/[0.06] bg-[#141414]/95 backdrop-blur'}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/models" className={`rounded-lg p-2 transition-colors ${L ? 'hover:bg-[#f0f0f1]' : 'hover:bg-[#262626]'}`}>
              <ArrowLeft className={`h-5 w-5 ${t.muted}`} />
            </Link>
            <div>
              <h1 className={`text-lg font-bold ${L ? 'text-[#1d2327]' : 'text-white'}`} style={L ? undefined : { fontFamily: 'Unbounded, sans-serif' }}>{model.displayName}</h1>
              <p className={`text-xs ${t.muted}`}>Просмотр модели</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/models/${model.slug}`}
              target="_blank"
              className={L ? `${t.btnSecondary} px-4 py-2 text-sm` : 'flex items-center gap-2 rounded-lg bg-[#262626] px-4 py-2 text-sm text-gray-300 transition-all hover:bg-[#333]'}
            >
              <Eye className="w-4 h-4" />
              На сайте
            </Link>
            <Link
              href={`/dashboard/models/${model.id}/edit`}
              className={
                L
                  ? `${t.btnPrimary} gap-2 px-4 py-2 text-sm`
                  : 'flex items-center gap-2 rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-2 text-sm font-medium text-[#d4af37] transition-all hover:bg-[#d4af37]/20'
              }
            >
              <Edit className="h-4 w-4" />
              Редактировать
            </Link>
            <button
              type="button"
              onClick={handleDelete}
              className={L ? `${t.btnDanger} gap-2 px-4 py-2 text-sm` : 'flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400 transition-all hover:bg-red-500/20'}
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
            <div className={`${cardBox} sticky top-24`}>
              <div className="relative aspect-[3/4]">
                {model.mainPhotoUrl ? (
                  <img src={model.mainPhotoUrl} alt={model.displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className={`flex h-full w-full items-center justify-center ${L ? 'bg-[#f6f7f7]' : 'bg-[#0a0a0a]'}`}>
                    <div className="text-gray-700 text-6xl">👤</div>
                  </div>
                )}
                
                {/* Elite Badge */}
                {model.eliteStatus && (
                  <div className="absolute top-4 right-4 px-4 py-2 bg-gradient-to-r from-[#d4af37] to-[#f4d03f] text-black text-xs font-bold rounded-full shadow-lg">
                    👑 Элитная
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
              <div className={`flex justify-center gap-6 border-t p-4 ${L ? 'border-[#dcdcde]' : 'border-white/[0.06]'}`}>
                <div className="text-center">
                  <div className={`text-xl font-bold ${accent}`}>{model.photoCount || 0}</div>
                  <div className={`text-xs ${t.muted}`}>Фото</div>
                </div>
                <div className="text-center">
                  <div className={`text-xl font-bold ${accent}`}>{model.totalMeetings}</div>
                  <div className={`text-xs ${t.muted}`}>Встреч</div>
                </div>
                <div className="text-center">
                  <div className={`text-xl font-bold ${accent}`}>{Math.round(reliability)}%</div>
                  <div className={`text-xs ${t.muted}`}>Рейтинг</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Info */}
          <div className="col-span-7 space-y-6">
            {/* Header */}
            <div className={`${cardBox} p-6`}>
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className={`mb-2 text-3xl font-bold ${L ? 'text-[#1d2327]' : 'text-white'}`} style={L ? undefined : { fontFamily: 'Unbounded, sans-serif' }}>{model.displayName}</h2>
                  <div className={`flex items-center gap-4 text-sm ${t.muted}`}>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {physical.age ? `${physical.age} лет` : ''}
                    </span>
                    <span className={`flex items-center gap-1 ${accent}`}>
                      <Star className="h-4 w-4 fill-current" />
                      {reliability.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {model.eliteStatus && (
                    <span className="px-3 py-1 bg-gradient-to-r from-[#d4af37] to-[#f4d03f] text-black text-xs font-bold rounded-full">
                      Элитная
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
              <div className={`grid grid-cols-3 gap-4 border-t pt-4 ${L ? 'border-[#dcdcde]' : 'border-white/[0.06]'}`}>
                <div className="flex items-center gap-2 text-sm">
                  <Ruler className={`h-4 w-4 ${t.muted}`} />
                  <span className={L ? 'text-[#2c3338]' : 'text-gray-300'}>{physical.height || '---'} см</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Weight className={`h-4 w-4 ${t.muted}`} />
                  <span className={L ? 'text-[#2c3338]' : 'text-gray-300'}>{physical.weight || '---'} кг</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Heart className={`h-4 w-4 ${t.muted}`} />
                  <span className={L ? 'text-[#2c3338]' : 'text-gray-300'}>{physical.bustSize ? `${physical.bustSize} (${physical.bustType === 'natural' ? 'нат' : 'сил'})` : '---'}</span>
                </div>
              </div>
            </div>

            {model.biography && (
              <div className={`${cardBox} p-6`}>
                <h3 className={`mb-3 text-sm font-bold uppercase ${L ? 'text-[#1d2327]' : 'text-gray-400'}`} style={L ? undefined : { fontFamily: 'Unbounded, sans-serif' }}>Обо мне</h3>
                <p className={`text-sm leading-relaxed ${L ? 'text-[#2c3338]' : 'text-gray-300'}`} style={L ? undefined : { fontFamily: 'Inter, sans-serif' }}>{model.biography}</p>
              </div>
            )}

            {model.psychotypeTags && model.psychotypeTags.length > 0 && (
              <div className={`${cardBox} p-6`}>
                <h3 className={`mb-3 text-sm font-bold uppercase ${L ? 'text-[#1d2327]' : 'text-gray-400'}`} style={L ? undefined : { fontFamily: 'Unbounded, sans-serif' }}>Психотипы</h3>
                <div className="flex flex-wrap gap-2">
                  {model.psychotypeTags.map((tag: string, i: number) => (
                    <span
                      key={i}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${L ? 'border-[#c3c4c7] bg-[#f0f6fc] text-[#2271b1]' : 'border-[#d4af37]/20 bg-[#d4af37]/10 text-[#d4af37]'}`}
                      style={L ? undefined : { fontFamily: 'Inter, sans-serif' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Rates */}
            {(model.rateHourly || model.rateOvernight) && (
              <div className={`${cardBox} p-6`}>
                <h3 className={`mb-4 text-sm font-bold uppercase ${L ? 'text-[#1d2327]' : 'text-gray-400'}`} style={L ? undefined : { fontFamily: 'Unbounded, sans-serif' }}>Расценки</h3>
                <div className="space-y-3">
                  {model.rateHourly && (
                    <div className={`flex items-center justify-between border-b py-2 ${L ? 'border-[#dcdcde]' : 'border-white/[0.06]'}`}>
                      <span className={`text-sm ${t.muted}`} style={L ? undefined : { fontFamily: 'Inter, sans-serif' }}>1 час</span>
                      <span className={`text-lg font-bold ${accent}`} style={L ? undefined : { fontFamily: 'Inter, sans-serif' }}>{model.rateHourly.toLocaleString()} ₽</span>
                    </div>
                  )}
                  {model.rateOvernight && (
                    <div className="flex items-center justify-between py-2">
                      <span className={`text-sm ${t.muted}`} style={L ? undefined : { fontFamily: 'Inter, sans-serif' }}>Вся ночь</span>
                      <span className={`text-lg font-bold ${accent}`} style={L ? undefined : { fontFamily: 'Inter, sans-serif' }}>{model.rateOvernight.toLocaleString()} ₽</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className={`${cardBox} p-6`}>
              <h3 className={`mb-4 text-sm font-bold uppercase ${L ? 'text-[#1d2327]' : 'text-gray-400'}`} style={L ? undefined : { fontFamily: 'Unbounded, sans-serif' }}>Дополнительно</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className={`flex justify-between border-b py-2 ${L ? 'border-[#dcdcde]' : 'border-white/[0.06]'}`}>
                  <span className={t.muted} style={L ? undefined : { fontFamily: 'Inter, sans-serif' }}>Статус</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    model.isPublished ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {model.isPublished ? 'Опубликована' : 'Черновик'}
                  </span>
                </div>
                <div className={`flex justify-between border-b py-2 ${L ? 'border-[#dcdcde]' : 'border-white/[0.06]'}`}>
                  <span className={t.muted} style={L ? undefined : { fontFamily: 'Inter, sans-serif' }}>Создана</span>
                  <span className={L ? 'text-[#2c3338]' : 'text-gray-300'} style={L ? undefined : { fontFamily: 'Inter, sans-serif' }}>{new Date(model.createdAt).toLocaleDateString('ru-RU')}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className={t.muted} style={L ? undefined : { fontFamily: 'Inter, sans-serif' }}>Обновлена</span>
                  <span className={L ? 'text-[#2c3338]' : 'text-gray-300'} style={L ? undefined : { fontFamily: 'Inter, sans-serif' }}>{new Date(model.updatedAt).toLocaleDateString('ru-RU')}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className={t.muted} style={L ? undefined : { fontFamily: 'Inter, sans-serif' }}>URL</span>
                  <Link href={`/models/${model.slug}`} target="_blank" className={`${t.link} max-w-[150px] truncate`}>
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
