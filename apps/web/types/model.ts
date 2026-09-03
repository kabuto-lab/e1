export type ModelContactChannel = 'click' | 'telegram' | 'platform';

interface PhysicalAttributes {
  age?: number;
  height?: number;
  weight?: number;
  bustSize?: number;
  bustType?: 'natural' | 'silicone';
  bodyType?: 'slim' | 'curvy' | 'bbw' | 'pear' | 'fit';
  temperament?: 'gentle' | 'active' | 'adaptable';
  sexuality?: 'active' | 'passive' | 'universal';
  hairColor?: string;
  eyeColor?: string;
  city?: string;
}

interface CatalogPreviewRow {
    id: string;
    slug: string;
    name: string;
    age: number;
    city: string;
    tier: string;
    image: string;
};

interface Profile {
  id: string;
  userId: string;
  managerId?: string | null;
  managerCommissionRate?: string | null;
  platformCommissionRate?: string | null;
  displayName: string;
  slug: string;
  biography?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  eliteStatus: boolean;
  isPublished: boolean;
  mainPhotoUrl?: string;
  physicalAttributes?: PhysicalAttributes;
  createdAt: string;
  updatedAt: string;
}

interface CreateProfilePayload {
  displayName: string;
  slug?: string;
  biography?: string;
  physicalAttributes?: PhysicalAttributes;
  languages?: string[];
  psychotypeTags?: string[];
  rateHourly?: number;
  rateOvernight?: number;
}

interface ModelProfile {
  id: string;
  userId: string | null;
  managerId: string | null;
  managerCommissionRate: string | null;
  platformCommissionRate: string | null;
  displayName: string;
  slug: string | null;
  biography: string | null;
  verificationStatus: 'pending' | 'video_required' | 'document_required' | 'verified' | 'rejected';
  eliteStatus: boolean;
  isPublished: boolean;
  mainPhotoUrl: string | null;
  rateHourly: string | null;
  rateOvernight: string | null;
  availabilityStatus: 'offline' | 'online' | 'in_shift' | 'busy';
  physicalAttributes: {
    age?: number;
    height?: number;
    weight?: number;
    bustSize?: number;
    bustType?: 'natural' | 'silicone';
    bodyType?: 'slim' | 'curvy' | 'bbw' | 'pear' | 'fit';
    temperament?: 'gentle' | 'active' | 'adaptable';
    sexuality?: 'active' | 'passive' | 'universal';
    hairColor?: string;
    eyeColor?: string;
    city?: string;
    country?: string;
  } | null;
  languages: string[] | null;
  psychotypeTags: string[] | null;
  ratingReliability: string;
  totalMeetings: number;
  totalCancellations: number;
  contactTelegram: string | null;
  contactPhone: string | null;
  contactWhatsapp: string | null;
  contactEmail: string | null;
  videoWalkthroughUrl: string | null;
  nextAvailableAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ModelStats {
  views: {
    total: number;
    last7Days: number;
    last30Days: number;
    daily: { date: string; count: number }[];
  };
  favorites: {
    current: number;
    added7Days: number;
    added30Days: number;
  };
  contacts: {
    total7Days: number;
    total30Days: number;
    byChannel: Record<ModelContactChannel, number>;
  };
}

interface ManagerModelStat {
  id: string;
  displayName: string;
  slug: string | null;
  mainPhotoUrl: string | null;
  views: { total: number; last7Days: number; last30Days: number };
  favorites: { current: number; added7Days: number; added30Days: number };
  contacts: { total7Days: number; total30Days: number };
}

interface ManagerStats {
  modelsCount: number;
  totals: {
    views: { total: number; last7Days: number; last30Days: number };
    favorites: { current: number; added7Days: number; added30Days: number };
    contacts: { total7Days: number; total30Days: number; byChannel: Record<ModelContactChannel, number> };
  };
  models: ManagerModelStat[];
}

export type {
  CatalogPreviewRow,
  Profile,
  CreateProfilePayload,
  ModelProfile,
  PhysicalAttributes,
  ModelStats,
  ManagerModelStat,
  ManagerStats,
};
