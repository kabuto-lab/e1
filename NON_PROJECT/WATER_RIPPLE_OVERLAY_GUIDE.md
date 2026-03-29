# Water Ripple Overlay - Implementation Guide

## Overview
The water ripple effect from your `testpage_constant.html` has been converted into a **React/Three.js overlay component** that works on top of your main slider.

## Key Features

### ✅ Responsive Design
- **Canvas**: 100% width/height, scales with window
- **Images**: Object-fit: cover behavior (no stretching/distortion)
- **Aspect Ratio**: Automatically calculated per image
- **Touch/Mouse**: Full support for interaction

### ✅ Shader Parameters (from your tweak panel)
All parameters from your HTML tweak panel are included:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `wave.speed` | 1.50 | Wave propagation speed |
| `wave.velocityDamp` | 0.99 | Energy dissipation |
| `wave.heightDamp` | 1.00 | Vertical motion damping |
| `wave.springForce` | 0.01 | Wave oscillation restoring force |
| `wave.refraction` | 0.03 | Light bending through water |
| `wave.specPower` | 50 | Specular highlight sharpness |
| `wave.specIntensity` | 0.40 | Highlight brightness |
| `wave.waterTint` | 0.15 | Water color tinting |
| `wave.aberration` | 0.50 | Chromatic distortion |
| `wave.gradientStrength` | 0.65 | Gradient overlay intensity |
| `wave.heightSensitivity` | 0.15 | Height-based effects |
| `wave.brushSize` | 0.04 | Mouse interaction radius |
| `wave.brushForce` | 0.80 | Interaction strength |

### ✅ Anti White-Screen
- Color clamping (0-1 range)
- Gradient clamping
- UV bounds checking

## Files Created/Modified

### New Files
1. **`apps/web/components/WaterRippleOverlay.tsx`** - Main overlay component

### Modified Files
1. **`apps/web/components/SimpleSlider.tsx`** - Integrated water overlay

## Usage

### Basic Integration
```tsx
import WaterRippleOverlay from './WaterRippleOverlay';

function MySlider() {
  return (
    <div className="slider-container">
      {/* Your background image */}
      <img src={currentSlide.image} alt="" />
      
      {/* Water overlay on top */}
      <WaterRippleOverlay
        imageUrl={currentSlide.image}
        isActive={true}
        isPaused={false}
      />
    </div>
  );
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `imageUrl` | string | required | Image to apply water effect to |
| `isActive` | boolean | required | Enable/disable effect |
| `isPaused` | boolean | false | Pause wave simulation |
| `onRipple` | function | - | Callback when ripple created |

## Customization

### Method 1: Edit WATER_CONFIG
In `WaterRippleOverlay.tsx`, modify the `WATER_CONFIG` object:

```typescript
const WATER_CONFIG = {
  textureResolution: 1024,
  wave: {
    speed: 1.50,
    velocityDamp: 0.99,
    // ... etc
  },
};
```

### Method 2: Add Tweak Panel (Optional)
Create a tweak panel component to adjust parameters in real-time:

```tsx
// Example: Adjust refraction
<WaterRippleOverlay
  imageUrl={image}
  isActive={true}
  // Pass custom config via context or props
/>
```

## How It Works

### Layer Structure
```
┌─────────────────────────────────┐
│  Water Ripple Overlay (Canvas)  │ ← Interactive Three.js layer
├─────────────────────────────────┤
│  Background Image (CSS/Div)     │ ← Static image with object-fit: cover
├─────────────────────────────────┤
│  Gradient Overlay (CSS)         │ ← Dark gradient from bottom
└─────────────────────────────────┘
```

### Image Aspect Ratio Handling
The shader calculates proper UV scaling to match `object-fit: cover` behavior:

```glsl
// Screen vs Image aspect ratio
float screenAspect = uResolution.x / uResolution.y;
float scale = max(screenAspect / uImageAspect, 1.0);

// Scale UVs accordingly
vec2 scaledUv = uv;
if (screenAspect > uImageAspect) {
  float ratio = uImageAspect / screenAspect;
  scaledUv.y = (uv.y - 0.5) / ratio + 0.5;
} else {
  float ratio = screenAspect / uImageAspect;
  scaledUv.x = (uv.x - 0.5) / ratio + 0.5;
}
```

### Wave Simulation
Uses a 2D wave equation with:
- **Laplacian** for wave propagation
- **Damping** for energy loss
- **Spring force** for oscillation
- **Boundary conditions** for edge reflection

## Performance

### Optimizations
- **1024x1024** simulation resolution (good balance)
- **RequestAnimationFrame** for smooth 60fps
- **Buffer swapping** for efficient updates
- **PixelRatio capped at 2** for high-DPI screens

### Mobile Considerations
- Touch events supported
- Canvas pointer events enabled
- Can be paused when not visible

## Troubleshooting

### Issue: Image looks stretched
**Solution:** Check `uImageAspect` uniform is being set correctly

### Issue: No ripples visible
**Solution:** 
1. Check `isActive` is true
2. Check `isPaused` is false
3. Increase `wave.refraction` and `wave.heightSensitivity`

### Issue: Performance lag
**Solution:**
1. Reduce `textureResolution` to 512
2. Cap pixelRatio to 1
3. Pause when not visible

### Issue: Canvas not interactive
**Solution:** Ensure `pointerEvents: 'auto'` and `touchAction: 'none'` are set

## Advanced: Adding Tweak Panel

To add a full tweak panel like in your HTML:

```tsx
import { useState } from 'react';
import WaterRippleOverlay from './WaterRippleOverlay';

export default function SliderWithTweaks() {
  const [config, setConfig] = useState({
    refraction: 0.03,
    specPower: 50,
    // ... etc
  });

  return (
    <>
      <WaterRippleOverlay
        imageUrl={currentImage}
        isActive={true}
        // Pass config overrides
      />
      
      {/* Tweak Panel UI */}
      <div className="tweak-panel">
        <input
          type="range"
          min="0"
          max="0.1"
          step="0.01"
          value={config.refraction}
          onChange={(e) => setConfig({...config, refraction: parseFloat(e.target.value)})}
        />
        {/* ... more controls */}
      </div>
    </>
  );
}
```

## Comparison: HTML vs React

| Feature | HTML Version | React Version |
|---------|-------------|---------------|
| Rendering | Full WebGL scene | Overlay on CSS background |
| Image Handling | WebGL texture | CSS + WebGL hybrid |
| Responsiveness | Manual resize | Auto with hooks |
| State Management | Class-based | React hooks |
| Integration | Standalone | Component-based |

## Next Steps

1. **Test on mobile** - Touch interaction
2. **Add tweak panel** - Real-time parameter adjustment
3. **Optimize for mobile** - Lower resolution on small screens
4. **Add presets** - "Calm", "Wavy", "Stormy" modes

---

**Created:** 2026-03-23  
**Status:** ✅ Ready to use
