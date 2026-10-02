import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { PDF_UPLOAD } from '@/config/uploads';
import { authorizeAdmin } from '@/lib/auth/session';
import { sql } from '@/lib/db/sql';
import { createLogger, describeError } from '@/lib/logger';
import { revalidatePublicContent } from '@/lib/revalidate';
import { detectFileKind, findPdfActiveContent, hasPdfTrailer, isPdf } from '@/lib/security/file-signature';
import { rateLimit } from '@/lib/security/rate-limit';
import { isSameOriginRequest } from '@/lib/security/request';
import { createPdfObjectPath } from '@/lib/storage/paths';
import { uuidSchema } from '@/schemas/common';
import { logActivity } from '@/services/activity-log.service';
import { removeDocuments, storeDocument } from '@/services/storage.service';
import type { UploadedFile } from '@/features/files/types';
import { formatBytes } from '@/utils/format';
import { getExtension, hasBlockedExtension, sanitizeDisplayFilename } from '@/utils/filename';

export const dynamic = 'force-dynamic';

const log = createLogger('pdf-upload');

const targetSchema = z.discriminatedUnion('target', [
  z.object({ target: z.literal('article'), articleId: uuidSchema }),
  z.object({ target: z.literal('cv') }),
]);

const ACTIVE_CONTENT_LABELS: Record<string, string> = {
  javascript: 'JavaScript',
  launch: 'an action that opens programs',
  'form submission': 'a form that sends data',
  'embedded file': 'an embedded file',
  'rich media': 'embedded media',
};

const error = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });

/**
 * POST /api/admin/uploads/pdf?target=article&articleId=<uuid> | ?target=cv
 * multipart/form-data with a single `file` field.
 *
 * The file is checked completely BEFORE anything is stored: same-origin
 * (CSRF), admin session with 2FA, rate limit, size, extension (blocks
 * .exe/.js/.html/.svg/.php/.sh/.bat/.cmd/.scr/.jar, also as double
 * extensions), declared type, PDF signature at byte 0 (blocks renamed
 * executables, scripts, HTML and polyglots), %%EOF trailer and active content
 * (JavaScript, launch actions, embedded files). The object gets a random name
 * chosen by the server; the user's file name is only stored, sanitised, for
 * display.
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return error('Cross-site request blocked.', 403);

  const auth = await authorizeAdmin('files:write');
  if (!auth.ok) return error(auth.error, auth.status);
  const { db, userId } = auth.session;

  const limit = await rateLimit('upload', userId);
  if (!limit.success) return error('Too many uploads in a short time. Wait a few minutes.', 429);

  const target = targetSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!target.success) return error('Unknown upload destination.', 400);

  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (declaredLength > PDF_UPLOAD.maxBytes + 64 * 1024) {
    return error(`The file is larger than ${formatBytes(PDF_UPLOAD.maxBytes)}.`, 413);
  }

  let file: File;
  try {
    const value = (await request.formData()).get('file');
    if (!(value instanceof File)) return error('No file was sent.', 400);
    file = value;
  } catch {
    return error('The upload could not be read.', 400);
  }

  const displayName = sanitizeDisplayFilename(file.name);
  if (hasBlockedExtension(file.name) || getExtension(displayName) !== 'pdf') return error('Only .pdf files are accepted.', 415);
  if (!(PDF_UPLOAD.mimeTypes as readonly string[]).includes(file.type)) return error('Only PDF files are accepted.', 415);
  if (file.size === 0) return error('The file is empty.', 400);
  if (file.size > PDF_UPLOAD.maxBytes) return error(`The file is larger than ${formatBytes(PDF_UPLOAD.maxBytes)}.`, 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isPdf(bytes)) {
    log.warn('Rejected upload: missing PDF signature', { detected: detectFileKind(bytes) });
    return error('This file is not a valid PDF (its content does not match the PDF format).', 415);
  }
  if (!hasPdfTrailer(bytes.subarray(Math.max(0, bytes.length - 2048)))) {
    return error('This PDF looks incomplete or damaged. Export it again and retry.', 415);
  }
  const activeContent = findPdfActiveContent(bytes);
  if (activeContent) {
    log.warn('Rejected upload: active PDF content', { feature: activeContent });
    return error(`This PDF contains ${ACTIVE_CONTENT_LABELS[activeContent] ?? 'active content'}, which is not allowed. Print or export it to a new PDF and retry.`, 415);
  }

  const isCv = target.data.target === 'cv';
  const articleId = target.data.target === 'article' ? target.data.articleId : null;
  if (articleId) {
    try {
      const article = await db.maybeOne(sql`select id from public.articles where id = ${articleId} and deleted_at is null`);
      if (!article) return error('Save the article before attaching files.', 404);
    } catch (lookupError) {
      log.error('Article lookup failed', { error: describeError(lookupError) });
      return error('The upload could not be saved. Try again.', 500);
    }
  }

  const { internalName, path } = createPdfObjectPath(articleId ? { kind: 'article', articleId } : { kind: 'cv' });
  if (!(await storeDocument(path, bytes))) return error('Storage is not available right now. Try again later.', 502);

  let saved: UploadedFile;
  try {
    saved = await db.transaction(async (tx) => {
      const row = await tx.one<UploadedFile>(sql`
        insert into public.article_files
          (article_id, kind, original_filename, internal_name, storage_path, mime_type, size_bytes, status, visibility, uploaded_by)
        values
          (${articleId}, ${isCv ? 'cv' : 'article_attachment'}::public.file_kind, ${displayName}, ${internalName}, ${path},
           'application/pdf', ${bytes.byteLength}, 'ready', ${isCv ? 'public' : 'private'}::public.file_visibility, ${userId})
        returning id, original_filename, label, size_bytes, visibility, status, created_at`);
      if (isCv) {
        await tx.execute(sql`update public.site_profile set cv_file_id = ${row.id}, updated_by = ${userId} where id = 1`);
      }
      return row;
    });
  } catch (saveError) {
    log.error('Could not record the uploaded PDF', { error: describeError(saveError) });
    await removeDocuments([path]);
    return error('The upload could not be saved. Try again.', 500);
  }

  if (isCv) {
    await logActivity(db, userId, { action: 'cv_updated', entityType: 'file', entityId: saved.id, summary: displayName });
    revalidatePublicContent();
  } else {
    await logActivity(db, userId, {
      action: 'pdf_uploaded',
      entityType: 'file',
      entityId: saved.id,
      summary: displayName,
      metadata: { article_id: articleId, size_bytes: bytes.byteLength },
    });
  }

  return NextResponse.json(saved, { status: 201, headers: { 'Cache-Control': 'no-store' } });
}
