'use client';

/**
 * Vanilla build and WordPress/Elementor widget: see /riply/core and /riply/wordpress/riply-elementor.
 */

import { useEffect, useRef, useCallback, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RippleConfig {
  simResolution?: number;
  waveSpeed?: number;
  velocityDamping?: number;
  heightDamping?: number;
  springForce?: number;
  brushSize?: number;
  brushForce?: number;
  refraction?: number;
  specularIntensity?: number;
  specularPower?: number;
  autoplayInterval?: number;
  interaction?: 'hover' | 'click' | 'none';
}

interface RippleSurfaceProps {
  images: string[];
  currentIndex?: number;
  onIndexChange?: (index: number) => void;
  className?: string;
  config?: RippleConfig;
  paused?: boolean;
  renderOverlay?: (props: {
    index: number;
    image: string;
    isTransitioning: boolean;
  }) => React.ReactNode;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULTS: Required<RippleConfig> = {
  simResolution: 256,
  waveSpeed: 1.8,
  velocityDamping: 0.953,
  heightDamping: 0.99,
  springForce: 0.012,
  brushSize: 0.025,
  brushForce: 6.8,
  refraction: 0.56,
  specularIntensity: 3,
  specularPower: 63,
  autoplayInterval: 5000,
  interaction: 'hover',
};

// ---------------------------------------------------------------------------
// Cover-crop: draw image onto offscreen canvas matching container size
// ---------------------------------------------------------------------------

function coverCrop(
  img: HTMLImageElement,
  targetW: number,
  targetH: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d')!;

  const imgAspect = img.naturalWidth / img.naturalHeight;
  const targetAspect = targetW / targetH;

  let srcX = 0;
  let srcY = 0;
  let srcW = img.naturalWidth;
  let srcH = img.naturalHeight;

  if (imgAspect > targetAspect) {
    srcW = Math.round(img.naturalHeight * targetAspect);
    srcX = Math.round((img.naturalWidth - srcW) / 2);
  } else {
    srcH = Math.round(img.naturalWidth / targetAspect);
    srcY = Math.round((img.naturalHeight - srcH) / 2);
  }

  ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, targetW, targetH);
  return canvas;
}

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------

const SIM_VS = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const SIM_FS = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uState;
  uniform vec2 uSimRes;
  uniform vec2 uMouse;
  uniform float uMouseDown;
  uniform float uWaveSpeed;
  uniform float uVelocityDamping;
  uniform float uHeightDamping;
  uniform float uSpringForce;
  uniform float uBrushSize;
  uniform float uBrushForce;

  void main() {
    vec2 px = 1.0 / uSimRes;
    float h = texture2D(uState, vUv).x;
    float v = texture2D(uState, vUv).y;

    float hR = texture2D(uState, vUv + vec2(px.x, 0.0)).x;
    float hL = texture2D(uState, vUv - vec2(px.x, 0.0)).x;
    float hU = texture2D(uState, vUv + vec2(0.0, px.y)).x;
    float hD = texture2D(uState, vUv - vec2(0.0, px.y)).x;

    float laplacian = (hR + hL + hU + hD) * 0.25 - h;

    v += laplacian * uWaveSpeed;
    v *= uVelocityDamping;
    h += v;
    h *= uHeightDamping;
    v -= uSpringForce * h;

    if (uMouseDown > 0.5) {
      float d = distance(vUv, uMouse);
      if (d < uBrushSize) {
        v += uBrushForce * (1.0 - d / uBrushSize);
      }
    }

    gl_FragColor = vec4(h, v, (hR - hL) * 0.5, (hU - hD) * 0.5);
  }
`;

const RENDER_VS = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const RENDER_FS = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uState;
  uniform sampler2D uImage;
  uniform float uRefraction;
  uniform float uSpecularPower;
  uniform float uSpecularIntensity;

  void main() {
    vec4 state = texture2D(uState, vUv);
    vec2 grad = state.zw;

    float mag = length(grad);
    vec2 softGrad = grad * clamp(1.0 - mag * 3.0, 0.2, 1.0);

    vec2 uv = vUv + softGrad * uRefraction;
    uv = clamp(uv, 0.001, 0.999);

    vec3 color = texture2D(uImage, vec2(uv.x, 1.0 - uv.y)).rgb;

    vec3 n = normalize(vec3(-grad.x * 3.0, 1.0, -grad.y * 3.0));
    vec3 light = normalize(vec3(0.4, 0.8, 0.3));
    float spec = pow(max(0.0, dot(n, light)), uSpecularPower);
    color += spec * uSpecularIntensity * vec3(0.98, 0.94, 0.85);

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  }
`;

// ---------------------------------------------------------------------------
// WebGL helpers
// ---------------------------------------------------------------------------

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  src: string,
): WebGLShader | null {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    gl.deleteShader(s);
    return null;
  }
  return s;
}

function linkProgram(
  gl: WebGLRenderingContext,
  vsSrc: string,
  fsSrc: string,
): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  if (!vs || !fs) return null;
  const p = gl.createProgram()!;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    gl.deleteProgram(p);
    return null;
  }
  return p;
}

function createFloatTexture(
  gl: WebGLRenderingContext,
  size: number,
  filter: number,
): WebGLTexture {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

function createImageTexture(
  gl: WebGLRenderingContext,
  filter: number,
): WebGLTexture {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([10, 10, 10, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

function uploadCroppedImage(
  gl: WebGLRenderingContext,
  tex: WebGLTexture,
  img: HTMLImageElement,
  canvasW: number,
  canvasH: number,
  filter: number,
): void {
  const cropped = coverCrop(img, canvasW, canvasH);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cropped);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RippleSurface({
  images,
  currentIndex = 0,
  onIndexChange,
  className = '',
  config = {},
  paused = false,
  renderOverlay,
}: RippleSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [activeIndex, setActiveIndex] = useState(currentIndex);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const cfg = { ...DEFAULTS, ...config };
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  const imagesKey = images.join('\n');
  const stableImages = useRef(images);
  if (stableImages.current.join('\n') !== imagesKey) {
    stableImages.current = images;
  }

  const glRef = useRef<WebGLRenderingContext | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5, down: false });
  const lastMouseTime = useRef(0);
  const isVisibleRef = useRef(true);
  const animFrameRef = useRef(0);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameCountRef = useRef(0);

  const loadedImagesRef = useRef<(HTMLImageElement | null)[]>([]);
  const imageTexturesRef = useRef<WebGLTexture[]>([]);
  const canvasSizeRef = useRef({ w: 0, h: 0 });
  const filterTypeRef = useRef<number>(0);

  const simRef = useRef<{
    program: WebGLProgram;
    tex1: WebGLTexture;
    tex2: WebGLTexture;
    fb1: WebGLFramebuffer;
    fb2: WebGLFramebuffer;
    readTex: WebGLTexture;
    writeFb: WebGLFramebuffer;
  } | null>(null);

  const renderRef = useRef<{
    program: WebGLProgram;
    buffer: WebGLBuffer;
  } | null>(null);

  // ------------------------------------------------------------------
  // Sync external currentIndex
  // ------------------------------------------------------------------
  useEffect(() => {
    if (currentIndex !== activeIndex && currentIndex >= 0 && currentIndex < stableImages.current.length) {
      setActiveIndex(currentIndex);
    }
  }, [currentIndex]);

  // ------------------------------------------------------------------
  // Load source images (kept in memory for re-crop on resize)
  // ------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    const imgs = stableImages.current;
    let loaded = 0;
    const total = imgs.length;
    loadedImagesRef.current = new Array(total).fill(null);

    imgs.forEach((src, i) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (cancelled) return;
        loadedImagesRef.current[i] = img;
        loaded++;

        const gl = glRef.current;
        if (gl && imageTexturesRef.current[i] && canvasSizeRef.current.w > 0) {
          uploadCroppedImage(
            gl,
            imageTexturesRef.current[i],
            img,
            canvasSizeRef.current.w,
            canvasSizeRef.current.h,
            filterTypeRef.current,
          );
        }

        if (loaded === total) setIsLoaded(true);
      };
      img.onerror = () => {
        if (cancelled) return;
        loaded++;
        if (loaded === total) setIsLoaded(true);
      };
      img.src = src;
    });

    return () => { cancelled = true; };
  }, [imagesKey]);

  // ------------------------------------------------------------------
  // Re-crop all loaded images when canvas size changes
  // ------------------------------------------------------------------
  const reCropAll = useCallback(() => {
    const gl = glRef.current;
    if (!gl) return;
    const { w, h } = canvasSizeRef.current;
    if (w === 0 || h === 0) return;

    loadedImagesRef.current.forEach((img, i) => {
      if (img && imageTexturesRef.current[i]) {
        uploadCroppedImage(gl, imageTexturesRef.current[i], img, w, h, filterTypeRef.current);
      }
    });
  }, []);

  // ------------------------------------------------------------------
  // WebGL init + resize
  // ------------------------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // Intersection observer for visibility
    const intObs = new IntersectionObserver(
      ([e]) => { isVisibleRef.current = e.isIntersecting; },
      { threshold: 0.1 },
    );
    intObs.observe(container);

    // --- Sizing helper ---
    const applySize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.floor(rect.width * dpr);
      const h = Math.floor(rect.height * dpr);
      canvas.width = w;
      canvas.height = h;
      canvasSizeRef.current = { w, h };
      if (glRef.current) glRef.current.viewport(0, 0, w, h);
      return { w, h };
    };

    const { w, h } = applySize();

    // --- WebGL context ---
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });

    if (!gl || !gl.getExtension('OES_texture_float')) {
      setUseFallback(true);
      intObs.disconnect();
      return;
    }

    const canUseLinear = !!gl.getExtension('OES_texture_float_linear');
    const filter = canUseLinear ? gl.LINEAR : gl.NEAREST;
    filterTypeRef.current = filter;

    glRef.current = gl;
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);

    // --- Sim textures (square, small) ---
    const simSize = cfgRef.current.simResolution;
    const simTex1 = createFloatTexture(gl, simSize, filter);
    const simTex2 = createFloatTexture(gl, simSize, filter);
    const fb1 = gl.createFramebuffer()!;
    const fb2 = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb1);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, simTex1, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb2);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, simTex2, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // --- Shader programs ---
    const simProg = linkProgram(gl, SIM_VS, SIM_FS);
    const renProg = linkProgram(gl, RENDER_VS, RENDER_FS);
    if (!simProg || !renProg) {
      setUseFallback(true);
      intObs.disconnect();
      return;
    }

    // --- Fullscreen quad buffer ---
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);

    // --- Image textures (one per slide, cover-cropped to canvas size) ---
    const imgs = stableImages.current;
    imageTexturesRef.current = imgs.map(() => createImageTexture(gl, filter));

    // Upload any already-loaded images
    loadedImagesRef.current.forEach((img, i) => {
      if (img && imageTexturesRef.current[i]) {
        uploadCroppedImage(gl, imageTexturesRef.current[i], img, w, h, filter);
      }
    });

    simRef.current = {
      program: simProg,
      tex1: simTex1,
      tex2: simTex2,
      fb1, fb2,
      readTex: simTex1,
      writeFb: fb2,
    };
    renderRef.current = { program: renProg, buffer: buf };

    // --- Resize observer ---
    const resObs = new ResizeObserver(() => {
      applySize();
      reCropAll();
    });
    resObs.observe(container);

    // --- Cleanup ---
    return () => {
      intObs.disconnect();
      resObs.disconnect();
      gl.deleteProgram(simProg);
      gl.deleteProgram(renProg);
      gl.deleteBuffer(buf);
      gl.deleteTexture(simTex1);
      gl.deleteTexture(simTex2);
      gl.deleteFramebuffer(fb1);
      gl.deleteFramebuffer(fb2);
      imageTexturesRef.current.forEach((t) => gl.deleteTexture(t));
      imageTexturesRef.current = [];
      glRef.current = null;
      simRef.current = null;
      renderRef.current = null;
    };
  }, [imagesKey, reCropAll]);

  // ------------------------------------------------------------------
  // Animation loop
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!isLoaded || !glRef.current || !simRef.current || !renderRef.current) return;

    const gl = glRef.current;
    const sim = simRef.current;
    const ren = renderRef.current;

    const posAttrSim = gl.getAttribLocation(sim.program, 'position');
    const posAttrRen = gl.getAttribLocation(ren.program, 'position');

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      if (!isVisibleRef.current || document.hidden) return;
      const { w, h } = canvasSizeRef.current;
      if (w === 0 || h === 0) return;

      frameCountRef.current++;
      if (frameCountRef.current % 2 !== 0) return;

      const c = cfgRef.current;
      const simSize = c.simResolution;

      // --- Simulation pass ---
      gl.bindFramebuffer(gl.FRAMEBUFFER, sim.writeFb);
      gl.viewport(0, 0, simSize, simSize);
      gl.useProgram(sim.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, ren.buffer);
      gl.enableVertexAttribArray(posAttrSim);
      gl.vertexAttribPointer(posAttrSim, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(gl.getUniformLocation(sim.program, 'uSimRes'), simSize, simSize);
      gl.uniform2f(gl.getUniformLocation(sim.program, 'uMouse'), mouseRef.current.x, mouseRef.current.y);
      gl.uniform1f(gl.getUniformLocation(sim.program, 'uMouseDown'), mouseRef.current.down ? 1.0 : 0.0);
      gl.uniform1f(gl.getUniformLocation(sim.program, 'uWaveSpeed'), c.waveSpeed);
      gl.uniform1f(gl.getUniformLocation(sim.program, 'uVelocityDamping'), c.velocityDamping);
      gl.uniform1f(gl.getUniformLocation(sim.program, 'uHeightDamping'), c.heightDamping);
      gl.uniform1f(gl.getUniformLocation(sim.program, 'uSpringForce'), c.springForce);
      gl.uniform1f(gl.getUniformLocation(sim.program, 'uBrushSize'), c.brushSize);
      gl.uniform1f(gl.getUniformLocation(sim.program, 'uBrushForce'), c.brushForce);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sim.readTex);
      gl.uniform1i(gl.getUniformLocation(sim.program, 'uState'), 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // Ping-pong
      if (sim.writeFb === sim.fb1) {
        sim.readTex = sim.tex1;
        sim.writeFb = sim.fb2;
      } else {
        sim.readTex = sim.tex2;
        sim.writeFb = sim.fb1;
      }

      // --- Render pass ---
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      gl.useProgram(ren.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, ren.buffer);
      gl.enableVertexAttribArray(posAttrRen);
      gl.vertexAttribPointer(posAttrRen, 2, gl.FLOAT, false, 0, 0);

      gl.uniform1f(gl.getUniformLocation(ren.program, 'uRefraction'), c.refraction);
      gl.uniform1f(gl.getUniformLocation(ren.program, 'uSpecularPower'), c.specularPower);
      gl.uniform1f(gl.getUniformLocation(ren.program, 'uSpecularIntensity'), c.specularIntensity);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sim.readTex);
      gl.uniform1i(gl.getUniformLocation(ren.program, 'uState'), 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, imageTexturesRef.current[activeIndex]);
      gl.uniform1i(gl.getUniformLocation(ren.program, 'uImage'), 1);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isLoaded, activeIndex]);

  // ------------------------------------------------------------------
  // Autoplay
  // ------------------------------------------------------------------
  useEffect(() => {
    if (paused || !cfgRef.current.autoplayInterval || stableImages.current.length <= 1) {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
      autoplayRef.current = null;
      return;
    }

    autoplayRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % stableImages.current.length;
        onIndexChange?.(next);
        return next;
      });
      setIsTransitioning(true);
      setTimeout(() => setIsTransitioning(false), 400);
    }, cfgRef.current.autoplayInterval);

    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [paused, imagesKey, onIndexChange]);

  // ------------------------------------------------------------------
  // Mouse / touch handlers
  // ------------------------------------------------------------------
  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current || cfgRef.current.interaction === 'none') return;
    const now = performance.now();
    if (now - lastMouseTime.current < 16) return;
    lastMouseTime.current = now;

    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    mouseRef.current.x = (clientX - rect.left) / rect.width;
    mouseRef.current.y = 1.0 - (clientY - rect.top) / rect.height;
    if (cfgRef.current.interaction === 'hover') mouseRef.current.down = true;
  }, []);

  const handlePointerDown = useCallback(() => {
    if (cfgRef.current.interaction !== 'none') mouseRef.current.down = true;
  }, []);

  const handlePointerUp = useCallback(() => {
    mouseRef.current.down = false;
  }, []);

  // ------------------------------------------------------------------
  // Fallback (no WebGL)
  // ------------------------------------------------------------------
  const imgs = stableImages.current;

  if (useFallback) {
    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden bg-[#0a0a0a] ${className}`}
        style={{ width: '100%', height: '100%', minHeight: 'inherit' }}
      >
        {imgs.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${i === activeIndex ? 'opacity-100' : 'opacity-0'}`}
          />
        ))}
        {renderOverlay && (
          <div className="absolute inset-0 pointer-events-none">
            {renderOverlay({ index: activeIndex, image: imgs[activeIndex], isTransitioning: false })}
          </div>
        )}
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-[#0a0a0a] ${className}`}
      onMouseMove={handlePointerMove}
      onMouseDown={handlePointerDown}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchMove={handlePointerMove}
      onTouchStart={handlePointerDown}
      onTouchEnd={handlePointerUp}
      style={{ width: '100%', height: '100%', minHeight: 'inherit' }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block touch-none w-full h-full"
      />
      {renderOverlay && (
        <div className="absolute inset-0 pointer-events-none">
          {renderOverlay({ index: activeIndex, image: imgs[activeIndex], isTransitioning })}
        </div>
      )}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]">
          <div className="w-12 h-12 rounded-full border-2 border-[#d4af37] border-t-transparent animate-spin" />
        </div>
      )}
    </div>
  );
}
