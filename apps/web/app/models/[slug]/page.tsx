/**
 * Public Model Profile Page
 * Route: /models/[slug]
 * 
 * Note: Water shader disabled per user request
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface ModelProfile {
  id: string;
  displayName: string;
  slug: string;
  biography?: string;
  verificationStatus: string;
  eliteStatus: boolean;
  isPublished: boolean;
  physicalAttributes?: {
    age?: number;
    height?: number;
    weight?: number;
    bustSize?: number;
    bustType?: string;
    bodyType?: string;
    temperament?: string;
    sexuality?: string;
    hairColor?: string;
    eyeColor?: string;
  };
  rateHourly?: number;
  rateOvernight?: number;
  mainPhotoUrl?: string;
  photos?: Array<{
    id: string;
    url: string;
    isVisible: boolean;
    albumCategory: string;
    sortOrder: number;
  }>;
}

export default function ModelProfilePage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [profile, setProfile] = useState<ModelProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, [slug]);

  const loadProfile = async () => {
    try {
      // Note: Backend endpoint is /models/:slug (not /models/slug/:slug)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/models/${slug}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Модель не найдена');
        }
        throw new Error('Ошибка загрузки');
      }

      const data = await response.json();
      
      if (!data) {
        throw new Error('Модель не найдена');
      }
      
      setProfile(data);

      // Filter only visible images for the slider
      const visibleImages = data.photos
        ?.filter(p => p.isVisible)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(p => p.url) || [];

      // If no visible images, use main photo
      if (visibleImages.length === 0 && data.mainPhotoUrl) {
        visibleImages.push(data.mainPhotoUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-500 text-xl">{error || 'Модель не найдена'}</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#0a0a0a]">
      {/* Background Image */}
      {profile.mainPhotoUrl && (
        <div 
          className="fixed inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${profile.mainPhotoUrl})` }}
        />
      )}

      {/* Profile Content Overlay */}
      <div className="relative z-10">
        {/* Header */}
        <header className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-6xl md:text-8xl font-bold text-white mb-4 drop-shadow-lg">
              {profile.displayName}
            </h1>
            {profile.eliteStatus && (
              <div className="inline-block px-6 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full text-black font-bold text-sm mb-4">
                👑 ELITE
              </div>
            )}
            {profile.verificationStatus === 'verified' && (
              <div className="inline-block px-6 py-2 bg-gradient-to-r from-green-400 to-green-600 rounded-full text-black font-bold text-sm mb-4 ml-2">
                ✓ VERIFIED
              </div>
            )}
          </div>
        </header>

        {/* Info Section */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            {/* Physical Attributes */}
            {profile.physicalAttributes && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                {profile.physicalAttributes.age && (
                  <div className="bg-black/50 backdrop-blur-md rounded-lg p-6 text-center">
                    <div className="text-cyan-400 text-sm mb-1">Age</div>
                    <div className="text-white text-2xl font-bold">{profile.physicalAttributes.age}</div>
                  </div>
                )}
                {profile.physicalAttributes.height && (
                  <div className="bg-black/50 backdrop-blur-md rounded-lg p-6 text-center">
                    <div className="text-cyan-400 text-sm mb-1">Height</div>
                    <div className="text-white text-2xl font-bold">{profile.physicalAttributes.height} cm</div>
                  </div>
                )}
                {profile.physicalAttributes.weight && (
                  <div className="bg-black/50 backdrop-blur-md rounded-lg p-6 text-center">
                    <div className="text-cyan-400 text-sm mb-1">Weight</div>
                    <div className="text-white text-2xl font-bold">{profile.physicalAttributes.weight} kg</div>
                  </div>
                )}
                {profile.physicalAttributes.bustSize && (
                  <div className="bg-black/50 backdrop-blur-md rounded-lg p-6 text-center">
                    <div className="text-cyan-400 text-sm mb-1">Bust</div>
                    <div className="text-white text-2xl font-bold">{profile.physicalAttributes.bustSize}</div>
                  </div>
                )}
              </div>
            )}

            {/* Biography */}
            {profile.biography && (
              <div className="bg-black/50 backdrop-blur-md rounded-lg p-8 mb-12">
                <h2 className="text-2xl font-bold text-white mb-4">About Me</h2>
                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {profile.biography}
                </p>
              </div>
            )}

            {/* Rates */}
            {(profile.rateHourly || profile.rateOvernight) && (
              <div className="bg-black/50 backdrop-blur-md rounded-lg p-8 mb-12">
                <h2 className="text-2xl font-bold text-white mb-6">Rates</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {profile.rateHourly && (
                    <div className="flex justify-between items-center border-b border-white/10 pb-4">
                      <span className="text-gray-300">Hourly</span>
                      <span className="text-cyan-400 text-xl font-bold">${profile.rateHourly}</span>
                    </div>
                  )}
                  {profile.rateOvernight && (
                    <div className="flex justify-between items-center border-b border-white/10 pb-4">
                      <span className="text-gray-300">Overnight</span>
                      <span className="text-cyan-400 text-xl font-bold">${profile.rateOvernight}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contact Button */}
            <div className="text-center">
              <button className="px-12 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-full font-bold text-lg hover:opacity-90 transition-all shadow-lg">
                Contact Me
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-6 border-t border-white/10">
          <div className="max-w-4xl mx-auto text-center text-gray-500 text-sm">
            © 2026 {profile.displayName}. All rights reserved.
          </div>
        </footer>
      </div>
    </div>
  );
}
