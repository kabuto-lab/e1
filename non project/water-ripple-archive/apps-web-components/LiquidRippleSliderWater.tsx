/**
 * Liquid Ripple - SIMPLE WATER EFFECT
 * Working water ripple effect with proper error handling
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import Link from 'next/link';

const SLIDES = [
  { id: '1', name: 'Юлианна', age: 22, tier: 'VIP', location: 'Москва', image: '/images_tst/photo-1544005313-94ddf0286df2.jpg' },
  { id: '2', name: 'Виктория', age: 25, tier: 'Elite', location: 'Санкт-Петербург', image: '/images_tst/photo-1534528741775-53994a69daeb.jpg' },
  { id: '3', name: 'Алина', age: 23, tier: 'Premium', location: 'Москва', image: '/images_tst/photo-1524504388940-b1c1722653e1.jpg' },
  { id: '4', name: 'София', age: 24, tier: 'VIP', location: 'Дубай', image: '/images_tst/photo-1531746020798-e6953c6e8e04.jpg' },
  { id: '5', name: 'Наталья', age: 27, tier: 'Elite', location: 'Москва', image: '/images_tst/photo-1529626455594-4ff0802cfb7e.jpg' },
];

// Simple ripple simulation
class RippleSim {
  width: number;
  height: number;
  buffer1: Float32Array;
  buffer2: Float32Array;
  current: Float32Array;
  previous: Float32Array;
  damping: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.buffer1 = new Float32Array(width * height);
    this.buffer2 = new Float32Array(width * height);
    this.current = this.buffer1;
    this.previous = this.buffer2;
    this.damping = 0.96;
  }

  addRipple(x: number, y: number, strength: number) {
    const px = Math.floor(x * this.width);
    const py = Math.floor(y * this.height);
    const r = 3;
    
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = px + dx;
        const ny = py + dy;
        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < r) {
            this.current[ny * this.width + nx] += strength * (1 - dist / r);
          }
        }
      }
    }
  }

  update() {
    const temp = this.previous;
    this.previous = this.current;
    this.current = temp;

    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const idx = y * this.width + x;
        const value = (
          this.current[idx - 1] +
          this.current[idx + 1] +
          this.current[idx - this.width] +
          this.current[idx + this.width]
        ) / 2 - this.previous[idx];
        
        this.previous[idx] = value * this.damping;
      }
    }

    return this.previous;
  }
}

export default function SimpleWaterSlider() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const rippleSimRef = useRef<RippleSim | null>(null);
  const rippleTextureRef = useRef<THREE.DataTexture | null>(null);
  const texturesRef = useRef<THREE.Texture[]>([]);
  
  const autoPlayRef = useRef<NodeJS.Timeout>(undefined);
  const animationIdRef = useRef<number>(undefined);
  const mouseRef = useRef({ x: 0.5, y: 0.5, down: false });

  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      const canvas = canvasRef.current;
      
      // Scene
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // Camera
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 1;
      cameraRef.current = camera;

      // Renderer
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      rendererRef.current = renderer;

      // Ripple simulation
      const simWidth = 256;
      const simHeight = 256;
      const rippleSim = new RippleSim(simWidth, simHeight);
      rippleSimRef.current = rippleSim;

      // Ripple texture
      const rippleData = new Uint8Array(simWidth * simHeight * 4);
      const rippleTexture = new THREE.DataTexture(rippleData, simWidth, simHeight, THREE.RGBAFormat);
      rippleTexture.minFilter = THREE.LinearFilter;
      rippleTexture.magFilter = THREE.LinearFilter;
      rippleTexture.needsUpdate = true;
      rippleTextureRef.current = rippleTexture;

      // Load images
      const loader = new THREE.TextureLoader();
      texturesRef.current = SLIDES.map(slide => {
        const texture = loader.load(slide.image);
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        return texture;
      });

      // Shader material
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uImage: { value: texturesRef.current[0] },
          uRipple: { value: rippleTexture },
          uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D uImage;
          uniform sampler2D uRipple;
          uniform vec2 uResolution;
          varying vec2 vUv;

          void main() {
            vec4 ripple = texture2D(uRipple, vUv);
            float height = ripple.r * 0.03;
            
            vec2 uv = vUv + vec2(height);
            vec3 color = texture2D(uImage, uv).rgb;
            
            // Brightness from wave height
            color += ripple.r * 0.3;
            
            gl_FragColor = vec4(color, 1.0);
          }
        `,
      });
      materialRef.current = material;

      // Mesh
      const geometry = new THREE.PlaneGeometry(2, 2);
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      meshRef.current = mesh;

      const updateMousePosition = (clientX: number, clientY: number) => {
        const rect = canvas.getBoundingClientRect();
        mouseRef.current.x = (clientX - rect.left) / rect.width;
        mouseRef.current.y = 1.0 - (clientY - rect.top) / rect.height;
      };

      const tryAddRipple = () => {
        if (mouseRef.current.down && rippleSimRef.current) {
          rippleSimRef.current.addRipple(
            mouseRef.current.x,
            mouseRef.current.y,
            0.5
          );
        }
      };

      const handleMouseMove = (e: MouseEvent) => {
        updateMousePosition(e.clientX, e.clientY);
        tryAddRipple();
      };

      const handleMouseDown = () => { mouseRef.current.down = true; };
      const handleMouseUp = () => { mouseRef.current.down = false; };

      const handleTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        mouseRef.current.down = true;
        if (e.touches.length > 0) {
          updateMousePosition(e.touches[0].clientX, e.touches[0].clientY);
          tryAddRipple();
        }
      };

      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        if (e.touches.length > 0) {
          updateMousePosition(e.touches[0].clientX, e.touches[0].clientY);
          tryAddRipple();
        }
      };

      const handleTouchEnd = () => { mouseRef.current.down = false; };

      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mousedown', handleMouseDown);
      canvas.addEventListener('mouseup', handleMouseUp);
      canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
      canvas.addEventListener('touchend', handleTouchEnd);

      // Resize
      const handleResize = () => {
        if (!rendererRef.current || !cameraRef.current) return;
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        if (materialRef.current) {
          materialRef.current.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
        }
      };
      window.addEventListener('resize', handleResize);

      // Animation
      const animate = () => {
        animationIdRef.current = requestAnimationFrame(animate);

        if (rippleSimRef.current && rippleTextureRef.current) {
          const data = rippleSimRef.current.update();
          const textureData = rippleTextureRef.current.image?.data;
          if (!textureData) return;

          for (let i = 0; i < data.length; i++) {
            const value = Math.floor((data[i] * 0.5 + 0.5) * 255);
            textureData[i * 4] = value;
            textureData[i * 4 + 1] = value;
            textureData[i * 4 + 2] = value;
            textureData[i * 4 + 3] = 255;
          }

          rippleTextureRef.current.needsUpdate = true;
        }

        renderer.render(scene, camera);
      };

      animate();

      // Hide loading
      setTimeout(() => setIsLoading(false), 1000);

      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mousedown', handleMouseDown);
        canvas.removeEventListener('mouseup', handleMouseUp);
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
        
        if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
        if (rendererRef.current) rendererRef.current.dispose();
        if (materialRef.current) materialRef.current.dispose();
        if (meshRef.current) meshRef.current.geometry.dispose();
        texturesRef.current.forEach(t => t.dispose());
        if (rippleTextureRef.current) rippleTextureRef.current.dispose();
      };
    } catch (error) {
      console.error('WebGL error:', error);
      setIsLoading(false);
    }
  }, []);

  // Autoplay
  useEffect(() => {
    if (!isPlaying) {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      return;
    }

    autoPlayRef.current = setInterval(() => {
      setCurrentSlide((prev) => {
        const next = (prev + 1) % SLIDES.length;
        if (materialRef.current && texturesRef.current[next]) {
          materialRef.current.uniforms.uImage.value = texturesRef.current[next];
        }
        return next;
      });
      setProgress(0);
    }, 4000);

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isPlaying]);

  // Progress
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0;
        return prev + 100 / (4000 / 50);
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setProgress(0);
    if (materialRef.current && texturesRef.current[index]) {
      materialRef.current.uniforms.uImage.value = texturesRef.current[index];
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center z-[100]">
        <div className="w-16 h-16 border-4 border-[#d4af37]/20 border-t-[#d4af37] rounded-full animate-spin" />
      </div>
    );
  }

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
          <Link href="/login" className="px-6 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#b8941f] text-black font-semibold rounded-lg hover:shadow-lg hover:shadow-[#d4af37]/30 transition-all text-base" style={{ fontFamily: 'Inter, sans-serif' }}>
            Войти
          </Link>
        </nav>
      </header>

      {/* Slider */}
      <div className="relative w-full h-screen overflow-hidden bg-[#0a0a0a]">
        <canvas ref={canvasRef} className="absolute inset-0 z-10" />

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
            <button onClick={() => goToSlide((currentSlide - 1 + SLIDES.length) % SLIDES.length)} className="w-14 h-14 border border-[#d4af37]/30 bg-[#d4af37]/5 rounded-full flex items-center justify-center text-[#d4af37] text-xl hover:bg-[#d4af37]/20 hover:border-[#d4af37]/60 hover:scale-105 transition-all backdrop-blur-sm">◀</button>
            <button onClick={() => goToSlide((currentSlide + 1) % SLIDES.length)} className="w-14 h-14 border border-[#d4af37]/30 bg-[#d4af37]/5 rounded-full flex items-center justify-center text-[#d4af37] text-xl hover:bg-[#d4af37]/20 hover:border-[#d4af37]/60 hover:scale-105 transition-all backdrop-blur-sm">▶</button>
          </div>
          <button onClick={() => setIsPlaying(!isPlaying)} className={`w-14 h-14 border border-[#d4af37]/30 rounded-full flex items-center justify-center text-xl transition-all backdrop-blur-sm ${isPlaying ? 'bg-[#d4af37]/5 text-[#d4af37] hover:bg-[#d4af37]/20' : 'bg-[#d4af37]/30 text-black hover:bg-[#d4af37]/50'}`}>{isPlaying ? '⏸' : '▶'}</button>
          <div className="flex gap-3">{SLIDES.map((_, i) => (<button key={i} onClick={() => goToSlide(i)} className={`w-3 h-3 rounded-full border-2 border-[#d4af37]/30 transition-all ${i === currentSlide ? 'bg-[#d4af37] border-[#d4af37] scale-125' : 'bg-[#d4af37]/20 hover:bg-[#d4af37]/40'}`} />))}</div>
        </div>

        {/* Progress */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#d4af37]/10 z-20">
          <div className="h-full bg-gradient-to-r from-[#d4af37] to-[#f4d03f] transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Features */}
      <section className="py-24 px-8 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-black text-center text-white mb-16" style={{ fontFamily: 'Unbounded, sans-serif' }}>Почему выбирают нас</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[{ icon: '👩‍🦰', title: 'Анкеты моделей', desc: 'Премиальный каталог с верификацией' }, { icon: '🔒', title: 'Безопасная сделка', desc: 'Эскроу платежи и гарантии' }, { icon: '⭐', title: 'Рейтинги', desc: 'Проверенные отзывы клиентов' }, { icon: '💎', title: 'Конфиденциальность', desc: 'Полная анонимность данных' }].map((f, i) => (
              <div key={i} className="p-6 bg-[#141414]/50 border border-white/[0.06] rounded-2xl hover:border-[#d4af37]/30 transition-all group">
                <div className="text-5xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#d4af37] transition-colors" style={{ fontFamily: 'Unbounded, sans-serif' }}>{f.title}</h3>
                <p className="text-gray-400 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
