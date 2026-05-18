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

export interface NavItem {
  label: string;
  href: string;
  depth: number;
}

export interface GuessedRoles {
  bg: string;
  head: string;
  acc: string;
}

export interface SiteAnalysis {
  identity: SiteIdentity;
  typography: Typography;
  palette: Palette;
  structure: Structure;
  images: ImageEntry[];
  navigation: NavItem[];
  isSpa: boolean;
  guessedRoles: GuessedRoles;
  notes: string[];
}

export interface ScreenshotResult {
  url: string;
  key: string;
  sizeBytes: number;
  width: number;
  height: number;
  cached: boolean;
  durationMs: number;
}

export const toolsApi = {
  analyzeSite: (url: string) =>
    apiFetch<SiteAnalysis>('/v1/tools/analyze-site', {
      method: 'POST',
      body: { url },
    }),
  screenshot: (url: string, fullPage = false) =>
    apiFetch<ScreenshotResult>('/v1/tools/screenshot', {
      method: 'POST',
      body: { url, fullPage },
    }),
};
