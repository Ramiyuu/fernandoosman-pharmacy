'use server';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { guardAction } from '@/lib/auth/action-guard';
import type { AdminSession } from '@/lib/auth/session';
import { sql } from '@/lib/db/sql';
import { failFromDbError } from '@/lib/db-errors';
import { revalidatePublicContent } from '@/lib/revalidate';
import { invalidInput } from '@/lib/validation';
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

async function finish(kind: Kind, verb: string, name: string, session: AdminSession) {
  await logActivity(session.db, session.userId, {
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

  const { id, name, name_pt: namePt, description, description_pt: descriptionPt, icon, sort_order: sortOrder } = parsed.data;
  const slug = parsed.data.slug || slugify(name);
  if (!slug) return fail('Add a name that contains letters or numbers.');

  let saved: { id: string } | null;
  try {
    saved = await guard.session.db.maybeOne(
      id
        ? sql`update public.topics set name = ${name}, name_pt = ${namePt}, slug = ${slug}, description = ${description},
                description_pt = ${descriptionPt}, icon = ${icon}, sort_order = ${sortOrder}
              where id = ${id} returning id`
        : sql`insert into public.topics (name, name_pt, slug, description, description_pt, icon, sort_order)
              values (${name}, ${namePt}, ${slug}, ${description}, ${descriptionPt}, ${icon}, ${sortOrder}) returning id`,
    );
  } catch (error) {
    return failFromDbError('topics.save', error);
  }
  if (!saved) return fail('This topic no longer exists.', { code: 'NOT_FOUND' });

  await finish('topic', id ? 'Updated' : 'Created', name, guard.session);
  return ok({ id: saved.id }, 'Topic saved.');
}

export async function saveCategoryAction(input: CategoryInput): Promise<ActionResult<{ id: string }>> {
  const guard = await guardAction('taxonomy:write');
  if (!guard.ok) return guard;
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const { id, name, name_pt: namePt, description, description_pt: descriptionPt, sort_order: sortOrder } = parsed.data;
  const slug = parsed.data.slug || slugify(name);
  if (!slug) return fail('Add a name that contains letters or numbers.');

  let saved: { id: string } | null;
  try {
    saved = await guard.session.db.maybeOne(
      id
        ? sql`update public.categories set name = ${name}, name_pt = ${namePt}, slug = ${slug}, description = ${description},
                description_pt = ${descriptionPt}, sort_order = ${sortOrder}
              where id = ${id} returning id`
        : sql`insert into public.categories (name, name_pt, slug, description, description_pt, sort_order)
              values (${name}, ${namePt}, ${slug}, ${description}, ${descriptionPt}, ${sortOrder}) returning id`,
    );
  } catch (error) {
    return failFromDbError('categories.save', error);
  }
  if (!saved) return fail('This category no longer exists.', { code: 'NOT_FOUND' });

  await finish('category', id ? 'Updated' : 'Created', name, guard.session);
  return ok({ id: saved.id }, 'Category saved.');
}

export async function saveTagAction(input: TagInput): Promise<ActionResult<{ id: string }>> {
  const guard = await guardAction('taxonomy:write');
  if (!guard.ok) return guard;
  const parsed = tagInputSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const { id, name } = parsed.data;
  const slug = slugify(name);
  if (!slug) return fail('Add a name that contains letters or numbers.');

  let saved: { id: string } | null;
  try {
    saved = await guard.session.db.maybeOne(
      id
        ? sql`update public.tags set name = ${name}, slug = ${slug} where id = ${id} returning id`
        : sql`insert into public.tags (name, slug) values (${name}, ${slug}) returning id`,
    );
  } catch (error) {
    return failFromDbError('tags.save', error);
  }
  if (!saved) return fail('This tag no longer exists.', { code: 'NOT_FOUND' });

  await finish('tag', id ? 'Renamed' : 'Created', name, guard.session);
  return ok({ id: saved.id }, 'Tag saved.');
}

/** Deleting a topic/category/tag only unlinks it from content (FK cascade / set null). */
export async function deleteTaxonomyAction(kind: Kind, id: string): Promise<ActionResult> {
  const guard = await guardAction('taxonomy:write');
  if (!guard.ok) return guard;
  if (!['topic', 'category', 'tag'].includes(kind) || !uuidSchema.safeParse(id).success) return fail('Invalid request.');

  // One fixed statement per table: table names are never built from input.
  const statement =
    kind === 'topic'
      ? sql`delete from public.topics where id = ${id} returning name`
      : kind === 'category'
        ? sql`delete from public.categories where id = ${id} returning name`
        : sql`delete from public.tags where id = ${id} returning name`;

  let deleted: { name: string } | null;
  try {
    deleted = await guard.session.db.maybeOne(statement);
  } catch (error) {
    return failFromDbError(`${kind}.delete`, error);
  }
  if (!deleted) return fail('This item no longer exists.', { code: 'NOT_FOUND' });

  await finish(kind, 'Deleted', deleted.name, guard.session);
  return ok(undefined, 'Deleted.');
}
