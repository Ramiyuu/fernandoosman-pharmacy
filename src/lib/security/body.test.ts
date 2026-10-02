import { describe, expect, it } from 'vitest';
import { boundedFormData } from './body';
describe('bounded multipart input', () => {
  it('rejects oversized bodies without Content-Length', async () => {
    const request = new Request('http://localhost', { method: 'POST', body: 'x'.repeat(1000) });
    expect(request.headers.has('content-length')).toBe(false);
    await expect(boundedFormData(request, 100)).rejects.toThrow('too large');
  });
  it('preserves a valid multipart file', async () => {
    const body = new FormData();
    body.set('file', new Blob(['%PDF-1.7\n%%EOF']), 'study.pdf');
    const result = await boundedFormData(new Request('http://localhost', { method: 'POST', body }), 4096);
    expect(await (result.get('file') as File).text()).toContain('%PDF-');
  });
});
