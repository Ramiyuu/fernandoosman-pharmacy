'use server';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { guardAction } from '@/lib/auth/action-guard';
import { sql } from '@/lib/db/sql';
import { failFromDbError } from '@/lib/db-errors';
import { uuidSchema } from '@/schemas/common';
import { logActivity } from '@/services/activity-log.service';

const STATUSES = ['new', 'read', 'archived'] as const;

export async function setMessageStatusAction(id: string, status: (typeof STATUSES)[number]): Promise<ActionResult> {
  const guard = await guardAction('messages:manage');
  if (!guard.ok) return guard;
  if (!uuidSchema.safeParse(id).success || !STATUSES.includes(status)) return fail('Invalid request.');

  try {
    await guard.session.db.execute(sql`update public.contacts set status = ${status} where id = ${id}`);
  } catch (error) {
    return failFromDbError('contacts.status', error);
  }
  return ok(undefined);
}

/** Deleting a message also honours LGPD erasure requests from the sender. */
export async function deleteMessageAction(id: string): Promise<ActionResult> {
  const guard = await guardAction('messages:manage');
  if (!guard.ok) return guard;
  const { db, userId } = guard.session;
  if (!uuidSchema.safeParse(id).success) return fail('Invalid request.');

  let deleted: { id: string } | null;
  try {
    deleted = await db.maybeOne(sql`delete from public.contacts where id = ${id} returning id`);
  } catch (error) {
    return failFromDbError('contacts.delete', error);
  }
  if (!deleted) return fail('This message no longer exists.', { code: 'NOT_FOUND' });

  await logActivity(db, userId, { action: 'contact_deleted', entityType: 'contact', entityId: id, summary: 'Deleted a message' });
  return ok(undefined, 'Message deleted.');
}
