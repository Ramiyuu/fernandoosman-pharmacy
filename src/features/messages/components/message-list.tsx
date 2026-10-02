'use client';

import { Archive, Mail, MailOpen, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useActionRunner } from '@/hooks/use-action-runner';
import { formatDateTime } from '@/utils/format';

import { deleteMessageAction, setMessageStatusAction } from '../actions';

export interface MessageRow {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'archived';
  created_at: string;
}

export function MessageList({ messages }: { messages: MessageRow[] }) {
  const { run } = useActionRunner();
  const [toDelete, setToDelete] = useState<MessageRow | null>(null);

  return (
    <>
      <ul className="space-y-3">
        {messages.map((message) => (
          <li key={message.id} className="rounded-xl border border-rule bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-ink">
                  {message.subject || 'No subject'}{' '}
                  {message.status === 'new' ? <Badge tone="teal">New</Badge> : null}
                  {message.status === 'archived' ? <Badge>Archived</Badge> : null}
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  {message.name}, <a href={`mailto:${message.email}`} className="text-azure-700 hover:underline">{message.email}</a>, {formatDateTime(message.created_at)}
                </p>
              </div>
              <div className="flex gap-1">
                {message.status === 'new' ? (
                  <Button variant="ghost" size="sm" onClick={() => run(() => setMessageStatusAction(message.id, 'read')).catch(() => undefined)}>
                    <MailOpen aria-hidden="true" /> Mark as read
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => run(() => setMessageStatusAction(message.id, 'new')).catch(() => undefined)}>
                    <Mail aria-hidden="true" /> Mark as new
                  </Button>
                )}
                {message.status !== 'archived' ? (
                  <Button variant="ghost" size="icon-sm" aria-label="Archive message" onClick={() => run(() => setMessageStatusAction(message.id, 'archived')).catch(() => undefined)}>
                    <Archive aria-hidden="true" />
                  </Button>
                ) : null}
                <Button variant="danger-ghost" size="icon-sm" aria-label="Delete message" onClick={() => setToDelete(message)}>
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-navy-900">{message.message}</p>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => (!open ? setToDelete(null) : undefined)}
        title="Delete message?"
        description={<>This action cannot be undone. The message from {toDelete?.name} will be deleted.</>}
        confirmLabel="Delete message"
        onConfirm={() => (toDelete ? run(() => deleteMessageAction(toDelete.id)) : undefined)}
      />
    </>
  );
}
