import { Inter, Unbounded, Playfair_Display, Space_Grotesk } from 'next/font/google';

export const fontInter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

export const fontUnbounded = Unbounded({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-unbounded',
  display: 'swap',
});

export const fontPlayfair = Playfair_Display({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-playfair',
  display: 'swap',
});

export const fontSpaceGrotesk = Space_Grotesk({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
});
