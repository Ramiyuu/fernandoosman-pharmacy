import { describe, expect, it } from 'vitest';
import { safeVideoSource, validVideoSignature } from './video';
describe('video security', () => {
  it('normalizes YouTube links and drops tracking parameters', () =>
    expect(safeVideoSource('https://youtu.be/dQw4w9WgXcQ?tracking=1')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    ));
  it.each([
    'javascript:alert(1)',
    'https://youtube.com.attacker.test/watch?v=dQw4w9WgXcQ',
    'https://user:pass@youtube.com/watch?v=dQw4w9WgXcQ',
    '//evil.test/video',
    '/api/videos/../../secret',
    'https://example.com/arbitrary.html',
  ])('rejects %s', (url) => expect(safeVideoSource(url)).toBeNull());
  it('checks magic bytes and container brand', () => {
    expect(
      validVideoSignature(new Uint8Array([0, 0, 0, 24, ...new TextEncoder().encode('ftypisom')]), 'video/mp4'),
    ).toBe(true);
    expect(validVideoSignature(new TextEncoder().encode('<html>ftypisom'), 'video/mp4')).toBe(false);
    expect(
      validVideoSignature(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, ...new TextEncoder().encode('webm')]), 'video/webm'),
    ).toBe(true);
    expect(validVideoSignature(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]), 'video/webm')).toBe(false);
  });
});
