'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Enhanced water shader — experimental                              */
/* ------------------------------------------------------------------ */

const QUAD_VS = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

// 6 splash points: 0-2 pointer, 3-5 audio-driven
const NUM_SPLASHES = 6;
const SIM_FS = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uState;
  uniform vec2 uSimRes;

  uniform vec2  uSplash0; uniform float uSize0; uniform float uForce0; uniform float uActive0;
  uniform vec2  uSplash1; uniform float uSize1; uniform float uForce1; uniform float uActive1;
  uniform vec2  uSplash2; uniform float uSize2; uniform float uForce2; uniform float uActive2;
  uniform vec2  uSplash3; uniform float uSize3; uniform float uForce3; uniform float uActive3;
  uniform vec2  uSplash4; uniform float uSize4; uniform float uForce4; uniform float uActive4;
  uniform vec2  uSplash5; uniform float uSize5; uniform float uForce5; uniform float uActive5;

  uniform float uWaveSpeed;
  uniform float uDamping;

  void applySplash(vec2 pos, float size, float force, float active, inout float v) {
    if (active > 0.5) {
      float d = distance(vUv, pos);
      if (d < size) {
        float f = 1.0 - d / size;
        v += force * f * f;
      }
    }
  }

  void main() {
    vec2 px = 1.0 / uSimRes;
    float h = texture2D(uState, vUv).x;
    float v = texture2D(uState, vUv).y;

    float hR = texture2D(uState, vUv + vec2(px.x, 0.0)).x;
    float hL = texture2D(uState, vUv - vec2(px.x, 0.0)).x;
    float hU = texture2D(uState, vUv + vec2(0.0, px.y)).x;
    float hD = texture2D(uState, vUv - vec2(0.0, px.y)).x;

    float hTR = texture2D(uState, vUv + vec2(px.x, px.y)).x;
    float hTL = texture2D(uState, vUv + vec2(-px.x, px.y)).x;
    float hBR = texture2D(uState, vUv + vec2(px.x, -px.y)).x;
    float hBL = texture2D(uState, vUv + vec2(-px.x, -px.y)).x;

    float laplacian = (hR + hL + hU + hD) * 0.2 + (hTR + hTL + hBR + hBL) * 0.05 - h;

    v += laplacian * uWaveSpeed;
    v *= uDamping;
    h += v;
    h *= 0.999;

    applySplash(uSplash0, uSize0, uForce0, uActive0, v);
    applySplash(uSplash1, uSize1, uForce1, uActive1, v);
    applySplash(uSplash2, uSize2, uForce2, uActive2, v);
    applySplash(uSplash3, uSize3, uForce3, uActive3, v);
    applySplash(uSplash4, uSize4, uForce4, uActive4, v);
    applySplash(uSplash5, uSize5, uForce5, uActive5, v);

    gl_FragColor = vec4(h, v, (hR - hL) * 0.5, (hU - hD) * 0.5);
  }
`;

const RENDER_FS = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uState;
  uniform sampler2D uImage;
  uniform sampler2D uImageB;
  uniform float uMix;
  uniform float uTime;
  uniform float uSpecIntensity;
  uniform sampler2D uOverlay;
  uniform vec4 uKBA;
  uniform vec4 uKBB;
  uniform float uKBProgressA;
  uniform float uKBProgressB;

  const float REFRACTION = 0.5;
  const float CHROMATIC = 0.012;
  const float SPEC_POWER = 80.0;
  const float FRESNEL_POWER = 3.0;
  const vec3 WATER_TINT = vec3(0.7, 0.85, 1.0);
  const vec3 CAUSTIC_COLOR = vec3(1.0, 0.97, 0.88);

  vec2 applyKB(vec2 uv, float progress, vec4 kb) {
    float zoom = mix(kb.x, kb.y, progress);
    vec2 center = kb.zw;
    return (uv - center) / zoom + center;
  }

  vec3 sampleCA(sampler2D tex, vec2 base, vec2 refract) {
    vec2 ur = clamp(base + refract * (1.0 + CHROMATIC), 0.001, 0.999);
    vec2 ug = clamp(base + refract, 0.001, 0.999);
    vec2 ub = clamp(base + refract * (1.0 - CHROMATIC), 0.001, 0.999);
    return vec3(
      texture2D(tex, vec2(ur.x, 1.0 - ur.y)).r,
      texture2D(tex, vec2(ug.x, 1.0 - ug.y)).g,
      texture2D(tex, vec2(ub.x, 1.0 - ub.y)).b
    );
  }

  float poolCaustic(vec2 uv, float t) {
    vec2 p = uv * 6.0;
    float c = 0.0;
    for (int i = 1; i <= 4; i++) {
      float fi = float(i);
      vec2 q = p * fi * 0.8 + t * vec2(0.25 * fi, 0.18 * fi);
      q += vec2(sin(q.y * 0.7 + t * 0.3 * fi), cos(q.x * 0.6 + t * 0.25 * fi));
      float wave = sin(q.x) * sin(q.y);
      c += wave;
    }
    c = c * 0.25 + 0.5;
    return pow(clamp(c, 0.0, 1.0), 4.0);
  }

  void main() {
    vec4 state = texture2D(uState, vUv);
    vec2 grad = state.zw;
    float height = state.x;

    vec3 normal = normalize(vec3(-grad.x * 4.0, 1.0, -grad.y * 4.0));

    vec2 refract = grad * REFRACTION;
    vec2 kbA = applyKB(vUv, uKBProgressA, uKBA);
    vec2 kbB = applyKB(vUv, uKBProgressB, uKBB);

    vec3 colorA = sampleCA(uImage, kbA, refract);
    vec3 colorB = sampleCA(uImageB, kbB, refract);
    vec3 color = mix(colorA, colorB, uMix);

    vec2 oUv = clamp(vUv + refract, 0.001, 0.999);
    vec4 ovr = texture2D(uOverlay, vec2(oUv.x, 1.0 - oUv.y));
    color = mix(color, ovr.rgb, ovr.a);

    // --- depth tinting (deeper = more blue) ---
    float depth = clamp(-height * 2.0, 0.0, 1.0);
    color = mix(color, color * WATER_TINT, depth * 0.3);

    // --- pool-bottom sun caustics ---
    vec2 causticUv = vUv + grad * 0.3;
    float c1 = poolCaustic(causticUv, uTime * 0.4);
    float c2 = poolCaustic(causticUv * 1.3 + 3.7, uTime * 0.4 + 2.5);
    float caustics = (c1 + c2) * 0.5;
    float activity = clamp(length(grad) * 8.0, 0.0, 1.0);
    float causticMask = mix(0.15, 0.45, activity);
    color += CAUSTIC_COLOR * caustics * causticMask;

    // --- specular: two light sources, only on disturbed water ---
    float specActivity = clamp(length(grad) * 15.0, 0.0, 1.0);
    vec3 view = vec3(0.0, 1.0, 0.0);

    vec3 light1 = normalize(vec3(0.3, 0.8, 0.4));
    vec3 half1 = normalize(light1 + view);
    float spec1 = pow(max(0.0, dot(normal, half1)), SPEC_POWER);

    vec3 light2 = normalize(vec3(-0.5, 0.6, -0.3));
    vec3 half2 = normalize(light2 + view);
    float spec2 = pow(max(0.0, dot(normal, half2)), SPEC_POWER * 0.5) * 0.4;

    vec3 specColor = vec3(0.98, 0.95, 0.86);
    color += (spec1 + spec2) * uSpecIntensity * specColor * specActivity;

    // --- fresnel: edges reflect environment ---
    float fresnel = pow(1.0 - max(0.0, dot(normal, view)), FRESNEL_POWER);
    vec3 envColor = vec3(0.05, 0.07, 0.12);
    color = mix(color, envColor, fresnel * 0.25);

    // --- subtle vignette ---
    float vig = 1.0 - length(vUv - 0.5) * 0.6;
    color *= vig;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  }
`;

/* ------------------------------------------------------------------ */
/*  WebGL helpers                                                     */
/* ------------------------------------------------------------------ */

function compileShader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn('Shader error:', gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

function linkProgram(gl: WebGLRenderingContext, vsSrc: string, fsSrc: string) {
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

function createFloatTex(gl: WebGLRenderingContext, size: number, filter: number) {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

function coverCrop(img: HTMLImageElement, tw: number, th: number) {
  const c = document.createElement('canvas');
  c.width = tw; c.height = th;
  const ctx = c.getContext('2d')!;
  const ia = img.naturalWidth / img.naturalHeight;
  const ta = tw / th;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (ia > ta) { sw = Math.round(sh * ta); sx = Math.round((img.naturalWidth - sw) / 2); }
  else { sh = Math.round(sw / ta); sy = Math.round((img.naturalHeight - sh) / 2); }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, tw, th);
  return c;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

interface Splash {
  x: number;
  y: number;
  size: number;
  force: number;
  active: boolean;
  ttl: number;
}

interface WaterSurfaceProps {
  images: string[];
  currentIndex?: number;
  className?: string;
  specIntensityRef?: React.MutableRefObject<number>;
  audioLevelRef?: React.MutableRefObject<number>;
  autoplayInterval?: number;
  overlayRenderer?: (ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number) => void;
}

export function WaterSurface({
  images, currentIndex = 0, className = '', specIntensityRef, audioLevelRef,
  autoplayInterval = 10000, overlayRenderer,
}: WaterSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [activeIdx, setActiveIdx] = useState(currentIndex);

  const glRef = useRef<WebGLRenderingContext | null>(null);
  const timeRef = useRef(0);
  const splashesRef = useRef<Splash[]>(
    Array.from({ length: NUM_SPLASHES }, () => ({ x: 0, y: 0, size: 0, force: 0, active: false, ttl: 0 }))
  );
  const mousePosRef = useRef({ x: 0.5, y: 0.5, inside: false });
  const mouseDownRef = useRef(false);

  const loadedImgsRef = useRef<(HTMLImageElement | null)[]>([]);
  const imgTexRef = useRef<WebGLTexture[]>([]);
  const sizeRef = useRef({ w: 0, h: 0 });

  const simRef = useRef<any>(null);
  const renRef = useRef<any>(null);
  const rafRef = useRef(0);

  const fadeRef = useRef({ from: 0, to: 0, mix: 0, fading: false });

  const KB_CENTERS: [number, number][] = [
    [0.4, 0.4], [0.6, 0.4], [0.5, 0.5], [0.4, 0.6], [0.6, 0.6],
    [0.35, 0.5], [0.65, 0.5], [0.5, 0.35],
  ];
  const kbConfigsRef = useRef<{ s: number; e: number; cx: number; cy: number }[]>([]);
  const kbRef = useRef({ fromStart: 0, toStart: 0 });
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayTexRef = useRef<WebGLTexture | null>(null);
  const overlayRendererRef = useRef(overlayRenderer);
  overlayRendererRef.current = overlayRenderer;

  const uploadOverlay = useCallback(() => {
    const gl = glRef.current;
    const tex = overlayTexRef.current;
    const renderer = overlayRendererRef.current;
    if (!gl || !tex || !renderer) return;
    const { w, h } = sizeRef.current;
    if (w === 0 || h === 0) return;
    if (!overlayCanvasRef.current) overlayCanvasRef.current = document.createElement('canvas');
    const oc = overlayCanvasRef.current;
    oc.width = w; oc.height = h;
    const ctx = oc.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);
    renderer(ctx, w, h, Math.min(window.devicePixelRatio || 1, 1.5));
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, oc);
  }, []);

  useEffect(() => { setActiveIdx(currentIndex); }, [currentIndex]);

  // autoplay + crossfade timer
  useEffect(() => {
    if (!loaded || images.length <= 1 || autoplayInterval <= 0) return;
    const id = setInterval(() => {
      const f = fadeRef.current;
      if (f.fading) return;
      const next = (f.from + 1) % images.length;
      f.to = next;
      f.mix = 0;
      f.fading = true;
      kbRef.current.toStart = timeRef.current;
    }, autoplayInterval);
    return () => clearInterval(id);
  }, [loaded, images.length, autoplayInterval]);

  // load images
  useEffect(() => {
    let cancelled = false;
    let count = 0;
    loadedImgsRef.current = new Array(images.length).fill(null);
    images.forEach((src, i) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { if (!cancelled) { loadedImgsRef.current[i] = img; if (++count === images.length) setLoaded(true); } };
      img.onerror = () => { if (!cancelled && ++count === images.length) setLoaded(true); };
      img.src = src;
    });
    return () => { cancelled = true; };
  }, [images.join(',')]);

  // WebGL init
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const applySize = () => {
      const r = container.getBoundingClientRect();
      const w = Math.floor(r.width * dpr);
      const h = Math.floor(r.height * dpr);
      canvas.width = w; canvas.height = h;
      sizeRef.current = { w, h };
      if (glRef.current) glRef.current.viewport(0, 0, w, h);
      return { w, h };
    };
    const { w, h } = applySize();

    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'high-performance' });
    if (!gl || !gl.getExtension('OES_texture_float')) { setFallback(true); return; }
    const linExt = !!gl.getExtension('OES_texture_float_linear');
    const filter = linExt ? gl.LINEAR : gl.NEAREST;
    glRef.current = gl;
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);

    const SIM_SIZE = 256;
    const t1 = createFloatTex(gl, SIM_SIZE, filter);
    const t2 = createFloatTex(gl, SIM_SIZE, filter);
    const fb1 = gl.createFramebuffer()!;
    const fb2 = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb1);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t1, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb2);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t2, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    const simProg = linkProgram(gl, QUAD_VS, SIM_FS);
    const renProg = linkProgram(gl, QUAD_VS, RENDER_FS);
    if (!simProg || !renProg) { setFallback(true); return; }

    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);

    imgTexRef.current = images.map(() => {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([10,10,10,255]));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return tex;
    });

    loadedImgsRef.current.forEach((img, i) => {
      if (img && imgTexRef.current[i]) {
        const cropped = coverCrop(img, w, h);
        gl.bindTexture(gl.TEXTURE_2D, imgTexRef.current[i]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cropped);
      }
    });

    const overlayTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, overlayTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    overlayTexRef.current = overlayTex;

    simRef.current = { program: simProg, t1, t2, fb1, fb2, readTex: t1, writeFb: fb2, SIM_SIZE };
    renRef.current = { program: renProg, buffer: buf };

    kbConfigsRef.current = images.map((_, i) => {
      const zoomIn = i % 2 === 0;
      const [cx, cy] = KB_CENTERS[i % KB_CENTERS.length];
      return { s: zoomIn ? 1.0 : 1.10, e: zoomIn ? 1.10 : 1.0, cx, cy };
    });
    kbRef.current = { fromStart: 0, toStart: 0 };

    uploadOverlay();

    const resObs = new ResizeObserver(() => {
      applySize();
      loadedImgsRef.current.forEach((img, i) => {
        if (img && imgTexRef.current[i]) {
          const cropped = coverCrop(img, sizeRef.current.w, sizeRef.current.h);
          gl.bindTexture(gl.TEXTURE_2D, imgTexRef.current[i]);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cropped);
        }
      });
      uploadOverlay();
    });
    resObs.observe(container);

    return () => {
      resObs.disconnect();
      gl.deleteProgram(simProg); gl.deleteProgram(renProg); gl.deleteBuffer(buf);
      gl.deleteTexture(t1); gl.deleteTexture(t2);
      gl.deleteFramebuffer(fb1); gl.deleteFramebuffer(fb2);
      imgTexRef.current.forEach(t => gl.deleteTexture(t));
      if (overlayTexRef.current) gl.deleteTexture(overlayTexRef.current);
      overlayTexRef.current = null;
      glRef.current = null; simRef.current = null; renRef.current = null;
    };
  }, [images.join(','), uploadOverlay]);

  // re-render overlay when fonts finish loading
  useEffect(() => {
    document.fonts.ready.then(() => uploadOverlay());
  }, [uploadOverlay]);

  // re-upload overlay when renderer prop changes
  useEffect(() => {
    overlayRendererRef.current = overlayRenderer;
    uploadOverlay();
  }, [overlayRenderer, uploadOverlay]);

  // upload new images as they load
  useEffect(() => {
    if (!loaded || !glRef.current) return;
    const gl = glRef.current;
    const { w, h } = sizeRef.current;
    loadedImgsRef.current.forEach((img, i) => {
      if (img && imgTexRef.current[i] && w > 0) {
        const cropped = coverCrop(img, w, h);
        gl.bindTexture(gl.TEXTURE_2D, imgTexRef.current[i]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cropped);
      }
    });
  }, [loaded]);

  // animation loop
  useEffect(() => {
    if (!loaded || !glRef.current || !simRef.current || !renRef.current) return;
    const gl = glRef.current;
    const sim = simRef.current;
    const ren = renRef.current;

    const posA = gl.getAttribLocation(sim.program, 'position');
    const posB = gl.getAttribLocation(ren.program, 'position');

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      const { w, h } = sizeRef.current;
      if (w === 0 || h === 0) return;
      timeRef.current += 0.016;

      // decay splash TTLs
      for (const s of splashesRef.current) {
        if (s.active) {
          s.ttl -= 16;
          if (s.ttl <= 0) s.active = false;
        }
      }

      // audio-driven: continuous vibration at mouse position
      const audioLevel = audioLevelRef?.current ?? 0;
      const mouse = mousePosRef.current;
      if (audioLevel > 0.03 && mouse.inside) {
        const sp = splashesRef.current;
        sp[3] = {
          x: mouse.x, y: mouse.y,
          size: 0.02 + audioLevel * 0.05,
          force: audioLevel * 6.0,
          active: true, ttl: 32,
        };
      }

      // sim pass
      gl.bindFramebuffer(gl.FRAMEBUFFER, sim.writeFb);
      gl.viewport(0, 0, sim.SIM_SIZE, sim.SIM_SIZE);
      gl.useProgram(sim.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, ren.buffer);
      gl.enableVertexAttribArray(posA);
      gl.vertexAttribPointer(posA, 2, gl.FLOAT, false, 0, 0);

      const u = (name: string) => gl.getUniformLocation(sim.program, name);
      gl.uniform2f(u('uSimRes'), sim.SIM_SIZE, sim.SIM_SIZE);
      gl.uniform1f(u('uWaveSpeed'), 1.6);
      gl.uniform1f(u('uDamping'), 0.965);

      const sp = splashesRef.current;
      for (let i = 0; i < NUM_SPLASHES; i++) {
        gl.uniform2f(u(`uSplash${i}`), sp[i].x, sp[i].y);
        gl.uniform1f(u(`uSize${i}`), sp[i].size);
        gl.uniform1f(u(`uForce${i}`), sp[i].force);
        gl.uniform1f(u(`uActive${i}`), sp[i].active ? 1 : 0);
      }

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sim.readTex);
      gl.uniform1i(u('uState'), 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      if (sim.writeFb === sim.fb1) { sim.readTex = sim.t1; sim.writeFb = sim.fb2; }
      else { sim.readTex = sim.t2; sim.writeFb = sim.fb1; }

      // render pass
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      gl.useProgram(ren.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, ren.buffer);
      gl.enableVertexAttribArray(posB);
      gl.vertexAttribPointer(posB, 2, gl.FLOAT, false, 0, 0);

      // advance crossfade
      const fade = fadeRef.current;
      if (fade.fading) {
        fade.mix += 0.016 / 1.5;
        if (fade.mix >= 1) {
          fade.mix = 0;
          fade.fading = false;
          fade.from = fade.to;
          kbRef.current.fromStart = kbRef.current.toStart;
          setActiveIdx(fade.to);
        }
      }

      const ur = (name: string) => gl.getUniformLocation(ren.program, name);
      gl.uniform1f(ur('uTime'), timeRef.current);
      gl.uniform1f(ur('uSpecIntensity'), specIntensityRef?.current ?? 2.5);

      const texFrom = imgTexRef.current[fade.from];
      const texTo = imgTexRef.current[fade.fading ? fade.to : fade.from];

      gl.uniform1f(ur('uMix'), fade.fading ? fade.mix : 0);

      // Ken Burns uniforms
      const autoSec = (autoplayInterval || 6000) / 1000;
      const kbDef = { s: 1, e: 1, cx: 0.5, cy: 0.5 };
      const cfgA = kbConfigsRef.current[fade.from] || kbDef;
      const cfgB = kbConfigsRef.current[fade.fading ? fade.to : fade.from] || kbDef;
      const rawA = Math.min(1, (timeRef.current - kbRef.current.fromStart) / autoSec);
      const rawB = fade.fading ? Math.min(1, (timeRef.current - kbRef.current.toStart) / autoSec) : 0;
      const easeA = rawA * rawA * (3 - 2 * rawA);
      const easeB = rawB * rawB * (3 - 2 * rawB);
      gl.uniform4f(ur('uKBA'), cfgA.s, cfgA.e, cfgA.cx, cfgA.cy);
      gl.uniform4f(ur('uKBB'), cfgB.s, cfgB.e, cfgB.cx, cfgB.cy);
      gl.uniform1f(ur('uKBProgressA'), easeA);
      gl.uniform1f(ur('uKBProgressB'), easeB);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sim.readTex);
      gl.uniform1i(ur('uState'), 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, texFrom);
      gl.uniform1i(ur('uImage'), 1);

      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, texTo);
      gl.uniform1i(ur('uImageB'), 2);

      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, overlayTexRef.current);
      gl.uniform1i(ur('uOverlay'), 3);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loaded]);

  const spawnSplashes = useCallback((nx: number, ny: number) => {
    const sp = splashesRef.current;

    // primary — at cursor, consistent params
    sp[0] = { x: nx, y: ny, size: 0.03, force: 5.0, active: true, ttl: 60 };

    // secondary — random offset, random size & force
    const angle2 = Math.random() * Math.PI * 2;
    const dist2 = 0.03 + Math.random() * 0.06;
    sp[1] = {
      x: nx + Math.cos(angle2) * dist2,
      y: ny + Math.sin(angle2) * dist2,
      size: 0.015 + Math.random() * 0.025,
      force: 2.0 + Math.random() * 4.0,
      active: true,
      ttl: 30 + Math.random() * 50,
    };

    // tertiary — farther, weaker, different timing
    const angle3 = Math.random() * Math.PI * 2;
    const dist3 = 0.05 + Math.random() * 0.1;
    sp[2] = {
      x: nx + Math.cos(angle3) * dist3,
      y: ny + Math.sin(angle3) * dist3,
      size: 0.01 + Math.random() * 0.02,
      force: 1.0 + Math.random() * 3.0,
      active: true,
      ttl: 20 + Math.random() * 40,
    };
  }, []);

  const getNorm = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const cy = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: (cx - rect.left) / rect.width, y: 1.0 - (cy - rect.top) / rect.height };
  }, []);

  const trackMouse = useCallback((e: React.MouseEvent) => {
    const p = getNorm(e);
    if (!p) return;
    mousePosRef.current = { x: p.x, y: p.y, inside: true };
    if (mouseDownRef.current) spawnSplashes(p.x, p.y);
  }, [getNorm, spawnSplashes]);

  const handleDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    mouseDownRef.current = true;
    const p = getNorm(e);
    if (!p) return;
    mousePosRef.current = { x: p.x, y: p.y, inside: true };
    spawnSplashes(p.x, p.y);
  }, [getNorm, spawnSplashes]);

  const handleUp = useCallback(() => {
    mouseDownRef.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const p = getNorm(e);
    if (!p) return;
    mousePosRef.current = { x: p.x, y: p.y, inside: true };
    spawnSplashes(p.x, p.y);
  }, [getNorm, spawnSplashes]);

  const handleLeave = useCallback(() => {
    mousePosRef.current.inside = false;
    mouseDownRef.current = false;
  }, []);

  if (fallback) {
    return (
      <div ref={containerRef} className={`relative overflow-hidden bg-[#0a0a0a] ${className}`} style={{ width: '100%', height: '100%' }}>
        {images.map((src, i) => (
          <img key={src} src={src} alt="" className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${i === activeIdx ? 'opacity-100' : 'opacity-0'}`} />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-[#0a0a0a] ${className}`}
      onMouseMove={trackMouse}
      onMouseDown={handleDown}
      onMouseUp={handleUp}
      onMouseLeave={handleLeave}
      onTouchMove={handleTouchMove}
      onTouchStart={handleDown}
      onTouchEnd={handleUp}
      style={{ width: '100%', height: '100%', minHeight: 'inherit' }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block touch-none w-full h-full" />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]">
          <div className="w-12 h-12 rounded-full border-2 border-[#d4af37] border-t-transparent animate-spin" />
        </div>
      )}
    </div>
  );
}
