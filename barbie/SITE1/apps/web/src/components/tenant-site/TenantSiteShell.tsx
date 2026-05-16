import type { Tenant } from '@/lib/tenants';
import { fetchPublicMenu } from '@/lib/tenants';
import { Navigation } from './Navigation';
import { Hero } from './sections/Hero';
import { Positioning } from './sections/Positioning';
import { Programs } from './sections/Programs';
import { Rooms } from './sections/Rooms';
import { Staff } from './sections/Staff';
import { Contacts } from './sections/Contacts';
import { Footer } from './sections/Footer';

function buildGoogleFontsUrl(...families: string[]): string {
  const dedup = Array.from(new Set(families.filter(Boolean)));
  const params = dedup
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@300;400;500;600;700`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

interface TenantSiteShellProps {
  tenant: Tenant;
}

export async function TenantSiteShell({ tenant }: TenantSiteShellProps) {
  const { designTokens: dt } = tenant;
  const fontsUrl = buildGoogleFontsUrl(dt.headFont, dt.accFont, dt.bodyFont);

  // Fetch live menu from API. If the slug is missing or API hiccups, fall back
  // to an empty menu — Navigation then synthesizes from tenant.navigation.
  const menu = tenant.slug
    ? await fetchPublicMenu(tenant.slug).catch(() => ({
        template: 'top-classic' as const,
        items: [],
      }))
    : { template: 'top-classic' as const, items: [] };

  const styleVars: React.CSSProperties = {
    '--bg': dt.bg,
    '--head-color': dt.headColor,
    '--head-font': `'${dt.headFont}', serif`,
    '--acc-color': dt.accColor,
    '--acc-font': `'${dt.accFont}', serif`,
    '--body-color': dt.bodyColor,
    '--body-font': `'${dt.bodyFont}', system-ui, sans-serif`,
  } as React.CSSProperties;

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={fontsUrl} />
      <div
        style={styleVars}
        className="tenant-site min-h-screen"
      >
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
        <Navigation tenant={tenant} menu={menu} />
        <Hero tenant={tenant} />
        <Positioning tenant={tenant} />
        <Programs tenant={tenant} />
        <Rooms tenant={tenant} />
        <Staff tenant={tenant} />
        <Contacts tenant={tenant} />
        <Footer tenant={tenant} />
      </div>
    </>
  );
}
