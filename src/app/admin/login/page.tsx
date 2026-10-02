import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { LoginForm } from '@/features/auth/components/login-form';
import { getAuthContext } from '@/lib/auth/session';
import { roleHasPermission } from '@/lib/auth/permissions';
import { isMagicLinkEnabled } from '@/lib/env';
import { safeRedirectPath } from '@/utils/url';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: PageProps<'/admin/login'>) {
  const params = await searchParams;
  const next = safeRedirectPath(Array.isArray(params.next) ? params.next[0] : params.next, '/admin');

  // Already signed in with access → straight to the panel.
  const context = await getAuthContext();
  if (context?.profile?.isActive && roleHasPermission(context.profile.role, 'admin:access')) redirect(next);

  const linkError = params.error === 'link' ? 'That sign-in link is invalid or has expired. Request a new one.' : undefined;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-mist px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-sm text-muted hover:text-ink">
            Back to the site
          </Link>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">Sign in to the admin panel</h1>
          <p className="mt-2 text-sm text-muted">Accounts are created by the site owner. There is no public sign-up.</p>
        </div>
        <div className="rounded-xl border border-rule bg-white p-6 shadow-raise">
          <LoginForm next={next} magicLinkEnabled={isMagicLinkEnabled()} initialError={linkError} />
        </div>
      </div>
    </main>
  );
}
