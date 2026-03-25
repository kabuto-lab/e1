'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  textureResolution: 512,
  ripple: {
    radius: 1.5,
    damping: 0.926,
    viscosity: 0.02,
    noiseAmount: 0.01,
    refraction: 0.195,
    normalScale: 8.5,
    heightAmplify: 1.55,
    mouseStrength: 6,
    mouseCooldown: 130,
    chromatic: 0.020,
    caustics: 0.2,
    secondaryLayer: 0.15,
    vignette: 0.4,
  },
  autoplayInterval: 5000,
};

// ============================================
// RIPPLE SIMULATION CLASS
// ============================================
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
  ripples: Array<{ x: number; y: number; strength: number; age: number }>;
  lastRippleTime: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.size = width * height;
    this.damping = CONFIG.ripple.damping;
    this.viscosity = CONFIG.ripple.viscosity;
    this.noiseAmount = CONFIG.ripple.noiseAmount;
    this.buffer1 = new Float32Array(this.size);
    this.buffer2 = new Float32Array(this.size);
    this.current = this.buffer1;
    this.previous = this.buffer2;
    this.ripples = [];
    this.lastRippleTime = 0;
  }

  addRipple(x: number, y: number, strength: number = 1.0): boolean {
    const now = performance.now();
    if (now - this.lastRippleTime < CONFIG.ripple.mouseCooldown) return false;

    const px = Math.floor(x * this.width);
    const py = Math.floor(y * this.height);
    const r = CONFIG.ripple.radius;
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

    this.ripples.push({ x, y, strength, age: 0 });
    this.lastRippleTime = now;
    return true;
  }

  update(): Float32Array {
    const temp = this.previous;
    this.previous = this.current;
    this.current = temp;

    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const idx = y * this.width + x;
        const left = this.current[idx - 1];
        const right = this.current[idx + 1];
        const top = this.current[idx - this.width];
        const bottom = this.current[idx + this.width];

        let value = ((left + right + top + bottom) / 2.0) - this.previous[idx];
        value *= this.damping;

        const velocity = Math.abs(value - this.previous[idx]);
        value *= (1.0 - this.viscosity * velocity * 0.5);

        this.previous[idx] = value;
      }
    }

    this.ripples = this.ripples.filter((r) => {
      r.age++;
      return r.age < 100;
    });

    return this.previous;
  }

  getRippleCount(): number {
    return this.ripples.length;
  }
}

// ============================================
// REACT COMPONENT
// ============================================
interface LiquidRippleBackgroundProps {
  imageUrl: string;
  width?: number;
  height?: number;
}

export default function LiquidRippleBackground({
  imageUrl,
  width = 400,
  height = 533, // 3:4 aspect ratio
}: LiquidRippleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: true,
    });

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Ripple simulation
    const rippleSim = new RippleSimulation(CONFIG.textureResolution, CONFIG.textureResolution);
    const rippleData = new Uint8Array(CONFIG.textureResolution * CONFIG.textureResolution * 4);
    const rippleTexture = new THREE.DataTexture(
      rippleData,
      CONFIG.textureResolution,
      CONFIG.textureResolution,
      THREE.RGBAFormat
    );
    rippleTexture.minFilter = THREE.LinearFilter;
    rippleTexture.magFilter = THREE.LinearFilter;
    rippleTexture.needsUpdate = true;

    // Load image texture
    const texture = new THREE.TextureLoader().load(imageUrl);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    // Geometry & Material
    const geometry = new THREE.PlaneGeometry(2, 2);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: texture },
        uRippleTexture: { value: rippleTexture },
        uTime: { value: 0 },
        uRefraction: { value: CONFIG.ripple.refraction },
        uChromatic: { value: CONFIG.ripple.chromatic },
        uNormalScale: { value: CONFIG.ripple.normalScale },
        uCaustics: { value: CONFIG.ripple.caustics },
        uSecondaryLayer: { value: CONFIG.ripple.secondaryLayer },
        uVignette: { value: CONFIG.ripple.vignette },
        uResolution: { value: new THREE.Vector2(width, height) },
        uTexel: { value: new THREE.Vector2(1.0 / CONFIG.textureResolution, 1.0 / CONFIG.textureResolution) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture, uRippleTexture;
        uniform float uTime, uRefraction, uChromatic, uNormalScale, uCaustics, uSecondaryLayer, uVignette;
        uniform vec2 uResolution, uTexel;
        varying vec2 vUv;

        void main() {
          vec2 uv = vUv;
          float h = texture2D(uRippleTexture, uv).r;
          float height = (h/255.0)*2.0 - 1.0;

          // 5-point Sobel normal calculation
          float hL = texture2D(uRippleTexture, uv - vec2(uTexel.x, 0.0)).r;
          float hR = texture2D(uRippleTexture, uv + vec2(uTexel.x, 0.0)).r;
          float hD = texture2D(uRippleTexture, uv - vec2(0.0, uTexel.y)).r;
          float hU = texture2D(uRippleTexture, uv + vec2(0.0, uTexel.y)).r;
          vec2 normal = vec2(hL - hR, hD - hU) * (uNormalScale/4.0);

          // Secondary distortion layer
          vec2 uv2 = uv + normal * uSecondaryLayer * 0.05;
          float h2 = texture2D(uRippleTexture, uv2).r;
          float height2 = (h2/255.0)*2.0 - 1.0;
          normal += vec2(
            texture2D(uRippleTexture, uv2 - vec2(uTexel.x*2.0, 0.0)).r - texture2D(uRippleTexture, uv2 + vec2(uTexel.x*2.0, 0.0)).r,
            texture2D(uRippleTexture, uv2 - vec2(0.0, uTexel.y*2.0)).r - texture2D(uRippleTexture, uv2 + vec2(0.0, uTexel.y*2.0)).r
          ) * (uNormalScale/8.0) * uSecondaryLayer;

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
      transparent: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Mouse/touch handlers
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      rippleSim.addRipple(x, y, CONFIG.ripple.mouseStrength);
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      rippleSim.addRipple(x, y, CONFIG.ripple.mouseStrength * 2.5);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const x = (touch.clientX - rect.left) / rect.width;
      const y = 1.0 - (touch.clientY - rect.top) / rect.height;
      rippleSim.addRipple(x, y, CONFIG.ripple.mouseStrength * 0.5);
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

    // Animation loop
    let animationId: number;
    let lastTime = performance.now();
    let frameCount = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      material.uniforms.uTime.value = performance.now() / 1000;

      // Update ripple simulation
      const waveData = rippleSim.update();
      for (let i = 0; i < rippleSim.size; i++) {
        const amplified = waveData[i] * CONFIG.ripple.heightAmplify;
        const clamped = Math.max(-1.0, Math.min(1.0, amplified));
        const value = Math.floor((clamped + 1.0) * 0.5 * 255.0);
        rippleData[i * 4] = value;
        rippleData[i * 4 + 1] = value;
        rippleData[i * 4 + 2] = value;
        rippleData[i * 4 + 3] = 255;
      }
      rippleTexture.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // Mark as loaded
    setIsLoaded(true);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('touchmove', handleTouchMove);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      texture.dispose();
      rippleTexture.dispose();
    };
  }, [imageUrl, width, height]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: 'rgba(26, 26, 26, 0.5)',
        borderRadius: '12px',
        border: '1px solid rgba(212, 175, 55, 0.1)',
        overflow: 'hidden',
      }}
    >
      {!isLoaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(10, 10, 10, 0.8)',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(212, 175, 55, 0.2)',
              borderTopColor: '#d4af37',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
