'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { toast } from 'sonner';

import type { ActionResult } from '@/lib/action-result';

/**
 * Runs a Server Action, shows a toast with the outcome and refreshes the
 * current route's server data. Throws on failure so ConfirmDialog stays open.
 */
export function useActionRunner() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const run = useCallback(
    async <T,>(action: () => Promise<ActionResult<T>>, options: { success?: string; refresh?: boolean } = {}): Promise<T> => {
      let result: ActionResult<T>;
      try {
        result = await action();
      } catch {
        toast.error('The server could not be reached. Check your connection and try again.');
        throw new Error('network');
      }
      if (!result.ok) {
        toast.error(result.error);
        if (result.code === 'UNAUTHENTICATED') router.push('/admin/login');
        throw new Error(result.error);
      }
      const message = options.success ?? result.message;
      if (message) toast.success(message);
      if (options.refresh !== false) startTransition(() => router.refresh());
      return result.data;
    },
    [router],
  );

  return { run, isPending };
}
