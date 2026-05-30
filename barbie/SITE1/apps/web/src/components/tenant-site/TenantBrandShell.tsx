/**
 * TenantBrandShell — общий wrapper тенант-публики.
 *
 * Φ2 brand-kit foundation. Принимает уже загруженные `designTokens`,
 * инжектирует:
 *   - CSS-vars: --bg, --head-color, --head-font, --acc-color, --acc-font,
 *     --body-color, --body-font (1:1 с колонками tenant_design_tokens).
 *   - Google Fonts <link> для трёх семейств.
 *   - Глобальные стили `.tenant-site` (background, typography, .container).
 *
 * Используется обоими путями рендера тенанта:
 *   - Legacy fallback (`TenantSiteShell`) — оборачивает <Navigation> + sections.
 *   - ED-страницы (например, `/imperiumspa` после Φ2) — оборачивают `<EdRenderer>`.
 *
 * Сервер-рендер: без 'use client'. Hooks не используются.
 */
import type { ReactNode } from 'react';

export interface BrandTokens {
  bg: string;
  headColor: string;
  headFont: string;
  accColor: string;
  accFont: string;
  bodyColor: string;
  bodyFont: string;
}

function buildGoogleFontsUrl(...families: string[]): string {
  const dedup = Array.from(new Set(families.filter(Boolean)));
  const params = dedup
    .map(
      (f) =>
        `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@300;400;500;600;700`,
    )
    .join('&');
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

interface TenantBrandShellProps {
  designTokens: BrandTokens;
  children: ReactNode;
  /** Доп. CSS-класс к wrapper-div (например, для vertical-side layout). */
  wrapperClassName?: string;
}

export function TenantBrandShell({
  designTokens: dt,
  children,
  wrapperClassName,
}: TenantBrandShellProps) {
  const fontsUrl = buildGoogleFontsUrl(dt.headFont, dt.accFont, dt.bodyFont);

  const styleVars: React.CSSProperties = {
    '--bg': dt.bg,
    '--head-color': dt.headColor,
    '--head-font': `'${dt.headFont}', serif`,
    '--acc-color': dt.accColor,
    '--acc-font': `'${dt.accFont}', serif`,
    '--body-color': dt.bodyColor,
    '--body-font': `'${dt.bodyFont}', system-ui, sans-serif`,
  } as React.CSSProperties;

  const cls = wrapperClassName ? `tenant-site ${wrapperClassName}` : 'tenant-site';

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={fontsUrl} />
      <div style={styleVars} className={cls}>
        <style>{`
          .tenant-site {
            background: var(--bg);
            color: var(--body-color);
            font-family: var(--body-font);
            line-height: 1.6;
          }
          .tenant-site h1, .tenant-site h2, .tenant-site h3 {
            font-family: var(--head-font);
            color: var(--head-color);
            letter-spacing: -0.01em;
            line-height: 1.1;
          }
          .tenant-site .accent {
            font-family: var(--acc-font);
            color: var(--acc-color);
          }
          .tenant-site a {
            color: var(--acc-color);
            text-decoration: none;
            transition: opacity 0.2s;
          }
          .tenant-site a:hover { opacity: 0.7; }
          .tenant-site .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 1.5rem;
          }
        `}</style>
        {children}
      </div>
    </>
  );
}
