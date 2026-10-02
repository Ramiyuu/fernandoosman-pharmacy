import { describe, expect, it } from 'vitest';

import { detectFileKind, detectImageMime, hasPdfTrailer, isPdf } from './file-signature';

const bytes = (...values: Array<number | string>) =>
  new Uint8Array(values.flatMap((value) => (typeof value === 'string' ? [...value].map((char) => char.charCodeAt(0)) : [value])));

describe('PDF signature', () => {
  it('accepts a real PDF header at byte 0', () => {
    expect(isPdf(bytes('%PDF-1.7\n'))).toBe(true);
    expect(isPdf(bytes('%PDF-2.0\n'))).toBe(true);
    expect(detectFileKind(bytes('%PDF-1.4'))).toBe('pdf');
  });

  it('rejects files renamed to .pdf', () => {
    expect(isPdf(bytes(0x4d, 0x5a, 0x90, 0x00, 0x03))).toBe(false); // Windows .exe/.scr
    expect(detectFileKind(bytes(0x4d, 0x5a, 0x90, 0x00, 0x03))).toBe('executable');
    expect(detectFileKind(bytes(0x7f, 'ELF', 0x02))).toBe('executable');
    expect(detectFileKind(bytes('PK', 0x03, 0x04, 0x14))).toBe('archive'); // .jar
    expect(detectFileKind(bytes('#!/bin/sh\n'))).toBe('script');
    expect(detectFileKind(bytes('<?php echo 1;'))).toBe('script');
    expect(detectFileKind(bytes('  <!DOCTYPE html><html>'))).toBe('markup');
    expect(detectFileKind(bytes('<svg xmlns="http://www.w3.org/2000/svg">'))).toBe('markup');
    expect(isPdf(bytes('<html>%PDF-1.7'))).toBe(false);
  });

  it('rejects polyglots with junk before the header', () => {
    expect(isPdf(bytes('GIF89a%PDF-1.7'))).toBe(false);
  });

  it('checks the end-of-file marker', () => {
    expect(hasPdfTrailer(bytes('trailer\n<<>>\nstartxref\n123\n%%EOF\n'))).toBe(true);
    expect(hasPdfTrailer(bytes('truncated stream'))).toBe(false);
  });
});

describe('image signatures', () => {
  it('detects allowed image types from bytes', () => {
    expect(detectImageMime(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg');
    expect(detectImageMime(bytes(0x89, 'PNG', 0x0d, 0x0a, 0x1a, 0x0a))).toBe('image/png');
    expect(detectImageMime(bytes('GIF89a', 0x01))).toBe('image/gif');
    expect(detectImageMime(bytes('RIFF', 0, 0, 0, 0, 'WEBP'))).toBe('image/webp');
    expect(detectImageMime(bytes(0, 0, 0, 0x1c, 'ftypavif'))).toBe('image/avif');
  });

  it('refuses SVG and disguised files', () => {
    expect(detectImageMime(bytes('<svg onload="alert(1)">'))).toBeNull();
    expect(detectImageMime(bytes(0x4d, 0x5a, 0x90, 0x00))).toBeNull();
    expect(detectImageMime(bytes('%PDF-1.7'))).toBeNull();
  });
});
