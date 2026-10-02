'use server';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { guardAction } from '@/lib/auth/action-guard';
import { failFromDbError } from '@/lib/db-errors';
import { uuidSchema } from '@/schemas/common';
import { logActivity } from '@/services/activity-log.service';

export async function setMessageStatusAction(id: string, status: 'new' | 'read' | 'archived'): Promise<ActionResult> {
  const guard = await guardAction('messages:manage');
  if (!guard.ok) return guard;
  if (!uuidSchema.safeParse(id).success || !['new', 'read', 'archived'].includes(status)) return fail('Invalid request.');

  const { error } = await guard.session.supabase.from('contacts').update({ status }).eq('id', id);
  if (error) return failFromDbError('contacts.status', error);
  return ok(undefined);
}

export async function deleteMessageAction(id: string): Promise<ActionResult> {
  const guard = await guardAction('messages:manage');
  if (!guard.ok) return guard;
  const { supabase, userId } = guard.session;
  if (!uuidSchema.safeParse(id).success) return fail('Invalid request.');

  const { data, error } = await supabase.from('contacts').delete().eq('id', id).select('id').maybeSingle();
  if (error) return failFromDbError('contacts.delete', error);
  if (!data) return fail('This message no longer exists.', { code: 'NOT_FOUND' });

  await logActivity(supabase, userId, { action: 'contact_deleted', entityType: 'contact', entityId: id, summary: 'Deleted a message' });
  return ok(undefined, 'Message deleted.');
}
