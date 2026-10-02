'use server';

import { z } from 'zod';

import { isImageBucket } from '@/lib/storage/paths';
import { fail, ok, type ActionResult } from '@/lib/action-result';
import { guardAction } from '@/lib/auth/action-guard';
import { sql } from '@/lib/db/sql';
import { failFromDbError } from '@/lib/db-errors';
import { revalidatePublicContent } from '@/lib/revalidate';
import { uuidSchema } from '@/schemas/common';
import { fileUpdateSchema } from '@/schemas/file.schema';
import { logActivity } from '@/services/activity-log.service';
import { removeDocuments, removeImages } from '@/services/storage.service';

// PDF and image uploads are Route Handlers (src/app/api/admin/uploads/*):
// they need the raw request body and report progress to the browser.

export async function updateFileAction(input: z.input<typeof fileUpdateSchema>): Promise<ActionResult> {
  const guard = await guardAction('files:write');
  if (!guard.ok) return guard;
  const { db } = guard.session;

  const parsed = fileUpdateSchema.safeParse(input);
  if (!parsed.success) return fail('Invalid request.');
  const { id, label, visibility } = parsed.data;

  try {
    const updated = await db.execute(sql`
      update public.article_files
      set label = coalesce(${label ?? null}, label),
          visibility = coalesce(${visibility ?? null}::public.file_visibility, visibility)
      where id = ${id}`);
    if (updated === 0) return fail('This file no longer exists.', { code: 'NOT_FOUND' });
  } catch (error) {
    return failFromDbError('files.update', error);
  }
  revalidatePublicContent();
  return ok(undefined, 'Saved.');
}

export async function deleteImageAction(imageId: string): Promise<ActionResult> {
  const guard = await guardAction('files:write');
  if (!guard.ok) return guard;
  const { db, userId } = guard.session;
  if (!uuidSchema.safeParse(imageId).success) return fail('Invalid request.');

  let image: { bucket: string; storage_path: string; original_filename: string } | null;
  try {
    image = await db.maybeOne(sql`select bucket, storage_path, original_filename from public.media_files where id = ${imageId}`);
  } catch (error) {
    return failFromDbError('images.delete.lookup', error);
  }
  if (!image || !isImageBucket(image.bucket)) return fail('This image no longer exists.', { code: 'NOT_FOUND' });

  const removed = await removeImages(image.bucket, [image.storage_path]);
  if (!removed) return fail('The image could not be removed from storage. Try again.');

  try {
    await db.execute(sql`delete from public.media_files where id = ${imageId}`);
  } catch (error) {
    return failFromDbError('images.delete', error);
  }

  await logActivity(db, userId, { action: 'image_deleted', entityType: 'image', entityId: imageId, summary: image.original_filename });
  revalidatePublicContent();
  return ok(undefined, 'Image deleted.');
}

export async function deleteFileAction(fileId: string): Promise<ActionResult> {
  const guard = await guardAction('files:write');
  if (!guard.ok) return guard;
  const { db, userId } = guard.session;
  if (!uuidSchema.safeParse(fileId).success) return fail('Invalid request.');

  let file: { storage_path: string; original_filename: string; article_id: string | null; kind: string } | null;
  try {
    file = await db.maybeOne(sql`
      select storage_path, original_filename, article_id, kind from public.article_files where id = ${fileId}`);
  } catch (error) {
    return failFromDbError('files.delete.lookup', error);
  }
  if (!file) return fail('This file no longer exists.', { code: 'NOT_FOUND' });

  // Remove the object first: a dangling DB row is visible and retryable, an
  // orphaned object in storage is not.
  const removed = await removeDocuments([file.storage_path]);
  if (!removed) return fail('The file could not be removed from storage. Try again.');

  try {
    await db.execute(sql`delete from public.article_files where id = ${fileId}`);
  } catch (error) {
    return failFromDbError('files.delete', error);
  }

  await logActivity(db, userId, {
    action: 'pdf_deleted',
    entityType: 'file',
    entityId: fileId,
    summary: file.original_filename,
    metadata: { article_id: file.article_id, kind: file.kind },
  });
  revalidatePublicContent();
  return ok(undefined, 'File deleted.');
}
