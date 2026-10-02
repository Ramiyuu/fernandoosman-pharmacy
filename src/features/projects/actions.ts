'use server';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { invalidInput } from '@/lib/validation';
import { guardAction } from '@/lib/auth/action-guard';
import { richTextToPlainText, sanitizeRichText } from '@/lib/content/rich-text';
import { failFromDbError } from '@/lib/db-errors';
import { revalidatePublicContent } from '@/lib/revalidate';
import { isAllowedContentImageUrl } from '@/lib/storage/public-url';
import { uuidSchema } from '@/schemas/common';
import { projectInputSchema, type ProjectInput } from '@/schemas/project.schema';
import { logActivity } from '@/services/activity-log.service';
import type { Json } from '@/types/database.types';

export async function saveProjectAction(input: ProjectInput): Promise<ActionResult<{ id: string; slug: string }>> {
  const guard = await guardAction('projects:write');
  if (!guard.ok) return guard;
  const { supabase, userId } = guard.session;

  const parsed = projectInputSchema.safeParse(input);
  if (!parsed.success) {
    return invalidInput(parsed.error);
  }
  const { id, tags, content: rawContent, ...data } = parsed.data;
  const content = sanitizeRichText(rawContent, { isAllowedImageSrc: isAllowedContentImageUrl });

  const { data: saved, error } = await supabase.rpc('admin_save_project', {
    p_id: id,
    p_data: { ...data, content, content_text: richTextToPlainText(content) } as unknown as Json,
    p_tag_names: [...new Set(tags)],
  });
  if (error || !saved) return failFromDbError('projects.save', error);
  const result = saved as unknown as { id: string; slug: string };

  await logActivity(supabase, userId, {
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
  const { supabase, userId } = guard.session;
  if (!uuidSchema.safeParse(id).success) return fail('Invalid request.');

  const { data, error } = await supabase.from('projects').delete().eq('id', id).select('title').maybeSingle();
  if (error) return failFromDbError('projects.delete', error);
  if (!data) return fail('This project no longer exists.', { code: 'NOT_FOUND' });

  await logActivity(supabase, userId, { action: 'project_deleted', entityType: 'project', entityId: id, summary: data.title });
  revalidatePublicContent();
  return ok(undefined, 'Project deleted.');
}
