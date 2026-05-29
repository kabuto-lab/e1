import type { DesignTokens } from './manifest';

/**
 * Design-extractor. Harvested from the Replikant migrator.
 *
 * Two modes:
 *   - **extracted**: parse real CSS text (e.g. a theme style.css). Build palette
 *     from CSS custom properties and color declarations; fonts from font-family
 *     rules; spacing baseline left at 8 (WP default).
 *   - **default**: when no CSS available. Use a neutral palette that "looks
 *     fine" until the user customises.
 *
 * Future enhancement: LLM augmentation — feed sampled design assets to a model
 * with a structured-output prompt to refine tokens. Out of scope for the harvest.
 */

export const DEFAULT_TOKENS: DesignTokens = {
  palette: {
    primary: '#d4af37', // neutral gold fallback
    secondary: '#4ec9b0',
    accent: '#e0a040',
    bg: '#0a0a0a',
    fg: '#e8e8e8',
    fgDim: '#9a9a9a',
  },
  fonts: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    serif: ['Georgia', 'serif'],
    mono: ['JetBrains Mono', 'Consolas', 'monospace'],
  },
  spacing: { unit: 8 },
  confidence: 'default',
};

/**
 * Extract design tokens from CSS source text.
 * Falls back to defaults when extraction yields too little information.
 */
export function extractFromCss(css: string): DesignTokens {
  if (!css || css.length < 20) {
    return { ...DEFAULT_TOKENS, confidence: 'default' };
  }

  const colors = extractColorTokens(css);
  const fonts = extractFontFamilies(css);

  // Need at least 2 distinct colors to consider extraction successful.
  const distinctColors = Array.from(new Set(colors));
  if (distinctColors.length < 2 && fonts.length === 0) {
    return { ...DEFAULT_TOKENS, confidence: 'default' };
  }

  // Pick palette from the most-mentioned colors (top by frequency).
  const colorCounts = new Map<string, number>();
  for (const c of colors) colorCounts.set(c, (colorCounts.get(c) ?? 0) + 1);
  const sortedColors = Array.from(colorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c);

  const primary = sortedColors[0] ?? DEFAULT_TOKENS.palette.primary;
  const secondary = sortedColors[1] ?? DEFAULT_TOKENS.palette.secondary;
  const accent = sortedColors[2] ?? DEFAULT_TOKENS.palette.accent;

  // Heuristic: brightest color → bg or fg? In dark themes bg is dark, fg light.
  // For MVP, just sort by lightness and pick extremes.
  const bgFg = pickBgFg(distinctColors);

  const sans = fonts.find((f) => looksLikeSans(f)) ?? null;
  const serif = fonts.find((f) => looksLikeSerif(f)) ?? null;
  const mono = fonts.find((f) => looksLikeMono(f)) ?? null;

  return {
    palette: {
      primary,
      secondary,
      accent,
      bg: bgFg.bg,
      fg: bgFg.fg,
      fgDim: DEFAULT_TOKENS.palette.fgDim,
    },
    fonts: {
      sans: sans ? [sans, ...DEFAULT_TOKENS.fonts.sans] : DEFAULT_TOKENS.fonts.sans,
      serif: serif ? [serif, ...DEFAULT_TOKENS.fonts.serif] : DEFAULT_TOKENS.fonts.serif,
      mono: mono ? [mono, ...DEFAULT_TOKENS.fonts.mono] : DEFAULT_TOKENS.fonts.mono,
    },
    spacing: { unit: 8 },
    confidence: 'extracted',
  };
}

// ────────── helpers ──────────

function extractColorTokens(css: string): string[] {
  const out: string[] = [];

  // CSS custom properties: --brand: #abcdef;
  for (const m of css.matchAll(/--[a-zA-Z0-9-]+\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))/g)) {
    const v = m[1];
    if (v) out.push(normalizeColor(v));
  }

  // color: declarations
  for (const m of css.matchAll(/\bcolor\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))/g)) {
    const v = m[1];
    if (v) out.push(normalizeColor(v));
  }

  // background / background-color
  for (const m of css.matchAll(
    /\bbackground(?:-color)?\s*:[^;{]*?(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))/g,
  )) {
    const v = m[1];
    if (v) out.push(normalizeColor(v));
  }

  return out;
}

function extractFontFamilies(css: string): string[] {
  const out: string[] = [];
  for (const m of css.matchAll(/font-family\s*:\s*([^;}]+)/g)) {
    const decl = m[1];
    if (!decl) continue;
    // First font in the stack — strip quotes.
    const first = decl.split(',')[0]?.trim().replace(/^['"]|['"]$/g, '');
    if (first && first.length > 0 && !looksLikeKeyword(first)) {
      out.push(first);
    }
  }
  return out;
}

function looksLikeKeyword(name: string): boolean {
  const kw = name.toLowerCase();
  return ['inherit', 'initial', 'unset', 'revert', 'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'system-ui'].includes(kw);
}

function looksLikeSans(name: string): boolean {
  const n = name.toLowerCase();
  return (
    /\b(inter|roboto|open\s*sans|lato|montserrat|poppins|nunito|raleway|source\s*sans|work\s*sans|sans)\b/.test(
      n,
    )
  );
}
function looksLikeSerif(name: string): boolean {
  const n = name.toLowerCase();
  return /\b(georgia|times|merriweather|playfair|lora|noto\s*serif|pt\s*serif|serif)\b/.test(n);
}
function looksLikeMono(name: string): boolean {
  const n = name.toLowerCase();
  return /\b(jetbrains|fira|courier|monaco|menlo|consolas|source\s*code|mono)\b/.test(n);
}

function normalizeColor(raw: string): string {
  const v = raw.trim().toLowerCase();
  // Expand 3-digit hex to 6-digit.
  const hex3 = v.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/);
  if (hex3) return `#${hex3[1]}${hex3[1]}${hex3[2]}${hex3[2]}${hex3[3]}${hex3[3]}`;
  return v;
}

function pickBgFg(colors: string[]): { bg: string; fg: string } {
  // Convert each to luminance, sort, pick extremes.
  const withLum = colors
    .map((c) => ({ c, lum: roughLuminance(c) }))
    .filter((x) => x.lum >= 0)
    .sort((a, b) => a.lum - b.lum);
  if (withLum.length < 2) {
    return { bg: DEFAULT_TOKENS.palette.bg, fg: DEFAULT_TOKENS.palette.fg };
  }
  const dark = withLum[0]!.c;
  const light = withLum[withLum.length - 1]!.c;
  // Most WP themes are light-bg / dark-fg, so default to that.
  return { bg: light, fg: dark };
}

function roughLuminance(color: string): number {
  // Only handle hex for MVP. rgba/hsla → -1 (skipped from bg/fg picking).
  const m = color.match(/^#([0-9a-fA-F]{6})$/);
  if (!m) return -1;
  const hex = m[1]!;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
