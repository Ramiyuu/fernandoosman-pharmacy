import type { ReactNode } from 'react';

import { AdminShell } from '@/features/admin/components/admin-shell';
import { requireAdminPage } from '@/lib/auth/session';
import { sql } from '@/lib/db/sql';

/**
 * Every route under /admin (except /admin/login) renders inside this layout.
 * The layout check is a convenience; each page and every Server Action
 * re-checks authorisation on its own (including the 2FA requirement) because
 * layouts are not re-rendered on every client-side navigation. The layout
 * itself allows a pending 2FA setup so that /admin/security can render.
 */
export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const session = await requireAdminPage('admin:access', { allowWithoutTwoFactor: true });
  const newMessages = session.twoFactorEnabled
    ? await session.db
        .one<{ count: number }>(sql`select count(*) as count from public.contacts where status = 'new'`)
        .then((row) => row.count)
        .catch(() => 0)
    : 0;

  return (
    <AdminShell
      userName={session.profile.displayName || session.email || 'Admin'}
      userEmail={session.email}
      newMessages={newMessages}
    >
      {children}
    </AdminShell>
  );
}
