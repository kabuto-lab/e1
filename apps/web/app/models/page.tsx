'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Типы
interface ModelProfile {
  id: string;
  displayName: string;
  slug: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  eliteStatus: boolean;
  availabilityStatus: 'offline' | 'online' | 'in_shift' | 'busy';
  rateHourly: string | null;
  rateOvernight: string | null;
  psychotypeTags: string[] | null;
  languages: string[] | null;
  physicalAttributes: {
    age?: number;
    height?: number;
    weight?: number;
    bustSize?: number;
    bustType?: 'natural' | 'silicone';
    bodyType?: 'slim' | 'curvy' | 'bbw' | 'pear' | 'fit';
    temperament?: 'gentle' | 'active' | 'adaptable';
    sexuality?: 'active' | 'passive' | 'universal';
  } | null;
  ratingReliability: string;
  totalMeetings: number;
  photoCount: number;
  videoWalkthroughUrl: string | null;
  createdAt: string;
}

interface Filters {
  availabilityStatus: string;
  verificationStatus: string;
  eliteStatus: boolean;
  orderBy: 'rating' | 'createdAt' | 'displayName';
  order: 'asc' | 'desc';
  limit: number;
  offset: number;
}

export default function ModelsPage() {
  const router = useRouter();
  const [models, setModels] = useState<ModelProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, online: 0, verified: 0, elite: 0 });
  
  // Фильтры
  const [filters, setFilters] = useState<Filters>({
    availabilityStatus: '',
    verificationStatus: '',
    eliteStatus: false,
    orderBy: 'rating',
    order: 'desc',
    limit: 20,
    offset: 0,
  });

  // Загрузка каталога
  const loadModels = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.availabilityStatus) params.append('availabilityStatus', filters.availabilityStatus);
      if (filters.verificationStatus) params.append('verificationStatus', filters.verificationStatus);
      if (filters.eliteStatus) params.append('eliteStatus', 'true');
      if (filters.orderBy) params.append('orderBy', filters.orderBy);
      if (filters.order) params.append('order', filters.order);
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/models?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Models loaded:', data);
        setModels(data);
      } else {
        console.error('Failed to load models, status:', response.status);
      }

      // Загрузка статистики
      const statsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/models/stats`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        console.log('Stats loaded:', statsData);
        setStats(statsData);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModels();
  }, [filters]);

  // Обработчики фильтров
  const handleFilterChange = (key: keyof Filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Статус доступности (цвет)
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#22c55e';
      case 'in_shift': return '#eab308';
      case 'busy': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Свободна';
      case 'in_shift': return 'В смене';
      case 'busy': return 'Занята';
      default: return 'Оффлайн';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)',
      padding: '0 0 60px 0',
    }}>
      {/* Header */}
      <header style={{
        background: 'rgba(26, 26, 26, 0.8)',
        borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
        padding: '20px 40px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Link href="/" style={{
            fontSize: '28px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textDecoration: 'none',
            letterSpacing: '-0.02em',
          }}>
            Lovnge
          </Link>
          
          <nav style={{ display: 'flex', gap: '24px' }}>
            <Link href="/" style={{
              color: '#a0a0a0',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.target as HTMLAnchorElement).style.color = '#d4af37'}
            onMouseLeave={(e) => (e.target as HTMLAnchorElement).style.color = '#a0a0a0'}
            >
              Главная
            </Link>
            <Link href="/dashboard" style={{
              color: '#a0a0a0',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.target as HTMLAnchorElement).style.color = '#d4af37'}
            onMouseLeave={(e) => (e.target as HTMLAnchorElement).style.color = '#a0a0a0'}
            >
              Дэшборд
            </Link>
            <Link href="/models" style={{
              color: '#d4af37',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
            }}>
              Каталог
            </Link>
          </nav>
        </div>
      </header>

      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '40px 20px',
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        gap: '40px',
      }}>
        {/* Sidebar с фильтрами */}
        <aside style={{
          background: 'rgba(26, 26, 26, 0.5)',
          borderRadius: '12px',
          border: '1px solid rgba(212, 175, 55, 0.1)',
          padding: '24px',
          height: 'fit-content',
          position: 'sticky',
          top: '100px',
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#e0e0e0',
            marginBottom: '24px',
            paddingBottom: '16px',
            borderBottom: '1px solid rgba(212, 175, 55, 0.1)',
          }}>
            Фильтры
          </h2>

          {/* Статистика */}
          <div style={{
            marginBottom: '24px',
            padding: '16px',
            background: 'rgba(212, 175, 55, 0.05)',
            borderRadius: '8px',
          }}>
            <div style={{ fontSize: '13px', color: '#6b6b6b', marginBottom: '8px' }}>Всего анкет</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#d4af37' }}>{stats.total}</div>
            <div style={{ fontSize: '12px', color: '#6b6b6b', marginTop: '8px' }}>
              <span style={{ color: '#22c55e' }}>●</span> Онлайн: {stats.online} | 
              <span style={{ color: '#d4af37' }}>●</span> VIP: {stats.elite}
            </div>
          </div>

          {/* Доступность */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '500',
              color: '#a0a0a0',
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Статус
            </label>
            <select
              value={filters.availabilityStatus}
              onChange={(e) => handleFilterChange('availabilityStatus', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(10, 10, 10, 0.5)',
                border: '1px solid rgba(212, 175, 55, 0.2)',
                borderRadius: '8px',
                color: '#e0e0e0',
                fontSize: '14px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="">Все</option>
              <option value="online">Свободна</option>
              <option value="in_shift">В смене</option>
              <option value="busy">Занята</option>
              <option value="offline">Оффлайн</option>
            </select>
          </div>

          {/* Верификация */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '500',
              color: '#a0a0a0',
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Статус проверки
            </label>
            <select
              value={filters.verificationStatus}
              onChange={(e) => handleFilterChange('verificationStatus', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(10, 10, 10, 0.5)',
                border: '1px solid rgba(212, 175, 55, 0.2)',
                borderRadius: '8px',
                color: '#e0e0e0',
                fontSize: '14px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="">Все</option>
              <option value="verified">Проверена ✓</option>
              <option value="pending">На проверке</option>
              <option value="rejected">Отклонена</option>
            </select>
          </div>

          {/* Elite только */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={filters.eliteStatus}
                onChange={(e) => handleFilterChange('eliteStatus', e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  accentColor: '#d4af37',
                  cursor: 'pointer',
                }}
              />
              <span style={{ fontSize: '14px', color: '#e0e0e0' }}>Только Elite 👑</span>
            </label>
          </div>

          {/* Сортировка */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '500',
              color: '#a0a0a0',
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Сортировка
            </label>
            <select
              value={filters.orderBy}
              onChange={(e) => handleFilterChange('orderBy', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(10, 10, 10, 0.5)',
                border: '1px solid rgba(212, 175, 55, 0.2)',
                borderRadius: '8px',
                color: '#e0e0e0',
                fontSize: '14px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="rating">По рейтингу</option>
              <option value="createdAt">По новизне</option>
              <option value="displayName">По имени</option>
            </select>
          </div>

          {/* Порядок */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '500',
              color: '#a0a0a0',
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Порядок
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleFilterChange('order', 'desc')}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: filters.order === 'desc' 
                    ? 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)' 
                    : 'rgba(212, 175, 55, 0.1)',
                  border: 'none',
                  borderRadius: '6px',
                  color: filters.order === 'desc' ? '#0a0a0a' : '#a0a0a0',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                ↓ Убыв.
              </button>
              <button
                onClick={() => handleFilterChange('order', 'asc')}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: filters.order === 'asc' 
                    ? 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)' 
                    : 'rgba(212, 175, 55, 0.1)',
                  border: 'none',
                  borderRadius: '6px',
                  color: filters.order === 'asc' ? '#0a0a0a' : '#a0a0a0',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                ↑ Возр.
              </button>
            </div>
          </div>

          {/* Сбросить фильтры */}
          <button
            onClick={() => setFilters({
              availabilityStatus: '',
              verificationStatus: '',
              eliteStatus: false,
              orderBy: 'rating',
              order: 'desc',
              limit: 20,
              offset: 0,
            })}
            style={{
              width: '100%',
              padding: '12px',
              background: 'transparent',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#ef4444',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = 'rgba(239, 68, 68, 0.1)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            Сбросить фильтры
          </button>
        </aside>

        {/* Каталог */}
        <main>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px',
          }}>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#e0e0e0',
            }}>
              Каталог моделей
            </h1>
            <div style={{
              fontSize: '14px',
              color: '#6b6b6b',
            }}>
              Показано: {models.length} из {stats.total}
            </div>
          </div>

          {/* Сетка карточек */}
          {loading ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '24px',
            }}>
              {[...Array(8)].map((_, i) => (
                <div key={i} style={{
                  background: 'rgba(26, 26, 26, 0.5)',
                  borderRadius: '12px',
                  border: '1px solid rgba(212, 175, 55, 0.1)',
                  padding: '20px',
                  animation: 'pulse 1.5s infinite',
                }}>
                  <div style={{
                    width: '100%',
                    height: '320px',
                    background: 'rgba(212, 175, 55, 0.05)',
                    borderRadius: '8px',
                    marginBottom: '16px',
                  }} />
                  <div style={{ height: '20px', width: '80%', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginBottom: '8px' }} />
                  <div style={{ height: '16px', width: '60%', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
                </div>
              ))}
            </div>
          ) : models.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '80px 20px',
              background: 'rgba(26, 26, 26, 0.5)',
              borderRadius: '12px',
              border: '1px solid rgba(212, 175, 55, 0.1)',
            }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔍</div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#e0e0e0', marginBottom: '8px' }}>
                Ничего не найдено
              </h3>
              <p style={{ fontSize: '14px', color: '#6b6b6b' }}>
                Попробуйте изменить параметры фильтров
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '24px',
            }}>
              {models.map((model) => (
                <ModelCard key={model.id} model={model} getStatusColor={getStatusColor} getStatusText={getStatusText} />
              ))}
            </div>
          )}
        </main>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

// Карточка модели
// Sample images for hover grid preview (using placeholder images)
const SAMPLE_IMAGES = [
  'photo-1544005313-94ddf0286df2.jpg',
  'photo-1534528741775-53994a69daeb.jpg',
  'photo-1524504388940-b1c1722653e1.jpg',
  'photo-1529626455594-4ff0802cfb7e.jpg',
  'photo-1531746020798-e6953c6e8e04.jpg',
  'photo-1488426862026-3ee34a7d66df.jpg',
  'photo-1517841905240-472988babdf9.jpg',
  '2.jpg',
  '30108e568dc2e23a67ba45329b35bc85242d9ed6.jpg',
  '4464dec9a2ea16249b4dbe8c40dacf7098429432.jpg',
  '5954164844e194f4b7a67ba5802ce88095c88b81.jpg',
  '7b2d2cb5da64492370db796c7614009426171252.jpg',
];

function ModelCard({
  model,
  getStatusColor,
  getStatusText
}: {
  model: ModelProfile;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
}) {
  const router = useRouter();
  const [activeSegment, setActiveSegment] = useState<number | null>(null);

  const physical = model.physicalAttributes || {};
  const reliability = parseFloat(model.ratingReliability || '0');

  // Get preview image for segment
  const getPreviewImage = (segmentIndex: number) => {
    const imageIndex = segmentIndex % SAMPLE_IMAGES.length;
    return `/images_tst/${SAMPLE_IMAGES[imageIndex]}`;
  };

  return (
    <article
      onClick={() => router.push(`/models/${model.slug || model.id}`)}
      style={{
        background: 'rgba(26, 26, 26, 0.5)',
        borderRadius: '12px',
        border: `1px solid ${model.eliteStatus ? 'rgba(212, 175, 55, 0.4)' : 'rgba(212, 175, 55, 0.1)'}`,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.3s',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-8px)';
        e.currentTarget.style.borderColor = model.eliteStatus ? 'rgba(212, 175, 55, 0.6)' : 'rgba(212, 175, 55, 0.3)';
        e.currentTarget.style.boxShadow = '0 20px 40px -10px rgba(212, 175, 55, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = model.eliteStatus ? 'rgba(212, 175, 55, 0.4)' : 'rgba(212, 175, 55, 0.1)';
        e.currentTarget.style.boxShadow = 'none';
        setActiveSegment(null);
      }}
    >
      {/* Elite бейдж */}
      {model.eliteStatus && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
          color: '#0a0a0a',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '700',
          zIndex: 10,
          boxShadow: '0 4px 12px rgba(212, 175, 55, 0.4)',
        }}>
          👑 Elite
        </div>
      )}

      {/* Фото модели с 3x4 hover grid */}
      <div style={{
        width: '100%',
        height: '320px',
        background: `linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(26, 26, 26, 0.5) 100%)`,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Main image or preview based on hover */}
        {model.mainPhotoUrl ? (
          <img
            src={activeSegment !== null ? getPreviewImage(activeSegment) : model.mainPhotoUrl}
            alt={model.displayName}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              position: 'absolute',
              top: 0,
              left: 0,
              transition: 'opacity 0.15s ease',
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallback = target.parentElement?.querySelector('.image-fallback');
              if (fallback) {
                (fallback as HTMLDivElement).style.display = 'flex';
              }
            }}
          />
        ) : (
          <img
            src={activeSegment !== null ? getPreviewImage(activeSegment) : undefined}
            alt="Preview"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              position: 'absolute',
              top: 0,
              left: 0,
              display: activeSegment !== null ? 'block' : 'none',
            }}
          />
        )}

        {/* Fallback placeholder */}
        <div
          className="image-fallback"
          style={{
            width: '100%',
            height: '100%',
            display: model.mainPhotoUrl && activeSegment === null ? 'none' : (activeSegment !== null ? 'none' : 'flex'),
            alignItems: 'center',
            justifyContent: 'center',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          <div style={{ fontSize: '64px', opacity: 0.3 }}>👤</div>
        </div>

        {/* 3x4 Hover Grid Overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: 'repeat(4, 1fr)',
          gap: '1px',
          zIndex: 10,
        }}>
          {Array.from({ length: 12 }).map((_, index) => (
            <div
              key={index}
              onMouseEnter={() => setActiveSegment(index)}
              onMouseLeave={() => setActiveSegment(null)}
              style={{
                background: 'rgba(212, 175, 55, 0)',
                border: '1px solid rgba(212, 175, 55, 0)',
                cursor: 'crosshair',
                transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => {
                (e.target as HTMLDivElement).style.background = 'rgba(212, 175, 55, 0.15)';
                (e.target as HTMLDivElement).style.borderColor = 'rgba(212, 175, 55, 0.5)';
              }}
              onMouseOut={(e) => {
                (e.target as HTMLDivElement).style.background = 'rgba(212, 175, 55, 0)';
                (e.target as HTMLDivElement).style.borderColor = 'rgba(212, 175, 55, 0)';
              }}
            >
              {/* Segment number (subtle) */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '10px',
                fontWeight: '700',
                color: 'rgba(212, 175, 55, 0)',
                transition: 'color 0.15s ease',
                pointerEvents: 'none',
              }}>
                {index + 1}
              </div>
            </div>
          ))}
        </div>

        {/* Status and badges */}
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          background: 'rgba(10, 10, 10, 0.8)',
          borderRadius: '20px',
          backdropFilter: 'blur(4px)',
          zIndex: 20,
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: getStatusColor(model.availabilityStatus),
            boxShadow: `0 0 10px ${getStatusColor(model.availabilityStatus)}`,
          }} />
          <span style={{
            fontSize: '12px',
            fontWeight: '500',
            color: '#e0e0e0',
          }}>
            {getStatusText(model.availabilityStatus)}
          </span>
        </div>

        {/* Verification Badge */}
        {model.verificationStatus === 'verified' && (
          <div style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            background: 'rgba(34, 197, 94, 0.9)',
            color: '#fff',
            padding: '6px 10px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            zIndex: 20,
          }}>
            ✓ Проверена
          </div>
        )}
      </div>

      {/* Контент карточки */}
      <div style={{ padding: '20px' }}>
        {/* Имя */}
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#e0e0e0',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          {model.displayName}
          {model.verificationStatus === 'verified' && (
            <span style={{ color: '#22c55e', fontSize: '16px' }}>✓</span>
          )}
        </h3>

        {/* Параметры */}
        <div style={{
          display: 'flex',
          gap: '16px',
          fontSize: '13px',
          color: '#6b6b6b',
          marginBottom: '16px',
        }}>
          {physical.age && <span>{physical.age} лет</span>}
          {physical.height && <span>{physical.height} см</span>}
          {physical.weight && <span>{physical.weight} кг</span>}
        </div>

        {/* Психотипы */}
        {model.psychotypeTags && model.psychotypeTags.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            marginBottom: '16px',
          }}>
            {model.psychotypeTags.slice(0, 3).map((tag: string, i: number) => (
              <span key={i} style={{
                padding: '4px 10px',
                background: 'rgba(212, 175, 55, 0.1)',
                border: '1px solid rgba(212, 175, 55, 0.2)',
                borderRadius: '12px',
                fontSize: '11px',
                color: '#d4af37',
                fontWeight: '500',
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Рейтинг и встречи */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '16px',
          borderTop: '1px solid rgba(212, 175, 55, 0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: `conic-gradient(#d4af37 ${reliability * 3.6}deg, rgba(212, 175, 55, 0.1) 0deg)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: '700',
              color: '#d4af37',
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#1a1a1a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {Math.round(reliability)}
              </div>
            </div>
            <span style={{ fontSize: '12px', color: '#6b6b6b' }}>надёжность</span>
          </div>
          <div style={{ fontSize: '12px', color: '#6b6b6b' }}>
            {model.totalMeetings} встреч
          </div>
        </div>

        {/* Цена (если есть) */}
        {model.rateHourly && (
          <div style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(212, 175, 55, 0.1)',
            textAlign: 'center',
          }}>
            <span style={{
              fontSize: '18px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {model.rateHourly} ₽/час
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
