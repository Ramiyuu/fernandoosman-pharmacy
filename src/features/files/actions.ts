'use server';

import { z } from 'zod';

import { PDF_UPLOAD } from '@/config/uploads';
import { fail, ok, type ActionResult } from '@/lib/action-result';
import { guardAction } from '@/lib/auth/action-guard';
import { failFromDbError } from '@/lib/db-errors';
import { createLogger } from '@/lib/logger';
import { revalidatePublicContent } from '@/lib/revalidate';
import { rateLimit } from '@/lib/security/rate-limit';
import { createPdfObjectPath } from '@/lib/storage/paths';
import { uuidSchema } from '@/schemas/common';
import { fileUpdateSchema, pdfUploadIntentSchema, type PdfUploadIntent } from '@/schemas/file.schema';
import { logActivity } from '@/services/activity-log.service';
import { createDocumentUploadUrl, removeDocuments, removePublicImages, verifyUploadedPdf } from '@/services/storage.service';
import type { FileStatus, FileVisibility } from '@/types/database.types';
import { formatBytes } from '@/utils/format';
import { getExtension, hasBlockedExtension, sanitizeDisplayFilename } from '@/utils/filename';

const log = createLogger('files');

export interface UploadTicket {
  fileId: string;
  signedUrl: string;
}

export interface UploadedFile {
  id: string;
  original_filename: string;
  label: string;
  size_bytes: number;
  visibility: FileVisibility;
  status: FileStatus;
  created_at: string;
}

const REJECTION_MESSAGES: Record<string, string> = {
  missing: 'The upload did not reach storage. Try again.',
  empty: 'The file is empty.',
  too_large: `The file is larger than ${formatBytes(PDF_UPLOAD.maxBytes)}.`,
  wrong_type: 'Only PDF files are accepted.',
  not_pdf: 'This file is not a valid PDF (its content does not match the PDF format).',
  malformed: 'This PDF looks incomplete or damaged. Export it again and retry.',
};

/**
 * Step 1 of a PDF upload. Validates the declared metadata, reserves a random
 * storage path and returns a one-time signed upload URL for that path only.
 * The file itself is verified in `finalizePdfUploadAction`.
 */
export async function createPdfUploadAction(input: PdfUploadIntent): Promise<ActionResult<UploadTicket>> {
  const guard = await guardAction('files:write');
  if (!guard.ok) return guard;
  const { supabase, userId } = guard.session;

  const parsed = pdfUploadIntentSchema.safeParse(input);
  if (!parsed.success) return fail('Invalid upload request.');
  const intent = parsed.data;

  const limit = await rateLimit('upload', userId);
  if (!limit.success) return fail('Too many uploads in a short time. Wait a few minutes.', { code: 'RATE_LIMITED' });

  const displayName = sanitizeDisplayFilename(intent.filename);
  if (hasBlockedExtension(intent.filename) || getExtension(displayName) !== 'pdf') {
    return fail('Only .pdf files are accepted.');
  }
  if (!(PDF_UPLOAD.mimeTypes as readonly string[]).includes(intent.mimeType)) {
    return fail('Only PDF files are accepted.');
  }
  if (intent.size > PDF_UPLOAD.maxBytes) {
    return fail(`The file is larger than ${formatBytes(PDF_UPLOAD.maxBytes)}.`);
  }

  if (intent.target === 'article') {
    const { data: article, error } = await supabase
      .from('articles')
      .select('id')
      .eq('id', intent.articleId)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) return failFromDbError('files.intent.article', error);
    if (!article) return fail('Save the article before attaching files.', { code: 'NOT_FOUND' });
  }

  const { internalName, path } = createPdfObjectPath(
    intent.target === 'article' ? { kind: 'article', articleId: intent.articleId } : { kind: 'cv' },
  );

  const { data: row, error: insertError } = await supabase
    .from('article_files')
    .insert({
      article_id: intent.target === 'article' ? intent.articleId : null,
      kind: intent.target === 'article' ? 'article_attachment' : 'cv',
      original_filename: displayName,
      internal_name: internalName,
      storage_path: path,
      mime_type: 'application/pdf',
      size_bytes: intent.size,
      status: 'pending',
      visibility: intent.target === 'cv' ? 'public' : 'private',
      uploaded_by: userId,
    })
    .select('id')
    .single();
  if (insertError || !row) return failFromDbError('files.intent.insert', insertError);

  const ticket = await createDocumentUploadUrl(path);
  if (!ticket) {
    await supabase.from('article_files').delete().eq('id', row.id);
    return fail('Storage is not available right now. Try again later.');
  }

  return ok({ fileId: row.id, signedUrl: ticket.signedUrl });
}

/**
 * Step 2: after the browser finished uploading, verify the stored object
 * (size, type, PDF signature). Invalid files are deleted immediately.
 */
export async function finalizePdfUploadAction(fileId: string): Promise<ActionResult<UploadedFile>> {
  const guard = await guardAction('files:write');
  if (!guard.ok) return guard;
  const { supabase, userId } = guard.session;
  if (!uuidSchema.safeParse(fileId).success) return fail('Invalid request.');

  const { data: file, error } = await supabase
    .from('article_files')
    .select('id, storage_path, status, uploaded_by, kind, article_id, original_filename')
    .eq('id', fileId)
    .maybeSingle();
  if (error) return failFromDbError('files.finalize.lookup', error);
  if (!file || file.status !== 'pending' || file.uploaded_by !== userId) {
    return fail('This upload cannot be completed.', { code: 'NOT_FOUND' });
  }

  const verification = await verifyUploadedPdf(file.storage_path);
  if (!verification.ok) {
    log.warn('PDF rejected after upload', { reason: verification.reason, fileId });
    await removeDocuments([file.storage_path]);
    await supabase.from('article_files').delete().eq('id', fileId);
    return fail(REJECTION_MESSAGES[verification.reason] ?? 'The file was rejected.');
  }

  const { data: ready, error: updateError } = await supabase
    .from('article_files')
    .update({ status: 'ready', size_bytes: verification.size })
    .eq('id', fileId)
    .select('id, original_filename, label, size_bytes, visibility, status, created_at')
    .single();
  if (updateError || !ready) return failFromDbError('files.finalize.update', updateError);

  if (file.kind === 'cv') {
    const { error: profileError } = await supabase.from('site_profile').update({ cv_file_id: fileId, updated_by: userId }).eq('id', 1);
    if (profileError) return failFromDbError('files.finalize.cv', profileError);
    await logActivity(supabase, userId, { action: 'cv_updated', entityType: 'file', entityId: fileId, summary: file.original_filename });
    revalidatePublicContent();
  } else {
    await logActivity(supabase, userId, {
      action: 'pdf_uploaded',
      entityType: 'file',
      entityId: fileId,
      summary: file.original_filename,
      metadata: { article_id: file.article_id, size_bytes: verification.size },
    });
  }

  return ok(ready as UploadedFile, 'Upload complete.');
}

/**
 * Called when the browser could not upload to the signed URL (network error,
 * size or type refused by Storage). Removes the reservation and anything that
 * may have been partially stored.
 */
export async function abandonPdfUploadAction(fileId: string): Promise<ActionResult> {
  const guard = await guardAction('files:write');
  if (!guard.ok) return guard;
  const { supabase, userId } = guard.session;
  if (!uuidSchema.safeParse(fileId).success) return fail('Invalid request.');

  const { data: file, error } = await supabase
    .from('article_files')
    .select('id, storage_path, status, uploaded_by')
    .eq('id', fileId)
    .maybeSingle();
  if (error) return failFromDbError('files.abandon.lookup', error);
  if (!file || file.status !== 'pending' || file.uploaded_by !== userId) return ok(undefined);

  await removeDocuments([file.storage_path]);
  const { error: deleteError } = await supabase.from('article_files').delete().eq('id', fileId);
  if (deleteError) return failFromDbError('files.abandon', deleteError);
  return ok(undefined);
}

export async function updateFileAction(input: z.input<typeof fileUpdateSchema>): Promise<ActionResult> {
  const guard = await guardAction('files:write');
  if (!guard.ok) return guard;
  const { supabase } = guard.session;

  const parsed = fileUpdateSchema.safeParse(input);
  if (!parsed.success) return fail('Invalid request.');
  const { id, ...changes } = parsed.data;

  const { error } = await supabase.from('article_files').update(changes).eq('id', id);
  if (error) return failFromDbError('files.update', error);
  revalidatePublicContent();
  return ok(undefined, 'Saved.');
}

export async function deleteImageAction(imageId: string): Promise<ActionResult> {
  const guard = await guardAction('files:write');
  if (!guard.ok) return guard;
  const { supabase, userId } = guard.session;
  if (!uuidSchema.safeParse(imageId).success) return fail('Invalid request.');

  const { data: image, error } = await supabase
    .from('media_files')
    .select('id, bucket, storage_path, original_filename')
    .eq('id', imageId)
    .maybeSingle();
  if (error) return failFromDbError('images.delete.lookup', error);
  if (!image) return fail('This image no longer exists.', { code: 'NOT_FOUND' });

  const removed = await removePublicImages(image.bucket, [image.storage_path]);
  if (!removed) return fail('The image could not be removed from storage. Try again.');

  const { error: deleteError } = await supabase.from('media_files').delete().eq('id', imageId);
  if (deleteError) return failFromDbError('images.delete', deleteError);

  await logActivity(supabase, userId, { action: 'image_deleted', entityType: 'image', entityId: imageId, summary: image.original_filename });
  revalidatePublicContent();
  return ok(undefined, 'Image deleted.');
}

export async function deleteFileAction(fileId: string): Promise<ActionResult> {
  const guard = await guardAction('files:write');
  if (!guard.ok) return guard;
  const { supabase, userId } = guard.session;
  if (!uuidSchema.safeParse(fileId).success) return fail('Invalid request.');

  const { data: file, error } = await supabase
    .from('article_files')
    .select('id, storage_path, original_filename, article_id, kind')
    .eq('id', fileId)
    .maybeSingle();
  if (error) return failFromDbError('files.delete.lookup', error);
  if (!file) return fail('This file no longer exists.', { code: 'NOT_FOUND' });

  // Remove the object first: a dangling DB row is visible and retryable, an
  // orphaned object in storage is not.
  const removed = await removeDocuments([file.storage_path]);
  if (!removed) return fail('The file could not be removed from storage. Try again.');

  const { error: deleteError } = await supabase.from('article_files').delete().eq('id', fileId);
  if (deleteError) return failFromDbError('files.delete', deleteError);

  await logActivity(supabase, userId, {
    action: 'pdf_deleted',
    entityType: 'file',
    entityId: fileId,
    summary: file.original_filename,
    metadata: { article_id: file.article_id, kind: file.kind },
  });
  revalidatePublicContent();
  return ok(undefined, 'File deleted.');
}
