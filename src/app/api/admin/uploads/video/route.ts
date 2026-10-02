import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeAdmin } from '@/lib/auth/session';
import { sql } from '@/lib/db/sql';
import { validVideoSignature } from '@/lib/content/video';
import { isSameOriginRequest } from '@/lib/security/request';
import { rateLimit } from '@/lib/security/rate-limit';
import { boundedJson } from '@/lib/security/body';
import { logActivity } from '@/services/activity-log.service';
import { deleteObject, headObject, presignPutUrl, readObjectHead, copyObject } from '@/lib/storage/r2';
import { sanitizeDisplayFilename, hasBlockedExtension } from '@/utils/filename';
const input = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('start'),
    filename: z.string().min(1).max(255),
    mime: z.enum(['video/mp4', 'video/webm']),
    size: z.number().int().min(12).max(524288000),
    articleId: z.uuid().optional(),
    projectId: z.uuid().optional(),
  }),
  z.object({ action: z.literal('complete'), id: z.uuid() }),
  z.object({ action: z.literal('delete'), id: z.uuid() }),
]);
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request))
    return NextResponse.json({ error: 'Cross-site request blocked.' }, { status: 403 });
  const auth = await authorizeAdmin('files:write');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!(await rateLimit('upload', auth.session.userId)).success)
    return NextResponse.json({ error: 'Too many uploads.' }, { status: 429 });
  if (Number(request.headers.get('content-length') ?? 0) > 2048)
    return NextResponse.json({ error: 'Request too large.' }, { status: 413 });
  const parsed = input.safeParse(await boundedJson(request, 2048).catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid upload request.' }, { status: 400 });
  const { db } = auth.session;
  const data = parsed.data;
  if (data.action === 'start') {
    if (Boolean(data.articleId) === Boolean(data.projectId) || hasBlockedExtension(data.filename))
      return NextResponse.json({ error: 'Choose one saved article or project.' }, { status: 400 });
    const ext = data.mime === 'video/mp4' ? 'mp4' : 'webm';
    if (!data.filename.toLowerCase().endsWith(`.${ext}`))
      return NextResponse.json({ error: 'File extension does not match video format.' }, { status: 415 });
    const target = data.articleId
      ? await db.maybeOne(sql`select id from public.articles where id = ${data.articleId} and deleted_at is null`)
      : await db.maybeOne(sql`select id from public.projects where id = ${data.projectId}`);
    if (!target) return NextResponse.json({ error: 'Save the content before uploading video.' }, { status: 404 });
    const id = crypto.randomUUID();
    const key = `videos/${id}.${ext}`;
    await db.execute(sql`insert into public.videos(id,article_id,project_id,filename,mime_type,size_bytes,storage_key) values
      (${id},${data.articleId ?? null},${data.projectId ?? null},${sanitizeDisplayFilename(data.filename)},${data.mime},${data.size},${key})`);
    return NextResponse.json({ id, url: await presignPutUrl(`pending/${id}.${ext}`, data.mime) }, { status: 201 });
  }
  const video = await db.maybeOne<{
    id: string;
    storage_key: string;
    size_bytes: number;
    mime_type: string;
    ready: boolean;
  }>(sql`select * from public.videos where id = ${data.id}`);
  if (!video) return NextResponse.json({ error: 'Upload not found.' }, { status: 404 });
  if (data.action === 'delete') {
    await deleteObject(video.storage_key);
    await deleteObject(video.storage_key.replace('videos/', 'pending/'));
    await db.execute(sql`delete from public.videos where id = ${video.id}`);
    await logActivity(db, auth.session.userId, {
      action: 'video_deleted',
      entityType: 'file',
      entityId: video.id,
      summary: 'Deleted video',
    });
    return NextResponse.json({ deleted: true });
  }
  if (video.ready) return NextResponse.json({ src: `/api/videos/${video.id}` });
  const pending = video.storage_key.replace('videos/', 'pending/');
  try {
    const head = await headObject(pending);
    if (!head || head.size !== Number(video.size_bytes) || head.contentType !== video.mime_type || !head.etag)
      throw new Error('Video size or type mismatch.');
    const bytes = await readObjectHead(pending, head.etag);
    if (!validVideoSignature(bytes, video.mime_type)) throw new Error('The file is not a valid MP4/WebM.');
    // Conditional immutable copy prevents replaying the PUT URL against a verified video.
    await copyObject(pending, video.storage_key, head.etag);
    await db.execute(sql`update public.videos set ready = true where id = ${video.id}`);
    await logActivity(db, auth.session.userId, {
      action: 'video_uploaded',
      entityType: 'file',
      entityId: video.id,
      summary: 'Uploaded and validated video',
    });
    await deleteObject(pending);
    return NextResponse.json({ src: `/api/videos/${video.id}` });
  } catch {
    await deleteObject(pending).catch(() => {});
    return NextResponse.json({ error: 'Video validation failed. Check the file and try again.' }, { status: 415 });
  }
}
