import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s | Admin' },
  robots: { index: false, follow: false },
};

// Never prerender or cache anything under /admin: every response depends on
// the visitor's session and is checked on the server per request.
export const dynamic = 'force-dynamic';

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="bottom-right" richColors closeButton />
    </>
  );
}
