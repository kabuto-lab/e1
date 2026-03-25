# 💧 Water Ripple Shader Component

Reusable WebGL water ripple effect component for React/Next.js projects.

---

## 📦 Installation

The component is already in your project:
```
apps/web/components/WaterRippleShader.tsx
```

---

## 🚀 Quick Start

### Basic Usage

```tsx
import WaterRippleShader from '@/components/WaterRippleShader';

export default function MyPage() {
  return (
    <div className="relative w-full h-screen">
      <WaterRippleShader imageUrl="/path/to/image.jpg" />
    </div>
  );
}
```

### With Custom Settings

```tsx
<WaterRippleShader
  imageUrl="/path/to/image.jpg"
  settings={{
    waveSpeed: 2.0,
    refraction: 0.05,
    specularPower: 80,
    waterTint: 0.3,
    brushSize: 0.06,
  }}
/>
```

### With Ripple Event Callback

```tsx
<WaterRippleShader
  imageUrl="/path/to/image.jpg"
  onRipple={(x, y) => {
    console.log('Ripple created at:', x, y);
  }}
/>
```

---

## 📐 Dimensions

### Simulation Resolution
- **Width:** 512 pixels
- **Height:** 512 pixels

### Canvas Resolution
- **Width:** `window.innerWidth` (fullscreen)
- **Height:** `window.innerHeight` (fullscreen)

The simulation runs at 512×512 for performance, then scales to fullscreen.

---

## ⚙️ Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `imageUrl` | `string` | - | Background image URL |
| `className` | `string` | `''` | Additional CSS classes |
| `onRipple` | `function` | - | Callback when ripple is created `(x, y) => void` |
| `settings` | `object` | - | Shader configuration (see below) |

---

## 🎨 Settings Object

```tsx
settings={{
  waveSpeed: 1.5,          // Wave propagation speed
  refraction: 0.03,        // Distortion strength
  specularPower: 50,       // Shininess exponent
  specularIntensity: 0.4,  // Highlight brightness
  waterTint: 0.15,         // Blue tint strength
  aberration: 0.5,         // Chromatic aberration
  gradientStrength: 0.3,   // Gradient overlay intensity
  heightSensitivity: 0.15, // Height-based effects
  brushSize: 0.04,         // Interaction brush radius
  brushForce: 0.8,         // Interaction strength
}}
```

---

## 📝 Usage Examples

### Fullscreen Background

```tsx
export default function HeroSection() {
  return (
    <div className="relative w-full h-screen">
      <WaterRippleShader imageUrl="/hero-bg.jpg" />
      
      {/* Content overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <h1 className="text-6xl text-white font-bold">
          Welcome
        </h1>
      </div>
    </div>
  );
}
```

### Product Card Background

```tsx
export default function ProductCard() {
  return (
    <div className="relative w-96 h-96 rounded-lg overflow-hidden">
      <WaterRippleShader 
        imageUrl="/product.jpg"
        settings={{
          refraction: 0.02,
          waveSpeed: 1.0,
        }}
      />
      
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/50">
        <h3 className="text-white text-xl">Product Name</h3>
      </div>
    </div>
  );
}
```

### Multiple Instances

```tsx
export default function Gallery() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="relative h-64 rounded-lg overflow-hidden">
          <WaterRippleShader 
            imageUrl={`/image-${i}.jpg`}
            settings={{
              brushSize: 0.05,
              refraction: 0.04,
            }}
          />
        </div>
      ))}
    </div>
  );
}
```

---

## 🎯 Features

- ✅ **Interactive** - Creates ripples on mouse/touch movement
- ✅ **Fullscreen** - Automatically scales to window size
- ✅ **Responsive** - Handles window resize
- ✅ **Configurable** - Customize wave physics and visual effects
- ✅ **Fallback** - Uses gradient if image fails to load
- ✅ **Performance** - Optimized 512×512 simulation

---

## 🔧 Technical Details

### WebGL Requirements
- `OES_texture_float` extension
- WebGL 1.0 or higher

### Performance
- Simulation: 512×512 float texture
- Render: Fullscreen (scales to canvas size)
- Frame rate: ~60 FPS on modern devices

### Browser Support
- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile: ✅ Touch support

---

## 🐛 Troubleshooting

### Black screen
- Check browser console for WebGL errors
- Ensure image URL is accessible (CORS)
- Verify WebGL is supported: https://get.webgl.org/

### No ripples
- Move mouse/finger across the canvas
- Check if `onRipple` callback is firing
- Increase `brushSize` or `brushForce` settings

### Image not loading
- Use absolute URLs or public folder paths
- Check CORS headers for external images
- Fallback gradient will be used if image fails

---

## 📁 Files

| File | Purpose |
|------|---------|
| `WaterRippleShader.tsx` | Main component |
| `water_shader_test.html` | Standalone demo (reference) |
| `water_shader_single.html` | Single panel version (reference) |

---

## 🎓 Learn More

Based on the water ripple shader implementation in:
- `water_shader_test.html` - Dual panel controls version
- `water_shader_single.html` - Single fullscreen version

**Simulation Resolution:** 512×512 (optimized for performance)
**Render Resolution:** Fullscreen (auto-scales)

---

**Created:** March 25, 2026
**Version:** 1.0.0
