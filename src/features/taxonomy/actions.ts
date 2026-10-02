'use server';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { invalidInput } from '@/lib/validation';
import { guardAction } from '@/lib/auth/action-guard';
import { failFromDbError } from '@/lib/db-errors';
import { revalidatePublicContent } from '@/lib/revalidate';
import { uuidSchema } from '@/schemas/common';
import {
  categoryInputSchema,
  tagInputSchema,
  topicInputSchema,
  type CategoryInput,
  type TagInput,
  type TopicInput,
} from '@/schemas/taxonomy.schema';
import { logActivity } from '@/services/activity-log.service';
import { slugify } from '@/utils/slugify';

type Kind = 'topic' | 'category' | 'tag';
const TABLES = { topic: 'topics', category: 'categories', tag: 'tags' } as const;

async function finish(kind: Kind, verb: string, name: string, session: { supabase: Parameters<typeof logActivity>[0]; userId: string }) {
  await logActivity(session.supabase, session.userId, {
    action: 'taxonomy_updated',
    entityType: kind,
    summary: `${verb} ${kind} “${name}”`,
  });
  revalidatePublicContent();
}

export async function saveTopicAction(input: TopicInput): Promise<ActionResult<{ id: string }>> {
  const guard = await guardAction('taxonomy:write');
  if (!guard.ok) return guard;
  const parsed = topicInputSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const { id, ...values } = parsed.data;
  const record = { ...values, slug: values.slug || slugify(values.name) };
  if (!record.slug) return fail('Add a name that contains letters or numbers.');

  const { supabase } = guard.session;
  const query = id
    ? supabase.from('topics').update(record).eq('id', id).select('id').single()
    : supabase.from('topics').insert(record).select('id').single();
  const { data, error } = await query;
  if (error || !data) return failFromDbError('topics.save', error);

  await finish('topic', id ? 'Updated' : 'Created', record.name, guard.session);
  return ok({ id: data.id }, 'Topic saved.');
}

export async function saveCategoryAction(input: CategoryInput): Promise<ActionResult<{ id: string }>> {
  const guard = await guardAction('taxonomy:write');
  if (!guard.ok) return guard;
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const { id, ...values } = parsed.data;
  const record = { ...values, slug: values.slug || slugify(values.name) };
  if (!record.slug) return fail('Add a name that contains letters or numbers.');

  const { supabase } = guard.session;
  const query = id
    ? supabase.from('categories').update(record).eq('id', id).select('id').single()
    : supabase.from('categories').insert(record).select('id').single();
  const { data, error } = await query;
  if (error || !data) return failFromDbError('categories.save', error);

  await finish('category', id ? 'Updated' : 'Created', record.name, guard.session);
  return ok({ id: data.id }, 'Category saved.');
}

export async function saveTagAction(input: TagInput): Promise<ActionResult<{ id: string }>> {
  const guard = await guardAction('taxonomy:write');
  if (!guard.ok) return guard;
  const parsed = tagInputSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const { id, name } = parsed.data;
  const slug = slugify(name);
  if (!slug) return fail('Add a name that contains letters or numbers.');

  const { supabase } = guard.session;
  const query = id
    ? supabase.from('tags').update({ name, slug }).eq('id', id).select('id').single()
    : supabase.from('tags').insert({ name, slug }).select('id').single();
  const { data, error } = await query;
  if (error || !data) return failFromDbError('tags.save', error);

  await finish('tag', id ? 'Renamed' : 'Created', name, guard.session);
  return ok({ id: data.id }, 'Tag saved.');
}

/** Deleting a topic/category/tag only unlinks it from content (FK cascade / set null). */
export async function deleteTaxonomyAction(kind: Kind, id: string): Promise<ActionResult> {
  const guard = await guardAction('taxonomy:write');
  if (!guard.ok) return guard;
  if (!(kind in TABLES) || !uuidSchema.safeParse(id).success) return fail('Invalid request.');

  const { supabase } = guard.session;
  const { data, error } = await supabase.from(TABLES[kind]).delete().eq('id', id).select('name').maybeSingle();
  if (error) return failFromDbError(`${kind}.delete`, error);
  if (!data) return fail('This item no longer exists.', { code: 'NOT_FOUND' });

  await finish(kind, 'Deleted', data.name, guard.session);
  return ok(undefined, 'Deleted.');
}
