# 💧 Water Shader Profile Component

Full-screen water ripple shader background for model profile pages with interactive control panel.

---

## 🎯 Features

- **Full-screen WebGL water ripple effect** (100vw x 100vh)
- **Background image slider** with model gallery photos
- **Interactive control panel** to tweak shader settings in real-time
- **Touch/mouse interaction** - create ripples by clicking/dragging
- **Auto-advance slider** with pause control
- **JSON import/export** for saving shader presets
- **Mobile responsive** with performance fallbacks

---

## 📁 Files Created

```
apps/web/components/WaterShaderProfile.tsx    ← Main shader component
apps/web/app/models/[slug]/page.tsx          ← Profile page using shader
```

---

## 🚀 Usage

### Basic Usage

```tsx
import WaterShaderProfile from '@/components/WaterShaderProfile';

export default function MyPage() {
  const images = [
    '/images/model1.jpg',
    '/images/model2.jpg',
    '/images/model3.jpg',
  ];

  return (
    <WaterShaderProfile images={images} />
  );
}
```

### With Custom Settings

```tsx
const customSettings = {
  gradientClamp: 0.30,
  waveSpeed: 1.5,
  refraction: 0.030,
  // ... other settings
};

<WaterShaderProfile
  images={images}
  shaderSettings={customSettings}
  onSettingsChange={(settings) => console.log(settings)}
/>
```

---

## 🎨 Control Panel

Click the **⚙️ settings icon** (top right) to open the control panel:

### Stability Controls
- **Gradient Clamp** - Limits gradient magnitude for stability
- **UV Bounds** - Prevents edge artifacts
- **Color Clamp** - Maximum color value

### Wave Physics
- **Wave Speed** - How fast ripples propagate
- **Velocity Damping** - Velocity decay per frame
- **Height Damping** - Height decay per frame
- **Spring Force** - Restoring force to zero

### Visual
- **Refraction** - Distortion strength
- **Specular Power** - Shininess exponent
- **Specular Intensity** - Highlight brightness
- **Water Tint** - Blue tint strength
- **Aberration** - Chromatic aberration

### Gradient
- **Mode** - White→Black, Subtle, Strong, Inverted, Disabled
- **Strength** - Gradient blend intensity
- **Height Sensitivity** - How much height affects tint

### Interaction
- **Brush Size** - Interaction brush radius
- **Brush Force** - Interaction strength

---

## 🖱️ Interaction

- **Click/Drag** on screen to create ripples
- **Touch** support for mobile devices
- **Auto-advance** images every 6 seconds
- **Pause/Play** button to stop auto-advance
- **Prev/Next** buttons to manually navigate

---

## 📊 Shader Settings JSON

### Export Settings
1. Open control panel
2. Click **📋 Export JSON**
3. Settings copied to clipboard

### Import Settings
1. Open control panel
2. Click **📥 Import JSON**
3. Paste settings JSON
4. Settings applied immediately

### Example JSON Preset

```json
{
  "gradientClamp": 0.30,
  "uvBounds": 0.010,
  "colorClamp": 1.0,
  "waveSpeed": 1.5,
  "velocityDamping": 0.995,
  "heightDamping": 0.999,
  "springForce": 0.005,
  "refraction": 0.030,
  "specularPower": 50,
  "specularIntensity": 0.40,
  "waterTint": 0.15,
  "aberration": 0.50,
  "gradientMode": 0,
  "gradientStrength": 0.30,
  "heightSensitivity": 0.15,
  "brushSize": 0.040,
  "brushForce": 0.8
}
```

---

## 🎯 Profile Page Features

The profile page at `/models/[slug]` includes:

- **Full-screen water shader background**
- **Model name header** with Elite/Verified badges
- **Physical attributes grid** (age, height, weight, bust)
- **Biography section**
- **Rates display** (hourly, overnight)
- **Contact button**
- **Footer**

All content is overlaid on top of the shader with proper z-index layering.

---

## 🔧 Technical Details

### WebGL Implementation
- **Simulation Pass**: 256x256 float texture for wave physics
- **Visualization Pass**: Full-screen render with image texture
- **Ping-pong buffers**: For simulation state
- **Extensions**: OES_texture_float, OES_texture_float_linear

### Performance
- **Desktop**: Full shader effect
- **Mobile**: Consider adding fallback (future enhancement)
- **FPS**: ~60 FPS on modern devices

### Images
- **Fit**: Images fit width while maintaining aspect ratio
- **Shader**: Full 100vw x 100vh coverage
- **Transition**: Smooth 6-second auto-advance

---

## 🎨 Customization

### Change Colors
Edit the fragment shader:
```glsl
// In visualizationFragmentShader
color = mix(color, color * vec3(0.9, 1.0, 1.1), uWaterTint);
```

### Change Auto-Advance Speed
In `WaterShaderProfile.tsx`:
```tsx
useEffect(() => {
  if (isPaused) return;
  const interval = setInterval(() => {
    setCurrentImageIndex(prev => (prev + 1) % images.length);
  }, 6000); // Change to desired milliseconds
  return () => clearInterval(interval);
}, [isPaused, images.length]);
```

### Add More Gradient Modes
In `visualizationFragmentShader`:
```glsl
if (uGradientMode == 5) {
  // Your custom mode here
}
```

---

## 🐛 Troubleshooting

### WebGL Not Supported
- Component shows error message
- Fallback to static image (future enhancement)

### Images Not Loading
- Check CORS headers
- Verify image URLs are accessible
- Fallback gradient texture is created automatically

### Performance Issues
- Reduce simulation resolution (SIM_W, SIM_H)
- Lower refraction value
- Disable on mobile (future enhancement)

---

## 📱 Mobile Considerations

Current implementation is desktop-focused. For mobile:

1. **Add detection**:
```tsx
const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
```

2. **Disable shader on mobile**:
```tsx
if (isMobile) {
  return <img src={images[currentImageIndex]} className="w-full h-full object-cover" />;
}
```

3. **Or reduce quality**:
```tsx
const SIM_W = isMobile ? 128 : 256;
const SIM_H = isMobile ? 128 : 256;
```

---

## 🔗 Related Files

- `water_shader_dual.html` - Original shader reference
- `apps/web/app/models/[slug]/page.tsx` - Profile page implementation
- `packages/db/src/schema/model_profiles.ts` - Database schema

---

## 📝 API Integration

The profile page fetches data from:
```
GET /models/slug/{slug}
```

Response should include:
```json
{
  "id": "uuid",
  "displayName": "Model Name",
  "photos": [
    {
      "id": "uuid",
      "url": "https://...",
      "isVisible": true,
      "albumCategory": "portfolio",
      "sortOrder": 0
    }
  ],
  "shaderSettings": { ... }
}
```

---

## ✅ Next Steps

1. **Backend Integration**: Save/load shader settings per profile
2. **Mobile Fallback**: Add responsive detection and fallback
3. **Performance Monitor**: Add FPS counter
4. **More Presets**: Create library of shader presets
5. **Video Support**: Add video texture support
6. **Multiple Shaders**: Support left/right split like water_shader_dual.html

---

**Created:** March 24, 2026  
**Based on:** water_shader_dual.html  
**Status:** ✅ Working
