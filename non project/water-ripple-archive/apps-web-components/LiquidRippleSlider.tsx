/**
 * Liquid Ripple Slider Component
 * SHOCKWAVE EDITION - Advanced GPU-based shader with SDF ripples
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

const DEFAULT_CONFIG = {
  textureResolution: 1024,
  ripple: {
    radius: 12,
    damping: 0.4,
    viscosity: 0.002,
    noiseAmount: 0.03,
    refraction: 0.12,
    normalScale: 10.0,
    heightAmplify: 80,
    mouseStrength: 4,
    mouseCooldown: 300,
    chromatic: 0.018,
    caustics: 0.2,
    secondaryLayer: 0.3,
    vignette: 0.4,
  },
  autoplayInterval: 6000,
};

const NUM_SHOCKWAVES = 10;
const MAX_RADIUS = 0.5;

class RippleSimulation {
  width: number;
  height: number;
  size: number;
  damping: number;
  viscosity: number;
  noiseAmount: number;
  buffer1: Float32Array;
  buffer2: Float32Array;
  current: Float32Array;
  previous: Float32Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.size = width * height;
    this.damping = DEFAULT_CONFIG.ripple.damping;
    this.viscosity = DEFAULT_CONFIG.ripple.viscosity;
    this.noiseAmount = DEFAULT_CONFIG.ripple.noiseAmount;
    this.buffer1 = new Float32Array(this.size);
    this.buffer2 = new Float32Array(this.size);
    this.current = this.buffer1;
    this.previous = this.buffer2;
  }

  addRipple(x: number, y: number, strength: number = 1.0): void {
    const px = Math.floor(x * this.width);
    const py = Math.floor(y * this.height);
    const r = DEFAULT_CONFIG.ripple.radius;
    const sigma = r / 2.5;
    const sigma2 = sigma * sigma;

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const distSq = dx * dx + dy * dy;
        if (distSq <= r * r) {
          const nx = px + dx;
          const ny = py + dy;
          if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
            const gaussian = Math.exp(-distSq / (2 * sigma2));
            const noise = 1.0 + (Math.random() - 0.5) * this.noiseAmount;
            this.current[ny * this.width + nx] += strength * gaussian * noise;
          }
        }
      }
    }
  }

  update(): Float32Array {
    const temp = this.previous;
    this.previous = this.current;
    this.current = temp;

    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const idx = y * this.width + x;
        const value =
          ((this.current[idx - 1] +
            this.current[idx + 1] +
            this.current[idx - this.width] +
            this.current[idx + this.width]) /
            2.0) -
          this.previous[idx];

        this.previous[idx] =
          value * this.damping * (1.0 - this.viscosity * Math.abs(value - this.previous[idx]) * 0.5);
      }
    }

    return this.previous;
  }
}

// Vertex Shader
const vertexShaderSource = `#version 300 es
  in vec2 position;
  out vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

// Fragment Shader - Shockwave with SDF
const fragmentShaderSource = `#version 300 es
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
    
    // Sample texture with offset
    vec2 sampleUv = vUv + totalDir * totalOffsets;
    
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

export default function LiquidRippleSlider() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showPanel, setShowPanel] = useState(true);
  const [config, setConfig] = useState(DEFAULT_CONFIG.ripple);
  
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const rippleSimRef = useRef<RippleSimulation | null>(null);
  const rippleTextureRef = useRef<THREE.DataTexture | null>(null);
  const texturesRef = useRef<THREE.Texture[]>([]);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const autoPlayRef = useRef<NodeJS.Timeout>(undefined);
  const animationIdRef = useRef<number>(undefined);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // Aspect ratio
    const aspect = window.innerWidth / window.innerHeight;

    // Geometry - Variant 3: Rectangular geometry matching screen aspect
    const geometry = new THREE.PlaneGeometry(2 * aspect, 2);

    // Ripple simulation - rectangular to match geometry
    const simWidth = DEFAULT_CONFIG.textureResolution;
    const simHeight = Math.round(DEFAULT_CONFIG.textureResolution / aspect);
    const rippleSim = new RippleSimulation(simWidth, simHeight);
    rippleSimRef.current = rippleSim;

    // Ripple texture
    const rippleData = new Uint8Array(simWidth * simHeight * 4);
    const rippleTexture = new THREE.DataTexture(rippleData, simWidth, simHeight, THREE.RGBAFormat);
    rippleTexture.minFilter = THREE.LinearFilter;
    rippleTexture.magFilter = THREE.LinearFilter;
    rippleTexture.needsUpdate = true;
    rippleTextureRef.current = rippleTexture;

    // Load textures
    const loader = new THREE.TextureLoader();
    texturesRef.current = SLIDES.map((slide) => {
      const texture = loader.load(slide.image, () => {
        if (materialRef.current) {
          materialRef.current.uniforms.uImageAspect.value = texture.image.width / texture.image.height;
        }
      });
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      return texture;
    });

    // Shader Material with cover mode
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: texturesRef.current[0] },
        uRippleTexture: { value: rippleTexture },
        uTime: { value: 0 },
        uRefraction: { value: config.refraction },
        uChromatic: { value: config.chromatic },
        uNormalScale: { value: config.normalScale },
        uCaustics: { value: config.caustics },
        uSecondaryLayer: { value: config.secondaryLayer },
        uVignette: { value: config.vignette },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uTexel: { value: new THREE.Vector2(1.0 / simWidth, 1.0 / simHeight) },
        uImageAspect: { value: 1.0 },
        uScreenAspect: { value: aspect },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform sampler2D uRippleTexture;
        uniform float uTime;
        uniform float uRefraction;
        uniform float uChromatic;
        uniform float uNormalScale;
        uniform float uCaustics;
        uniform float uSecondaryLayer;
        uniform float uVignette;
        uniform float uImageAspect;
        uniform float uScreenAspect;
        uniform vec2 uResolution;
        uniform vec2 uTexel;
        varying vec2 vUv;

        // Corrected coverUv for proper object-fit: cover behavior
        vec2 coverUv(vec2 uv, float imgAspect, float scrAspect) {
          float scaleX = min(1.0, scrAspect / imgAspect);   // crop x when image is wider
          float scaleY = min(1.0, imgAspect / scrAspect);   // crop y when image is taller
          return vec2(
            (uv.x - 0.5) * scaleX + 0.5,
            (uv.y - 0.5) * scaleY + 0.5
          );
        }

        void main() {
          vec2 uv = vUv;
          
          // Sample ripple texture at screen UV (1:1)
          float h = texture2D(uRippleTexture, uv).r;
          float height = (h / 255.0) * 2.0 - 1.0;

          // 5-point Sobel normal calculation
          float hL = texture2D(uRippleTexture, uv - vec2(uTexel.x, 0.0)).r;
          float hR = texture2D(uRippleTexture, uv + vec2(uTexel.x, 0.0)).r;
          float hD = texture2D(uRippleTexture, uv - vec2(0.0, uTexel.y)).r;
          float hU = texture2D(uRippleTexture, uv + vec2(0.0, uTexel.y)).r;
          vec2 normal = vec2(hL - hR, hD - hU) * (uNormalScale / 4.0);

          // Secondary distortion layer
          vec2 uv2 = uv + normal * uSecondaryLayer * 0.05;
          float h2 = texture2D(uRippleTexture, uv2).r;
          float height2 = (h2 / 255.0) * 2.0 - 1.0;
          normal += vec2(
            texture2D(uRippleTexture, uv2 - vec2(uTexel.x * 2.0, 0.0)).r - texture2D(uRippleTexture, uv2 + vec2(uTexel.x * 2.0, 0.0)).r,
            texture2D(uRippleTexture, uv2 - vec2(0.0, uTexel.y * 2.0)).r - texture2D(uRippleTexture, uv2 + vec2(0.0, uTexel.y * 2.0)).r
          ) * (uNormalScale / 8.0) * uSecondaryLayer;

          // Depth-based refraction
          float depth = abs(height) * 1.5 + abs(height2) * 0.8;
          vec2 refractUv = uv + normal * uRefraction * (1.0 + depth);

          // Chromatic aberration
          float caStrength = uChromatic * (1.0 + depth * 1.5);
          vec3 color;
          color.r = texture2D(uTexture, refractUv + normal * caStrength * 1.5).r;
          color.g = texture2D(uTexture, refractUv).g;
          color.b = texture2D(uTexture, refractUv - normal * caStrength * 1.5).b;

          // Caustics
          float gradient = length(normal);
          float caustics = pow(max(0.0, -normal.y), 2.5) * uCaustics * 0.5;
          caustics += pow(max(0.0, gradient - 0.3), 2.0) * uCaustics * 0.3;
          color += vec3(0.95, 0.98, 1.0) * caustics * (1.0 + height * 0.5);

          // Specular
          float specular = pow(max(0.0, height), 3.0) * 0.15;
          color += vec3(1.0) * specular;

          // Vignette
          float vignette = 1.0 - length(uv - 0.5) * uVignette;
          color *= vignette;

          // Warm gold tint
          color *= mix(vec3(1.0), vec3(1.0, 0.96, 0.88), 0.1 * (1.0 - vignette));

          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
    materialRef.current = material;

    // Mesh
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    meshRef.current = mesh;

    // Mouse interaction - continuous ripples while mouse is pressed
    let isMouseDown = false;
    let rippleInterval: NodeJS.Timeout | null = null;

    const startRipple = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      isMouseDown = true;
      
      const rect = canvasRef.current!.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      
      const x = (clientX - rect.left) / rect.width;
      const y = 1.0 - (clientY - rect.top) / rect.height;

      rippleSim.addRipple(x, y, config.mouseStrength * 2.5);

      // Continue creating ripples while mouse is held
      if (!rippleInterval) {
        rippleInterval = setInterval(() => {
          if (!isMouseDown) {
            if (rippleInterval) {
              clearInterval(rippleInterval);
              rippleInterval = null;
            }
            return;
          }
          
          // Add slight variation to position for natural effect
          const variationX = x + (Math.random() - 0.5) * 0.05;
          const variationY = y + (Math.random() - 0.5) * 0.05;
          rippleSim.addRipple(variationX, variationY, config.mouseStrength * 1.5);
        }, 150); // New ripple every 150ms while held
      }
    };

    const endRipple = () => {
      isMouseDown = false;
      if (rippleInterval) {
        clearInterval(rippleInterval);
        rippleInterval = null;
      }
    };

    canvasRef.current.addEventListener('mousedown', startRipple);
    canvasRef.current.addEventListener('mouseup', endRipple);
    canvasRef.current.addEventListener('mouseleave', endRipple);

    // Touch support - continuous ripples while touching
    canvasRef.current.addEventListener('touchstart', startRipple);
    canvasRef.current.addEventListener('touchend', endRipple);
    canvasRef.current.addEventListener('touchcancel', endRipple);

    // Resize handler
    const handleResize = () => {
      if (rendererRef.current && canvasRef.current && materialRef.current && cameraRef.current) {
        const newAspect = window.innerWidth / window.innerHeight;
        
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
        
        // Update camera
        cameraRef.current.left = -1;
        cameraRef.current.right = 1;
        cameraRef.current.top = 1;
        cameraRef.current.bottom = -1;
        cameraRef.current.updateProjectionMatrix();
        
        // Update geometry
        if (meshRef.current) {
          meshRef.current.geometry.dispose();
          meshRef.current.geometry = new THREE.PlaneGeometry(2 * newAspect, 2);
        }
        
        // Update uniforms
        materialRef.current.uniforms.uResolution.value = new THREE.Vector2(window.innerWidth, window.innerHeight);
        materialRef.current.uniforms.uScreenAspect.value = newAspect;
        materialRef.current.uniforms.uTexel.value = new THREE.Vector2(
          1.0 / DEFAULT_CONFIG.textureResolution,
          1.0 / Math.round(DEFAULT_CONFIG.textureResolution / newAspect)
        );
      }
    };
    window.addEventListener('resize', handleResize);

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      const currentTime = performance.now();

      // Update ripple simulation
      const waveData = rippleSim.update();
      const rippleData = rippleTexture.image?.data;
      if (!rippleData) return;

      for (let i = 0; i < rippleSim.size; i++) {
        const amplified = waveData[i] * config.heightAmplify;
        const clamped = Math.max(-1.0, Math.min(1.0, amplified));
        const value = Math.floor((clamped + 1.0) * 0.5 * 255.0);
        const idx = i * 4;
        rippleData[idx] = value;
        rippleData[idx + 1] = value;
        rippleData[idx + 2] = value;
        rippleData[idx + 3] = 255;
      }

      rippleTexture.needsUpdate = true;
      material.uniforms.uTime.value = currentTime / 1000;

      renderer.render(scene, camera);
    };

    animate();

    // Hide loading
    setTimeout(() => setIsLoading(false), 1500);

    // Cleanup
    const canvasEl = canvasRef.current;
    return () => {
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      window.removeEventListener('resize', handleResize);
      if (canvasEl) {
        canvasEl.removeEventListener('mousedown', startRipple);
        canvasEl.removeEventListener('mouseup', endRipple);
        canvasEl.removeEventListener('mouseleave', endRipple);
        canvasEl.removeEventListener('touchstart', startRipple);
        canvasEl.removeEventListener('touchend', endRipple);
        canvasEl.removeEventListener('touchcancel', endRipple);
      }
      if (rippleInterval) clearInterval(rippleInterval);
      if (rendererRef.current) rendererRef.current.dispose();
      if (materialRef.current) materialRef.current.dispose();
      if (meshRef.current) meshRef.current.geometry.dispose();
      texturesRef.current.forEach((texture) => texture.dispose());
      if (rippleTextureRef.current) rippleTextureRef.current.dispose();
    };
  }, []);

  // Update config in real-time
  useEffect(() => {
    if (materialRef.current && rippleSimRef.current) {
      materialRef.current.uniforms.uRefraction.value = config.refraction;
      materialRef.current.uniforms.uChromatic.value = config.chromatic;
      materialRef.current.uniforms.uNormalScale.value = config.normalScale;
      materialRef.current.uniforms.uCaustics.value = config.caustics;
      materialRef.current.uniforms.uSecondaryLayer.value = config.secondaryLayer;
      materialRef.current.uniforms.uVignette.value = config.vignette;
      rippleSimRef.current.damping = config.damping;
      rippleSimRef.current.viscosity = config.viscosity;
      rippleSimRef.current.noiseAmount = config.noiseAmount;
    }
  }, [config]);

  // Auto-play
  useEffect(() => {
    if (!isPlaying) {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      return;
    }

    autoPlayRef.current = setInterval(() => {
      setCurrentSlide((prev) => {
        const next = (prev + 1) % SLIDES.length;
        if (materialRef.current && texturesRef.current[next]) {
          materialRef.current.uniforms.uTexture.value = texturesRef.current[next];
        }
        return next;
      });
      setProgress(0);
    }, DEFAULT_CONFIG.autoplayInterval);

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0;
        return prev + 100 / (DEFAULT_CONFIG.autoplayInterval / 16.67);
      });
    }, 16.67);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const goToSlide = (index: number) => {
    if (index === currentSlide || !materialRef.current) return;
    setCurrentSlide(index);
    if (texturesRef.current[index]) {
      materialRef.current.uniforms.uTexture.value = texturesRef.current[index];
    }
    setProgress(0);
  };

  // Debug marker function
  const showDebugMarker = (x: number, y: number) => {
    if (typeof document === 'undefined') return;
    const marker = document.createElement('div');
    marker.style.cssText = `
      position: fixed; left: ${x-5}px; top: ${y-5}px;
      width: 10px; height: 10px; background: red;
      border-radius: 50%; pointer-events: none; z-index: 9999;
    `;
    document.body.appendChild(marker);
    setTimeout(() => marker.remove(), 500);
  };

  const updateConfig = (key: keyof typeof config, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const resetConfig = () => {
    setConfig(DEFAULT_CONFIG.ripple);
  };

  return (
    <>
      {/* Loading Screen */}
      {isLoading && (
        <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center z-[100] transition-opacity duration-500">
          <div className="w-16 h-16 border-4 border-[#d4af37]/20 border-t-[#d4af37] rounded-full animate-spin" />
        </div>
      )}

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
        {/* Three.js Canvas */}
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
          {/* Navigation Arrows */}
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

          {/* Play/Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`w-14 h-14 border border-[#d4af37]/30 rounded-full flex items-center justify-center text-xl transition-all backdrop-blur-sm ${
              isPlaying
                ? 'bg-[#d4af37]/5 text-[#d4af37] hover:bg-[#d4af37]/20'
                : 'bg-[#d4af37]/30 text-black hover:bg-[#d4af37]/50'
            }`}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          {/* Navigation Dots */}
          <div className="flex gap-3">
            {SLIDES.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full border-2 border-[#d4af37]/30 transition-all ${
                  index === currentSlide
                    ? 'bg-[#d4af37] border-[#d4af37] scale-125'
                    : 'bg-[#d4af37]/20 hover:bg-[#d4af37]/40'
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

      {/* Ripple Tweaks Panel */}
      {showPanel && (
        <div className="fixed top-4 right-4 z-[1000] w-[420px] bg-[#141414]/90 border border-white/[0.06] rounded-2xl backdrop-blur-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
            <h3 className="text-sm font-bold text-[#d4af37] uppercase tracking-wide" style={{ fontFamily: 'Unbounded, sans-serif' }}>💧 Ripple Controls</h3>
            <button
              onClick={() => setShowPanel(false)}
              className="w-8 h-8 border border-[#d4af37]/30 bg-[#d4af37]/5 rounded-lg flex items-center justify-center text-[#d4af37] hover:bg-[#d4af37]/20 transition-all"
            >
              ✕
            </button>
          </div>

          {/* Controls Grid */}
          <div className="p-4 max-h-[70vh] overflow-y-auto space-y-4">
            {/* Wave Radius */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>🔵 Radius</label>
                <span className="text-xs font-mono text-[#d4af37]">{config.radius.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="3"
                max="25"
                step="0.5"
                value={config.radius}
                onChange={(e) => updateConfig('radius', parseFloat(e.target.value))}
                className="w-full h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-[#d4af37]"
              />
            </div>

            {/* Damping */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>💧 Damping</label>
                <span className="text-xs font-mono text-[#d4af37]">{config.damping.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.6"
                step="0.01"
                defaultValue={0.4}
                onChange={(e) => updateConfig('damping', parseFloat(e.target.value))}
                className="w-full h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-[#d4af37]"
              />
            </div>

            {/* Viscosity */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>🍯 Viscosity</label>
                <span className="text-xs font-mono text-[#d4af37]">{config.viscosity.toFixed(3)}</span>
              </div>
              <input
                type="range"
                min="0.000"
                max="0.008"
                step="0.001"
                value={config.viscosity}
                onChange={(e) => updateConfig('viscosity', parseFloat(e.target.value))}
                className="w-full h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-[#d4af37]"
              />
            </div>

            {/* Noise */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>🌀 Noise</label>
                <span className="text-xs font-mono text-[#d4af37]">{config.noiseAmount.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.15"
                step="0.01"
                value={config.noiseAmount}
                onChange={(e) => updateConfig('noiseAmount', parseFloat(e.target.value))}
                className="w-full h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-[#d4af37]"
              />
            </div>

            {/* Refraction */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>✨ Refraction</label>
                <span className="text-xs font-mono text-[#d4af37]">{config.refraction.toFixed(3)}</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.28"
                step="0.005"
                value={config.refraction}
                onChange={(e) => updateConfig('refraction', parseFloat(e.target.value))}
                className="w-full h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-[#d4af37]"
              />
            </div>

            {/* Normal Scale */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>📐 Normal Scale</label>
                <span className="text-xs font-mono text-[#d4af37]">{config.normalScale.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="2"
                max="18"
                step="0.5"
                value={config.normalScale}
                onChange={(e) => updateConfig('normalScale', parseFloat(e.target.value))}
                className="w-full h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-[#d4af37]"
              />
            </div>

            {/* Height Amplify */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>📈 Height Amp</label>
                <span className="text-xs font-mono text-[#d4af37]">{config.heightAmplify.toFixed(0)}</span>
              </div>
              <input
                type="range"
                min="20"
                max="180"
                step="5"
                value={config.heightAmplify}
                onChange={(e) => updateConfig('heightAmplify', parseFloat(e.target.value))}
                className="w-full h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-[#d4af37]"
              />
            </div>

            {/* Mouse Strength */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>🖱️ Mouse Str</label>
                <span className="text-xs font-mono text-[#d4af37]">{config.mouseStrength.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="1"
                max="12"
                step="0.5"
                value={config.mouseStrength}
                onChange={(e) => updateConfig('mouseStrength', parseFloat(e.target.value))}
                className="w-full h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-[#d4af37]"
              />
            </div>

            {/* Mouse Cooldown */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>⏱️ Cooldown (ms)</label>
                <span className="text-xs font-mono text-[#d4af37]">{config.mouseCooldown.toFixed(0)}</span>
              </div>
              <input
                type="range"
                min="50"
                max="2000"
                step="50"
                value={config.mouseCooldown}
                onChange={(e) => updateConfig('mouseCooldown', parseFloat(e.target.value))}
                className="w-full h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-[#d4af37]"
              />
            </div>

            {/* Chromatic */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>🌈 Chromatic</label>
                <span className="text-xs font-mono text-[#d4af37]">{config.chromatic.toFixed(3)}</span>
              </div>
              <input
                type="range"
                min="0.000"
                max="0.035"
                step="0.001"
                value={config.chromatic}
                onChange={(e) => updateConfig('chromatic', parseFloat(e.target.value))}
                className="w-full h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-[#d4af37]"
              />
            </div>

            {/* Caustics */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>💎 Caustics</label>
                <span className="text-xs font-mono text-[#d4af37]">{config.caustics.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.4"
                step="0.05"
                value={config.caustics}
                onChange={(e) => updateConfig('caustics', parseFloat(e.target.value))}
                className="w-full h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-[#d4af37]"
              />
            </div>

            {/* Secondary Layer */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>🔮 Secondary</label>
                <span className="text-xs font-mono text-[#d4af37]">{config.secondaryLayer.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.6"
                step="0.05"
                value={config.secondaryLayer}
                onChange={(e) => updateConfig('secondaryLayer', parseFloat(e.target.value))}
                className="w-full h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-[#d4af37]"
              />
            </div>

            {/* Vignette */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>◐ Vignette</label>
                <span className="text-xs font-mono text-[#d4af37]">{config.vignette.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.8"
                step="0.05"
                value={config.vignette}
                onChange={(e) => updateConfig('vignette', parseFloat(e.target.value))}
                className="w-full h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-[#d4af37]"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="p-4 border-t border-white/[0.06] flex gap-2">
            <button
              onClick={resetConfig}
              className="flex-1 px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-all text-xs font-semibold uppercase"
            >
              ↺ Reset
            </button>
            <button
              onClick={() => {
                if (rippleSimRef.current) {
                  rippleSimRef.current.current.fill(0);
                  rippleSimRef.current.previous.fill(0);
                }
              }}
              className="flex-1 px-3 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-all text-xs font-semibold uppercase"
            >
              🌊 Calm
            </button>
          </div>
        </div>
      )}

      {/* Toggle Panel Button */}
      {!showPanel && (
        <button
          onClick={() => setShowPanel(true)}
          className="fixed top-4 right-4 z-[1000] w-12 h-12 bg-[#141414]/90 border border-[#d4af37]/30 rounded-xl flex items-center justify-center text-[#d4af37] hover:bg-[#d4af37]/20 transition-all backdrop-blur-xl"
        >
          🎛️
        </button>
      )}

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
              <div key={i} className="p-6 bg-[#141414]/50 border border-white/[0.06] rounded-2xl hover:border-[#d4af37]/30 transition-all group">
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
