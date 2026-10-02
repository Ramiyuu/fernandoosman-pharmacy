import { AdminPage, Panel } from '@/features/admin/components/admin-page';
import { requireAdminPage } from '@/lib/auth/session';
import { sql } from '@/lib/db/sql';
import { formatDateTime } from '@/utils/format';
export const metadata = { title: 'Audit log' };
export default async function AuditPage() {
  const { db } = await requireAdminPage();
  const entries = await db.many<{ id: number; action: string; summary: string; created_at: string }>(
    sql`select id, action, summary, created_at from public.activity_logs order by created_at desc limit 200`,
  );
  return (
    <AdminPage
      title="Audit log"
      description="The 200 most recent administrative events. Records cannot be edited from the application."
    >
      <Panel title="Recent activity">
        <ol className="divide-y divide-rule">
          {entries.map((e) => (
            <li className="py-4 text-sm" key={e.id}>
              <p className="font-medium">{e.summary || e.action}</p>
              <p className="mt-1 text-xs text-muted">
                {formatDateTime(e.created_at)} · {e.action}
              </p>
            </li>
          ))}
        </ol>
      </Panel>
    </AdminPage>
  );
}
