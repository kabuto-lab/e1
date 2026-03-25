/**
 * Liquid Ripple Slider - SHOCKWAVE EDITION
 * Advanced GPU-based shader with SDF ripples
 * Drop-in replacement for LiquidRippleSlider.tsx
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

const NUM_SHOCKWAVES = 10;

// Vertex Shader
const vertexShader = `#version 300 es
  in vec2 position;
  out vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

// Fragment Shader - Shockwave with SDF
const fragmentShader = `#version 300 es
  precision mediump float;

  const int NUM_SHOCKWAVES = 10;

  in vec2 vUv;
  out vec4 colour;

  uniform sampler2D image;
  uniform vec2 aspect;
  uniform vec2[NUM_SHOCKWAVES] centres;
  uniform float[NUM_SHOCKWAVES] times;
  uniform float uImageAspect;

  const float maxRadius = 0.5;

  // SDF circle for perfect circular ripples
  float getOffsetStrength(float t, vec2 dir) {
    vec2 scaledDir = dir / aspect;
    float d = length(scaledDir) - t * maxRadius;
    
    // Sharp ripple edge
    d *= 1.0 - smoothstep(0.0, 0.05, abs(d));
    // Smooth intro
    d *= smoothstep(0.0, 0.05, t);
    // Smooth outro
    d *= 1.0 - smoothstep(0.5, 1.0, t);
    
    return d;
  }

  void main() {  
    vec2 totalDir = vec2(0.0);
    vec3 totalOffsets = vec3(0.0);
    
    for(int i = 0; i < NUM_SHOCKWAVES; i++) {
      vec2 centre = centres[i];
      float t = times[i];
      
      vec2 dir = centre - vUv;
      float tOffset = 0.01 * sin(t * 3.14);
      
      float rD = getOffsetStrength(t + tOffset, dir);
      float gD = getOffsetStrength(t, dir);
      float bD = getOffsetStrength(t - tOffset, dir);

      dir = normalize(dir);
      float influence = ceil(abs(gD));
      
      totalDir += dir * influence;
      totalOffsets += vec3(rD, gD, bD) * influence;
    }
    
    // Sample texture with offset and aspect correction
    vec2 sampleUv = vUv;
    
    // Apply aspect ratio correction for portrait images
    float screenAspect = aspect.x / aspect.y;
    float imgAspect = uImageAspect;
    float scale = min(1.0, screenAspect / imgAspect);
    sampleUv = (sampleUv - 0.5) * vec2(scale, 1.0) + 0.5;
    
    // Apply ripple distortion
    sampleUv += totalDir * totalOffsets;
    
    // Clamp UVs to prevent edge artifacts
    sampleUv = clamp(sampleUv, 0.0, 1.0);
    
    float r = texture(image, sampleUv + totalDir * totalOffsets.r).r;
    float g = texture(image, sampleUv + totalDir * totalOffsets.g).g;
    float b = texture(image, sampleUv + totalDir * totalOffsets.b).b;
    
    // Add shading for depth
    float shading = totalOffsets.g * 8.0;
    
    colour = vec4(r, g, b, 1.0);
    colour.rgb += shading;
  }
`;

export default function LiquidRippleSliderShockwave() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  
  // WebGL refs
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const texturesRef = useRef<WebGLTexture[]>([]);
  const vaoRef = useRef<WebGLVertexArrayObject | null>(null);
  
  // Shockwave state
  const shockwavesRef = useRef({
    centres: Array(NUM_SHOCKWAVES).fill([0.5, 0.5]),
    times: Array(NUM_SHOCKWAVES).fill(0),
    nextIndex: 0,
  });
  
  // Animation refs
  const animationIdRef = useRef<number>();
  const autoPlayRef = useRef<NodeJS.Timeout>();
  const lastTimeRef = useRef(0);
  const frameCountRef = useRef(0);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl2');
    
    if (!gl) {
      console.error('WebGL 2 not supported');
      return;
    }
    
    glRef.current = gl;
    
    // Resize canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resizeCanvas();

    // Compile shaders
    const vertexShaderObj = gl.createShader(gl.VERTEX_SHADER);
    if (vertexShaderObj) {
      gl.shaderSource(vertexShaderObj, vertexShader);
      gl.compileShader(vertexShaderObj);
    }

    const fragmentShaderObj = gl.createShader(gl.FRAGMENT_SHADER);
    if (fragmentShaderObj) {
      gl.shaderSource(fragmentShaderObj, fragmentShader);
      gl.compileShader(fragmentShaderObj);
    }

    // Create program
    const program = gl.createProgram();
    if (program && vertexShaderObj && fragmentShaderObj) {
      gl.attachShader(program, vertexShaderObj);
      gl.attachShader(program, fragmentShaderObj);
      gl.linkProgram(program);
      gl.useProgram(program);
      programRef.current = program;
    }

    // Create geometry (full-screen quad)
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // Create VAO
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    vaoRef.current = vao;

    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Load textures
    const loadTexture = (url: string): WebGLTexture => {
      const texture = gl.createTexture();
      const image = new Image();
      image.crossOrigin = 'anonymous';
      
      image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      };
      
      image.src = url;
      return texture;
    };

    // Load all slide textures
    texturesRef.current = SLIDES.map(slide => loadTexture(slide.image));

    // Get uniform locations
    const imageLocation = gl.getUniformLocation(program, 'image');
    const aspectLocation = gl.getUniformLocation(program, 'aspect');
    const centresLocation = gl.getUniformLocation(program, 'centres');
    const timesLocation = gl.getUniformLocation(program, 'times');
    const imageAspectLocation = gl.getUniformLocation(program, 'uImageAspect');

    // Set initial uniforms
    gl.uniform1i(imageLocation, 0);
    gl.uniform2fv(aspectLocation, [canvas.width / canvas.height, 1.0]);
    gl.uniform1f(imageAspectLocation, 0.75); // Portrait images ~3:4 aspect ratio

    // Mouse interaction - continuous ripples while pressed
    let isMouseDown = false;
    let rippleInterval: NodeJS.Timeout | null = null;

    const startRipple = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      isMouseDown = true;
      
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      
      const x = (clientX - rect.left) / canvas.width;
      const y = 1.0 - (clientY - rect.top) / canvas.height;
      
      // Add initial shockwave
      shockwavesRef.current.centres[shockwavesRef.current.nextIndex] = [x, y];
      shockwavesRef.current.times[shockwavesRef.current.nextIndex] = 0;
      shockwavesRef.current.nextIndex = (shockwavesRef.current.nextIndex + 1) % NUM_SHOCKWAVES;
      
      // Continue creating ripples while held
      if (!rippleInterval) {
        rippleInterval = setInterval(() => {
          if (!isMouseDown) {
            if (rippleInterval) {
              clearInterval(rippleInterval);
              rippleInterval = null;
            }
            return;
          }
          
          const variationX = x + (Math.random() - 0.5) * 0.05;
          const variationY = y + (Math.random() - 0.5) * 0.05;
          shockwavesRef.current.centres[shockwavesRef.current.nextIndex] = [variationX, variationY];
          shockwavesRef.current.times[shockwavesRef.current.nextIndex] = 0;
          shockwavesRef.current.nextIndex = (shockwavesRef.current.nextIndex + 1) % NUM_SHOCKWAVES;
        }, 150);
      }
    };

    const endRipple = () => {
      isMouseDown = false;
      if (rippleInterval) {
        clearInterval(rippleInterval);
        rippleInterval = null;
      }
    };

    canvas.addEventListener('mousedown', startRipple);
    canvas.addEventListener('mouseup', endRipple);
    canvas.addEventListener('mouseleave', endRipple);
    canvas.addEventListener('touchstart', startRipple);
    canvas.addEventListener('touchend', endRipple);
    canvas.addEventListener('touchcancel', endRipple);

    // Resize handler
    const handleResize = () => {
      resizeCanvas();
      if (programRef.current) {
        const aspectLocation = gl.getUniformLocation(programRef.current, 'aspect');
        gl.uniform2fv(aspectLocation, [canvas.width / canvas.height, 1.0]);
      }
    };
    window.addEventListener('resize', handleResize);

    // Hide loading
    setTimeout(() => setIsLoading(false), 1500);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousedown', startRipple);
      canvas.removeEventListener('mouseup', endRipple);
      canvas.removeEventListener('mouseleave', endRipple);
      canvas.removeEventListener('touchstart', startRipple);
      canvas.removeEventListener('touchend', endRipple);
      canvas.removeEventListener('touchcancel', endRipple);
      
      if (vaoRef.current) gl.deleteVertexArray(vaoRef.current);
      if (programRef.current) gl.deleteProgram(programRef.current);
      texturesRef.current.forEach(t => gl.deleteTexture(t));
    };
  }, []);

  // Animation loop
  useEffect(() => {
    const gl = glRef.current;
    const program = programRef.current;
    
    if (!gl || !program) return;

    const animate = (time: number) => {
      animationIdRef.current = requestAnimationFrame(animate);

      // FPS calculation
      frameCountRef.current++;
      if (time - lastTimeRef.current >= 1000) {
        frameCountRef.current = 0;
        lastTimeRef.current = time;
      }

      // Update shockwave times
      for (let i = 0; i < NUM_SHOCKWAVES; i++) {
        if (shockwavesRef.current.times[i] < 1.0) {
          shockwavesRef.current.times[i] += 0.016; // ~60fps
        }
      }

      // Clear and render
      gl.clearColor(0.04, 0.04, 0.04, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);
      gl.bindVertexArray(vaoRef.current);

      // Bind current slide texture
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texturesRef.current[currentSlide]);

      // Set uniforms
      const centresLocation = gl.getUniformLocation(program, 'centres');
      const timesLocation = gl.getUniformLocation(program, 'times');
      
      gl.uniform2fv(centresLocation, shockwavesRef.current.centres.flat());
      gl.uniform1fv(timesLocation, shockwavesRef.current.times);

      // Draw
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    animate(0);

    return () => {
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
    };
  }, [currentSlide]);

  // Autoplay
  useEffect(() => {
    if (!isPlaying) {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      return;
    }

    autoPlayRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
      setProgress(0);
    }, 6000);

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isPlaying]);

  // Progress bar
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0;
        return prev + 100 / (6000 / 16.67);
      });
    }, 16.67);

    return () => clearInterval(interval);
  }, []);

  const goToSlide = (index: number) => {
    if (index === currentSlide) return;
    setCurrentSlide(index);
    setProgress(0);
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
      {/* Transparent Header */}
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

      {/* Main Slider Container */}
      <div className="relative w-full h-screen overflow-hidden bg-[#0a0a0a]">
        {/* WebGL Canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 z-10 cursor-crosshair" />

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
              onClick={() => goToSlide((currentSlide - 1 + SLIDES.length) % SLIDES.length)}
              className="w-14 h-14 border border-[#d4af37]/30 bg-[#d4af37]/5 rounded-full flex items-center justify-center text-[#d4af37] text-xl hover:bg-[#d4af37]/20 hover:border-[#d4af37]/60 hover:scale-105 transition-all backdrop-blur-sm"
            >
              ◀
            </button>
            <button
              onClick={() => goToSlide((currentSlide + 1) % SLIDES.length)}
              className="w-14 h-14 border border-[#d4af37]/30 bg-[#d4af37]/5 rounded-full flex items-center justify-center text-[#d4af37] text-xl hover:bg-[#d4af37]/20 hover:border-[#d4af37]/60 hover:scale-105 transition-all backdrop-blur-sm"
            >
              ▶
            </button>
          </div>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`w-14 h-14 border border-[#d4af37]/30 rounded-full flex items-center justify-center text-xl transition-all backdrop-blur-sm ${
              isPlaying ? 'bg-[#d4af37]/5 text-[#d4af37] hover:bg-[#d4af37]/20' : 'bg-[#d4af37]/30 text-black hover:bg-[#d4af37]/50'
            }`}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

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
