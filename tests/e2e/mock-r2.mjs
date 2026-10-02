// Minimal S3-compatible stand-in for Cloudflare R2, used only by the local
// end-to-end stack. It VERIFIES SigV4 signatures (header and presigned query)
// with the test credentials, enforces presigned URL expiry, and supports the
// operations the site uses: PUT, HEAD, GET (with Range, If-None-Match and
// response-* overrides) and DELETE.

import { createHash } from 'node:crypto';
import { createServer } from 'node:http';

import { AwsV4Signer } from 'aws4fetch';

const AUTH_QUERY = ['X-Amz-Algorithm', 'X-Amz-Credential', 'X-Amz-Date', 'X-Amz-SignedHeaders', 'X-Amz-Signature'];

function amzDateToMs(value) {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(value ?? '');
  return match ? Date.UTC(+match[1], +match[2] - 1, +match[3], +match[4], +match[5], +match[6]) : NaN;
}

async function verify(request, url, body, credentials) {
  const presigned = url.searchParams.has('X-Amz-Signature');
  if (presigned) {
    const signature = url.searchParams.get('X-Amz-Signature');
    const datetime = url.searchParams.get('X-Amz-Date');
    const expires = Number(url.searchParams.get('X-Amz-Expires') ?? 0);
    if (!url.searchParams.get('X-Amz-Credential')?.startsWith(`${credentials.accessKeyId}/`)) return 'wrong access key';
    if (Date.now() > amzDateToMs(datetime) + expires * 1000) return 'expired';
    const unsigned = new URL(url);
    for (const name of AUTH_QUERY) unsigned.searchParams.delete(name);
    const signer = new AwsV4Signer({
      method: request.method,
      url: unsigned.toString(),
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      service: 's3',
      region: 'auto',
      signQuery: true,
      datetime,
    });
    const signed = await signer.sign();
    return signed.url.searchParams.get('X-Amz-Signature') === signature ? null : 'bad signature';
  }

  const authorization = request.headers.authorization ?? '';
  const match = /Credential=([^/]+)\/[^,]+, ?SignedHeaders=([^,]+), ?Signature=([0-9a-f]+)/.exec(authorization);
  if (!match) return 'missing signature';
  const [, accessKeyId, signedHeaderList, signature] = match;
  if (accessKeyId !== credentials.accessKeyId) return 'wrong access key';
  const datetime = request.headers['x-amz-date'];
  if (Math.abs(Date.now() - amzDateToMs(datetime)) > 15 * 60_000) return 'clock skew';

  const contentHash = request.headers['x-amz-content-sha256'];
  if (
    contentHash &&
    contentHash !== 'UNSIGNED-PAYLOAD' &&
    contentHash !== createHash('sha256').update(body).digest('hex')
  ) {
    return 'body hash mismatch';
  }
  const headers = {};
  for (const name of signedHeaderList.split(';')) {
    if (name !== 'host' && request.headers[name] !== undefined) headers[name] = request.headers[name];
  }
  const signer = new AwsV4Signer({
    method: request.method,
    url: url.toString(),
    headers,
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    service: 's3',
    region: 'auto',
    datetime,
  });
  const signed = await signer.sign();
  const expected = /Signature=([0-9a-f]+)/.exec(signed.headers.get('authorization') ?? '')?.[1];
  return expected === signature ? null : 'bad signature';
}

export function startMockR2({ port, credentials, log = () => {} }) {
  const objects = new Map();

  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    const done = (status, payload = '', headers = {}) => {
      log(`${request.method} ${url.pathname} → ${status}`);
      response.writeHead(status, {
        'access-control-allow-origin': 'http://localhost:3000',
        'access-control-allow-methods': 'GET, PUT, HEAD',
        'access-control-allow-headers': 'content-type',
        ...headers,
      });
      response.end(payload);
    };

    if (request.method === 'OPTIONS') return done(204);
    const failure = await verify(request, url, body, credentials);
    if (failure)
      return done(403, `<Error><Code>AccessDenied</Code><Message>${failure}</Message></Error>`, {
        'content-type': 'application/xml',
      });

    const [, bucket, ...rest] = url.pathname.split('/');
    const key = decodeURIComponent(rest.join('/'));
    if (bucket !== credentials.bucket || !key) return done(404, '<Error><Code>NoSuchBucket</Code></Error>');

    if (request.method === 'PUT' && request.headers['x-amz-copy-source']) {
      const source = objects.get(request.headers['x-amz-copy-source'].replace(`/${bucket}/`, ''));
      if (!source) return done(404);
      if (request.headers['x-amz-copy-source-if-match'] !== source.etag) return done(412);
      objects.set(key, { ...source });
      return done(200, `<CopyObjectResult><ETag>${source.etag}</ETag></CopyObjectResult>`);
    }
    if (request.method === 'PUT') {
      const etag = `"${createHash('md5').update(body).digest('hex')}"`;
      objects.set(key, {
        body,
        etag,
        contentType: request.headers['content-type'] ?? 'application/octet-stream',
        cacheControl: request.headers['cache-control'],
      });
      return done(200, '', { etag });
    }

    const object = objects.get(key);
    if (request.method === 'DELETE') {
      objects.delete(key);
      return done(204);
    }
    if (!object) return done(404, '<Error><Code>NoSuchKey</Code></Error>', { 'content-type': 'application/xml' });

    const headers = {
      etag: object.etag,
      'content-type': url.searchParams.get('response-content-type') ?? object.contentType,
      ...(object.cacheControl ? { 'cache-control': object.cacheControl } : {}),
      ...(url.searchParams.get('response-content-disposition')
        ? { 'content-disposition': url.searchParams.get('response-content-disposition') }
        : {}),
      ...(url.searchParams.get('response-cache-control')
        ? { 'cache-control': url.searchParams.get('response-cache-control') }
        : {}),
    };
    if (request.headers['if-match'] && request.headers['if-match'] !== object.etag) return done(412);
    if (request.method === 'HEAD') return done(200, '', { ...headers, 'content-length': object.body.length });
    if (request.method !== 'GET') return done(405);
    if (request.headers['if-none-match'] === object.etag) return done(304, '', headers);

    const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range ?? '');
    if (range) {
      const size = object.body.length;
      const start = range[1] === '' ? Math.max(0, size - Number(range[2])) : Number(range[1]);
      const end = range[1] === '' || range[2] === '' ? size - 1 : Math.min(Number(range[2]), size - 1);
      return done(206, object.body.subarray(start, end + 1), {
        ...headers,
        'content-range': `bytes ${start}-${end}/${size}`,
      });
    }
    return done(200, object.body, { ...headers, 'content-length': object.body.length });
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve({ server, objects }));
  });
}
