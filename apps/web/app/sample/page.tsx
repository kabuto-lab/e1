/**
 * Sample Page - Water Ripple Shader Test Lab
 * Interactive test area with mobile frame mockup
 */

'use client';

import WaterRippleShader from '@/components/WaterRippleShader';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { Upload, Check, RefreshCw, Play, Pause, MousePointer2 } from 'lucide-react';

const DEMO_IMAGES = [
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&h=1067&fit=crop',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&h=1067&fit=crop',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&h=1067&fit=crop',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&h=1067&fit=crop',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&h=1067&fit=crop',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&h=1067&fit=crop',
];

const MODEL_NAMES = ['Юлианна', 'Алина', 'Виктория', 'Екатерина', 'София', 'Анастасия'];
const MODEL_CITIES = ['22 года • Москва', '25 лет • СПб', '23 года • Казань', '24 года • Сочи', '21 год • Москва', '26 лет • СПб'];

export default function SamplePage() {
  const [currentImage, setCurrentImage] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const autoPlayIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [settings, setSettings] = useState({
    waveSpeed: 1.5,
    refraction: 0.03,
    specularPower: 50,
    specularIntensity: 0.4,
    waterTint: 0.15,
    aberration: 0.5,
    gradientStrength: 0.3,
    heightSensitivity: 0.15,
    brushSize: 0.04,
    brushForce: 0.8,
  });

  const handleRipple = (x: number, y: number) => {
    // Ripple is handled directly by the shader via mouse events
  };

  const updateSetting = (key: string, value: number) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const nextImage = () => {
    setCurrentImage((prev) => (prev + 1) % DEMO_IMAGES.length);
  };

  const prevImage = () => {
    setCurrentImage((prev) => (prev - 1 + DEMO_IMAGES.length) % DEMO_IMAGES.length);
  };

  const toggleAutoPlay = () => {
    if (isAutoPlaying) {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
        autoPlayIntervalRef.current = null;
      }
      setIsAutoPlaying(false);
    } else {
      autoPlayIntervalRef.current = setInterval(() => {
        setCurrentImage((prev) => (prev + 1) % DEMO_IMAGES.length);
      }, 3000);
      setIsAutoPlaying(true);
    }
  };

  const resetSettings = () => {
    setSettings({
      waveSpeed: 1.5,
      refraction: 0.03,
      specularPower: 50,
      specularIntensity: 0.4,
      waterTint: 0.15,
      aberration: 0.5,
      gradientStrength: 0.3,
      heightSensitivity: 0.15,
      brushSize: 0.04,
      brushForce: 0.8,
    });
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsMouseDown(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  useEffect(() => {
    return () => {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 px-6 py-4 flex justify-between items-center border-b border-[#1a1a1a] bg-[#0a0a0a]">
        <Link
          href="/"
          className="text-2xl font-black bg-gradient-to-r from-[#d4af37] via-[#f4d03f] to-[#d4af37] bg-clip-text text-transparent hover:opacity-80 transition-opacity"
          style={{ fontFamily: 'Unbounded, sans-serif' }}
        >
          Lov<span className="text-[#d4af37]">nge</span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/" className="text-sm font-medium text-gray-400 hover:text-[#d4af37] transition-colors font-inter">Home</Link>
          <Link href="/models" className="text-sm font-medium text-gray-400 hover:text-[#d4af37] transition-colors font-inter">Каталог</Link>
          <Link href="/dashboard" className="text-sm font-medium text-gray-400 hover:text-[#d4af37] transition-colors font-inter">Dashboard</Link>
          <span className="text-xs text-[#d4af37] font-mono px-3 py-1 bg-[#d4af37]/10 rounded-full border border-[#d4af37]/20">
            Shader Test Lab
          </span>
        </nav>
      </header>

      {/* Main Content - Fixed Height */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT - Phone Preview with Fixed Position */}
        <div className="flex-1 flex items-center justify-center relative bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a]">
          {/* Phone Frame */}
          <div className="relative" style={{ transform: 'scale(1.1)' }}>
            <div className="relative border-[4px] border-[#2a2a2a] rounded-[2.5rem] overflow-hidden bg-[#0a0a0a] shadow-2xl shadow-[#d4af37]/10" style={{ width: '340px', height: '680px' }}>
              {/* Status Bar */}
              <div className="h-8 bg-[#1a1a1a] flex items-center justify-between px-5 flex-shrink-0 z-10 relative">
                <span className="text-[11px] text-gray-500 font-medium">9:41</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-gray-600" />
                  <div className="w-2 h-2 rounded-sm border border-gray-600 bg-gray-700" />
                </div>
              </div>

              {/* Water Ripple Shader */}
              <div className="relative" style={{ height: 'calc(100% - 32px)' }}>
                <WaterRippleShader
                  imageUrl={DEMO_IMAGES[currentImage]}
                  onRipple={handleRipple}
                  settings={settings}
                  className="cursor-crosshair"
                />

                {/* Profile Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none">
                  <div className="flex items-end justify-between">
                    <div>
                      <h3 className="text-white font-bold text-lg font-unbounded">
                        {MODEL_NAMES[currentImage]}
                      </h3>
                      <p className="text-gray-400 text-xs mt-1 font-inter">
                        {MODEL_CITIES[currentImage]}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-500">
                        <span>💎 Elite</span>
                        <span>•</span>
                        <span>⭐ 4.9</span>
                      </div>
                    </div>
                    {/* Online Status */}
                    <div className="absolute bottom-4 right-4 flex items-center gap-1.5 px-2.5 py-1.5 bg-black/80 rounded-full backdrop-blur-sm">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-white text-[10px] font-medium">Online</span>
                    </div>
                  </div>
                </div>

                {/* Image Counter */}
                <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full text-[10px] text-white font-mono border border-white/10">
                  {currentImage + 1} / {DEMO_IMAGES.length}
                </div>

                {/* Hint Overlay */}
                <div className="absolute top-3 left-3 px-2.5 py-1.5 bg-black/60 backdrop-blur-sm rounded-full text-[10px] text-gray-300 flex items-center gap-1.5 border border-white/10 pointer-events-none">
                  <MousePointer2 className="w-3 h-3" />
                  <span>Move mouse to create ripples</span>
                </div>
              </div>
            </div>

            {/* Phone Stand */}
            <div className="mx-auto mt-6 w-28 h-2.5 bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] rounded-full shadow-lg" />
            <div className="mx-auto -mt-1 w-20 h-1.5 bg-[#1a1a1a] rounded-full" />
          </div>
        </div>

        {/* RIGHT - Settings Panel */}
        <div className="w-[400px] flex-shrink-0 border-l border-[#1a1a1a] bg-[#0a0a0a] overflow-y-auto">
          <div className="p-5 space-y-5">
            {/* Title */}
            <div>
              <h1 className="text-xl font-black text-white mb-1 font-unbounded">
                💧 Shader Lab
              </h1>
              <p className="text-xs text-gray-400 font-inter">
                Adjust settings in real-time
              </p>
            </div>

            {/* Image Selector */}
            <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2 font-inter">
                  <Upload className="w-3.5 h-3.5" />
                  Test Image
                </h2>
                <button
                  onClick={toggleAutoPlay}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 transition-all font-inter ${
                    isAutoPlaying
                      ? 'bg-[#d4af37] text-black'
                      : 'bg-[#333] text-gray-400 hover:bg-[#444]'
                  }`}
                >
                  {isAutoPlaying ? <><Pause className="w-2.5 h-2.5" /> Auto</> : <><Play className="w-2.5 h-2.5" /> Auto</>}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {DEMO_IMAGES.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImage(idx)}
                    className={`relative aspect-[3/4] rounded-md overflow-hidden border-2 transition-all ${
                      currentImage === idx
                        ? 'border-[#d4af37] scale-105'
                        : 'border-[#333] hover:border-[#555]'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    {currentImage === idx && (
                      <div className="absolute inset-0 bg-[#d4af37]/20 flex items-center justify-center">
                        <Check className="w-4 h-4 text-[#d4af37]" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between mt-3">
                <button onClick={prevImage} className="px-2.5 py-1.5 bg-[#333] hover:bg-[#444] rounded-lg text-[10px] text-white transition-all font-inter">
                  ◀ Prev
                </button>
                <button onClick={resetSettings} className="px-2.5 py-1.5 bg-[#333] hover:bg-[#444] rounded-lg text-[10px] text-white transition-all flex items-center gap-1.5 font-inter">
                  <RefreshCw className="w-2.5 h-2.5" /> Reset
                </button>
                <button onClick={nextImage} className="px-2.5 py-1.5 bg-[#333] hover:bg-[#444] rounded-lg text-[10px] text-white transition-all font-inter">
                  Next ▶
                </button>
              </div>
            </div>

            {/* Wave Physics */}
            <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4">
              <h2 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2 font-inter">
                <span>🌊</span> Wave Physics
              </h2>
              <div className="space-y-3">
                <Slider label="Wave Speed" value={settings.waveSpeed} min={0.5} max={3} step={0.05} onChange={(v) => updateSetting('waveSpeed', v)} />
                <Slider label="Refraction" value={settings.refraction} min={0.01} max={0.15} step={0.005} onChange={(v) => updateSetting('refraction', v)} />
                <Slider label="Brush Size" value={settings.brushSize} min={0.01} max={0.15} step={0.005} onChange={(v) => updateSetting('brushSize', v)} />
                <Slider label="Brush Force" value={settings.brushForce} min={0.1} max={3} step={0.1} onChange={(v) => updateSetting('brushForce', v)} />
              </div>
            </div>

            {/* Visual Effects */}
            <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4">
              <h2 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2 font-inter">
                <span>✨</span> Visual Effects
              </h2>
              <div className="space-y-3">
                <Slider label="Specular Power" value={settings.specularPower} min={10} max={100} step={5} onChange={(v) => updateSetting('specularPower', v)} />
                <Slider label="Specular Intensity" value={settings.specularIntensity} min={0} max={1} step={0.05} onChange={(v) => updateSetting('specularIntensity', v)} />
                <Slider label="Water Tint" value={settings.waterTint} min={0} max={0.5} step={0.05} onChange={(v) => updateSetting('waterTint', v)} />
                <Slider label="Aberration" value={settings.aberration} min={0} max={1} step={0.05} onChange={(v) => updateSetting('aberration', v)} />
                <Slider label="Gradient Strength" value={settings.gradientStrength} min={0} max={1} step={0.05} onChange={(v) => updateSetting('gradientStrength', v)} />
                <Slider label="Height Sensitivity" value={settings.heightSensitivity} min={0} max={0.5} step={0.01} onChange={(v) => updateSetting('heightSensitivity', v)} />
              </div>
            </div>

            {/* Usage */}
            <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4">
              <h2 className="text-xs font-bold text-gray-400 uppercase mb-3 font-inter">📦 Usage</h2>
              <pre className="bg-[#0a0a0a] rounded-lg p-2.5 text-[9px] text-gray-400 overflow-x-auto font-mono leading-tight">
{`<WaterRippleShader
  imageUrl="/photo.jpg"
  settings={{
    waveSpeed: ${settings.waveSpeed.toFixed(1)},
    refraction: ${settings.refraction.toFixed(2)},
    brushSize: ${settings.brushSize.toFixed(2)},
  }}
/>`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Slider Component
function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  const displayValue = value < 1 ? value.toFixed(step < 0.01 ? 3 : 2) : value.toFixed(0);
  return (
    <div>
      <div className="flex justify-between mb-1">
        <label className="text-[10px] text-gray-400 font-inter">{label}</label>
        <span className="text-[10px] text-[#d4af37] font-mono">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-[#333] rounded-lg appearance-none cursor-pointer accent-[#d4af37]"
      />
    </div>
  );
}
