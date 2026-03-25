/**
 * Simple Image Slider
 * Clean slider without water ripple effects
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const SLIDES = [
  { id: '1', name: 'Юлианна', age: 22, tier: 'VIP', location: 'Москва', image: '/images_tst/photo-1544005313-94ddf0286df2.jpg' },
  { id: '2', name: 'Виктория', age: 25, tier: 'Elite', location: 'Санкт-Петербург', image: '/images_tst/photo-1534528741775-53994a69daeb.jpg' },
  { id: '3', name: 'Алина', age: 23, tier: 'Premium', location: 'Москва', image: '/images_tst/photo-1524504388940-b1c1722653e1.jpg' },
  { id: '4', name: 'София', age: 24, tier: 'VIP', location: 'Дубай', image: '/images_tst/photo-1531746020798-e6953c6e8e04.jpg' },
  { id: '5', name: 'Наталья', age: 27, tier: 'Elite', location: 'Москва', image: '/images_tst/photo-1529626455594-4ff0802cfb7e.jpg' },
];

export default function SimpleSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Autoplay
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
      setProgress(0);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Progress bar
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0;
        return prev + 100 / (4000 / 50);
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setProgress(0);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    setProgress(0);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
    setProgress(0);
  };

  return (
    <>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-8 py-6 flex justify-between items-center bg-gradient-to-b from-[#0a0a0a]/90 to-transparent pointer-events-none">
        <Link href="/" className="text-3xl font-black bg-gradient-to-r from-[#d4af37] via-[#f4d03f] to-[#d4af37] bg-clip-text text-transparent pointer-events-auto hover:opacity-80 transition-opacity" style={{ fontFamily: 'Unbounded, sans-serif' }}>
          Lov<span className="text-[#d4af37]">nge</span>
        </Link>
        <nav className="flex items-center gap-8 pointer-events-auto">
          <Link href="/models" className="text-lg font-medium text-white/90 hover:text-[#d4af37] transition-colors" style={{ fontFamily: 'Inter, sans-serif' }}>
            Каталог
          </Link>
          <Link href="/sample" className="text-lg font-medium text-white/90 hover:text-[#d4af37] transition-colors" style={{ fontFamily: 'Inter, sans-serif' }}>
            Sample
          </Link>
          <Link href="/login" className="px-6 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#b8941f] text-black font-semibold rounded-lg hover:shadow-lg hover:shadow-[#d4af37]/30 transition-all text-base" style={{ fontFamily: 'Inter, sans-serif' }}>
            Войти
          </Link>
        </nav>
      </header>

      {/* Slider Container */}
      <div className="relative w-full h-screen overflow-hidden bg-[#0a0a0a]">
        {/* Current Slide Image - Background */}
        {SLIDES.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ pointerEvents: 'none' }}
          >
            {/* Image with object-fit: cover behavior */}
            <div
              className="w-full h-full"
              style={{
                backgroundImage: `url(${slide.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
              onLoad={() => setLoaded(true)}
            />

            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
          </div>
        ))}

        {/* Slide Info */}
        <div className="absolute bottom-32 left-16 z-20 max-w-xl pointer-events-none">
          <span className="inline-block px-4 py-2 bg-gradient-to-r from-[#d4af37] to-[#b8941f] text-black text-xs font-bold rounded-full uppercase tracking-widest mb-4 shadow-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
            {SLIDES[currentSlide].tier}
          </span>
          <h1 className="text-7xl font-black text-white mb-3 leading-tight drop-shadow-2xl" style={{ fontFamily: 'Unbounded, sans-serif' }}>
            {SLIDES[currentSlide].name}
          </h1>
          <p className="text-xl text-white/80 font-light" style={{ fontFamily: 'Inter, sans-serif' }}>
            {SLIDES[currentSlide].age} лет • {SLIDES[currentSlide].location}
          </p>
        </div>

        {/* Controls */}
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-8">
          <div className="flex gap-4">
            <button
              onClick={prevSlide}
              className="w-14 h-14 border border-[#d4af37]/30 bg-[#d4af37]/5 rounded-full flex items-center justify-center text-[#d4af37] text-xl hover:bg-[#d4af37]/20 hover:border-[#d4af37]/60 hover:scale-105 transition-all backdrop-blur-sm"
            >
              ◀
            </button>
            <button
              onClick={nextSlide}
              className="w-14 h-14 border border-[#d4af37]/30 bg-[#d4af37]/5 rounded-full flex items-center justify-center text-[#d4af37] text-xl hover:bg-[#d4af37]/20 hover:border-[#d4af37]/60 hover:scale-105 transition-all backdrop-blur-sm"
            >
              ▶
            </button>
          </div>

          <div className="flex gap-3">
            {SLIDES.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full border-2 border-[#d4af37]/30 transition-all ${
                  index === currentSlide ? 'bg-[#d4af37] border-[#d4af37] scale-125' : 'bg-[#d4af37]/20 hover:bg-[#d4af37]/40'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#d4af37]/10 z-20">
          <div
            className="h-full bg-gradient-to-r from-[#d4af37] to-[#f4d03f] transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Features Section */}
      <section className="py-24 px-8 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-black text-center text-white mb-16" style={{ fontFamily: 'Unbounded, sans-serif' }}>
            Почему выбирают нас
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { icon: '👩‍🦰', title: 'Анкеты моделей', desc: 'Премиальный каталог с верификацией' },
              { icon: '🔒', title: 'Безопасная сделка', desc: 'Эскроу платежи и гарантии' },
              { icon: '⭐', title: 'Рейтинги', desc: 'Проверенные отзывы клиентов' },
              { icon: '💎', title: 'Конфиденциальность', desc: 'Полная анонимность данных' },
            ].map((feature, i) => (
              <div key={i} className="p-6 bg-[#1a1a1a]/50 border border-[#333] rounded-2xl hover:border-[#d4af37]/30 transition-all group">
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#d4af37] transition-colors" style={{ fontFamily: 'Unbounded, sans-serif' }}>
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
