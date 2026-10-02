import type { Metadata, Viewport } from 'next';
import { Instrument_Sans, Source_Serif_4 } from 'next/font/google';
import type { ReactNode } from 'react';

import { siteUrl } from '@/lib/public-env';

import './globals.css';

const instrumentSans = Instrument_Sans({
  subsets: ['latin', 'latin-ext'],
  axes: ['wdth'],
  variable: '--font-instrument-sans',
  display: 'swap',
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin', 'latin-ext'],
  axes: ['opsz'],
  style: ['normal', 'italic'],
  variable: '--font-source-serif',
  display: 'swap',
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
  themeColor: '#0b1b33',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${instrumentSans.variable} ${sourceSerif.variable}`}>
      <body className="min-h-dvh bg-white">{children}</body>
    </html>
  );
}
