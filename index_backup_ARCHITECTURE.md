# 📊 index_backup.html — ULTRA-DETAILED ARCHITECTURE MAP

## 🎯 FILE OVERVIEW

| Property | Value |
|----------|-------|
| **File** | `index_backup.html` |
| **Lines** | 984 |
| **Type** | Single-File WebGL Water Ripple Slider |
| **Dependencies** | Three.js (CDN) |
| **Architecture** | MVC + Game Loop |
| **Render Target** | WebGL Canvas (Full Screen) |

---

## 🌳 NODE MIND MAP (Complete Architecture)

```
index_backup.html
│
├── 📄 HTML STRUCTURE (DOM Tree)
│   ├── <head>
│   │   ├── <meta> tags (charset, viewport)
│   │   ├── <title> — "Realistic Water Touch | Lovnge Platform"
│   │   └── <style> — 984 lines of CSS
│   │
│   └── <body>
│       ├── .loading — Full-screen loader
│       │   └── .loader — Spinning animation
│       │
│       ├── .header — Fixed top navigation
│       │   ├── .logo — "Lovnge" brand
│       │   └── #models-grid-btn — "📋 Models" button
│       │
│       ├── .slider-container — Main viewport (100vh)
│       │   ├── #glCanvas — WebGL rendering surface
│       │   ├── .slide-info — Model info overlay (bottom-left)
│       │   │   ├── .slide-tier — VIP/Elite/Premium badge
│       │   │   ├── .slide-name — Model name
│       │   │   └── .slide-subtitle — Age • Location
│       │   │
│       │   ├── .controls — Bottom center controls
│       │   │   ├── .thumbnails — Image strip
│       │   │   └── .pause-btn — Play/Pause toggle
│       │   │
│       │   └── .progress-bar — Autoplay progress
│       │       └── .progress-fill — Animated width
│       │
│       ├── .tweak-panel — Settings panel (top-right)
│       │   ├── .tweak-header — Collapsible title bar
│       │   └── .tweak-content — 15 slider controls
│       │       ├── Wave Physics (6 sliders)
│       │       ├── Image Adjustments (4 sliders)
│       │       └── Image Transform (6 sliders)
│       │
│       └── .models-overlay — Full-screen modal
│           ├── .models-overlay-header
│           └── .models-grid-container
│               └── .models-grid — Card grid
│
│
├── 🎨 CSS STYLESHEET (984 lines)
│   ├── Reset & Base (lines 8-10)
│   ├── Header & Logo (lines 11-14)
│   ├── Slider Container (lines 15-16)
│   ├── Slide Info Overlay (lines 17-20)
│   ├── Controls & Thumbnails (lines 21-26)
│   ├── Progress Bar (lines 27-28)
│   ├── Loading Screen (lines 29-32)
│   ├── Tweak Panel (lines 34-52)
│   ├── Control Groups (lines 54-62)
│   ├── Responsive (line 64)
│   └── Models Overlay (lines 67-82)
│
│
├── ⚙️ JAVASCRIPT APPLICATION
│   │
│   ├── 📦 DATA LAYER
│   │   ├── SLIDES[] — Array of 4 model objects
│   │   │   ├── id, slug, name, age, tier, location, imageUrl
│   │   │
│   │   └── CONFIG — Global configuration object
│   │       ├── simResolution: 256 (water simulation grid)
│   │       ├── waveSpeed, velocityDamping, heightDamping
│   │       ├── springForce, brushSize, brushForce
│   │       ├── refraction, specularPower, specularIntensity
│   │       ├── gradientClamp, uvBounds, colorClamp
│   │       ├── waterTint, aberration
│   │       ├── imageContrast, imageBrightness, waterBlend
│   │       ├── imageHeightScale, imgWidthScale, imgHeightScale
│   │       └── imgPosX, imgPosY, imgRotation, imgZoom
│   │
│   │
│   ├── 🏗️ CLASS: WaterRippleApp
│   │   │
│   │   ├── 🔧 CONSTRUCTOR
│   │   │   ├── Get canvas & WebGL context
│   │   │   ├── Initialize state variables
│   │   │   ├── Check WebGL support
│   │   │   ├── Check OES_texture_float extension
│   │   │   └── Call this.init()
│   │   │
│   │   ├── 🚀 INITIALIZATION CHAIN
│   │   │   ├── init()
│   │   │   │   ├── resizeCanvas() — Set canvas to window size
│   │   │   │   ├── createSimulationTextures() — Ping-pong buffers
│   │   │   │   ├── loadImages() — Load 4 model photos
│   │   │   │   ├── createShaders() — Compile GLSL programs
│   │   │   │   ├── setupEvents() — Mouse/touch listeners
│   │   │   │   ├── createNavDots() — Thumbnail strip
│   │   │   │   ├── setupTweaks() — Settings panel bindings
│   │   │   │   ├── createModelsGrid() — Model cards overlay
│   │   │   │   └── animate() — Start render loop
│   │   │
│   │   ├── 🎮 WEBGL RESOURCE MANAGEMENT
│   │   │   ├── createSimulationTextures()
│   │   │   │   ├── tex1, tex2 — Float32 textures (256x256)
│   │   │   │   ├── fb1, fb2 — Framebuffer objects
│   │   │   │   ├── readTex, writeFb — Ping-pong pointers
│   │   │   │   └── positionBuffer — Quad vertices [-1,-1 to 1,1]
│   │   │   │
│   │   │   └── loadImages()
│   │   │       ├── Create placeholder textures (2x2 pixels)
│   │   │       ├── Load images asynchronously
│   │   │       ├── Upload to GPU on load
│   │   │       ├── Store aspect ratios
│   │   │       └── Hide loader when complete
│   │   │
│   │   ├── 🎭 SHADER COMPILATION
│   │   │   ├── createShaders()
│   │   │   │   ├── simVertex — Simulation vertex shader
│   │   │   │   ├── simFragment — Wave physics simulation
│   │   │   │   ├── visVertex — Visualization vertex shader
│   │   │   │   ├── visFragment — Final render with effects
│   │   │   │   ├── simProgram — Simulation GPU program
│   │   │   │   └── visProgram — Visualization GPU program
│   │   │   │
│   │   │   └── createProgram(vs, fs)
│   │   │       ├── Create vertex shader
│   │   │       ├── Create fragment shader
│   │   │       ├── Link program
│   │   │       └── Return program handle
│   │   │
│   │   ├── 🖼️ UI GENERATION
│   │   │   ├── createModelsGrid()
│   │   │   │   ├── Generate HTML for 4 model cards
│   │   │   │   ├── Inject into .models-grid
│   │   │   │   └── Bind click → goToSlide(i)
│   │   │   │
│   │   │   ├── createNavDots()
│   │   │   │   ├── Generate thumbnail strip
│   │   │   │   └── Bind click → goToSlide(i)
│   │   │   │
│   │   │   └── setupTweaks()
│   │   │       ├── Bind 15 sliders to CONFIG
│   │   │       ├── Bind Calm button → clear water
│   │   │       └── Bind Reset button → restore defaults
│   │   │
│   │   ├── 🖱️ EVENT HANDLING
│   │   │   ├── setupEvents()
│   │   │   │   ├── mousedown → Start water disturbance
│   │   │   │   ├── mousemove → Update water while dragging
│   │   │   │   ├── mouseup → Stop disturbance
│   │   │   │   ├── touchstart → Mobile support
│   │   │   │   ├── touchmove → Mobile drag
│   │   │   │   ├── resize → Update canvas
│   │   │   │   ├── prev/next buttons → Slide navigation
│   │   │   │   ├── pause button → Toggle autoplay
│   │   │   │   ├── models button → Open overlay
│   │   │   │   └── overlay close → Hide overlay
│   │   │
│   │   ├── 🎬 SLIDE NAVIGATION
│   │   │   ├── goToSlide(index)
│   │   │   │   ├── Update currentIndex
│   │   │   │   ├── Change background texture
│   │   │   │   ├── Update slide info (name, tier, subtitle)
│   │   │   │   ├── Update thumbnail active state
│   │   │   │   └── Reset autoplay timer
│   │   │   │
│   │   │   ├── nextSlide() — Cycle forward
│   │   │   ├── prevSlide() — Cycle backward
│   │   │   ├── togglePause() — Play/Pause autoplay
│   │   │   └── scheduleNext() — Queue next slide (8s)
│   │   │
│   │   ├── 💧 WATER SIMULATION
│   │   │   ├── updateWaterTexture()
│   │   │   │   ├── Read float heightmap (256x256)
│   │   │   │   ├── Convert to Uint8 (0-255)
│   │   │   │   ├── Apply tanh() for soft clipping
│   │   │   │   └── Mark texture for update
│   │   │   │
│   │   │   └── calm()
│   │   │       └── Clear both simulation buffers
│   │   │
│   │   └── 🔄 RENDER LOOP
│   │       └── animate()
│   │           ├── requestAnimationFrame()
│   │           ├── updateWaterTexture()
│   │           ├── Update autoplay progress
│   │           └── Render next frame
│   │
│   │
│   └── 📡 ENTRY POINT
│       └── DOMContentLoaded
│           └── new WaterRippleApp()
│
│
└── 🎭 SHADER PROGRAMS (GLSL)
    │
    ├── SIMULATION PASS (Physics)
    │   ├── simVertex
    │   │   ├── Input: position (vec2)
    │   │   ├── Output: vUv (varying vec2)
    │   │   └── Maps quad to screen [-1,1]
    │   │
    │   └── simFragment
    │       ├── Inputs: uState, uResolution, uMouse, uMouseDown
    │       ├── Uniforms: waveSpeed, damping, brushSize, brushForce
    │       ├── Read: height & velocity from texture
    │       ├── Compute: Laplacian (wave equation)
    │       ├── Update: velocity += laplacian * speed
    │       ├── Apply: damping & spring force
    │       ├── Mouse: Add disturbance if clicked
    │       ├── Output: height, velocity, gradX, gradY (RGBA)
    │       └── Resolution: 256x256 float texture
    │
    │
    └── VISUALIZATION PASS (Rendering)
        ├── visVertex
        │   ├── Input: position (vec2)
        │   ├── Output: vUv (varying vec2)
        │   └── Maps quad to screen [-1,1]
        │
        └── visFragment
            ├── Inputs: uState, uImage, uCanvasSize
            ├── Image Adjust: contrast, brightness, heightScale
            ├── Image Transform: width, height, pos, rotation, zoom
            ├── Water Effects: refraction, blend, tint, aberration
            ├── Lighting: specularPower, specularIntensity
            │
            ├── Processing Pipeline:
            │   1. Read gradient from water state
            │   2. Compute refraction scale
            │   3. Apply zoom transform
            │   4. Apply rotation matrix
            │   5. Apply width/height scaling
            │   6. Apply position offset
            │   7. Apply aspect ratio correction
            │   8. Apply global height scale
            │   9. Clamp UVs to [0.001, 0.999]
            │   10. Flip Y for correct orientation
            │   11. Sample image texture
            │   12. Apply contrast & brightness
            │   13. Blend with water-distorted version
            │   14. Compute surface normal
            │   15. Calculate specular highlight
            │   16. Apply water tint
            │   └── 17. Clamp final color
            │
            └── Output: Final pixel color (RGBA)
```

---

## ⚡ EXECUTION FLOW (Step-by-Step)

### Phase 1: Page Load (0-100ms)
```
1. HTML parsed → DOM constructed
2. CSS parsed → Style rules applied
3. Three.js downloaded from CDN (45KB)
4. DOMContentLoaded event fires
5. new WaterRippleApp() instantiated
```

### Phase 2: Initialization (100-500ms)
```
WaterRippleApp.constructor()
  ↓
WaterRippleApp.init()
  ├─ resizeCanvas() → Set canvas to window.innerWidth/Height
  ├─ createSimulationTextures() → Allocate GPU memory
  │   ├─ tex1, tex2 (256x256 FLOAT32)
  │   ├─ fb1, fb2 (framebuffers)
  │   └─ positionBuffer (quad vertices)
  ├─ loadImages() → Start async image loading
  ├─ createShaders() → Compile GLSL programs
  │   ├─ simProgram (wave physics)
  │   └─ visProgram (final render)
  ├─ setupEvents() → Attach DOM listeners
  ├─ createNavDots() → Build thumbnail strip
  ├─ setupTweaks() → Bind slider controls
  ├─ createModelsGrid() → Build model cards
  └─ animate() → Start render loop
```

### Phase 3: Image Loading (500-5000ms)
```
For each of 4 images:
  ├─ Create placeholder texture (2x2 pixels)
  ├─ new Image() → Start HTTP request
  ├─ On load:
  │   ├─ Upload to GPU (gl.texImage2D)
  │   ├─ Store aspect ratio
  │   └─ Increment loaded counter
  └─ When all loaded → Hide loader
```

### Phase 4: Render Loop (Every 16.67ms @ 60fps)
```
animate()
  ↓
updateWaterTexture()
  ├─ Read 256x256 float heightmap
  ├─ Convert to Uint8 (0-255 range)
  └─ gl.texImage2D() → Upload to GPU
  ↓
Simulation Pass
  ├─ Bind writeFb
  ├─ Use simProgram
  ├─ Draw quad (6 vertices)
  ├─ Compute wave equation per pixel
  └─ Ping-pong swap (readTex ↔ writeFb)
  ↓
Visualization Pass
  ├─ Bind null framebuffer (screen)
  ├─ Use visProgram
  ├─ Set 18 uniforms (CONFIG values)
  ├─ Bind water texture (TEX0)
  ├─ Bind image texture (TEX1)
  ├─ Draw quad (6 vertices)
  └─ Fragment shader executes per pixel
```

---

## 🔬 SHADER MECHANICS (Deep Dive)

### Simulation Fragment Shader — Wave Physics

**Purpose:** Simulate 2D water wave equation on 256x256 grid

**Inputs:**
- `uState` — Texture containing (height, velocity, gradX, gradY)
- `uMouse` — Normalized mouse position [0-1]
- `uMouseDown` — 1.0 if mouse pressed, 0.0 otherwise

**Algorithm:**
```glsl
// 1. Sample neighbors for Laplacian
float hRight = texture2D(uState, uv + vec2(pixel.x, 0.0)).x;
float hLeft  = texture2D(uState, uv - vec2(pixel.x, 0.0)).x;
float hUp    = texture2D(uState, uv + vec2(0.0, pixel.y)).x;
float hDown  = texture2D(uState, uv - vec2(0.0, pixel.y)).x;

// 2. Compute Laplacian (curvature)
float laplacian = (hRight + hLeft + hUp + hDown) * 0.25 - height;

// 3. Wave equation integration
velocity += laplacian * uWaveSpeed;     // Acceleration from curvature
velocity *= uVelocityDamping;           // Energy loss (viscosity)
height += velocity;                      // Position update
height *= uHeightDamping;               // Height damping
velocity -= uSpringForce * height;      // Restoring force

// 4. Mouse interaction
if (uMouseDown > 0.5) {
  float dist = distance(vUv, uMouse);
  if (dist < uBrushSize) {
    velocity += uBrushForce * (1.0 - dist / uBrushSize);
  }
}

// 5. Output state (RGBA)
gl_FragColor = vec4(height, velocity, gradX, gradY);
```

**Physics Constants:**
- `uWaveSpeed: 1.5` — Wave propagation speed
- `uVelocityDamping: 0.995` — Velocity decay per frame
- `uHeightDamping: 0.999` — Height decay per frame
- `uSpringForce: 0.005` — Surface tension restoring force

---

### Visualization Fragment Shader — Final Render

**Purpose:** Render background image with water distortion effects

**Processing Pipeline (17 Steps):**

```glsl
// 1. Read water state
vec4 state = texture2D(uState, vUv);
float height = state.x;
vec2 gradient = state.zw;

// 2. Compute refraction scale
float gradMagnitude = length(gradient);
float refractionScale = clamp(1.0 - gradMagnitude * 3.0, 0.2, 1.0);
vec2 softGradient = gradient * refractionScale;

// 3. Start with base UVs
vec2 uv = vUv;

// 4. Apply water refraction
uv += softGradient * uRefraction;

// 5. Apply zoom
uv = (uv - 0.5) * uImgZoom + 0.5;

// 6. Apply rotation matrix
float c = cos(uImgRotation);
float s = sin(uImgRotation);
uv = uv - 0.5;
uv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
uv = uv + 0.5;

// 7. Apply width/height scaling
uv = (uv - 0.5) * vec2(uImgWidthScale, uImgHeightScale) + 0.5;

// 8. Apply position offset
uv = uv - vec2(uImgPosX - 0.5, uImgPosY - 0.5);

// 9. Aspect ratio correction
float canvasAspect = uCanvasSize.x / uCanvasSize.y;
vec2 aspectScale = vec2(1.0);
aspectScale.x = uImageAspect / canvasAspect;
uv = (uv - 0.5) * aspectScale + 0.5;

// 10. Global height scale
uv.y = (uv.y - 0.5) / uImageHeightScale + 0.5;

// 11. Clamp to prevent artifacts
uv = clamp(uv, 0.001, 0.999);

// 12. Flip Y for correct orientation
vec2 imageUV = vec2(uv.x, 1.0 - uv.y);

// 13. Sample image
vec3 color = texture2D(uImage, imageUV).rgb;

// 14. Apply contrast & brightness
color = (color - vec3(0.5)) * uImageContrast + vec3(0.5);
color *= uImageBrightness;

// 15. Blend with water-distorted version
vec2 distortedUV = imageUV + softGradient * uRefraction;
vec3 waterColor = texture2D(uImage, clamp(distortedUV, 0.001, 0.999)).rgb;
waterColor = (waterColor - vec3(0.5)) * uImageContrast + vec3(0.5);
waterColor *= uImageBrightness;
color = mix(color, waterColor, uWaterBlend);

// 16. Compute lighting
vec3 normal = normalize(vec3(-gradient.x * 3.0, 1.0, -gradient.y * 3.0));
vec3 lightDir = normalize(vec3(0.4, 0.8, 0.3));
float specular = pow(max(0.0, dot(normal, lightDir)), uSpecularPower);
color += specular * uSpecularIntensity;
color = mix(color, color * vec3(0.9, 1.0, 1.1), uWaterTint);

// 17. Final clamp
color = clamp(color, 0.0, uColorClamp);
gl_FragColor = vec4(color, 1.0);
```

---

## 🎛️ CONFIGURATION REFERENCE

| Parameter | Default | Range | Effect |
|-----------|---------|-------|--------|
| `simResolution` | 256 | Fixed | Water simulation grid size |
| `waveSpeed` | 1.5 | 0.5-3.0 | Wave propagation velocity |
| `velocityDamping` | 0.995 | 0.90-0.999 | Wave energy decay |
| `heightDamping` | 0.999 | 0.90-0.999 | Wave height decay |
| `springForce` | 0.005 | 0.001-0.02 | Surface tension |
| `brushSize` | 0.04 | 0.01-0.15 | Mouse brush radius |
| `brushForce` | 0.8 | 0.1-3.0 | Mouse brush strength |
| `refraction` | 0.03 | 0.01-0.15 | Water distortion amount |
| `specularPower` | 50 | 10-100 | Highlight sharpness |
| `specularIntensity` | 0.4 | 0.0-1.0 | Highlight brightness |
| `imageContrast` | 1.0 | 0.5-2.0 | Image contrast multiplier |
| `imageBrightness` | 1.0 | 0.5-1.5 | Image brightness multiplier |
| `waterBlend` | 0.5 | 0.0-1.0 | Water effect mix |
| `imgZoom` | 1.0 | 0.5-5.0 | Image zoom level |
| `imgRotation` | 0.0 | -π to π | Image rotation (radians) |

---

## 📊 PERFORMANCE METRICS

| Metric | Value | Notes |
|--------|-------|-------|
| **Canvas Resolution** | Window size | Dynamic resize |
| **Simulation Resolution** | 256×256 | Fixed (performance) |
| **Texture Memory** | ~1MB | 2× float textures + 4× images |
| **Draw Calls/Frame** | 2 | Sim pass + Vis pass |
| **Uniform Updates/Frame** | 18 | All CONFIG values |
| **Target FPS** | 60 | requestAnimationFrame |
| **Autoplay Interval** | 8000ms | Per slide |

---

## 🔐 SECURITY CONSIDERATIONS

| Risk | Status | Mitigation |
|------|--------|------------|
| **CORS Images** | ✅ Safe | `crossOrigin='anonymous'` |
| **WebGL Injection** | ✅ Safe | No user code in shaders |
| **XSS via Image URLs** | ⚠️ Medium | Unsplash URLs only |
| **LocalStorage** | ❌ None | No persistence |
| **API Keys** | ❌ None | No external APIs |

---

## 🐛 KNOWN LIMITATIONS

1. **No Error Recovery** — If WebGL fails, page is unusable
2. **No Mobile Optimization** — Tweak panel hidden on mobile
3. **No Keyboard Navigation** — Mouse/touch only
4. **No Accessibility** — No ARIA labels, screen reader support
5. **No Offline Support** — Requires CDN for Three.js
6. **No State Persistence** — Settings lost on refresh

---

## 📁 DEPENDENCY GRAPH

```
index_backup.html
  ↓
Three.js (r128) — CDN only
  ↓
WebGL (OES_texture_float) — Browser extension
  ↓
OES_texture_float_linear — Browser extension
```

**Browser Requirements:**
- WebGL 1.0+
- OES_texture_float extension
- OES_texture_float_linear extension
- ES6 (class, let/const, arrow functions)

---

## 🎯 OPTIMIZATION OPPORTUNITIES

| Area | Current | Potential |
|------|---------|-----------|
| **Three.js** | Full library (45KB) | Raw WebGL (0KB) |
| **Image Loading** | Sequential | Parallel + progressive |
| **Simulation** | 256×256 fixed | Dynamic (mobile: 128×128) |
| **Shader Compiles** | Every load | Cache compiled programs |
| **Event Listeners** | No cleanup | Remove on destroy |
| **CSS** | 984 lines inline | External + minified |

---

## 🧪 TESTING CHECKLIST

- [ ] WebGL context loss handling
- [ ] Image load failure fallback
- [ ] Mobile touch events
- [ ] Resize event throttling
- [ ] Memory leak check (textures)
- [ ] FPS drop on low-end devices
- [ ] Autoplay memory leak
- [ ] Thumbnail active state sync

---

**Generated:** 2026-03-25  
**File:** `index_backup.html`  
**Lines:** 984  
**Complexity:** High (WebGL + MVC + Game Loop)
