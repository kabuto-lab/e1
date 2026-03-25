/**
 * FadeSlider Component
 * Smooth crossfade transitions for background images
 * Designed to work with WaterShaderOverlay
 */

'use client';

import { useEffect, useState, useCallback } from 'react';

interface FadeSliderProps {
  images: string[];        // Array of image URLs
  interval?: number;       // Transition interval in ms (default: 5000)
  transition?: 'fade' | 'slide' | 'zoom'; // Transition type
  enabled?: boolean;       // Enable/disable slider
}

export function FadeSlider({
  images,
  interval = 5000,
  transition = 'fade',
  enabled = true,
}: FadeSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());

  // Filter to only public visible images
  const visibleImages = images.filter(url => url && url.trim() !== '');

  // Auto-advance images
  useEffect(() => {
    if (!enabled || visibleImages.length <= 1) return;

    const timer = setInterval(() => {
      setIsTransitioning(true);
      setCurrentIndex((prev) => (prev + 1) % visibleImages.length);
      
      // Reset transition flag after animation
      setTimeout(() => setIsTransitioning(false), 1000);
    }, interval);

    return () => clearInterval(timer);
  }, [enabled, visibleImages.length, interval]);

  // Handle image load
  const handleImageLoad = useCallback((index: number) => {
    setLoadedImages((prev) => new Set(prev).add(index));
  }, []);

  if (!enabled || visibleImages.length === 0) {
    return null;
  }

  // Single image - no slider needed
  if (visibleImages.length === 1) {
    return (
      <div className="fixed inset-0 z-0 overflow-hidden">
        <img
          src={visibleImages[0]}
          alt="Background"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {visibleImages.map((url, index) => {
        const isActive = index === currentIndex;
        const isPreload = index === (currentIndex + 1) % visibleImages.length;
        
        return (
          <div
            key={url}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
            style={{
              transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <img
              src={url}
              alt={`Background ${index}`}
              className="w-full h-full object-cover"
              loading={isPreload ? 'eager' : 'lazy'}
              onLoad={() => handleImageLoad(index)}
              style={{
                transform: transition === 'zoom' && isActive 
                  ? 'scale(1.05)' 
                  : 'scale(1)',
                transition: 'transform 3s ease-out',
              }}
            />
            
            {/* Overlay gradient for better text contrast */}
            <div 
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(180deg, rgba(10,10,10,0.3) 0%, rgba(10,10,10,0.5) 50%, rgba(10,10,10,0.8) 100%)',
              }}
            />
          </div>
        );
      })}
      
      {/* Progress indicators */}
      {visibleImages.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {visibleImages.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentIndex(index);
                setIsTransitioning(true);
                setTimeout(() => setIsTransitioning(false), 1000);
              }}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-[#d4af37] w-6'
                  : 'bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Hook to get public images for a model
export function usePublicImages(modelId: string | null) {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!modelId) {
      setLoading(false);
      return;
    }

    const fetchImages = async () => {
      try {
        // This would call your API endpoint
        // const response = await fetch(`/api/models/${modelId}/public-photos`);
        // const data = await response.json();
        // setImages(data.map((f: any) => f.cdnUrl));
        
        // Placeholder - replace with actual API call
        setImages([]);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [modelId]);

  return { images, loading, error };
}
