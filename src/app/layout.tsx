import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';

import { siteUrl } from '@/lib/public-env';

import './globals.css';

// Fonts ship with the project (@fontsource-variable): the build never depends
// on a font CDN, and visitors' browsers never contact third parties for them.
// Montserrat matches the geometric capitals of the brand wordmark; the serif
// carries long-form reading (articles, bios). The Latin subset covers
// Portuguese and English.
const montserrat = localFont({
  src: [
    { path: '../../node_modules/@fontsource-variable/montserrat/files/montserrat-latin-wght-normal.woff2', weight: '100 900', style: 'normal' },
    { path: '../../node_modules/@fontsource-variable/montserrat/files/montserrat-latin-wght-italic.woff2', weight: '100 900', style: 'italic' },
  ],
  variable: '--font-montserrat',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
});

const sourceSerif = localFont({
  src: [
    { path: '../../node_modules/@fontsource-variable/source-serif-4/files/source-serif-4-latin-opsz-normal.woff2', weight: '200 900', style: 'normal' },
    { path: '../../node_modules/@fontsource-variable/source-serif-4/files/source-serif-4-latin-opsz-italic.woff2', weight: '200 900', style: 'italic' },
  ],
  variable: '--font-source-serif',
  display: 'swap',
  fallback: ['ui-serif', 'Georgia', 'serif'],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'Fernando Osman | Pharmacy, Clinical Research & Data',
    template: '%s | Fernando Osman',
  },
  description: 'Scientific communication, clinical evidence and data-driven learning in pharmacy.',
  applicationName: 'Fernando Osman',
  authors: [{ name: 'Fernando Osman' }],
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: '#0b1f44',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${montserrat.variable} ${sourceSerif.variable}`}>
      <body className="min-h-dvh bg-white">{children}</body>
    </html>
  );
}
