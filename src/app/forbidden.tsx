import type { Metadata } from 'next';
import Link from 'next/link';

import { StatusPage } from '@/components/feedback/status-page';
import { buttonVariants } from '@/components/ui/button';
import { signOutAction } from '@/features/auth/actions';

export const metadata: Metadata = { title: 'Access denied', robots: { index: false } };

/** Rendered (HTTP 403) when a signed-in account lacks the required role. */
export default function Forbidden() {
  return (
    <StatusPage
      code="403"
      title="You do not have access to this area"
      description="You are signed in, but this account has no administrative role. Ask the site owner to grant access, or sign in with a different account."
      actions={
        <>
          <form action={signOutAction}>
            <button type="submit" className={buttonVariants({ variant: 'dark' })}>
              Sign out
            </button>
          </form>
          <Link href="/" className={buttonVariants({ variant: 'secondary' })}>
            Go to the public site
          </Link>
        </>
      }
    />
  );
}
