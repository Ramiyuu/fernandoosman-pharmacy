import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };

const BRAND = { navy: '#0b1f44', blue: '#2563eb', blueLight: '#60a5fa', teal: '#14b8a6', mist: '#c7d2e5', rule: '#1e3a73' };

let iconDataUrl: string | null | undefined;

/** The FO app icon, embedded as a data URL (ImageResponse cannot read local files by path). */
function brandIcon(): string | null {
  if (iconDataUrl !== undefined) return iconDataUrl;
  try {
    iconDataUrl = `data:image/png;base64,${readFileSync(join(process.cwd(), 'public/brand/fo-icon.png')).toString('base64')}`;
  } catch {
    iconDataUrl = null;
  }
  return iconDataUrl;
}

interface OgCardInput {
  /** Shown as the two-tone wordmark (last word in blue). */
  name: string;
  eyebrow: string;
  title: string;
  footer: string;
}

/** Branded share image: navy field, FO icon and wordmark, title set large, teal-dot footer. */
export function renderOgCard({ name, eyebrow, title, footer }: OgCardInput) {
  const words = name.trim().toUpperCase().split(/\s+/);
  const last = words.length > 1 ? words.pop() : undefined;
  const fontSize = title.length > 70 ? 54 : title.length > 40 ? 64 : 76;
  const icon = brandIcon();
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px 72px',
          background: BRAND.navy,
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- rendered by ImageResponse, not the browser */}
          {icon ? <img src={icon} width={72} height={72} alt="" /> : null}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', fontSize: 26, letterSpacing: 6, fontWeight: 600 }}>
              <span>{words.join(' ')}</span>
              {last ? <span style={{ color: BRAND.blueLight, marginLeft: 14 }}>{last}</span> : null}
            </div>
            <div style={{ display: 'flex', fontSize: 22, color: BRAND.teal, letterSpacing: 2 }}>{eyebrow}</div>
          </div>
        </div>
        <div style={{ display: 'flex', fontSize, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1, maxWidth: 1050 }}>{title}</div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: 24,
            color: BRAND.mist,
            borderTop: `2px solid ${BRAND.rule}`,
            paddingTop: 24,
          }}
        >
          {footer}
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
