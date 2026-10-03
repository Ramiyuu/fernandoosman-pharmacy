'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { StatusPage } from '@/components/feedback/status-page';
import { Button } from '@/components/ui/button';
import { ERROR_COPY } from '@/i18n/error-copy';
import { localeFromPathname } from '@/i18n/routing';

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const copy = ERROR_COPY[localeFromPathname(usePathname())];
  useEffect(() => {
    // Only the digest is logged client-side; details stay in the server logs.
    console.error('Page error', error.digest);
  }, [error.digest]);

  return (
    <StatusPage
      code="500"
      title={copy.errorTitle}
      description={
        <>
          {copy.errorBody}
          {error.digest ? (
            <span className="mt-2 block text-sm">
              {copy.reference} {error.digest}
            </span>
          ) : null}
        </>
      }
      actions={
        <Button variant="dark" onClick={reset}>
          {copy.tryAgain}
        </Button>
      }
    />
  );
}
