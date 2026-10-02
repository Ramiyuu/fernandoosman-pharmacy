/** Only our protected media route and YouTube's privacy-enhanced player. */
export function safeVideoSource(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  if (/^\/api\/videos\/[a-f0-9-]{36}$/.test(input)) return input;
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    let id: string | null = null;
    if (['www.youtube.com', 'youtube.com'].includes(url.hostname) && url.pathname === '/watch')
      id = url.searchParams.get('v');
    if (url.hostname === 'youtu.be') id = url.pathname.slice(1);
    if (url.hostname === 'www.youtube-nocookie.com' && url.pathname.startsWith('/embed/')) id = url.pathname.slice(7);
    return id && /^[\w-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

export function validVideoSignature(bytes: Uint8Array, mime: string): boolean {
  if (mime === 'video/mp4')
    return (
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.subarray(4, 8)) === 'ftyp' &&
      ['isom', 'iso2', 'mp41', 'mp42', 'avc1', 'M4V '].includes(String.fromCharCode(...bytes.subarray(8, 12)))
    );
  return (
    mime === 'video/webm' &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3 &&
    new TextDecoder().decode(bytes).includes('webm')
  );
}
