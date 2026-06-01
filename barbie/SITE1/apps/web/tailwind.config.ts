import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,js,jsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── NAS · 2077 palette (source: barbie/SITE1/dashboard-2077.html) ──
        // Все цвета — `rgb(var(--name) / <alpha-value>)`, поэтому работают
        // и сплошные классы (`bg-surface`), и альфа-варианты (`bg-gold/15`).
        bg: 'rgb(var(--bg) / <alpha-value>)',
        'bg-elev': 'rgb(var(--bg-elev) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        'surface-3': 'rgb(var(--surface-3) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        'line-strong': 'rgb(var(--line-strong) / <alpha-value>)',

        text: 'rgb(var(--text) / <alpha-value>)',
        'text-dim': 'rgb(var(--text-dim) / <alpha-value>)',
        'text-mute': 'rgb(var(--text-mute) / <alpha-value>)',

        gold: 'rgb(var(--gold) / <alpha-value>)',
        'gold-warm': 'rgb(var(--gold-warm) / <alpha-value>)',

        // Secondary accent — для notifications/info/ED chrome.
        // Primary остаётся `gold`. Альфа-варианты: `bg-accent-2/15`.
        'accent-2': 'rgb(var(--accent-2) / <alpha-value>)',

        cyan: 'rgb(var(--cyan) / <alpha-value>)',
        magenta: 'rgb(var(--magenta) / <alpha-value>)',
        amber: 'rgb(var(--amber) / <alpha-value>)',
        green: 'rgb(var(--green) / <alpha-value>)',
        red: 'rgb(var(--red) / <alpha-value>)',

        // Compat aliases for legacy code paths.
        border: 'rgb(var(--line) / <alpha-value>)',
        accent: 'rgb(var(--gold) / <alpha-value>)',
      },
      fontFamily: {
        // ВСЕ text-fontfamilies = RF Rufo Semibold. Первой — next/font/local
        // переменная `--font-rufo` (self-hosted, корректные URL в любом
        // окружении/basePath), затем legacy `@font-face 'RF Rufo'` (globals.css)
        // и системные фолбэки. JetBrains Mono — отдельный role для meta/timestamps.
        admin: ['var(--font-rufo)', 'RF Rufo', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['var(--font-rufo)', 'RF Rufo', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-rufo)', 'RF Rufo', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '8px',
        md: '14px',
        lg: '22px',
        xl: '28px',
      },
      letterSpacing: {
        widest: '.18em',
      },
    },
  },
  plugins: [],
};

export default config;
