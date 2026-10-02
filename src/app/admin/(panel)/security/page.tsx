import type { Metadata } from 'next';

import { AdminPage } from '@/features/admin/components/admin-page';
import { SecuritySettings } from '@/features/security/components/security-settings';
import { TwoFactorSetup } from '@/features/security/components/two-factor-setup';
import { requireAdminPage } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Security' };

/**
 * The only admin page reachable before two-factor authentication is set up
 * (requireAdminPage sends every other page here until then).
 */
export default async function SecurityPage() {
  const session = await requireAdminPage('admin:access', { allowWithoutTwoFactor: true });

  return (
    <AdminPage
      title="Security"
      description={session.twoFactorEnabled ? 'Sign-in protection for the admin panel.' : 'Set up two-factor authentication to unlock the admin panel.'}
    >
      {session.twoFactorEnabled ? <SecuritySettings /> : <TwoFactorSetup />}
    </AdminPage>
  );
}
