import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { publicDb } from '@/lib/db/client';
import { sql } from '@/lib/db/sql';
import { isSameOriginRequest, getRequestIp } from '@/lib/security/request';
import { rateLimit } from '@/lib/security/rate-limit';
import { recordEvent } from '@/services/analytics.service';
const event = z.object({ kind: z.enum(['article_view', 'project_view']), id: z.uuid(), session: z.uuid() });
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return new NextResponse(null, { status: 403 });
  if (!(await rateLimit('fileDownload', getRequestIp(request))).success) return new NextResponse(null, { status: 429 });
  const reader = request.body?.getReader();
  if (!reader) return new NextResponse(null, { status: 400 });
  let raw = '';
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    raw += decoder.decode(value, { stream: true });
    if (raw.length > 512) {
      await reader.cancel();
      return new NextResponse(null, { status: 413 });
    }
  }
  const parsed = event.safeParse(
    await Promise.resolve()
      .then(() => JSON.parse(raw))
      .catch(() => null),
  );
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  const { kind, id, session } = parsed.data;
  const target =
    kind === 'article_view'
      ? await publicDb().maybeOne(sql`select id from public.articles where id = ${id}`)
      : await publicDb().maybeOne(sql`select id from public.projects where id = ${id}`);
  if (!target) return new NextResponse(null, { status: 404 });
  await recordEvent(kind, id, session);
  return new NextResponse(null, { status: 204 });
}
