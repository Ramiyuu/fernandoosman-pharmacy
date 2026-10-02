'use server';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { invalidInput } from '@/lib/validation';
import { guardAction } from '@/lib/auth/action-guard';
import { estimateReadingTime, richTextToPlainText, sanitizeRichText } from '@/lib/content/rich-text';
import { failFromDbError } from '@/lib/db-errors';
import { revalidatePublicContent } from '@/lib/revalidate';
import { isAllowedContentImageUrl } from '@/lib/storage/public-url';
import {
  articleInputSchema,
  articleStatusChangeSchema,
  publishBlockers,
  type ArticleInput,
} from '@/schemas/article.schema';
import { uuidSchema } from '@/schemas/common';
import { logActivity } from '@/services/activity-log.service';
import { removeDocuments } from '@/services/storage.service';
import type { ContentStatus, Json } from '@/types/database.types';

export interface SavedArticle {
  id: string;
  slug: string;
  status: ContentStatus;
  updated_at: string;
  reading_time: number;
}

export async function saveArticleAction(input: ArticleInput, options: { autosave?: boolean } = {}): Promise<ActionResult<SavedArticle>> {
  const guard = await guardAction('articles:write');
  if (!guard.ok) return guard;
  const { supabase, userId } = guard.session;

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
    const { data: current, error } = await supabase.from('articles').select('status, deleted_at').eq('id', data.id).maybeSingle();
    if (error) return failFromDbError('articles.current', error);
    if (!current || current.deleted_at) return fail('This article no longer exists or is in the trash.', { code: 'NOT_FOUND' });
    wasPublished = current.status === 'published';
  }

  // A live article must stay publishable.
  if (wasPublished) {
    const blockers = publishBlockers({ title: data.title, excerpt: data.excerpt, contentText });
    if (blockers.length > 0) return fail(`A published article needs: ${blockers.join(' ')}`);
  }

  const payload = {
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

  const { data: saved, error } = await supabase.rpc('admin_save_article', {
    p_id: data.id,
    p_data: payload as unknown as Json,
    p_topic_ids: data.topic_ids,
    p_tag_names: [...new Set(data.tags)],
    p_references: data.references as unknown as Json,
  });
  if (error || !saved) return failFromDbError('articles.save', error);

  const result = saved as unknown as Omit<SavedArticle, 'reading_time'>;

  if (!data.id) {
    await logActivity(supabase, userId, {
      action: 'article_created',
      entityType: 'article',
      entityId: result.id,
      summary: data.title || 'Untitled draft',
    });
  } else if (!options.autosave) {
    await logActivity(supabase, userId, {
      action: 'article_updated',
      entityType: 'article',
      entityId: result.id,
      summary: data.title,
    });
  }

  if (wasPublished || data.featured) revalidatePublicContent();
  return ok({ ...result, reading_time: readingTime });
}

export async function setArticleStatusAction(input: { id: string; status: ContentStatus }): Promise<ActionResult<{ status: ContentStatus }>> {
  const guard = await guardAction('articles:publish');
  if (!guard.ok) return guard;
  const { supabase, userId } = guard.session;

  const parsed = articleStatusChangeSchema.safeParse(input);
  if (!parsed.success) return fail('Invalid request.');
  const { id, status } = parsed.data;

  const { data: article, error } = await supabase
    .from('articles')
    .select('title, excerpt, content_text, status, deleted_at')
    .eq('id', id)
    .maybeSingle();
  if (error) return failFromDbError('articles.status.lookup', error);
  if (!article || article.deleted_at) return fail('This article no longer exists or is in the trash.', { code: 'NOT_FOUND' });

  if (status === 'published') {
    const blockers = publishBlockers({ title: article.title, excerpt: article.excerpt, contentText: article.content_text });
    if (blockers.length > 0) return fail(`Before publishing: ${blockers.join(' ')}`);
  }

  const { error: updateError } = await supabase.from('articles').update({ status }).eq('id', id);
  if (updateError) return failFromDbError('articles.status.update', updateError);

  const action =
    status === 'published' ? 'article_published' : status === 'archived' ? 'article_archived' : 'article_unpublished';
  await logActivity(supabase, userId, { action, entityType: 'article', entityId: id, summary: article.title });

  revalidatePublicContent();
  return ok({ status }, status === 'published' ? 'Published.' : status === 'archived' ? 'Archived.' : 'Moved back to drafts.');
}

export async function deleteArticleAction(id: string): Promise<ActionResult> {
  const guard = await guardAction('articles:delete');
  if (!guard.ok) return guard;
  const { supabase, userId } = guard.session;
  if (!uuidSchema.safeParse(id).success) return fail('Invalid request.');

  const { data, error } = await supabase
    .from('articles')
    .update({ deleted_at: new Date().toISOString(), featured: false })
    .eq('id', id)
    .is('deleted_at', null)
    .select('title')
    .maybeSingle();
  if (error) return failFromDbError('articles.delete', error);
  if (!data) return fail('This article no longer exists.', { code: 'NOT_FOUND' });

  await logActivity(supabase, userId, { action: 'article_deleted', entityType: 'article', entityId: id, summary: data.title });
  revalidatePublicContent();
  return ok(undefined, 'Moved to trash.');
}

export async function restoreArticleAction(id: string): Promise<ActionResult> {
  const guard = await guardAction('articles:delete');
  if (!guard.ok) return guard;
  const { supabase, userId } = guard.session;
  if (!uuidSchema.safeParse(id).success) return fail('Invalid request.');

  // Restored articles come back as drafts so nothing goes live by accident.
  const { data, error } = await supabase
    .from('articles')
    .update({ deleted_at: null, status: 'draft' })
    .eq('id', id)
    .not('deleted_at', 'is', null)
    .select('title')
    .maybeSingle();
  if (error) return failFromDbError('articles.restore', error);
  if (!data) return fail('This article is not in the trash.', { code: 'NOT_FOUND' });

  await logActivity(supabase, userId, { action: 'article_restored', entityType: 'article', entityId: id, summary: data.title });
  revalidatePublicContent();
  return ok(undefined, 'Restored as a draft.');
}

/** Permanently deletes an article that is already in the trash, including its PDFs. */
export async function purgeArticleAction(id: string): Promise<ActionResult> {
  const guard = await guardAction('articles:delete');
  if (!guard.ok) return guard;
  const { supabase, userId } = guard.session;
  if (!uuidSchema.safeParse(id).success) return fail('Invalid request.');

  const { data: article, error } = await supabase.from('articles').select('title, deleted_at').eq('id', id).maybeSingle();
  if (error) return failFromDbError('articles.purge.lookup', error);
  if (!article) return fail('This article no longer exists.', { code: 'NOT_FOUND' });
  if (!article.deleted_at) return fail('Move the article to the trash before deleting it permanently.');

  const { data: files, error: filesError } = await supabase.from('article_files').select('id, storage_path').eq('article_id', id);
  if (filesError) return failFromDbError('articles.purge.files', filesError);

  if (files && files.length > 0) {
    const removed = await removeDocuments(files.map((file) => file.storage_path));
    if (!removed) return fail('The attached documents could not be removed. Nothing was deleted; try again.');
    const { error: deleteFilesError } = await supabase.from('article_files').delete().eq('article_id', id);
    if (deleteFilesError) return failFromDbError('articles.purge.file-rows', deleteFilesError);
  }

  const { error: deleteError } = await supabase.from('articles').delete().eq('id', id);
  if (deleteError) return failFromDbError('articles.purge', deleteError);

  await logActivity(supabase, userId, {
    action: 'article_purged',
    entityType: 'article',
    entityId: id,
    summary: article.title,
    metadata: { files_removed: files?.length ?? 0 },
  });
  return ok(undefined, 'Deleted permanently.');
}
