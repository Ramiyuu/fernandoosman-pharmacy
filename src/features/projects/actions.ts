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

/** Opens the project's version in another language, creating a draft copy when missing. */
export async function createProjectTranslationAction(input: {
  id: string;
  language: 'en' | 'pt';
}): Promise<ActionResult<{ id: string; created: boolean }>> {
  const guard = await guardAction('projects:write');
  if (!guard.ok) return guard;
  const { db, userId } = guard.session;
  if (!uuidSchema.safeParse(input.id).success || !['en', 'pt'].includes(input.language)) return fail('Invalid request.');

  let result: { id: string; created: boolean };
  try {
    const row = await db.one<{ result: { id: string; created: boolean } }>(
      sql`select public.admin_create_project_translation(${input.id}::uuid, ${input.language}) as result`,
    );
    result = row.result;
  } catch (error) {
    return failFromDbError('projects.translate', error);
  }

  if (result.created) {
    await logActivity(db, userId, {
      action: 'project_created',
      entityType: 'project',
      entityId: result.id,
      summary: `${input.language === 'pt' ? 'Portuguese' : 'English'} version created from ${input.id}`,
    });
  }
  return ok(
    result,
    result.created
      ? `${input.language === 'pt' ? 'Portuguese' : 'English'} draft created. Translate it and publish when ready.`
      : 'Opening the existing version.',
  );
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
