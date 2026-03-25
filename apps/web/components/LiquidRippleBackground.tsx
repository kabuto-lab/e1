/**
 * Liquid Ripple Background Component
 * Based on testpage.html - Three.js water ripple simulation
 */

'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface LiquidRippleBackgroundProps {
  imageUrl: string;
  width?: number;
  height?: number;
}

export default function LiquidRippleBackground({ 
  imageUrl, 
  width = 800, 
  height = 1067 
}: LiquidRippleBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const rippleRef = useRef<any>(null);
  const animationIdRef = useRef<number>();
  const mouseRef = useRef({ x: 0, y: 0, lastX: 0, lastY: 0, lastMoveTime: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      width / height,
      0.1,
      1000
    );
    camera.position.z = 1;
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Load texture
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(imageUrl, (texture) => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      
      // Create ripple simulation
      const ripple = createRippleSimulation(width, height);
      rippleRef.current = ripple;

      // Create shader material
      const material = new THREE.ShaderMaterial({
        uniforms: {
          tDiffuse: { value: texture },
          tRipple: { value: ripple.texture },
          uTime: { value: 0 },
          uRefraction: { value: 0.12 },
          uNormalScale: { value: 10.0 },
          uHeightAmplify: { value: 80.0 },
          uChromatic: { value: 0.018 },
          uCaustics: { value: 0.2 },
          uSecondary: { value: 0.3 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform sampler2D tRipple;
          uniform float uTime;
          uniform float uRefraction;
          uniform float uNormalScale;
          uniform float uHeightAmplify;
          uniform float uChromatic;
          uniform float uCaustics;
          uniform float uSecondary;
          varying vec2 vUv;

          void main() {
            vec2 uv = vUv;
            
            // Sample ripple height
            float height = texture2D(tRipple, uv).r * uHeightAmplify;
            
            // Calculate normal from height
            float texel = 1.0 / 512.0;
            float h0 = texture2D(tRipple, uv).r;
            float h1 = texture2D(tRipple, uv + vec2(texel, 0.0)).r;
            float h2 = texture2D(tRipple, uv + vec2(0.0, texel)).r;
            vec2 normal = vec2(h0 - h1, h0 - h2) * uNormalScale;
            
            // Refract UVs
            vec2 refractedUv = uv + normal * uRefraction;
            
            // Chromatic aberration
            float r = texture2D(tDiffuse, refractedUv + normal * uChromatic).r;
            float g = texture2D(tDiffuse, refractedUv).g;
            float b = texture2D(tDiffuse, refractedUv - normal * uChromatic).b;
            
            // Caustics
            float caustic = max(0.0, dot(normal, vec2(0.5, 0.5))) * uCaustics;
            
            // Secondary layer
            float secondary = texture2D(tRipple, uv * 2.0).r * uSecondary;
            
            vec3 color = vec3(r, g, b);
            color += caustic;
            color += secondary * 0.1;
            
            gl_FragColor = vec4(color, 1.0);
          }
        `,
        transparent: true,
      });

      // Create plane
      const geometry = new THREE.PlaneGeometry(width / 100, height / 100);
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      meshRef.current = mesh;

      // Mouse interaction
      const handleMouseMove = (e: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * width;
        const y = ((e.clientY - rect.top) / rect.height) * height;
        
        const now = Date.now();
        if (now - mouseRef.current.lastMoveTime < 50) return;
        
        mouseRef.current.lastMoveTime = now;
        
        // Add ripple
        ripple.addRipple(x, y, 2.0, 12);
        mouseRef.current.lastX = x;
        mouseRef.current.lastY = y;
      };

      renderer.domElement.addEventListener('mousemove', handleMouseMove);

      // Animation loop
      const animate = (time: number) => {
        animationIdRef.current = requestAnimationFrame(animate);
        
        const deltaTime = time * 0.001;
        
        if (rippleRef.current) {
          rippleRef.current.update();
          material.uniforms.uTime.value = time * 0.001;
        }
        
        renderer.render(scene, camera);
      };

      animate(0);
    });

    // Cleanup
    return () => {
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      if (meshRef.current) {
        meshRef.current.geometry.dispose();
        (meshRef.current.material as THREE.Material).dispose();
      }
    };
  }, [imageUrl, width, height]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width, 
        height, 
        position: 'relative',
        overflow: 'hidden'
      }}
    />
  );
}

// Ripple Simulation Class
class RippleSimulation {
  width: number;
  height: number;
  buffer1: Float32Array;
  buffer2: Float32Array;
  current: Float32Array;
  previous: Float32Array;
  texture: THREE.DataTexture;
  damping: number;
  viscosity: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.buffer1 = new Float32Array(width * height);
    this.buffer2 = new Float32Array(width * height);
    this.current = this.buffer1;
    this.previous = this.buffer2;
    this.damping = 0.96;
    this.viscosity = 0.002;

    // Create texture
    const data = new Uint8Array(width * height * 4);
    this.texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
  }

  addRipple(x: number, y: number, strength: number, radius: number) {
    const startX = Math.floor(x - radius);
    const endX = Math.floor(x + radius);
    const startY = Math.floor(y - radius);
    const endY = Math.floor(y + radius);

    for (let py = startY; py < endY; py++) {
      for (let px = startX; px < endX; px++) {
        if (px >= 0 && px < this.width && py >= 0 && py < this.height) {
          const dx = px - x;
          const dy = py - y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < radius) {
            const force = (1 - distance / radius) * strength;
            this.current[py * this.width + px] += force;
          }
        }
      }
    }
  }

  update() {
    const newBuffer = this.current === this.buffer1 ? this.buffer2 : this.buffer1;
    const width = this.width;
    const height = this.height;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const value = (
          this.current[idx - 1] +
          this.current[idx + 1] +
          this.current[idx - width] +
          this.current[idx + width]
        ) * 0.5 - this.previous[idx];

        newBuffer[idx] = value * this.damping;
      }
    }

    // Update texture
    const data = this.texture.image.data;
    for (let i = 0; i < this.width * this.height; i++) {
      const height = newBuffer[i] * 128 + 128;
      const idx = i * 4;
      data[idx] = height;
      data[idx + 1] = height;
      data[idx + 2] = height;
      data[idx + 3] = 255;
    }
    this.texture.needsUpdate = true;

    // Swap buffers
    this.previous = this.current;
    this.current = newBuffer;
  }
}

function createRippleSimulation(width: number, height: number) {
  return new RippleSimulation(width, height);
}
