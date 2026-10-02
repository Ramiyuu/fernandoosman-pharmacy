'use client';

import { useEffect } from 'react';

import { StatusPage } from '@/components/feedback/status-page';
import { Button } from '@/components/ui/button';

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Only the digest is logged client-side; details stay in the server logs.
    console.error('Page error', error.digest);
  }, [error.digest]);

  return (
    <StatusPage
      code="500"
      title="This page could not be loaded"
      description={
        <>
          The content service did not respond as expected. Try again in a moment.
          {error.digest ? <span className="mt-2 block text-sm">Reference: {error.digest}</span> : null}
        </>
      }
      actions={
        <Button variant="dark" onClick={reset}>
          Try again
        </Button>
      }
    />
  );
}
