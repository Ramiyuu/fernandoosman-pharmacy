import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };

interface OgCardInput {
  eyebrow: string;
  title: string;
  footer: string;
}

/** Branded share image: navy field, confidence-interval mark, title set large. */
export function renderOgCard({ eyebrow, title, footer }: OgCardInput) {
  const fontSize = title.length > 70 ? 56 : title.length > 40 ? 66 : 78;
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background: '#0b1b33',
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', width: 120, height: 24, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 11, width: 120, height: 3, background: '#a9dfe4' }} />
            <div style={{ position: 'absolute', left: 0, top: 0, width: 3, height: 24, background: '#a9dfe4' }} />
            <div style={{ position: 'absolute', left: 117, top: 0, width: 3, height: 24, background: '#a9dfe4' }} />
            <div style={{ position: 'absolute', left: 48, top: 0, width: 24, height: 24, background: '#ffffff' }} />
          </div>
          <div style={{ fontSize: 28, color: '#a9dfe4' }}>{eyebrow}</div>
        </div>
        <div style={{ display: 'flex', fontSize, fontWeight: 700, lineHeight: 1.08, letterSpacing: -1, maxWidth: 1040 }}>
          {title}
        </div>
        <div style={{ display: 'flex', fontSize: 26, color: '#c9d4e4', borderTop: '2px solid #1b3a68', paddingTop: 24 }}>
          {footer}
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
