/**
 * Water Shader Profile Background Component
 * Full-screen water ripple shader with background image slider
 * Based on water_shader_dual.html implementation
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface ShaderSettings {
  // Stability
  gradientClamp: number;
  uvBounds: number;
  colorClamp: number;
  
  // Wave Physics
  waveSpeed: number;
  velocityDamping: number;
  heightDamping: number;
  springForce: number;
  
  // Visual
  refraction: number;
  specularPower: number;
  specularIntensity: number;
  waterTint: number;
  aberration: number;
  
  // Gradient
  gradientMode: number;
  gradientStrength: number;
  heightSensitivity: number;
  
  // Interaction
  brushSize: number;
  brushForce: number;
}

interface WaterShaderProfileProps {
  images: string[];
  shaderSettings?: ShaderSettings;
  onSettingsChange?: (settings: ShaderSettings) => void;
}

const DEFAULT_SETTINGS: ShaderSettings = {
  // Stability
  gradientClamp: 0.30,
  uvBounds: 0.010,
  colorClamp: 1.0,
  
  // Wave Physics
  waveSpeed: 1.5,
  velocityDamping: 0.995,
  heightDamping: 0.999,
  springForce: 0.005,
  
  // Visual
  refraction: 0.030,
  specularPower: 50,
  specularIntensity: 0.40,
  waterTint: 0.15,
  aberration: 0.50,
  
  // Gradient
  gradientMode: 0,
  gradientStrength: 0.30,
  heightSensitivity: 0.15,
  
  // Interaction
  brushSize: 0.040,
  brushForce: 0.8,
};

const SIM_W = 256;
const SIM_H = 256;

export default function WaterShaderProfile({ 
  images = [], 
  shaderSettings: initialSettings,
  onSettingsChange 
}: WaterShaderProfileProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const animationFrameRef = useRef<number>(0);
  const settingsRef = useRef<ShaderSettings>(initialSettings || DEFAULT_SETTINGS);
  
  // WebGL resources
  const resourcesRef = useRef({
    simulationTexture: null as WebGLTexture | null,
    simulationFramebuffer: null as WebGLFramebuffer | null,
    readTexture: null as WebGLTexture | null,
    writeFramebuffer: null as WebGLFramebuffer | null,
    imageTexture: null as WebGLTexture | null,
    simulationProgram: null as WebGLProgram | null,
    visualizationProgram: null as WebGLProgram | null,
    imageAspect: 1,
  });

  // State
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [settings, setSettings] = useState<ShaderSettings>(initialSettings || DEFAULT_SETTINGS);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, down: false });

  // Shader sources
  const simulationVertexShader = `
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
      vUv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const simulationFragmentShader = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uState;
    uniform vec2 uResolution;
    uniform vec2 uMouse;
    uniform float uMouseDown;
    uniform float uGradientClamp;
    uniform float uWaveSpeed;
    uniform float uVelocityDamping;
    uniform float uHeightDamping;
    uniform float uSpringForce;
    uniform float uBrushSize;
    uniform float uBrushForce;

    void main() {
      vec2 pixel = 1.0 / uResolution;
      float height = texture2D(uState, vUv).x;
      float velocity = texture2D(uState, vUv).y;
      
      float hRight = texture2D(uState, vUv + vec2(pixel.x, 0.0)).x;
      float hLeft  = texture2D(uState, vUv - vec2(pixel.x, 0.0)).x;
      float hUp    = texture2D(uState, vUv + vec2(0.0, pixel.y)).x;
      float hDown  = texture2D(uState, vUv - vec2(0.0, pixel.y)).x;
      
      float laplacian = (hRight + hLeft + hUp + hDown) * 0.25 - height;
      velocity += laplacian * uWaveSpeed;
      velocity *= uVelocityDamping;
      height += velocity;
      height *= uHeightDamping;
      velocity -= uSpringForce * height;
      
      if (uMouseDown > 0.5) {
        float dist = distance(vUv, uMouse);
        if (dist < uBrushSize) {
          velocity += uBrushForce * (1.0 - dist / uBrushSize);
        }
      }
      
      float gradX = (hRight - hLeft) * 0.5;
      float gradY = (hUp - hDown) * 0.5;
      gradX = clamp(gradX, -uGradientClamp, uGradientClamp);
      gradY = clamp(gradY, -uGradientClamp, uGradientClamp);
      
      gl_FragColor = vec4(height, velocity, gradX, gradY);
    }
  `;

  const visualizationFragmentShader = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uState;
    uniform sampler2D uImage;
    uniform vec2 uCanvasAspect;
    uniform vec2 uImageAspect;
    uniform float uGradientClamp;
    uniform float uUVBounds;
    uniform float uColorClamp;
    uniform float uRefraction;
    uniform float uSpecularPower;
    uniform float uSpecularIntensity;
    uniform float uWaterTint;
    uniform float uAberration;
    uniform int uGradientMode;
    uniform float uGradientStrength;
    uniform float uHeightSensitivity;

    void main() {
      vec4 state = texture2D(uState, vUv);
      float height = state.x;
      vec2 gradient = state.zw;
      float gradMagnitude = length(gradient);
      
      float refractionScale = clamp(1.0 - gradMagnitude * 3.0, 0.2, 1.0);
      vec2 softGradient = gradient * refractionScale;
      
      float aberrationStrength = uRefraction * uAberration;
      vec2 aberrationOffset = softGradient * aberrationStrength;
      
      float scale = uImageAspect.x / uCanvasAspect.x;
      vec2 uv = vUv + softGradient * uRefraction;
      uv.y = (uv.y - 0.5) * scale + 0.5;
      uv = clamp(uv, uUVBounds, 1.0 - uUVBounds);
      
      vec2 imageUV = vec2(uv.x, 1.0 - uv.y);
      vec3 colorR = texture2D(uImage, imageUV + aberrationOffset * 0.5).rgb;
      vec3 colorG = texture2D(uImage, imageUV).rgb;
      vec3 colorB = texture2D(uImage, imageUV - aberrationOffset * 0.5).rgb;
      vec3 color = vec3(colorR.r, colorG.g, colorB.b);
      
      vec3 normal = normalize(vec3(-gradient.x * 3.0, 1.0, -gradient.y * 3.0));
      vec3 lightDir = normalize(vec3(0.4, 0.8, 0.3));
      float specular = pow(max(0.0, dot(normal, lightDir)), uSpecularPower);
      
      vec3 whiteColor = vec3(1.0, 1.0, 1.0);
      vec3 blackColor = vec3(0.0, 0.0, 0.0);
      float heightScale = clamp(1.0 - gradMagnitude * 2.0, 0.4, 1.0);
      float tintStrength = height * uHeightSensitivity * heightScale;
      
      vec3 heightTint;
      if (uGradientMode == 0) {
        heightTint = mix(blackColor, whiteColor, clamp(tintStrength + 0.5, 0.0, 1.0));
      } else if (uGradientMode == 1) {
        heightTint = mix(blackColor, whiteColor, clamp(tintStrength * 0.5 + 0.5, 0.0, 1.0));
      } else if (uGradientMode == 2) {
        heightTint = mix(blackColor, whiteColor, clamp(tintStrength * 2.0 + 0.5, 0.0, 1.0));
      } else if (uGradientMode == 3) {
        heightTint = mix(blackColor, whiteColor, clamp(0.5 - tintStrength, 0.0, 1.0));
      } else {
        heightTint = color;
      }
      
      if (uGradientMode != 4 && uGradientStrength > 0.0) {
        color = mix(color, heightTint, clamp(abs(tintStrength), 0.0, uGradientStrength));
      }
      
      color += vec3(specular * uSpecularIntensity);
      color = mix(color, color * vec3(0.9, 1.0, 1.1), uWaterTint);
      color = clamp(color, 0.0, uColorClamp);
      
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  // Initialize WebGL
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    glRef.current = gl;

    // Enable extensions
    const floatExt = gl.getExtension('OES_texture_float');
    const floatLinearExt = gl.getExtension('OES_texture_float_linear');
    
    if (!floatExt) {
      console.error('Float textures not supported');
      return;
    }

    // Create simulation texture
    const simulationTexture = createFloatTexture(gl);
    const simulationFramebuffer = createFramebuffer(gl, simulationTexture);
    const readTexture = createFloatTexture(gl);
    const writeFramebuffer = createFramebuffer(gl, readTexture);

    // Create image texture
    const imageTexture = gl.createTexture();

    // Create programs
    const simulationProgram = createProgram(gl, simulationVertexShader, simulationFragmentShader);
    const visualizationProgram = createProgram(gl, simulationVertexShader.replace('varying vec2 vUv;', ''), visualizationFragmentShader);

    resourcesRef.current = {
      simulationTexture,
      simulationFramebuffer,
      readTexture,
      writeFramebuffer,
      imageTexture,
      simulationProgram,
      visualizationProgram,
      imageAspect: 1,
    };

    // Load first image
    if (images.length > 0) {
      loadImage(gl, imageTexture, images[0], resourcesRef.current);
    }

    // Handle resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);

    // Start animation
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Cleanup WebGL resources
      if (simulationTexture) gl.deleteTexture(simulationTexture);
      if (simulationFramebuffer) gl.deleteFramebuffer(simulationFramebuffer);
      if (readTexture) gl.deleteTexture(readTexture);
      if (writeFramebuffer) gl.deleteFramebuffer(writeFramebuffer);
      if (imageTexture) gl.deleteTexture(imageTexture);
      if (simulationProgram) gl.deleteProgram(simulationProgram);
      if (visualizationProgram) gl.deleteProgram(visualizationProgram);
    };
  }, []);

  // Load image when index changes
  useEffect(() => {
    const gl = glRef.current;
    const { imageTexture } = resourcesRef.current;
    
    if (gl && imageTexture && images.length > 0) {
      loadImage(gl, imageTexture, images[currentImageIndex], resourcesRef.current);
    }
  }, [currentImageIndex, images]);

  // Update settings
  useEffect(() => {
    settingsRef.current = settings;
    if (onSettingsChange) {
      onSettingsChange(settings);
    }
  }, [settings]);

  // Auto-advance images
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCurrentImageIndex(prev => (prev + 1) % images.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [isPaused, images.length]);

  // Create float texture
  function createFloatTexture(gl: WebGLRenderingContext): WebGLTexture {
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    const data = new Float32Array(SIM_W * SIM_H * 4);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SIM_W, SIM_H, 0, gl.RGBA, gl.FLOAT, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  // Create framebuffer
  function createFramebuffer(gl: WebGLRenderingContext, texture: WebGLTexture): WebGLFramebuffer {
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return fb;
  }

  // Load image into texture
  function loadImage(
    gl: WebGLRenderingContext,
    texture: WebGLTexture,
    src: string,
    resources: typeof resourcesRef.current
  ) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      resources.imageAspect = img.width / img.height;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    };
    img.onerror = () => {
      console.log('Image failed to load, creating fallback');
      createFallbackTexture(gl, texture, resources);
    };
    img.src = src;
  }

  // Create fallback texture
  function createFallbackTexture(
    gl: WebGLRenderingContext,
    texture: WebGLTexture,
    resources: typeof resourcesRef.current
  ) {
    const size = 512;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        data[i] = 100 + Math.sin(x * 0.02) * 50 + Math.sin(y * 0.02) * 50;
        data[i + 1] = 100 + Math.sin(x * 0.03) * 50;
        data[i + 2] = 150 + Math.sin(y * 0.025) * 50;
        data[i + 3] = 255;
      }
    }
    resources.imageAspect = 1;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  // Create shader program
  function createProgram(
    gl: WebGLRenderingContext,
    vertexSource: string,
    fragmentSource: string
  ): WebGLProgram | null {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    
    if (!vertexShader || !fragmentShader) return null;

    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return null;
    }

    return program;
  }

  // Create shader
  function createShader(
    gl: WebGLRenderingContext,
    type: number,
    source: string
  ): WebGLShader | null {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  // Animation loop
  const animate = useCallback(() => {
    const gl = glRef.current;
    const canvas = canvasRef.current;
    const resources = resourcesRef.current;
    
    if (!gl || !canvas || !resources.simulationProgram || !resources.visualizationProgram) {
      animationFrameRef.current = requestAnimationFrame(animate);
      return;
    }

    const settings = settingsRef.current;

    // Simulation pass
    gl.bindFramebuffer(gl.FRAMEBUFFER, resources.writeFramebuffer);
    gl.viewport(0, 0, SIM_W, SIM_H);

    const simProgram = resources.simulationProgram;
    gl.useProgram(simProgram);

    const simPositionLocation = gl.getAttribLocation(simProgram, 'position');
    const simStateLocation = gl.getUniformLocation(simProgram, 'uState');
    const simResolutionLocation = gl.getUniformLocation(simProgram, 'uResolution');
    const simMouseLocation = gl.getUniformLocation(simProgram, 'uMouse');
    const simMouseDownLocation = gl.getUniformLocation(simProgram, 'uMouseDown');
    const simGradientClampLoc = gl.getUniformLocation(simProgram, 'uGradientClamp');
    const simWaveSpeedLoc = gl.getUniformLocation(simProgram, 'uWaveSpeed');
    const simVelocityDampingLoc = gl.getUniformLocation(simProgram, 'uVelocityDamping');
    const simHeightDampingLoc = gl.getUniformLocation(simProgram, 'uHeightDamping');
    const simSpringForceLoc = gl.getUniformLocation(simProgram, 'uSpringForce');
    const simBrushSizeLoc = gl.getUniformLocation(simProgram, 'uBrushSize');
    const simBrushForceLoc = gl.getUniformLocation(simProgram, 'uBrushForce');

    gl.enableVertexAttribArray(simPositionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(simPositionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, resources.readTexture);
    gl.uniform1i(simStateLocation, 0);
    gl.uniform2f(simResolutionLocation, SIM_W, SIM_H);
    gl.uniform2f(simMouseLocation, mousePos.x, mousePos.y);
    gl.uniform1f(simMouseDownLocation, mousePos.down ? 1 : 0);
    gl.uniform1f(simGradientClampLoc, settings.gradientClamp);
    gl.uniform1f(simWaveSpeedLoc, settings.waveSpeed);
    gl.uniform1f(simVelocityDampingLoc, settings.velocityDamping);
    gl.uniform1f(simHeightDampingLoc, settings.heightDamping);
    gl.uniform1f(simSpringForceLoc, settings.springForce);
    gl.uniform1f(simBrushSizeLoc, settings.brushSize);
    gl.uniform1f(simBrushForceLoc, settings.brushForce);

    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    // Swap buffers
    const tempTex = resources.readTexture;
    const tempFb = resources.writeFramebuffer;
    resources.readTexture = resources.simulationTexture;
    resources.writeFramebuffer = resources.simulationFramebuffer;
    resources.simulationTexture = tempTex;
    resources.simulationFramebuffer = tempFb;

    // Visualization pass
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);

    const visProgram = resources.visualizationProgram;
    gl.useProgram(visProgram);

    const visPositionLocation = gl.getAttribLocation(visProgram, 'position');
    const visStateLocation = gl.getUniformLocation(visProgram, 'uState');
    const visImageLocation = gl.getUniformLocation(visProgram, 'uImage');
    const visCanvasAspectLocation = gl.getUniformLocation(visProgram, 'uCanvasAspect');
    const visImageAspectLocation = gl.getUniformLocation(visProgram, 'uImageAspect');
    const visGradientClampLoc = gl.getUniformLocation(visProgram, 'uGradientClamp');
    const visUVBoundsLoc = gl.getUniformLocation(visProgram, 'uUVBounds');
    const visColorClampLoc = gl.getUniformLocation(visProgram, 'uColorClamp');
    const visRefractionLoc = gl.getUniformLocation(visProgram, 'uRefraction');
    const visSpecularPowerLoc = gl.getUniformLocation(visProgram, 'uSpecularPower');
    const visSpecularIntensityLoc = gl.getUniformLocation(visProgram, 'uSpecularIntensity');
    const visWaterTintLoc = gl.getUniformLocation(visProgram, 'uWaterTint');
    const visAberrationLoc = gl.getUniformLocation(visProgram, 'uAberration');
    const visGradientModeLoc = gl.getUniformLocation(visProgram, 'uGradientMode');
    const visGradientStrengthLoc = gl.getUniformLocation(visProgram, 'uGradientStrength');
    const visHeightSensitivityLoc = gl.getUniformLocation(visProgram, 'uHeightSensitivity');

    gl.enableVertexAttribArray(visPositionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(visPositionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, resources.readTexture);
    gl.uniform1i(visStateLocation, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, resources.imageTexture);
    gl.uniform1i(visImageLocation, 1);

    gl.uniform2f(visCanvasAspectLocation, canvas.width, canvas.height);
    gl.uniform2f(visImageAspectLocation, resources.imageAspect, 1);
    gl.uniform1f(visGradientClampLoc, settings.gradientClamp);
    gl.uniform1f(visUVBoundsLoc, settings.uvBounds);
    gl.uniform1f(visColorClampLoc, settings.colorClamp);
    gl.uniform1f(visRefractionLoc, settings.refraction);
    gl.uniform1f(visSpecularPowerLoc, settings.specularPower);
    gl.uniform1f(visSpecularIntensityLoc, settings.specularIntensity);
    gl.uniform1f(visWaterTintLoc, settings.waterTint);
    gl.uniform1f(visAberrationLoc, settings.aberration);
    gl.uniform1i(visGradientModeLoc, settings.gradientMode);
    gl.uniform1f(visGradientStrengthLoc, settings.gradientStrength);
    gl.uniform1f(visHeightSensitivityLoc, settings.heightSensitivity);

    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [mousePos]);

  // Mouse handlers
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1.0 - (e.clientY - rect.top) / rect.height;
    
    setMousePos(prev => ({ ...prev, x, y }));
  }, []);

  const handleMouseDown = useCallback(() => {
    setMousePos(prev => ({ ...prev, down: true }));
  }, []);

  const handleMouseUp = useCallback(() => {
    setMousePos(prev => ({ ...prev, down: false }));
  }, []);

  // Touch handlers
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = (touch.clientX - rect.left) / rect.width;
    const y = 1.0 - (touch.clientY - rect.top) / rect.height;
    
    setMousePos(prev => ({ ...prev, x, y }));
  }, []);

  const handleTouchStart = useCallback(() => {
    setMousePos(prev => ({ ...prev, down: true }));
  }, []);

  const handleTouchEnd = useCallback(() => {
    setMousePos(prev => ({ ...prev, down: false }));
  }, []);

  // Update setting
  const updateSetting = useCallback((key: keyof ShaderSettings, value: number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // Reset settings
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  // Navigate images
  const prevImage = useCallback(() => {
    setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const nextImage = useCallback(() => {
    setCurrentImageIndex(prev => (prev + 1) % images.length);
  }, [images.length]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      />

      {/* Control Toggle Button */}
      <button
        onClick={() => setShowControls(!showControls)}
        className="fixed top-4 right-4 z-50 w-12 h-12 bg-black/50 backdrop-blur-md border border-white/20 rounded-lg flex items-center justify-center text-white hover:bg-black/70 transition-all"
      >
        {showControls ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        )}
      </button>

      {/* Control Panel */}
      {showControls && (
        <div className="fixed top-0 right-0 h-full w-96 bg-black/95 backdrop-blur-xl border-l border-white/10 overflow-y-auto z-40">
          <div className="p-6 space-y-6">
            <h3 className="text-xl font-bold text-white mb-4">⚙️ Shader Settings</h3>

            {/* Stability */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-cyan-400 uppercase">Stability</h4>
              <SliderControl
                label="Gradient Clamp"
                value={settings.gradientClamp}
                min={0.01}
                max={1.0}
                step={0.01}
                onChange={(v) => updateSetting('gradientClamp', v)}
              />
              <SliderControl
                label="UV Bounds"
                value={settings.uvBounds}
                min={0.001}
                max={0.1}
                step={0.001}
                onChange={(v) => updateSetting('uvBounds', v)}
              />
              <SliderControl
                label="Color Clamp"
                value={settings.colorClamp}
                min={0.5}
                max={2.0}
                step={0.1}
                onChange={(v) => updateSetting('colorClamp', v)}
              />
            </div>

            {/* Wave Physics */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-cyan-400 uppercase">Wave Physics</h4>
              <SliderControl
                label="Wave Speed"
                value={settings.waveSpeed}
                min={0.5}
                max={3.0}
                step={0.1}
                onChange={(v) => updateSetting('waveSpeed', v)}
              />
              <SliderControl
                label="Velocity Damping"
                value={settings.velocityDamping}
                min={0.90}
                max={0.999}
                step={0.001}
                onChange={(v) => updateSetting('velocityDamping', v)}
              />
              <SliderControl
                label="Height Damping"
                value={settings.heightDamping}
                min={0.90}
                max={0.999}
                step={0.001}
                onChange={(v) => updateSetting('heightDamping', v)}
              />
              <SliderControl
                label="Spring Force"
                value={settings.springForce}
                min={0.001}
                max={0.02}
                step={0.001}
                onChange={(v) => updateSetting('springForce', v)}
              />
            </div>

            {/* Visual */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-cyan-400 uppercase">Visual</h4>
              <SliderControl
                label="Refraction"
                value={settings.refraction}
                min={0.01}
                max={0.15}
                step={0.005}
                onChange={(v) => updateSetting('refraction', v)}
              />
              <SliderControl
                label="Specular Power"
                value={settings.specularPower}
                min={10}
                max={100}
                step={5}
                onChange={(v) => updateSetting('specularPower', v)}
              />
              <SliderControl
                label="Specular Intensity"
                value={settings.specularIntensity}
                min={0.0}
                max={1.0}
                step={0.05}
                onChange={(v) => updateSetting('specularIntensity', v)}
              />
              <SliderControl
                label="Water Tint"
                value={settings.waterTint}
                min={0.0}
                max={0.5}
                step={0.05}
                onChange={(v) => updateSetting('waterTint', v)}
              />
              <SliderControl
                label="Aberration"
                value={settings.aberration}
                min={0.0}
                max={1.0}
                step={0.05}
                onChange={(v) => updateSetting('aberration', v)}
              />
            </div>

            {/* Gradient */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-cyan-400 uppercase">Gradient</h4>
              <div className="space-y-2">
                <label className="text-xs text-gray-400">Mode</label>
                <select
                  value={settings.gradientMode}
                  onChange={(e) => updateSetting('gradientMode', parseInt(e.target.value))}
                  className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm"
                >
                  <option value={0}>White → Black</option>
                  <option value={1}>Subtle Overlay</option>
                  <option value={2}>Strong Overlay</option>
                  <option value={3}>Inverted</option>
                  <option value={4}>Disabled</option>
                </select>
              </div>
              <SliderControl
                label="Strength"
                value={settings.gradientStrength}
                min={0.0}
                max={1.0}
                step={0.05}
                onChange={(v) => updateSetting('gradientStrength', v)}
              />
              <SliderControl
                label="Height Sensitivity"
                value={settings.heightSensitivity}
                min={0.05}
                max={0.5}
                step={0.01}
                onChange={(v) => updateSetting('heightSensitivity', v)}
              />
            </div>

            {/* Interaction */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-cyan-400 uppercase">Interaction</h4>
              <SliderControl
                label="Brush Size"
                value={settings.brushSize}
                min={0.01}
                max={0.15}
                step={0.005}
                onChange={(v) => updateSetting('brushSize', v)}
              />
              <SliderControl
                label="Brush Force"
                value={settings.brushForce}
                min={0.1}
                max={3.0}
                step={0.1}
                onChange={(v) => updateSetting('brushForce', v)}
              />
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <button
                onClick={resetSettings}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-semibold hover:opacity-90 transition-all"
              >
                🔄 Reset to Defaults
              </button>
              <button
                onClick={() => {
                  const json = JSON.stringify(settings, null, 2);
                  navigator.clipboard.writeText(json);
                  alert('Settings copied to clipboard!');
                }}
                className="w-full py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-all"
              >
                📋 Export JSON
              </button>
              <button
                onClick={() => {
                  const json = prompt('Paste settings JSON:');
                  if (json) {
                    try {
                      const parsed = JSON.parse(json);
                      setSettings(parsed);
                    } catch (e) {
                      alert('Invalid JSON');
                    }
                  }
                }}
                className="w-full py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-all"
              >
                📥 Import JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Navigation */}
      {images.length > 1 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3 bg-black/70 backdrop-blur-md rounded-full border border-white/10">
          <button
            onClick={prevImage}
            className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
          >
            ◀
          </button>
          <span className="text-white text-sm font-mono min-w-[80px] text-center">
            {currentImageIndex + 1} / {images.length}
          </span>
          <button
            onClick={nextImage}
            className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
          >
            ▶
          </button>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${
              isPaused ? 'bg-yellow-500/30 text-yellow-400' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {isPaused ? '▶' : '⏸'}
          </button>
        </div>
      )}
    </div>
  );
}

// Slider Control Component
interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function SliderControl({ label, value, min, max, step, onChange }: SliderControlProps) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs text-gray-400 min-w-[100px]">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:appearance-none"
      />
      <span className="text-xs text-cyan-400 font-mono w-12 text-right">{value.toFixed(3)}</span>
    </div>
  );
}
