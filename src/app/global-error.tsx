'use client';

/** Last-resort boundary (root layout failed). Must render its own <html>/<body>. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', color: '#0b1b33', padding: '4rem 1rem', maxWidth: 640, margin: '0 auto' }}>
        <p style={{ fontSize: 48, fontWeight: 600, color: '#0e9aa7', margin: 0 }}>500</p>
        <h1 style={{ fontSize: 28 }}>Something went wrong</h1>
        <p style={{ color: '#566170', lineHeight: 1.6 }}>
          The site could not be displayed. Try again in a moment.
          {error.digest ? ` Reference: ${error.digest}` : ''}
        </p>
        <button
          type="button"
          onClick={reset}
          style={{ marginTop: 16, padding: '10px 16px', background: '#0b1b33', color: '#fff', border: 0, borderRadius: 6, cursor: 'pointer' }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
