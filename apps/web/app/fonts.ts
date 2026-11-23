import localFont from 'next/font/local';

// Same font versions as the published site, bundled locally so builds do not
// depend on Google Fonts CSS. Sources, OFL licenses and hashes: font-assets/.
// Inter keeps production's optical size 14 and its variable weight axis.
export const fontInter = localFont({
  src: './font-assets/inter-normal-variable.woff2',
  weight: '100 900',
  style: 'normal',
  variable: '--font-inter',
  display: 'swap',
  adjustFontFallback: 'Arial',
});

export const fontUnbounded = localFont({
  src: './font-assets/unbounded-normal-variable.woff2',
  weight: '400 900',
  style: 'normal',
  variable: '--font-unbounded',
  display: 'swap',
  adjustFontFallback: 'Arial',
});

export const fontPlayfair = localFont({
  src: './font-assets/playfair-display-normal-variable.woff2',
  weight: '400 700',
  style: 'normal',
  variable: '--font-playfair',
  display: 'swap',
  adjustFontFallback: 'Times New Roman',
});

export const fontSpaceGrotesk = localFont({
  src: './font-assets/space-grotesk-normal-variable.woff2',
  weight: '400 700',
  style: 'normal',
  variable: '--font-space-grotesk',
  display: 'swap',
  adjustFontFallback: 'Arial',
});
