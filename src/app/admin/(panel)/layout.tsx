import type { ReactNode } from 'react';

import { AdminShell } from '@/features/admin/components/admin-shell';
import { requireAdminPage } from '@/lib/auth/session';

/**
 * Every route under /admin (except /admin/login and /admin/auth/*) renders
 * inside this layout. The layout check is a convenience; each page and every
 * Server Action re-checks authorisation on its own because layouts are not
 * re-rendered on every client-side navigation.
 */
export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const session = await requireAdminPage();
  const { count } = await session.supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('status', 'new');

  return (
    <AdminShell
      userName={session.profile.displayName || session.email || 'Admin'}
      userEmail={session.email}
      newMessages={count ?? 0}
    >
      {children}
    </AdminShell>
  );
}
