'use client';

import { apiFetch } from './api-client';

export interface SiteIdentity {
  url: string;
  finalUrl: string;
  httpStatus: number;
  bytesFetched: number;
  durationMs: number;
  title?: string;
  description?: string;
  lang?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  favicon?: string;
}

export interface Typography {
  fontFamilies: string[];
  googleFonts: string[];
  stylesheets: string[];
}

export interface ColorEntry {
  value: string;
  count: number;
}

export interface Palette {
  hex: ColorEntry[];
  rgb: ColorEntry[];
}

export interface Structure {
  h1Count: number;
  h2Count: number;
  h3Count: number;
  sectionCount: number;
  h1Texts: string[];
  h2Texts: string[];
  ctaTexts: string[];
}

export interface ImageEntry {
  src: string;
  alt?: string;
}

export interface SiteAnalysis {
  identity: SiteIdentity;
  typography: Typography;
  palette: Palette;
  structure: Structure;
  images: ImageEntry[];
  notes: string[];
}

export const toolsApi = {
  analyzeSite: (url: string) =>
    apiFetch<SiteAnalysis>('/v1/tools/analyze-site', {
      method: 'POST',
      body: { url },
    }),
};
