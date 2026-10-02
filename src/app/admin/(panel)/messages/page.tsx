import type { Metadata } from 'next';

import { AdminPage, EmptyState } from '@/features/admin/components/admin-page';
import { MessageList } from '@/features/messages/components/message-list';
import { requireAdminPage } from '@/lib/auth/session';
import { failQuery } from '@/services/errors';

export const metadata: Metadata = { title: 'Messages' };

export default async function MessagesPage() {
  const session = await requireAdminPage('messages:manage');
  const { data, error } = await session.supabase
    .from('contacts')
    .select('id, name, email, subject, message, status, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) failQuery('admin.messages', error);

  return (
    <AdminPage title="Messages" description="Sent through the contact form. Reply by email.">
      {data && data.length > 0 ? (
        <MessageList messages={data} />
      ) : (
        <EmptyState title="No messages yet." description="Messages from the contact form will appear here." />
      )}
    </AdminPage>
  );
}
