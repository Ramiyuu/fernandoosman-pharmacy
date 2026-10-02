import 'server-only';

import { AwsClient } from 'aws4fetch';

import { serverEnv } from '@/lib/env';

/**
 * Minimal Cloudflare R2 client (S3 API, SigV4 via aws4fetch). The bucket is
 * PRIVATE: nothing in it is reachable without a signature made with the
 * server's credentials. Callers pass object keys built by
 * src/lib/storage/paths.ts, never user input.
 */

interface R2Config {
  client: AwsClient;
  endpoint: string;
  bucket: string;
}

let config: R2Config | null = null;

function r2(): R2Config {
  if (config) return config;
  const env = serverEnv();
  config = {
    client: new AwsClient({
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      service: 's3',
      region: 'auto',
      retries: 2,
    }),
    endpoint: (env.R2_ENDPOINT ?? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`).replace(/\/+$/, ''),
    bucket: env.R2_BUCKET,
  };
  return config;
}

function objectUrl(key: string): URL {
  if (!/^[a-z0-9-]+(\/[a-z0-9_.-]+)+$/.test(key) || key.includes('..')) {
    throw new Error('Refusing to use an unexpected object key');
  }
  const { endpoint, bucket } = r2();
  return new URL(`${endpoint}/${bucket}/${key}`);
}

const TIMEOUT = { metadata: 15_000, transfer: 120_000 } as const;

export class StorageError extends Error {
  constructor(
    operation: string,
    readonly status?: number,
  ) {
    super(`Storage ${operation} failed${status ? ` (${status})` : ''}`);
    this.name = 'StorageError';
  }
}

export async function putObject(
  key: string,
  body: Uint8Array,
  options: { contentType: string; cacheControl?: string },
): Promise<void> {
  const response = await r2().client.fetch(objectUrl(key), {
    method: 'PUT',
    body: body as BodyInit,
    headers: {
      'content-type': options.contentType,
      'content-length': String(body.byteLength),
      ...(options.cacheControl ? { 'cache-control': options.cacheControl } : {}),
    },
    signal: AbortSignal.timeout(TIMEOUT.transfer),
  });
  if (!response.ok) throw new StorageError('upload', response.status);
}

export async function headObject(
  key: string,
): Promise<{ size: number; contentType: string | null; etag: string | null } | null> {
  const response = await r2().client.fetch(objectUrl(key), {
    method: 'HEAD',
    signal: AbortSignal.timeout(TIMEOUT.metadata),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new StorageError('head', response.status);
  return {
    size: Number(response.headers.get('content-length') ?? 0),
    contentType: response.headers.get('content-type'),
    etag: response.headers.get('etag'),
  };
}

/** Streams an object (used to serve images). Returns null when it does not exist. */
export async function getObject(key: string, options: { ifNoneMatch?: string | null } = {}): Promise<Response | null> {
  const response = await r2().client.fetch(objectUrl(key), {
    method: 'GET',
    headers: options.ifNoneMatch ? { 'if-none-match': options.ifNoneMatch } : undefined,
    signal: AbortSignal.timeout(TIMEOUT.transfer),
  });
  if (response.status === 404) return null;
  if (!response.ok && response.status !== 304) throw new StorageError('get', response.status);
  return response;
}

/** Deletes an object; deleting something that does not exist counts as success. */
export async function deleteObject(key: string): Promise<void> {
  const response = await r2().client.fetch(objectUrl(key), {
    method: 'DELETE',
    signal: AbortSignal.timeout(TIMEOUT.metadata),
  });
  if (!response.ok && response.status !== 404) throw new StorageError('delete', response.status);
}

/** RFC 6266 / 5987 Content-Disposition with an ASCII fallback for old clients. */
export function contentDisposition(type: 'inline' | 'attachment', filename: string): string {
  const fallback =
    filename
      .normalize('NFKD')
      .replace(/[^\x20-\x7e]/g, '')
      .replace(/["\\]/g, '')
      .trim() || 'document.pdf';
  return `${type}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

/**
 * Short-lived, signed GET URL (query-string SigV4). Never persisted: callers
 * redirect to it immediately. The response headers are pinned so the object is
 * always served as a PDF, inline or as a download.
 */
export async function presignGetUrl(
  key: string,
  options: { expiresInSeconds: number; contentType: string; disposition: string },
): Promise<string> {
  const url = objectUrl(key);
  url.searchParams.set('X-Amz-Expires', String(Math.max(1, Math.min(options.expiresInSeconds, 3600))));
  url.searchParams.set('response-content-type', options.contentType);
  url.searchParams.set('response-content-disposition', options.disposition);
  url.searchParams.set('response-cache-control', 'private, no-store');
  const signed = await r2().client.sign(new Request(url, { method: 'GET' }), { aws: { signQuery: true } });
  return signed.url;
}

/** PUT URLs are only valid for quarantine keys; never for published objects. */
export async function presignPutUrl(key: string, contentType: string): Promise<string> {
  if (!key.startsWith('pending/')) throw new Error('Uploads require quarantine');
  const url = objectUrl(key);
  url.searchParams.set('X-Amz-Expires', '300');
  return (
    await r2().client.sign(new Request(url, { method: 'PUT', headers: { 'content-type': contentType } }), {
      aws: { signQuery: true },
    })
  ).url;
}
export async function readObjectHead(key: string, etag: string): Promise<Uint8Array> {
  const response = await r2().client.fetch(objectUrl(key), {
    headers: { Range: 'bytes=0-4095', 'If-Match': etag },
    signal: AbortSignal.timeout(TIMEOUT.metadata),
  });
  if (!response.ok || !response.body) throw new StorageError('video validation', response.status);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let count = 0;
  while (count < 4096) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = value.subarray(0, 4096 - count);
    chunks.push(chunk);
    count += chunk.length;
  }
  await reader.cancel();
  const result = new Uint8Array(count);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
export async function copyObject(source: string, destination: string, etag: string): Promise<void> {
  const response = await r2().client.fetch(objectUrl(destination), {
    method: 'PUT',
    headers: { 'x-amz-copy-source': `/${r2().bucket}/${source}`, 'x-amz-copy-source-if-match': etag },
    signal: AbortSignal.timeout(TIMEOUT.transfer),
  });
  if (!response.ok || (await response.text()).includes('<Error>')) throw new StorageError('copy', response.status);
}
