import type { Metadata } from 'next';

import { contactRetentionDays, describeRetention } from '@/config/privacy';
import { AdminPage, EmptyState } from '@/features/admin/components/admin-page';
import { MessageList, type MessageRow as ContactMessage } from '@/features/messages/components/message-list';
import { requireAdminPage } from '@/lib/auth/session';
import { serverDb } from '@/lib/db/client';
import { sql } from '@/lib/db/sql';
import { failQuery } from '@/services/errors';

export const metadata: Metadata = { title: 'Messages' };

export default async function MessagesPage() {
  const session = await requireAdminPage('messages:manage');
  const retentionDays = contactRetentionDays();
  let data: ContactMessage[];
  try {
    // LGPD retention: expired messages are purged before the inbox is shown.
    await serverDb().execute(sql`select private.purge_expired_contacts(${retentionDays})`);
    data = await session.db.many<ContactMessage>(sql`
      select id, name, email, subject, message, status, created_at
      from public.contacts order by created_at desc limit 200`);
  } catch (error) {
    failQuery('admin.messages', error);
  }

  return (
    <AdminPage
      title="Messages"
      description={`Sent through the contact form. Reply by email. Messages are deleted automatically after ${describeRetention(retentionDays)}; delete one sooner if the sender asks.`}
    >
      {data && data.length > 0 ? (
        <MessageList messages={data} />
      ) : (
        <EmptyState title="No messages yet." description="Messages from the contact form will appear here." />
      )}
    </AdminPage>
  );
}
