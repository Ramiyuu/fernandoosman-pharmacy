import type { ImageMimeType } from '@/config/uploads';

/**
 * Content sniffing based on magic bytes. File names and client-declared MIME
 * types are attacker-controlled; these checks look at the actual bytes.
 */

export type DetectedKind =
  | 'pdf'
  | 'jpeg'
  | 'png'
  | 'gif'
  | 'webp'
  | 'avif'
  | 'executable'
  | 'archive'
  | 'markup'
  | 'script'
  | 'unknown';

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length));

const startsWith = (bytes: Uint8Array, signature: readonly number[], offset = 0) =>
  bytes.length >= offset + signature.length && signature.every((byte, index) => bytes[offset + index] === byte);

function leadingText(bytes: Uint8Array): string {
  // Skip a UTF-8 BOM and leading whitespace, then read a short lowercase prefix.
  let index = startsWith(bytes, [0xef, 0xbb, 0xbf]) ? 3 : 0;
  while (index < bytes.length && [0x09, 0x0a, 0x0d, 0x20].includes(bytes[index])) index += 1;
  return ascii(bytes, index, 64).toLowerCase();
}

export function detectFileKind(bytes: Uint8Array): DetectedKind {
  if (bytes.length < 4) return 'unknown';

  // Documents and images
  if (ascii(bytes, 0, 5) === '%PDF-') return 'pdf';
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (ascii(bytes, 0, 6) === 'GIF87a' || ascii(bytes, 0, 6) === 'GIF89a') return 'gif';
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'webp';
  if (ascii(bytes, 4, 4) === 'ftyp' && ['avif', 'avis'].includes(ascii(bytes, 8, 4))) return 'avif';

  // Executables and binaries
  if (startsWith(bytes, [0x4d, 0x5a])) return 'executable'; // MZ (Windows PE: .exe, .dll, .scr)
  if (startsWith(bytes, [0x7f, 0x45, 0x4c, 0x46])) return 'executable'; // ELF
  if (
    startsWith(bytes, [0xfe, 0xed, 0xfa, 0xce]) ||
    startsWith(bytes, [0xfe, 0xed, 0xfa, 0xcf]) ||
    startsWith(bytes, [0xce, 0xfa, 0xed, 0xfe]) ||
    startsWith(bytes, [0xcf, 0xfa, 0xed, 0xfe]) ||
    startsWith(bytes, [0xca, 0xfe, 0xba, 0xbe]) // Mach-O / Java class
  ) {
    return 'executable';
  }
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return 'archive'; // ZIP, JAR, DOCX…

  const text = leadingText(bytes);
  if (text.startsWith('#!')) return 'script';
  if (/^<\?php|^<%/.test(text)) return 'script';
  if (/^(<!doctype|<html|<script|<svg|<\?xml|<head|<body|<iframe)/.test(text)) return 'markup';

  return 'unknown';
}

export function isPdf(bytes: Uint8Array): boolean {
  // Strict: the header must be at byte 0 (the spec tolerates junk before it,
  // which is exactly how polyglot files are built).
  return /^%PDF-[12]\.\d/.test(ascii(bytes, 0, 8));
}

/** The end-of-file marker must appear in the last kilobytes of a well-formed PDF. */
export function hasPdfTrailer(tail: Uint8Array): boolean {
  return ascii(tail, 0, tail.length).includes('%%EOF');
}

const IMAGE_KIND_TO_MIME: Partial<Record<DetectedKind, ImageMimeType>> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
};

export function detectImageMime(bytes: Uint8Array): ImageMimeType | null {
  return IMAGE_KIND_TO_MIME[detectFileKind(bytes)] ?? null;
}

export const IMAGE_EXTENSION_BY_MIME: Record<ImageMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

// PDF features that run code or carry other files. A portfolio PDF (paper,
// poster, CV) has no reason to contain them, so they are refused to protect
// visitors' PDF readers. The patterns match PDF dictionary syntax (an action
// type, a key followed by a value), not plain words, so a link such as
// https://example.com/js/ is not a false positive. Hex-escaped names
// (/J#61vaScript) are decoded first. Content inside compressed object streams
// is not visible here: this is defence in depth on top of admin-only uploads.
const ACTIVE_PDF_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ['javascript', /\/S\s*\/JavaScript\b/],
  ['javascript', /\/JS\s*(?:\(|<|\d+\s+\d+\s+R)/],
  ['launch', /\/S\s*\/Launch\b/],
  ['form submission', /\/S\s*\/(?:SubmitForm|ImportData)\b/],
  ['embedded file', /\/EmbeddedFiles?\s*(?:<<|\[|\d+\s+\d+\s+R)/],
  ['embedded file', /\/Type\s*\/EmbeddedFile\b/],
  ['rich media', /\/RichMedia(?:Content|Execute|Settings)?\b/],
];

const decodeNameEscapes = (name: string) =>
  name.replace(/#([0-9a-fA-F]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));

export function findPdfActiveContent(bytes: Uint8Array): string | null {
  const text = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    .toString('latin1')
    .replace(/\/[A-Za-z0-9#]+/g, decodeNameEscapes);
  for (const [label, pattern] of ACTIVE_PDF_PATTERNS) {
    if (pattern.test(text)) return label;
  }
  return null;
}
