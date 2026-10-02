'use server';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { guardAction } from '@/lib/auth/action-guard';
import { richTextToPlainText, sanitizeRichText } from '@/lib/content/rich-text';
import { sql } from '@/lib/db/sql';
import { failFromDbError } from '@/lib/db-errors';
import { revalidatePublicContent } from '@/lib/revalidate';
import { isAllowedContentImageUrl } from '@/lib/storage/public-url';
import { invalidInput } from '@/lib/validation';
import { uuidSchema } from '@/schemas/common';
import { projectInputSchema, type ProjectInput } from '@/schemas/project.schema';
import { logActivity } from '@/services/activity-log.service';

export async function saveProjectAction(input: ProjectInput): Promise<ActionResult<{ id: string; slug: string }>> {
  const guard = await guardAction('projects:write');
  if (!guard.ok) return guard;
  const { db, userId } = guard.session;

  const parsed = projectInputSchema.safeParse(input);
  if (!parsed.success) {
    return invalidInput(parsed.error);
  }
  const { id, tags, content: rawContent, ...data } = parsed.data;
  const content = sanitizeRichText(rawContent, { isAllowedImageSrc: isAllowedContentImageUrl });

  let result: { id: string; slug: string };
  try {
    const row = await db.one<{ saved: { id: string; slug: string } }>(sql`
      select public.admin_save_project(
        ${id ?? null}::uuid,
        ${JSON.stringify({ ...data, content, content_text: richTextToPlainText(content) })}::jsonb,
        ${[...new Set(tags)]}::text[]
      ) as saved`);
    result = row.saved;
  } catch (error) {
    return failFromDbError('projects.save', error);
  }

  await logActivity(db, userId, {
    action: id ? 'project_updated' : 'project_created',
    entityType: 'project',
    entityId: result.id,
    summary: data.title,
  });
  revalidatePublicContent();
  return ok(result, id ? 'Project saved.' : 'Project created.');
}

export async function deleteProjectAction(id: string): Promise<ActionResult> {
  const guard = await guardAction('projects:write');
  if (!guard.ok) return guard;
  const { db, userId } = guard.session;
  if (!uuidSchema.safeParse(id).success) return fail('Invalid request.');

  let deleted: { title: string } | null;
  try {
    deleted = await db.maybeOne(sql`delete from public.projects where id = ${id} returning title`);
  } catch (error) {
    return failFromDbError('projects.delete', error);
  }
  if (!deleted) return fail('This project no longer exists.', { code: 'NOT_FOUND' });

  await logActivity(db, userId, { action: 'project_deleted', entityType: 'project', entityId: id, summary: deleted.title });
  revalidatePublicContent();
  return ok(undefined, 'Project deleted.');
}
