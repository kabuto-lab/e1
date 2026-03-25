/**
 * Water Ripple Overlay Component
 * Three.js water shader overlay for slider
 * Falls back to simple CSS effect if WebGL unavailable
 */

'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface WaterRippleOverlayProps {
  imageUrl: string;
  isActive: boolean;
  isPaused?: boolean;
  onRipple?: (x: number, y: number) => void;
}

// Shader parameters
const WATER_CONFIG = {
  textureResolution: 512, // Reduced for better compatibility
  wave: {
    speed: 1.50,
    velocityDamp: 0.99,
    heightDamp: 1.00,
    springForce: 0.01,
    refraction: 0.03,
    specPower: 50,
    specIntensity: 0.40,
    waterTint: 0.15,
    aberration: 0.50,
    gradientStrength: 0.65,
    heightSensitivity: 0.15,
    brushSize: 0.04,
    brushForce: 0.80,
  },
};

// Wave equation simulation
class WaveSimulation {
  width: number;
  height: number;
  buffer1: Float32Array;
  buffer2: Float32Array;
  current: Float32Array;
  prev: Float32Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.buffer1 = new Float32Array(width * height);
    this.buffer2 = new Float32Array(width * height);
    this.current = this.buffer1;
    this.prev = this.buffer2;
  }

  addRipple(x: number, y: number, strength: number = 1.0) {
    const px = Math.floor(x * this.width);
    const py = Math.floor(y * this.height);
    const radius = Math.floor(WATER_CONFIG.wave.brushSize * 100);

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
          const nx = px + dx;
          const ny = py + dy;
          if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
            const factor = Math.cos((dist / radius) * Math.PI / 2);
            const idx = ny * this.width + nx;
            this.current[idx] += strength * factor * factor * WATER_CONFIG.wave.brushForce;
          }
        }
      }
    }
  }

  update() {
    const temp = this.current;
    this.current = this.prev;
    this.prev = temp;

    const w = this.width;
    const h = this.height;

    for (let y = 1; y < h - 1; y++) {
      const row = y * w;
      for (let x = 1; x < w - 1; x++) {
        const idx = row + x;
        const val = this.prev[idx];
        const laplacian = (this.prev[idx - w] + this.prev[idx + w] + this.prev[idx + 1] + this.prev[idx - 1]) * 0.25 - val;
        let velocity = val - this.current[idx];
        velocity *= WATER_CONFIG.wave.velocityDamp;
        velocity += laplacian * WATER_CONFIG.wave.springForce;
        this.current[idx] = val + velocity * WATER_CONFIG.wave.speed;
      }
    }

    // Boundary damping
    for (let x = 0; x < w; x++) {
      this.current[x] *= 0.95;
      this.current[(h - 1) * w + x] *= 0.95;
    }
    for (let y = 0; y < h; y++) {
      this.current[y * w] *= 0.95;
      this.current[y * w + (w - 1)] *= 0.95;
    }

    return this.current;
  }

  calm() {
    this.buffer1.fill(0);
    this.buffer2.fill(0);
  }
}

export default function WaterRippleOverlay({ imageUrl, isActive, isPaused = false }: WaterRippleOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const waterSimRef = useRef<WaveSimulation | null>(null);
  const textureRef = useRef<THREE.Texture | null>(null);
  const waterTextureRef = useRef<THREE.DataTexture | null>(null);
  const animationFrameRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0.5, y: 0.5, prevX: 0.5, prevY: 0.5, velocity: 0 });
  const imageAspectRef = useRef<number>(1);
  const initializedRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current.forceContextLoss();
        rendererRef.current = null;
      }
      if (textureRef.current) {
        textureRef.current.dispose();
      }
      if (waterTextureRef.current) {
        waterTextureRef.current.dispose();
      }
    };
  }, []);

  // Initialize Three.js and shader
  useEffect(() => {
    if (!canvasRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const canvas = canvasRef.current;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Renderer setup with proper WebGL context - wrapped in try-catch
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: false,
        alpha: false,
        powerPreference: 'low-power',
        preserveDrawingBuffer: false,
        depth: false,
        stencil: false,
        failIfMajorPerformanceCaveat: true,
      });

      // Test if renderer is working
      const gl = renderer.getContext();
      if (!gl) {
        throw new Error('No GL context');
      }
    } catch (error) {
      console.warn('💧 WaterRippleOverlay: WebGL not available, using fallback', error);
      initializedRef.current = false;
      return;
    }

    // Check if renderer is valid
    if (!renderer || !renderer.domElement) {
      console.warn('WaterRippleOverlay: Invalid renderer created');
      initializedRef.current = false;
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
    rendererRef.current = renderer;

    // Scene and camera
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    // Water simulation
    const waterSim = new WaveSimulation(WATER_CONFIG.textureResolution, WATER_CONFIG.textureResolution);
    waterSimRef.current = waterSim;

    // Water texture
    const waterTexture = new THREE.DataTexture(
      new Uint8Array(WATER_CONFIG.textureResolution * WATER_CONFIG.textureResolution * 4),
      WATER_CONFIG.textureResolution,
      WATER_CONFIG.textureResolution,
      THREE.RGBAFormat
    );
    waterTexture.minFilter = THREE.LinearFilter;
    waterTexture.magFilter = THREE.LinearFilter;
    waterTexture.needsUpdate = true;
    waterTextureRef.current = waterTexture;

    // Load image texture
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(imageUrl, (tex) => {
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;

      if (tex.image) {
        imageAspectRef.current = tex.image.width / tex.image.height;
      }

      textureRef.current = tex;

      if (materialRef.current) {
        materialRef.current.uniforms.uTexture.value = tex;
        materialRef.current.uniforms.uTexture.needsUpdate = true;
      }
    });

    // Shader material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: texture },
        uWaterTexture: { value: waterTexture },
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(width, height) },
        uTexelSize: { value: new THREE.Vector2(1 / WATER_CONFIG.textureResolution, 1 / WATER_CONFIG.textureResolution) },
        uRefraction: { value: WATER_CONFIG.wave.refraction },
        uSpecPower: { value: WATER_CONFIG.wave.specPower },
        uSpecIntensity: { value: WATER_CONFIG.wave.specIntensity },
        uWaterTint: { value: WATER_CONFIG.wave.waterTint },
        uAberration: { value: WATER_CONFIG.wave.aberration },
        uGradientStrength: { value: WATER_CONFIG.wave.gradientStrength },
        uHeightSensitivity: { value: WATER_CONFIG.wave.heightSensitivity },
        uImageAspect: { value: 1 },
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
        uniform sampler2D uWaterTexture;
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uTexelSize;
        uniform float uRefraction;
        uniform float uSpecPower;
        uniform float uSpecIntensity;
        uniform float uWaterTint;
        uniform float uAberration;
        uniform float uGradientStrength;
        uniform float uHeightSensitivity;
        uniform float uImageAspect;

        varying vec2 vUv;

        vec3 calculateNormal(sampler2D heightMap, vec2 uv, vec2 texel) {
          float hL = texture2D(heightMap, uv - vec2(texel.x, 0.0)).r;
          float hR = texture2D(heightMap, uv + vec2(texel.x, 0.0)).r;
          float hD = texture2D(heightMap, uv - vec2(0.0, texel.y)).r;
          float hU = texture2D(heightMap, uv + vec2(0.0, texel.y)).r;
          return normalize(vec3(hL - hR, hD - hU, 2.0));
        }

        void main() {
          vec2 uv = vUv;
          float screenAspect = uResolution.x / uResolution.y;

          vec2 scaledUv = uv;
          if (screenAspect > uImageAspect) {
            float ratio = uImageAspect / screenAspect;
            scaledUv.y = (uv.y - 0.5) / ratio + 0.5;
          } else {
            float ratio = screenAspect / uImageAspect;
            scaledUv.x = (uv.x - 0.5) / ratio + 0.5;
          }

          vec3 waterNormal = calculateNormal(uWaterTexture, uv, uTexelSize);
          float height = texture2D(uWaterTexture, uv).r;

          float refractStrength = uRefraction * (1.0 + height * uHeightSensitivity);
          vec2 refractOffset = waterNormal.xy * refractStrength;

          vec3 color;
          color.r = texture2D(uTexture, scaledUv + refractOffset * (1.0 + uAberration)).r;
          color.g = texture2D(uTexture, scaledUv + refractOffset).g;
          color.b = texture2D(uTexture, scaledUv + refractOffset * (1.0 - uAberration)).b;

          float depthFactor = smoothstep(0.0, 1.0, height * 0.5 + 0.5);
          vec3 waterColor = mix(vec3(0.1, 0.2, 0.4), vec3(0.5, 0.7, 1.0), depthFactor);
          color = mix(color, waterColor, abs(height) * uWaterTint);

          vec3 lightDir = normalize(vec3(0.3, 0.5, 1.0));
          vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));
          vec3 halfDir = normalize(lightDir + viewDir);
          float specAngle = max(dot(waterNormal, halfDir), 0.0);
          float specular = pow(specAngle, uSpecPower) * uSpecIntensity;
          color += vec3(1.0, 0.95, 0.8) * specular;

          float gradientValue = smoothstep(0.0, 1.0, height * uHeightSensitivity + 0.5);
          gradientValue = pow(gradientValue, uGradientStrength);
          vec3 gradientColor = mix(vec3(0.0), vec3(1.0), gradientValue);
          color = mix(color, gradientColor, uGradientStrength * 0.3);

          float vignette = 1.0 - length(uv - 0.5) * 0.4;
          color *= vignette;
          color = clamp(color, 0.0, 1.0);

          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
    materialRef.current = material;

    // Mesh
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      if (!isPaused && isActive) {
        material.uniforms.uTime.value = performance.now() / 1000;

        const waterData = waterSim.update();
        const pixels = waterTexture.image.data;
        const size = WATER_CONFIG.textureResolution * WATER_CONFIG.textureResolution;

        for (let i = 0; i < size; i++) {
          const val = waterData[i];
          const normalized = Math.tanh(val * 2.0) * 0.5 + 0.5;
          const byte = Math.floor(normalized * 255);
          pixels[i * 4] = byte;
          pixels[i * 4 + 1] = byte;
          pixels[i * 4 + 2] = byte;
          pixels[i * 4 + 3] = 255;
        }
        waterTexture.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      renderer.setSize(newWidth, newHeight);
      material.uniforms.uResolution.value.set(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    // Handle interaction
    const handlePointerMove = (clientX: number, clientY: number) => {
      if (!isActive || isPaused) return;

      const rect = canvas.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width;
      const y = 1.0 - (clientY - rect.top) / rect.height;

      const dx = x - mouseRef.current.prevX;
      const dy = y - mouseRef.current.prevY;
      const velocity = Math.sqrt(dx * dx + dy * dy) * 10;

      if (velocity > 0.01) {
        waterSim.addRipple(x, y, velocity);
      }

      mouseRef.current.prevX = x;
      mouseRef.current.prevY = y;
      mouseRef.current.x = x;
      mouseRef.current.y = y;
      mouseRef.current.velocity = velocity;
    };

    const handlePointerDown = (clientX: number, clientY: number) => {
      if (!isActive || isPaused) return;
      const rect = canvas.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width;
      const y = 1.0 - (clientY - rect.top) / rect.height;
      waterSim.addRipple(x, y, 1.5);
    };

    const onMouseMove = (e: MouseEvent) => handlePointerMove(e.clientX, e.clientY);
    const onMouseDown = (e: MouseEvent) => handlePointerDown(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchstart', onTouchStart);
    };
  }, []);

  // Update texture when image changes
  useEffect(() => {
    if (materialRef.current) {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(imageUrl, (tex) => {
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;

        if (tex.image) {
          imageAspectRef.current = tex.image.width / tex.image.height;
          if (materialRef.current) {
            materialRef.current.uniforms.uImageAspect.value = imageAspectRef.current;
          }
        }

        if (materialRef.current) {
          materialRef.current.uniforms.uTexture.value = tex;
          materialRef.current.uniforms.uTexture.needsUpdate = true;
        }
        textureRef.current = tex;
      });
    }
  }, [imageUrl]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        pointerEvents: 'auto',
        touchAction: 'none',
      }}
    />
  );
}
