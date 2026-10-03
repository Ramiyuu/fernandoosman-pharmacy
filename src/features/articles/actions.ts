'use server';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { guardAction } from '@/lib/auth/action-guard';
import { estimateReadingTime, richTextToPlainText, sanitizeRichText } from '@/lib/content/rich-text';
import { sql } from '@/lib/db/sql';
import { failFromDbError } from '@/lib/db-errors';
import { revalidatePublicContent } from '@/lib/revalidate';
import { isAllowedContentImageUrl } from '@/lib/storage/public-url';
import { invalidInput } from '@/lib/validation';
import {
  articleInputSchema,
  articleStatusChangeSchema,
  publishBlockers,
  type ArticleInput,
} from '@/schemas/article.schema';
import { uuidSchema } from '@/schemas/common';
import { logActivity } from '@/services/activity-log.service';
import { removeDocuments } from '@/services/storage.service';
import type { ContentStatus } from '@/types/database.types';

export interface SavedArticle {
  id: string;
  slug: string;
  status: ContentStatus;
  updated_at: string;
  reading_time: number;
}

export async function saveArticleAction(
  input: ArticleInput,
  options: { autosave?: boolean } = {},
): Promise<ActionResult<SavedArticle>> {
  const guard = await guardAction('articles:write');
  if (!guard.ok) return guard;
  const { db, userId } = guard.session;

  const parsed = articleInputSchema.safeParse(input);
  if (!parsed.success) {
    return invalidInput(parsed.error);
  }
  const data = parsed.data;

  // Rebuild the document from the allow-list; anything else is dropped.
  const content = sanitizeRichText(data.content, { isAllowedImageSrc: isAllowedContentImageUrl });
  const contentText = richTextToPlainText(content);
  const readingTime = estimateReadingTime(contentText);

  let wasPublished = false;
  if (data.id) {
    try {
      const current = await db.maybeOne<{ status: ContentStatus; deleted_at: string | null }>(
        sql`select status, deleted_at from public.articles where id = ${data.id}`,
      );
      if (!current || current.deleted_at)
        return fail('This article no longer exists or is in the trash.', { code: 'NOT_FOUND' });
      wasPublished = current.status === 'published';
    } catch (error) {
      return failFromDbError('articles.current', error);
    }
  }

  // A live article must stay publishable.
  if (wasPublished) {
    const blockers = publishBlockers({ title: data.title, excerpt: data.excerpt, contentText });
    if (blockers.length > 0) return fail(`A published article needs: ${blockers.join(' ')}`);
  }

  const payload = {
    pmid: data.pmid,
    og_image_path: data.og_image_path,
    published_at: data.published_at,
    title: data.title,
    slug: data.slug,
    subtitle: data.subtitle,
    excerpt: data.excerpt,
    content,
    content_text: contentText,
    reading_time: readingTime,
    category_id: data.category_id,
    language: data.language,
    translation_of_article_id: data.translation_of_article_id === data.id ? null : data.translation_of_article_id,
    featured: data.featured,
    doi: data.doi,
    external_url: data.external_url,
    seo_title: data.seo_title,
    seo_description: data.seo_description,
    cover_image_path: data.cover_image_path,
    cover_image_alt: data.cover_image_alt,
  };

  let result: Omit<SavedArticle, 'reading_time'>;
  try {
    const row = await db.one<{ saved: Omit<SavedArticle, 'reading_time'> }>(sql`
      select public.admin_save_article(
        ${data.id ?? null}::uuid,
        ${JSON.stringify(payload)}::jsonb,
        ${data.topic_ids}::uuid[],
        ${[...new Set(data.tags)]}::text[],
        ${JSON.stringify(data.references)}::jsonb
      ) as saved`);
    result = row.saved;
  } catch (error) {
    return failFromDbError('articles.save', error);
  }

  if (!data.id) {
    await logActivity(db, userId, {
      action: 'article_created',
      entityType: 'article',
      entityId: result.id,
      summary: data.title || 'Untitled draft',
    });
  } else if (!options.autosave) {
    await logActivity(db, userId, {
      action: 'article_updated',
      entityType: 'article',
      entityId: result.id,
      summary: data.title,
    });
  }

  if (wasPublished || data.featured) revalidatePublicContent();
  return ok({ ...result, reading_time: readingTime });
}

/**
 * Opens the version of an article in another language, creating it first
 * when missing: a draft copy (text, references, topics, tags, cover) to
 * translate. PDFs are not copied.
 */
export async function createArticleTranslationAction(input: {
  id: string;
  language: 'en' | 'pt';
}): Promise<ActionResult<{ id: string; created: boolean }>> {
  const guard = await guardAction('articles:write');
  if (!guard.ok) return guard;
  const { db, userId } = guard.session;
  if (!uuidSchema.safeParse(input.id).success || !['en', 'pt'].includes(input.language)) return fail('Invalid request.');

  let result: { id: string; created: boolean };
  try {
    const row = await db.one<{ result: { id: string; created: boolean } }>(
      sql`select public.admin_create_article_translation(${input.id}::uuid, ${input.language}) as result`,
    );
    result = row.result;
  } catch (error) {
    return failFromDbError('articles.translate', error);
  }

  if (result.created) {
    await logActivity(db, userId, {
      action: 'article_created',
      entityType: 'article',
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

export async function setArticleStatusAction(input: {
  id: string;
  status: ContentStatus;
}): Promise<ActionResult<{ status: ContentStatus }>> {
  const guard = await guardAction('articles:publish');
  if (!guard.ok) return guard;
  const { db, userId } = guard.session;

  const parsed = articleStatusChangeSchema.safeParse(input);
  if (!parsed.success) return fail('Invalid request.');
  const { id, status } = parsed.data;

  let article: { title: string; excerpt: string; content_text: string; deleted_at: string | null } | null;
  try {
    article = await db.maybeOne(
      sql`select title, excerpt, content_text, deleted_at from public.articles where id = ${id}`,
    );
  } catch (error) {
    return failFromDbError('articles.status.lookup', error);
  }
  if (!article || article.deleted_at)
    return fail('This article no longer exists or is in the trash.', { code: 'NOT_FOUND' });

  if (status === 'published') {
    const blockers = publishBlockers({
      title: article.title,
      excerpt: article.excerpt,
      contentText: article.content_text,
    });
    if (blockers.length > 0) return fail(`Before publishing: ${blockers.join(' ')}`);
  }

  try {
    const updated = await db.execute(
      sql`update public.articles set status = ${status}::public.content_status where id = ${id}`,
    );
    if (updated === 0) return fail('You do not have permission to do this.', { code: 'FORBIDDEN' });
  } catch (error) {
    return failFromDbError('articles.status.update', error);
  }

  const action =
    status === 'published' ? 'article_published' : status === 'archived' ? 'article_archived' : 'article_unpublished';
  await logActivity(db, userId, { action, entityType: 'article', entityId: id, summary: article.title });

  revalidatePublicContent();
  return ok(
    { status },
    status === 'published' ? 'Published.' : status === 'archived' ? 'Archived.' : 'Moved back to drafts.',
  );
}

export async function deleteArticleAction(id: string): Promise<ActionResult> {
  const guard = await guardAction('articles:delete');
  if (!guard.ok) return guard;
  const { db, userId } = guard.session;
  if (!uuidSchema.safeParse(id).success) return fail('Invalid request.');

  let deleted: { title: string } | null;
  try {
    deleted = await db.maybeOne(sql`
      update public.articles set deleted_at = now(), featured = false
      where id = ${id} and deleted_at is null
      returning title`);
  } catch (error) {
    return failFromDbError('articles.delete', error);
  }
  if (!deleted) return fail('This article no longer exists.', { code: 'NOT_FOUND' });

  await logActivity(db, userId, {
    action: 'article_deleted',
    entityType: 'article',
    entityId: id,
    summary: deleted.title,
  });
  revalidatePublicContent();
  return ok(undefined, 'Moved to trash.');
}

export async function restoreArticleAction(id: string): Promise<ActionResult> {
  const guard = await guardAction('articles:delete');
  if (!guard.ok) return guard;
  const { db, userId } = guard.session;
  if (!uuidSchema.safeParse(id).success) return fail('Invalid request.');

  // Restored articles come back as drafts so nothing goes live by accident.
  let restored: { title: string } | null;
  try {
    restored = await db.maybeOne(sql`
      update public.articles set deleted_at = null, status = 'draft'
      where id = ${id} and deleted_at is not null
      returning title`);
  } catch (error) {
    return failFromDbError('articles.restore', error);
  }
  if (!restored) return fail('This article is not in the trash.', { code: 'NOT_FOUND' });

  await logActivity(db, userId, {
    action: 'article_restored',
    entityType: 'article',
    entityId: id,
    summary: restored.title,
  });
  revalidatePublicContent();
  return ok(undefined, 'Restored as a draft.');
}

/** Permanently deletes an article that is already in the trash, including its PDFs. */
export async function purgeArticleAction(id: string): Promise<ActionResult> {
  const guard = await guardAction('articles:delete');
  if (!guard.ok) return guard;
  const { db, userId } = guard.session;
  if (!uuidSchema.safeParse(id).success) return fail('Invalid request.');

  let article: { title: string; deleted_at: string | null } | null;
  let files: Array<{ id: string; storage_path: string }>;
  try {
    article = await db.maybeOne(sql`select title, deleted_at from public.articles where id = ${id}`);
    files = article
      ? await db.many(sql`select id, storage_path from public.article_files where article_id = ${id}`)
      : [];
  } catch (error) {
    return failFromDbError('articles.purge.lookup', error);
  }
  if (!article) return fail('This article no longer exists.', { code: 'NOT_FOUND' });
  if (!article.deleted_at) return fail('Move the article to the trash before deleting it permanently.');

  // Remove the objects first: a dangling row is visible and retryable, an
  // orphaned object in storage is not.
  if (files.length > 0) {
    const removed = await removeDocuments(files.map((file) => file.storage_path));
    if (!removed) return fail('The attached documents could not be removed. Nothing was deleted; try again.');
  }

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`delete from public.article_files where article_id = ${id}`);
      await tx.execute(sql`delete from public.articles where id = ${id}`);
    });
  } catch (error) {
    return failFromDbError('articles.purge', error);
  }

  await logActivity(db, userId, {
    action: 'article_purged',
    entityType: 'article',
    entityId: id,
    summary: article.title,
    metadata: { files_removed: files.length },
  });
  return ok(undefined, 'Deleted permanently.');
}
