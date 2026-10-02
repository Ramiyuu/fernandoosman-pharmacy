'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Admin page error', error.digest);
  }, [error.digest]);

  return (
    <div className="mx-auto max-w-xl px-6 py-20">
      <p className="text-sm font-medium text-danger-700">Error</p>
      <h1 className="mt-2 text-2xl font-semibold text-ink">This page could not be loaded</h1>
      <p className="mt-2 text-muted">
        The database did not respond as expected. Your saved work is not affected. Try again, and if the problem persists check
        the server logs{error.digest ? ` (reference ${error.digest})` : ''}.
      </p>
      <Button className="mt-6" variant="dark" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
