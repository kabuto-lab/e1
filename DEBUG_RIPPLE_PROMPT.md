# URGENT: Three.js Liquid Ripple Distortion Effect NOT WORKING - Debug Request

## 🎯 Task Overview

I need you to debug and fix a **Three.js liquid ripple distortion shader** for a premium escort platform slider. The effect should create **water-like ripples** that follow mouse movement over model photos, but **currently NO ripples are visible**.

---

## 📋 Project Context

**Platform:** Lovnge - Premium Escort Platform  
**Stack:** Three.js r128 (CDN), vanilla JavaScript, HTML5 Canvas  
**Use Case:** Premium model showcase slider with interactive water ripple distortion  
**Design:** Black (#0a0a0a) + Gold (#d4af37) premium aesthetic

---

## 🐛 Problem Description

### Current Behavior
- ❌ **No visible ripples** when moving mouse over canvas
- ❌ **No distortion effect** on images
- ❌ **Click/splash does nothing**
- ✅ Canvas renders correctly (image displays)
- ✅ FPS counter shows 60fps (rendering works)
- ✅ Navigation works (slide changes function)

### Expected Behavior
- ✅ **Mouse movement** should create expanding circular ripples
- ✅ **Ripples should propagate** like water waves (2-3 second decay)
- ✅ **Image distortion** via refraction shader (normal mapping from height)
- ✅ **Click** should create intense splash (3x amplitude)
- ✅ **60fps performance** on mid-range devices

---

## 🏗️ Current Architecture

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    HTML Canvas                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Three.js Scene (Orthographic Camera)             │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  PlaneGeometry (2x2) + ShaderMaterial       │  │  │
│  │  │  ├─ Vertex Shader: pass-through UV          │  │  │
│  │  │  └─ Fragment Shader: refraction + chromatic │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              RippleSimulation (CPU-based)                │
│  ┌──────────────┐    ┌──────────────┐                   │
│  │ current[]    │◄──►│ previous[]   │ (Float32Array)    │
│  │ (height map) │    │ (height map) │                   │
│  └──────────────┘    └──────────────┘                   │
│                          │                               │
│                          ▼                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Wave Equation:                                  │   │
│  │  new[i] = (avg(neighbors) * 2) - previous[i]    │   │
│  │  new[i] *= damping (0.97)                        │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│            DataTexture (RGBA, 512x512)                   │
│  - Updated every frame from RippleSimulation            │
│  - Sampled in fragment shader for normal calculation    │
└─────────────────────────────────────────────────────────┘
```

### Data Flow (DFD Level 1)

```
[Mouse Move] → [Calculate Velocity] → [Add Ripple to Height Map]
                                              │
                                              ▼
[Animation Loop] → [Update Wave Simulation] → [Update DataTexture]
                                              │
                                              ▼
                                    [Shader Samples Texture]
                                              │
                                              ▼
                                    [Calculate Normal from Gradient]
                                              │
                                              ▼
                                    [Apply Refraction to UV]
                                              │
                                              ▼
                                    [Sample Image with Offset]
                                              │
                                              ▼
                                    [Output Distorted Pixel]
```

---

## 📁 Current Implementation

### 1. Ripple Simulation Class (CPU-based)

```javascript
class RippleSimulation {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.size = width * height;
    
    // Two buffers for wave equation
    this.current = new Float32Array(this.size);
    this.previous = new Float32Array(this.size);
    this.damping = 0.97;
    this.ripples = [];
  }

  addRipple(x, y, strength = 0.5) {
    const idx = Math.floor(y * this.height) * this.width + Math.floor(x * this.width);
    if (idx >= 0 && idx < this.size) {
      this.current[idx] += strength;
      // Also affect neighbors
      this.current[idx - 1] += strength * 0.5;
      this.current[idx + 1] += strength * 0.5;
      this.current[idx - this.width] += strength * 0.5;
      this.current[idx + this.width] += strength * 0.5;
    }
    this.ripples.push({ x, y, strength, age: 0 });
  }

  update() {
    // Swap buffers
    const temp = this.previous;
    this.previous = this.current;
    this.current = temp;
    
    // Wave equation
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const idx = y * this.width + x;
        const left = this.current[idx - 1];
        const right = this.current[idx + 1];
        const top = this.current[idx - this.width];
        const bottom = this.current[idx + this.width];
        
        const average = (left + right + top + bottom) / 4;
        this.previous[idx] = average * 2 - this.previous[idx];
        this.previous[idx] *= this.damping;
      }
    }
    
    return this.previous;
  }
}
```

### 2. DataTexture Creation

```javascript
this.rippleTexture = new THREE.DataTexture(
  new Uint8Array(CONFIG.textureResolution * CONFIG.textureResolution * 4),
  CONFIG.textureResolution,
  CONFIG.textureResolution,
  THREE.RGBAFormat
);
this.rippleTexture.needsUpdate = true;
```

### 3. Texture Update (called every frame)

```javascript
updateRippleTexture() {
  const data = this.rippleSim.update();
  const textureData = this.rippleTexture.image.data;
  
  for (let i = 0; i < this.size; i++) {
    const value = Math.floor((data[i] + 1) / 2 * 255);
    textureData[i * 4] = value;     // R
    textureData[i * 4 + 1] = value; // G
    textureData[i * 4 + 2] = value; // B
    textureData[i * 4 + 3] = 255;   // A
  }
  
  this.rippleTexture.needsUpdate = true;
}
```

### 4. Fragment Shader

```glsl
uniform sampler2D uTexture;
uniform sampler2D uRippleTexture;
uniform vec2 uTexel;
uniform float uRippleStrength;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  
  // Sample ripple height
  float height = texture2D(uRippleTexture, uv).r;
  float hScale = height * 255.0 * uRippleStrength;
  
  // Calculate normal from gradient
  float hL = texture2D(uRippleTexture, uv - vec2(uTexel.x, 0.0)).r;
  float hR = texture2D(uRippleTexture, uv + vec2(uTexel.x, 0.0)).r;
  float hD = texture2D(uRippleTexture, uv - vec2(0.0, uTexel.y)).r;
  float hU = texture2D(uRippleTexture, uv + vec2(0.0, uTexel.y)).r;
  
  vec2 normal = vec2(hL - hR, hD - hU) * 3.0;
  
  // Refraction
  vec2 refractUv = uv + normal * uRippleStrength;
  
  // Chromatic aberration
  vec3 color;
  color.r = texture2D(uTexture, refractUv + normal * 0.015).r;
  color.g = texture2D(uTexture, refractUv).g;
  color.b = texture2D(uTexture, refractUv - normal * 0.015).b;
  
  gl_FragColor = vec4(color, 1.0);
}
```

### 5. Mouse Interaction

```javascript
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = 1.0 - (e.clientY - rect.top) / rect.height;
  
  const velocity = Math.sqrt(
    Math.pow(x - mouse.prevX, 2) + 
    Math.pow(y - mouse.prevY, 2)
  );
  
  if (velocity > 0.003) {
    rippleSim.addRipple(x, y, Math.min(velocity * 3, 0.5));
  }
  
  mouse.prevX = x;
  mouse.prevY = y;
});
```

---

## 🔍 Known Issues & Suspected Problems

### Issue #1: Index Calculation Bug (HIGH PROBABILITY)
```javascript
// CURRENT (WRONG):
const idx = Math.floor(y * this.height) * this.width + Math.floor(x * this.width);

// Should be:
const idx = Math.floor(y * this.width) * this.height + Math.floor(x * this.height);
// OR:
const idx = Math.floor(y) * this.width + Math.floor(x);
```

**Impact:** Ripples being added to wrong array indices → no visible effect

---

### Issue #2: DataTexture Not Updating Properly
- `textureData` is a **view** into the texture's internal data
- Modifying it may not trigger GPU update
- `needsUpdate = true` may not be sufficient

**Suspected fix:** Create new Uint8Array every frame or use `texture.dispose()`

---

### Issue #3: Height Value Range
- Wave equation produces values in range **-1 to 1**
- Converting to 0-255: `Math.floor((data[i] + 1) / 2 * 255)`
- If values are tiny (0.001), they become **0** after conversion
- **Result:** Texture is all black (no height) → no distortion

**Suspected fix:** Amplify height values before conversion:
```javascript
const value = Math.floor(((data[i] * 10) + 1) / 2 * 255);
```

---

### Issue #4: Shader Normal Calculation
- Current: `vec2 normal = vec2(hL - hR, hD - hU) * 3.0;`
- If height values are 0-255 (uint8), gradient is **huge**
- Should normalize or use floating point texture

---

### Issue #5: Texture Sampling Coordinates
- Mouse coords: normalized 0-1
- Array index: pixel coordinates 0-511
- Conversion may be incorrect in `addRipple()`

---

## 🎯 Specific Debug Tasks

### Task 1: Add Debug Visualization
```javascript
// Show ripple height map as overlay
const debugCanvas = document.createElement('canvas');
debugCanvas.width = 512;
debugCanvas.height = 512;
const ctx = debugCanvas.getContext('2d');
const imageData = ctx.createImageData(512, 512);

// Copy ripple data to visible canvas
for (let i = 0; i < size; i++) {
  const value = Math.floor((data[i] + 1) / 2 * 255);
  imageData.data[i * 4] = value;
  imageData.data[i * 4 + 1] = value;
  imageData.data[i * 4 + 2] = value;
  imageData.data[i * 4 + 3] = 255;
}
ctx.putImageData(imageData, 0, 0);
document.body.appendChild(debugCanvas);
```

**Question:** Can you see ripples in the debug canvas when moving mouse?

---

### Task 2: Log Ripple Values
```javascript
// In addRipple():
console.log('Adding ripple at:', x, y, 'strength:', strength, 'index:', idx);
console.log('Value at index:', this.current[idx]);

// In update():
const sampleIdx = Math.floor(0.5 * this.width) * this.height + Math.floor(0.5 * this.width);
console.log('Center value:', this.previous[sampleIdx]);
```

**Question:** Are ripple values being added and propagated?

---

### Task 3: Test Shader Uniforms
```javascript
// In animate loop:
console.log('Ripple texture:', this.material.uniforms.uRippleTexture.value);
console.log('Texture data[0]:', this.rippleTexture.image.data[0]);
```

**Question:** Is the texture being updated with non-zero values?

---

### Task 4: Simplify Shader for Testing
```glsl
// Replace entire fragment shader with:
void main() {
  float height = texture2D(uRippleTexture, vUv).r;
  gl_FragColor = vec4(height, height, height, 1.0);
}
```

**Question:** Do you see ANY grayscale variation when moving mouse?

---

## ✅ Definition of Done

The effect is working when:

1. ✅ **Mouse movement** creates visible circular ripples that expand from cursor
2. ✅ **Ripples propagate** across the image (2-3 seconds decay)
3. ✅ **Image distorts** via refraction (water-like appearance)
4. ✅ **Click creates** intense splash (3x amplitude, larger radius)
5. ✅ **60fps sustained** on desktop, 30fps+ on mobile
6. ✅ **Debug visualization** shows clear ripple height map

---

## 📤 Required Output Format

Please provide:

### 1. Root Cause Analysis
- Which specific bug(s) caused the failure
- Why the current code doesn't work
- Evidence from debug output

### 2. Fixed Implementation
- **Complete working code** (HTML file with embedded JS)
- No placeholders or "TODO" comments
- Production-ready quality

### 3. Debug Steps Taken
- What you tested
- What you measured
- How you verified the fix

### 4. Performance Optimizations
- CPU vs GPU ripple simulation trade-offs
- Texture resolution recommendations
- Frame rate optimization tips

### 5. Alternative Approaches
If CPU-based doesn't work, provide:
- **GPU-based ping-pong framebuffer** implementation
- **Post-processing chain** with EffectComposer
- **Simplified CSS/Canvas fallback**

---

## 🔗 Reference Implementations

### Working Examples to Study:
1. **WebGL Water Ripple:** https://github.com/evanw/webgl-water-ripple
2. **Three.js Ripple Shader:** https://threejs.org/examples/#webgl_shaders_ocean
3. **2D Ripple Effect:** https://www.shadertoy.com/view/ldf3zM

### Key Equations:
```
Wave Equation: ∂²h/∂t² = c²(∂²h/∂x² + ∂²h/∂y²) - damping*∂h/∂t

Discrete Form:
new[i] = (left + right + top + bottom) / 2 - previous[i]
new[i] *= damping

Normal from Height:
normal.x = height(x-1, y) - height(x+1, y)
normal.y = height(x, y-1) - height(x, y+1)

Refraction:
uv_distorted = uv + normal * strength
```

---

## 🚨 Critical Constraints

- **Three.js r128** (CDN version - cannot upgrade)
- **No build tools** - vanilla JS only
- **Must work offline** after initial load
- **Mobile support** - touch events required
- **Russian market** - must work on slow 3G connections

---

## 💡 Success Criteria

**If you can answer these questions, the effect is working:**

1. What is the exact height value at pixel (256, 256) when mouse clicks at center?
2. How many frames does it take for a ripple to decay to 10% amplitude?
3. What is the normal vector at the edge of a ripple?
4. What color does the debug canvas show at rest? During ripple?
5. What is the frame time (ms) for ripple update + render?

---

**Please debug systematically, provide complete working code, and explain WHY each fix works.**
