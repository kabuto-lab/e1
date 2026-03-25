/**
 * Water Ripple Shader Component
 * Reusable WebGL water ripple effect
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';

export interface WaterRippleShaderProps {
  imageUrl?: string;
  className?: string;
  onRipple?: (x: number, y: number) => void;
  settings?: {
    waveSpeed?: number;
    refraction?: number;
    specularPower?: number;
    specularIntensity?: number;
    waterTint?: number;
    aberration?: number;
    gradientStrength?: number;
    heightSensitivity?: number;
    brushSize?: number;
    brushForce?: number;
  };
}

const SIM_W = 256;
const SIM_H = 256;

const DEFAULT_SETTINGS = {
  waveSpeed: 1.5,
  velocityDamping: 0.995,
  heightDamping: 0.999,
  springForce: 0.005,
  refraction: 0.03,
  specularPower: 50,
  specularIntensity: 0.4,
  waterTint: 0.15,
  aberration: 0.5,
  gradientStrength: 0.3,
  heightSensitivity: 0.15,
  brushSize: 0.04,
  brushForce: 0.8,
};

// Shader source strings (memoized outside component)
const SIM_VS = `attribute vec2 p;varying vec2 v;void main(){v=p*0.5+0.5;gl_Position=vec4(p,0,1);}`;

const SIM_FS = `precision highp float;
varying vec2 v;
uniform sampler2D s;
uniform vec2 r;
uniform vec2 m;
uniform float md;
uniform float ws;
uniform float vd;
uniform float hd;
uniform float sf;
uniform float bs;
uniform float bf;
void main(){
vec2 px=1.0/r;
float h=texture2D(s,v).x;
float vel=texture2D(s,v).y;
float l=texture2D(s,v-vec2(px.x,0)).x;
float ri=texture2D(s,v+vec2(px.x,0)).x;
float u=texture2D(s,v-vec2(0,px.y)).x;
float d=texture2D(s,v+vec2(0,px.y)).x;
vec2 g=vec2(l-ri,u-d);
float dist=distance(v,m);
float br=smoothstep(bs,bs-0.01,dist);
float f=md*bf*br;
float nh=h+vel*ws;
float lp=(l+ri+u+d)*0.25-h;
float nv=(nh-h)*sf+f;
nv*=vd;
nh+=lp*sf;
nh*=hd;
gl_FragColor=vec4(nh,nv,g.x,g.y);
}`;

const VIS_VS = `attribute vec2 p;varying vec2 v;void main(){v=p*0.5+0.5;gl_Position=vec4(p.x,p.y,0,1);}`;

const VIS_FS = `precision highp float;
varying vec2 v;
uniform sampler2D s;
uniform sampler2D img;
uniform vec2 res;
uniform vec2 ca;
uniform vec2 ia;
uniform float ref;
uniform float sp;
uniform float si;
uniform float wt;
uniform float ab;
uniform float gs;
uniform float hs;
uniform float uvb;
uniform float cc;
uniform float gc;
void main(){
vec4 st=texture2D(s,v);
float h=st.x;
vec2 g=st.zw;
float gm=length(g);
float rs=clamp(1.0-gm*3.0,0.2,1.0);
vec2 sg=g*rs;
float as=ref*ab;
vec2 ao=sg*as;
float imia=ia.x;
float caa=ca.x;
float sc=imia/caa;
vec2 uv=v+sg*ref;
uv.y=(uv.y-0.5)*sc+0.5;
uv=clamp(uv,uvb,1.0-uvb);
vec2 iu=vec2(uv.x,1.0-uv.y);
vec3 cr=texture2D(img,iu+ao*0.5).rgb;
vec3 cg=texture2D(img,iu).rgb;
vec3 cb=texture2D(img,iu-ao*0.5).rgb;
vec3 col=vec3(cr.r,cg.g,cb.b);
vec3 n=normalize(vec3(-g.x*3.0,1.0,-g.y*3.0));
vec3 ld=normalize(vec3(0.4,0.8,0.3));
float spc=pow(max(0.0,dot(n,ld)),sp);
float hsc=clamp(1.0-gm*2.0,0.4,1.0);
float ts=h*hs*hsc;
float mf=clamp(ts+0.5,0.0,1.0);
vec3 ht=mix(vec3(0),vec3(1),mf);
if(gs>0.0){
float bf=clamp(abs(ts),0.0,gs);
col=mix(col,ht,bf);
}
col+=vec3(spc*si);
col=mix(col,col*vec3(0.9,1.0,1.1),wt);
col=clamp(col,0.0,cc);
gl_FragColor=vec4(col,1);
}`;

export default function WaterRippleShader({
  imageUrl,
  className = '',
  onRipple,
  settings = {},
}: WaterRippleShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const animationFrameRef = useRef<number>(0);
  
  const resourcesRef = useRef<{
    simProgram: WebGLProgram | null;
    visProgram: WebGLProgram | null;
    readTex: WebGLTexture | null;
    writeFb: WebGLFramebuffer | null;
    imageTexture: WebGLTexture | null;
    buffer: WebGLBuffer | null;
    mouse: { x: number; y: number; down: number };
    imageAspect: number;
    imageLoaded: boolean;
    time: number;
    config: typeof DEFAULT_SETTINGS;
  }>({
    simProgram: null,
    visProgram: null,
    readTex: null,
    writeFb: null,
    imageTexture: null,
    buffer: null,
    mouse: { x: 0.5, y: 0.5, down: 0 },
    imageAspect: 1,
    imageLoaded: false,
    time: 0,
    config: DEFAULT_SETTINGS,
  });

  // Memoize config to prevent re-renders
  const configRef = useRef({ ...DEFAULT_SETTINGS, ...settings });
  configRef.current = { ...DEFAULT_SETTINGS, ...settings };

  const createShader = useCallback((gl: WebGLRenderingContext, type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }, []);

  const createProgram = useCallback((gl: WebGLRenderingContext, vs: string, fs: string) => {
    const program = gl.createProgram();
    if (!program) return null;
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vs);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fs);
    if (!vertexShader || !fragmentShader) return null;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program error:', gl.getProgramInfoLog(program));
      return null;
    }
    return program;
  }, [createShader]);

  const createFloatTexture = useCallback((gl: WebGLRenderingContext) => {
    const tex = gl.createTexture();
    if (!tex) return null;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    const data = new Float32Array(SIM_W * SIM_H * 4);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SIM_W, SIM_H, 0, gl.RGBA, gl.FLOAT, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }, []);

  const createFramebuffer = useCallback((gl: WebGLRenderingContext, texture: WebGLTexture) => {
    const fb = gl.createFramebuffer();
    if (!fb) return null;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      console.error('Framebuffer incomplete:', status);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return fb;
  }, []);

  const loadImage = useCallback((src: string) => {
    const gl = glRef.current;
    const resources = resourcesRef.current;
    if (!gl || !resources.imageTexture) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      resources.imageAspect = img.width / img.height;
      gl.bindTexture(gl.TEXTURE_2D, resources.imageTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      resources.imageLoaded = true;
      console.log('✅ Water shader image loaded');
    };
    
    img.onerror = () => {
      console.warn('⚠️ Failed to load image, using fallback');
      const size = 512;
      const data = new Uint8Array(size * size * 4);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const idx = (y * size + x) * 4;
          const t = y / size;
          data[idx] = Math.floor(100 + t * 50);
          data[idx + 1] = Math.floor(50 + t * 100);
          data[idx + 2] = Math.floor(150 - t * 50);
          data[idx + 3] = 255;
        }
      }
      gl.bindTexture(gl.TEXTURE_2D, resources.imageTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
      resources.imageLoaded = true;
    };
    
    img.src = src;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    glRef.current = gl;

    const ext = gl.getExtension('OES_texture_float');
    if (!ext) {
      console.error('OES_texture_float not supported');
      return;
    }

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const simProgram = createProgram(gl, SIM_VS, SIM_FS);
    const visProgram = createProgram(gl, VIS_VS, VIS_FS);

    if (!simProgram || !visProgram) {
      console.error('Failed to create shader programs');
      return;
    }

    const tex1 = createFloatTexture(gl);
    const tex2 = createFloatTexture(gl);
    const fb1 = tex1 ? createFramebuffer(gl, tex1) : null;
    const fb2 = tex2 ? createFramebuffer(gl, tex2) : null;

    if (!tex1 || !tex2 || !fb1 || !fb2) {
      console.error('Failed to create textures or framebuffers');
      return;
    }

    const imageTexture = gl.createTexture();
    if (imageTexture) {
      gl.bindTexture(gl.TEXTURE_2D, imageTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    // Store config in resources
    resourcesRef.current = {
      simProgram,
      visProgram,
      readTex: tex1,
      writeFb: fb1,
      imageTexture,
      buffer,
      mouse: { x: 0.5, y: 0.5, down: 0 },
      imageAspect: 1,
      imageLoaded: false,
      time: 0,
      config: configRef.current,
    };

    if (imageUrl) {
      loadImage(imageUrl);
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      resourcesRef.current.mouse.x = x;
      resourcesRef.current.mouse.y = y;
      // Always trigger ripples on mouse move (not just when clicking)
      resourcesRef.current.mouse.down = 1;
      if (onRipple) {
        onRipple(x, y);
      }
    };

    const handleMouseDown = () => { resourcesRef.current.mouse.down = 1; };
    const handleMouseUp = () => { resourcesRef.current.mouse.down = 0; };
    const handleMouseLeave = () => { resourcesRef.current.mouse.down = 0; };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('touchstart', handleMouseDown);
    canvas.addEventListener('touchend', handleMouseUp);
    canvas.addEventListener('touchmove', (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      resourcesRef.current.mouse.x = (touch.clientX - rect.left) / rect.width;
      resourcesRef.current.mouse.y = 1.0 - (touch.clientY - rect.top) / rect.height;
      resourcesRef.current.mouse.down = 1;
    }, { passive: false });

    let readTex = tex1;
    let writeFb = fb1;
    let lastTime = performance.now();

    const animate = () => {
      const now = performance.now();
      const deltaTime = (now - lastTime) / 1000;
      lastTime = now;
      resourcesRef.current.time += deltaTime;

      gl.bindFramebuffer(gl.FRAMEBUFFER, writeFb);
      gl.viewport(0, 0, SIM_W, SIM_H);
      gl.useProgram(simProgram);

      gl.bindBuffer(gl.ARRAY_BUFFER, buffer!);
      const simPos = gl.getAttribLocation(simProgram, 'p');
      gl.enableVertexAttribArray(simPos);
      gl.vertexAttribPointer(simPos, 2, gl.FLOAT, false, 0, 0);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, readTex!);
      gl.uniform1i(gl.getUniformLocation(simProgram, 's'), 0);
      gl.uniform2f(gl.getUniformLocation(simProgram, 'r'), SIM_W, SIM_H);
      gl.uniform2f(gl.getUniformLocation(simProgram, 'm'), resourcesRef.current.mouse.x, resourcesRef.current.mouse.y);
      gl.uniform1f(gl.getUniformLocation(simProgram, 'md'), resourcesRef.current.mouse.down);
      gl.uniform1f(gl.getUniformLocation(simProgram, 'ws'), configRef.current.waveSpeed);
      gl.uniform1f(gl.getUniformLocation(simProgram, 'vd'), configRef.current.velocityDamping);
      gl.uniform1f(gl.getUniformLocation(simProgram, 'hd'), configRef.current.heightDamping);
      gl.uniform1f(gl.getUniformLocation(simProgram, 'sf'), configRef.current.springForce);
      gl.uniform1f(gl.getUniformLocation(simProgram, 'bs'), configRef.current.brushSize);
      gl.uniform1f(gl.getUniformLocation(simProgram, 'bf'), configRef.current.brushForce);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(visProgram);

      gl.bindBuffer(gl.ARRAY_BUFFER, buffer!);
      const visPos = gl.getAttribLocation(visProgram, 'p');
      gl.enableVertexAttribArray(visPos);
      gl.vertexAttribPointer(visPos, 2, gl.FLOAT, false, 0, 0);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, readTex!);
      gl.uniform1i(gl.getUniformLocation(visProgram, 's'), 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, imageTexture!);
      gl.uniform1i(gl.getUniformLocation(visProgram, 'img'), 1);

      gl.uniform2f(gl.getUniformLocation(visProgram, 'res'), SIM_W, SIM_H);
      gl.uniform2f(gl.getUniformLocation(visProgram, 'ca'), canvas.width / canvas.height, 1);
      gl.uniform2f(gl.getUniformLocation(visProgram, 'ia'), resourcesRef.current.imageAspect, 1);
      gl.uniform1f(gl.getUniformLocation(visProgram, 'ref'), configRef.current.refraction);
      gl.uniform1f(gl.getUniformLocation(visProgram, 'sp'), configRef.current.specularPower);
      gl.uniform1f(gl.getUniformLocation(visProgram, 'si'), configRef.current.specularIntensity);
      gl.uniform1f(gl.getUniformLocation(visProgram, 'wt'), configRef.current.waterTint);
      gl.uniform1f(gl.getUniformLocation(visProgram, 'ab'), configRef.current.aberration);
      gl.uniform1f(gl.getUniformLocation(visProgram, 'gs'), configRef.current.gradientStrength);
      gl.uniform1f(gl.getUniformLocation(visProgram, 'hs'), configRef.current.heightSensitivity);
      gl.uniform1f(gl.getUniformLocation(visProgram, 'uvb'), 0.01);
      gl.uniform1f(gl.getUniformLocation(visProgram, 'cc'), 1.0);
      gl.uniform1f(gl.getUniformLocation(visProgram, 'gc'), 0.3);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      const tempTex = readTex;
      readTex = writeFb === fb1 ? tex2 : tex1;
      writeFb = readTex === tex1 ? fb1 : fb2;

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('touchstart', handleMouseDown);
      canvas.removeEventListener('touchend', handleMouseUp);
    };
  }, [imageUrl, onRipple, createProgram, createFloatTexture, createFramebuffer, loadImage]);

  useEffect(() => {
    if (imageUrl) {
      loadImage(imageUrl);
    }
  }, [imageUrl, loadImage]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ 
        touchAction: 'none',
        background: 'linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d)'
      }}
    />
  );
}
