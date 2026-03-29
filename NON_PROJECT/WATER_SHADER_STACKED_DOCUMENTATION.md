# 💧 Water Shader Stacked - Visual Documentation

## Overview

**`water_shader_stacked.html`** is a dual-layer WebGL water ripple effect system that renders **two independent shader simulations** stacked on top of each other with blend control.

---

## 🎨 Visual Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        VIEWPORT                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  📺 CANVAS 1 (z-index: 2)                             │  │
│  │     Shader 1: Wave Physics                            │  │
│  │     mix-blend-mode: multiply                          │  │
│  │     ┌─────────────────────────────────────────────┐  │  │
│  │     │  📺 CANVAS 2 (z-index: 1)                   │  │  │
│  │     │     Shader 2: Color & Effects               │  │  │
│  │     │                                             │  │  │
│  │     │     ┌───────────────────────────────────┐  │  │  │
│  │     │     │  🖼️ Background Image              │  │  │  │
│  │     │     │     (6 images, auto-rotating)     │  │  │  │
│  │     │     └───────────────────────────────────┘  │  │  │
│  │     └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         RENDER PIPELINE                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SHADER 1 (Left Panel - Blue 💧)          SHADER 2 (Right Panel - Orange 🔥)
│  ┌──────────────────────────────┐         ┌──────────────────────────────┐
│  │  WebGL Context 1             │         │  WebGL Context 2             │
│  │                              │         │                              │
│  │  ┌────────────────────────┐  │         │  ┌────────────────────────┐  │
│  │  │  Simulation Shader     │  │         │  │  Simulation Shader     │  │
│  │  │  - Wave equation       │  │         │  │  - Wave equation       │  │
│  │  │  - Velocity/Height     │  │         │  │  - Velocity/Height     │  │
│  │  │  - Gradient calc       │  │         │  │  - Gradient calc       │  │
│  │  └───────────┬────────────┘  │         │  └───────────┬────────────┘  │
│  │              │               │         │              │               │
│  │              ▼               │         │              ▼               │
│  │  ┌────────────────────────┐  │         │  ┌────────────────────────┐  │
│  │  │  Visualization Shader  │  │         │  │  Visualization Shader  │  │
│  │  │  - Refraction          │  │         │  │  - Refraction          │  │
│  │  │  - Specular lighting   │  │         │  │  - Specular lighting   │  │
│  │  │  - Chromatic aberration│  │         │  │  - Color grading       │  │
│  │  │  - Height-based tint   │  │         │  │  - Saturation/Contrast │  │
│  │  └───────────┬────────────┘  │         │  └───────────┬────────────┘  │
│  │              │               │         │              │               │
│  └──────────────┼───────────────┘         └──────────────┼───────────────┘
│                 │                                        │
│                 └──────────────────┬─────────────────────┘
│                                    │
│                                    ▼
│                    ┌───────────────────────────┐
│                    │  Blend Slider (0-100%)    │
│                    │  Controls Canvas 2 opacity│
│                    └───────────────────────────┘
│
└────────────────────────────────────────────────────────────────────┘
```

---

## 📐 Layer Stack (Z-Order)

```
┌─────────────────────────────────────────────────────────┐
│  Z-INDEX 1001  │  🍔 Burger Buttons (Left + Right)      │
├─────────────────────────────────────────────────────────┤
│  Z-INDEX 1000  │  🎛️ Control Panels (Slide-out)        │
├─────────────────────────────────────────────────────────┤
│  Z-INDEX 100   │  ℹ️ Info Display (Top Center)          │
│  Z-INDEX 100   │  🖼️ Image Slider Controls (Bottom)    │
│  Z-INDEX 100   │  🎚️ Blend Slider (Bottom Center)      │
├─────────────────────────────────────────────────────────┤
│  Z-INDEX 2     │  📺 Canvas 1 (Shader 1 - Multiply)     │
├─────────────────────────────────────────────────────────┤
│  Z-INDEX 1     │  📺 Canvas 2 (Shader 2 - Normal)       │
├─────────────────────────────────────────────────────────┤
│  Z-INDEX 0     │  🖼️ Background (Dark #0a0a0a)         │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

### Ping-Pong Buffer System (Per Shader)

```
Frame N:                              Frame N+1:
┌────────────────────────────┐        ┌────────────────────────────┐
│  READ: tex1  ──┐           │        │  READ: tex2  ──┐           │
│                │           │        │                │           │
│                ▼           │        │                ▼           │
│           [Simulation]     │        │           [Simulation]     │
│                │           │        │                │           │
│                ▼           │        │                ▼           │
│  WRITE: fb1   ──┘          │        │  WRITE: fb2   ──┘          │
│                            │        │                            │
│  SWAP!                     │        │  SWAP!                     │
└────────────────────────────┘        └────────────────────────────┘

Each shader maintains 2 textures + 2 framebuffers
Read from one, write to the other, then swap every frame
```

---

## 🎛️ Control Panel Layout

### LEFT PANEL - Shader 1 (Wave Physics) 💙

```
┌─────────────────────────────────────────┐
│  💧 Shader 1 - Wave Physics             │
├─────────────────────────────────────────┤
│  ⚠️ STABILITY                           │
│  ├─ Gradient Clamp    [====|====] 0.30 │
│  ├─ UV Bounds         [==|========] 0.010│
│  └─ Color Clamp       [====|====] 1.0  │
├─────────────────────────────────────────┤
│  🌊 WAVE PHYSICS                        │
│  ├─ Wave Speed        [===|======] 1.5 │
│  ├─ Velocity Damp     [======|==] 0.995│
│  ├─ Height Damp       [=======|=] 0.999│
│  └─ Spring Force      [=|=========] 0.005│
├─────────────────────────────────────────┤
│  ✨ VISUAL                              │
│  ├─ Refraction        [==|=======] 0.030│
│  ├─ Spec Power        [====|=====] 50  │
│  ├─ Spec Intensity    [====|=====] 0.40│
│  ├─ Water Tint        [==|=======] 0.15│
│  └─ Aberration        [=====|====] 0.50│
├─────────────────────────────────────────┤
│  🎨 GRADIENT                            │
│  ├─ Mode: [White→Black ▼]              │
│  ├─ Strength          [===|======] 0.30│
│  └─ Height Sens       [==|=======] 0.15│
├─────────────────────────────────────────┤
│  🖱️ INTERACTION                         │
│  ├─ Brush Size        [===|======] 0.040│
│  └─ Brush Force       [====|=====] 0.8 │
├─────────────────────────────────────────┤
│  [🔄 Reset Shader 1]                    │
└─────────────────────────────────────────┘
```

### RIGHT PANEL - Shader 2 (Color & Effects) 🧡

```
┌─────────────────────────────────────────┐
│  🔥 Shader 2 - Color & Effects          │
├─────────────────────────────────────────┤
│  ⚠️ STABILITY                           │
│  ├─ Gradient Clamp    [====|====] 0.30 │
│  ├─ UV Bounds         [==|========] 0.010│
│  └─ Color Clamp       [====|====] 1.0  │
├─────────────────────────────────────────┤
│  🌊 WAVE PHYSICS                        │
│  ├─ Wave Speed        [==|=======] 1.2 │
│  ├─ Velocity Damp     [======|==] 0.990│
│  ├─ Height Damp       [=======|=] 0.995│
│  └─ Spring Force      [==|========] 0.008│
├─────────────────────────────────────────┤
│  ✨ VISUAL                              │
│  ├─ Refraction        [===|======] 0.050│
│  ├─ Spec Power        [===|======] 35  │
│  ├─ Spec Intensity    [======|==] 0.60 │
│  ├─ Water Tint        [===|======] 0.25│
│  └─ Aberration        [=======| ] 0.70 │
├─────────────────────────────────────────┤
│  🎨 COLOR GRADING                       │
│  ├─ Saturation        [======|==] 1.30 │
│  ├─ Contrast          [======|==] 1.15 │
│  ├─ Brightness        [=====|===] 1.05 │
│  └─ Warmth            [====|=====] 0.10│
├─────────────────────────────────────────┤
│  🖱️ INTERACTION                         │
│  ├─ Brush Size        [====|=====] 0.060│
│  └─ Brush Force       [======|==] 1.2  │
├─────────────────────────────────────────┤
│  [🔄 Reset Shader 2]                    │
└─────────────────────────────────────────┘
```

---

## 🌊 Wave Physics Explained

### Simulation Shader Algorithm

```glsl
// 1. Sample neighbors
float hRight = texture2D(uState, vUv + vec2(pixel.x, 0.0)).x;
float hLeft  = texture2D(uState, vUv - vec2(pixel.x, 0.0)).x;
float hUp    = texture2D(uState, vUv + vec2(0.0, pixel.y)).x;
float hDown  = texture2D(uState, vUv - vec2(0.0, pixel.y)).x;

// 2. Calculate Laplacian (difference from average)
float laplacian = (hRight + hLeft + hUp + hDown) * 0.25 - height;

// 3. Update velocity from wave force
velocity += laplacian * uWaveSpeed;

// 4. Apply damping (energy loss)
velocity *= uVelocityDamping;
height *= uHeightDamping;

// 5. Apply spring force (restoring force)
velocity -= uSpringForce * height;

// 6. Mouse interaction - add velocity at cursor
if (uMouseDown > 0.5) {
  float dist = distance(vUv, uMouse);
  if (dist < uBrushSize) {
    velocity += uBrushForce * (1.0 - dist / uBrushSize);
  }
}

// 7. Calculate surface gradients for rendering
float gradX = (hRight - hLeft) * 0.5;
float gradY = (hUp - hDown) * 0.5;
```

---

## ✨ Visual Effects Pipeline

### Visualization Shader 1 (Canvas 1)

```
┌─────────────────────────────────────────────────────────────┐
│  INPUT: Height + Gradient from Simulation                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  1. SOFTEN GRADIENT                                         │
│     refractionScale = clamp(1.0 - gradMagnitude * 3.0)      │
│     softGradient = gradient * refractionScale               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  2. CHROMATIC ABERRATION                                    │
│     aberrationOffset = softGradient * uRefraction * uAberr  │
│     - Red channel:   UV + offset                            │
│     - Green channel: UV (unchanged)                         │
│     - Blue channel:  UV - offset                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  3. IMAGE UV MAPPING                                        │
│     - Scale to image aspect ratio                           │
│     - Apply refraction offset                               │
│     - Flip Y coordinate                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  4. SPECULAR LIGHTING                                       │
│     normal = normalize(vec3(-gradient.x * 3.0, 1.0, -gradient.y * 3.0))
│     lightDir = normalize(vec3(0.4, 0.8, 0.3))
│     specular = pow(dot(normal, lightDir), uSpecularPower)
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  5. HEIGHT-BASED TINT (Gradient Mode)                       │
│     - Mode 0: White → Black (default)                       │
│     - Mode 1: Subtle Overlay                                │
│     - Mode 2: Strong Overlay                                │
│     - Mode 3: Inverted                                      │
│     - Mode 4: Disabled                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  6. WATER TINT                                              │
│     color *= vec3(0.9, 1.0, 1.1)  // Cyan tint              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
                  OUTPUT
```

### Visualization Shader 2 (Canvas 2)

```
┌─────────────────────────────────────────────────────────────┐
│  INPUT: Height + Gradient from Simulation                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  1-4. Same as Shader 1 (Refraction, Aberration, UV, Spec)  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  5. WATER TINT                                              │
│     color *= vec3(0.9, 1.0, 1.1)                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  6. SATURATION                                              │
│     gray = dot(color, vec3(0.299, 0.587, 0.114))
│     color = mix(vec3(gray), color, uSaturation)
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  7. CONTRAST                                                │
│     color = (color - 0.5) * uContrast + 0.5
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  8. BRIGHTNESS                                              │
│     color *= uBrightness
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  9. WARMTH (Color Temperature)                              │
│     color.r += uWarmth * 0.3  // Add red                   │
│     color.b -= uWarmth * 0.3  // Remove blue               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
                  OUTPUT
```

---

## 🖱️ Interaction System

### Mouse/Touch Input Flow

```
┌─────────────────────────────────────────────────────────────┐
│  CANVAS 1                    CANVAS 2                       │
│  ┌────────────────────┐      ┌────────────────────┐         │
│  │  mousedown →       │      │  mousedown →       │         │
│  │  mousemove →       │      │  mousemove →       │         │
│  │  mouseup →         │      │  mouseup →         │         │
│  │  touchstart →      │      │  touchstart →      │         │
│  │  touchmove →       │      │  touchmove →       │         │
│  │  touchend →        │      │  touchend →        │         │
│  └─────────┬──────────┘      └─────────┬──────────┘         │
│            │                           │                     │
│            └─────────────┬─────────────┘                     │
│                          │                                   │
│                          ▼                                   │
│            ┌───────────────────────────┐                    │
│            │  Shared Mouse State       │                    │
│            │  { x: 0-1, y: 0-1, down } │                    │
│            └───────────────────────────┘                    │
│                          │                                   │
│                          ▼                                   │
│            Both shaders receive same mouse position          │
│            Each applies its own brush size/force             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🖼️ Image System

### Image Slider Controls

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ◀  [  3 / 6  ]  ❚❚  ▶                                    │
│   │       │         │   │                                   │
│   │       │         │   └─ Next Image                      │
│   │       │         └───── Pause/Play Autoplay             │
│   │       └─────────────── Current / Total                 │
│   └─────────────────────── Previous Image                  │
│                                                             │
│   ════════════════════════════  (Progress Bar)             │
│   0% ──────────────────────> 100% (6 seconds)              │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Image List (6 images):
1. fra.jpg
2. ripples_images/slide1.jpg
3. ripples_images/slide2.jpg
4. ripples_images/slide3.jpg
5. ripples_images/slide4.jpg
6. ripples_images/slide5.jpg

Autoplay: 6 seconds per image (pausable)
```

---

## 🎚️ Blend Control

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   Shader 1 ────[🔘]──── Shader 2                           │
│   (Blue)      50%      (Orange)                            │
│                                                             │
│   Canvas 1 Opacity = 1 - blendValue                         │
│   Canvas 2 Opacity = blendValue                             │
│                                                             │
│   blendValue = 0.0  →  Only Canvas 1 visible                │
│   blendValue = 0.5  →  Both equally visible                 │
│   blendValue = 1.0  →  Only Canvas 2 visible                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Uniform Parameters Reference

### Shared Parameters (Both Shaders)

| Parameter | Range | Default S1 | Default S2 | Description |
|-----------|-------|------------|------------|-------------|
| **Gradient Clamp** | 0.01-1.0 | 0.30 | 0.30 | Max gradient value for stability |
| **UV Bounds** | 0.001-0.1 | 0.010 | 0.010 | Edge padding to prevent UV overflow |
| **Color Clamp** | 0.5-2.0 | 1.0 | 1.0 | Max output color value |
| **Wave Speed** | 0.5-3.0 | 1.5 | 1.2 | How fast waves propagate |
| **Velocity Damping** | 0.90-0.999 | 0.995 | 0.990 | Velocity energy loss per frame |
| **Height Damping** | 0.90-0.999 | 0.999 | 0.995 | Height energy loss per frame |
| **Spring Force** | 0.001-0.02 | 0.005 | 0.008 | Restoring force pulling to zero |
| **Refraction** | 0.01-0.15 | 0.030 | 0.050 | UV distortion strength |
| **Specular Power** | 10-100 | 50 | 35 | Shininess exponent |
| **Specular Intensity** | 0.0-1.0 | 0.40 | 0.60 | Highlight brightness |
| **Water Tint** | 0.0-0.5 | 0.15 | 0.25 | Cyan tint strength |
| **Aberration** | 0.0-1.0 | 0.50 | 0.70 | RGB channel separation |
| **Brush Size** | 0.01-0.15 | 0.040 | 0.060 | Mouse interaction radius |
| **Brush Force** | 0.1-3.0 | 0.8 | 1.2 | Ripple strength from mouse |

### Shader 1 Exclusive

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| **Gradient Mode** | 0-4 | 0 | Height-based tint pattern |
| **Gradient Strength** | 0.0-1.0 | 0.30 | How much tint mixes with image |
| **Height Sensitivity** | 0.05-0.5 | 0.15 | How much height affects tint |

### Shader 2 Exclusive

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| **Saturation** | 0.0-2.0 | 1.30 | Color intensity (0 = grayscale) |
| **Contrast** | 0.5-2.0 | 1.15 | Color contrast (1 = unchanged) |
| **Brightness** | 0.5-1.5 | 1.05 | Overall brightness multiplier |
| **Warmth** | -0.3-0.3 | 0.10 | Color temperature (- = cool, + = warm) |

---

## 🔧 Technical Specifications

### WebGL Setup

```javascript
Canvas 1:  WebGL Context 1
Canvas 2:  WebGL Context 2
Resolution:  Window innerWidth × innerHeight
Simulation:  256 × 256 (low-res physics grid)

Texture Format: RGBA Float32 (OES_texture_float)
Filtering: NEAREST for simulation, LINEAR for visualization
```

### Ping-Pong Buffers

```javascript
// Per shader configuration
readTex  →  tex1 or tex2 (current state)
writeFb  →  fb1 or fb2 (next state)

// Every frame:
1. Simulate: readTex → writeFb
2. Swap: readTex = writeFb's texture, writeFb = other framebuffer
3. Visualize: readTex → screen
```

### Render Loop Order

```
1. [SHADER 1] Simulation pass (256×256 framebuffer)
2. [SHADER 2] Simulation pass (256×256 framebuffer)
3. [SHADER 1] Visualization pass (full screen canvas)
4. [SHADER 2] Visualization pass (full screen canvas)
5. Swap ping-pong buffers for both shaders
6. Repeat (requestAnimationFrame)
```

---

## 🎯 Use Cases

### When to Use This vs Other Water Shader Files

| File | Purpose | Best For |
|------|---------|----------|
| `water_shader_stacked.html` | **Dual independent shaders** with blend control | Comparing/tweaking two shader configurations simultaneously |
| `testpage_constant.html` | Single shader with physics tweak panel | Fine-tuning wave physics parameters |
| `water_shader_test.html` | Single shader test | Basic shader testing |
| `water_shader_dual.html` | Dual shaders (different config) | Alternative dual-shader setup |

---

## 📝 Summary

**`water_shader_stacked.html`** provides:

✅ **Two independent WebGL contexts** running separate shader simulations  
✅ **Real-time blend control** between the two shaders  
✅ **Separate control panels** (left = blue wave physics, right = orange color grading)  
✅ **Shared mouse input** affecting both shaders simultaneously  
✅ **Image slideshow** with 6 images, auto-rotation, and manual navigation  
✅ **Comprehensive parameter control** for stability, physics, visuals, and interaction  
✅ **Ping-pong buffer system** for stable wave simulation  
✅ **Advanced visual effects**: refraction, specular lighting, chromatic aberration, color grading  

This is the **most advanced** water shader demo in the project, designed for **A/B testing shader configurations** and **fine-tuning visual parameters** side-by-side.
