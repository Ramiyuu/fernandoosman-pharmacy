const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

// Control characters and whitespace that browsers strip or ignore inside URLs
// (e.g. "java\tscript:") must not be able to sneak a dangerous scheme past us.
const URL_NOISE = /[\u0000-\u001F\u007F-\u009F\s]/g;
const HAS_URL_NOISE = /[\u0000-\u001F\u007F-\u009F\s]/;

/**
 * Returns the href if it is safe to render in an <a> tag, otherwise null.
 * Allows http(s), mailto, same-site absolute paths ("/x") and fragments ("#x").
 */
export function safeHref(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const href = value.trim();
  if (!href || href.length > 2048) return null;

  const compact = href.replace(URL_NOISE, '');
  if (compact.startsWith('#')) return href;
  if (compact.startsWith('/') && !compact.startsWith('//') && !compact.startsWith('/\\')) return href;

  try {
    const url = new URL(compact);
    return SAFE_PROTOCOLS.has(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Only absolute http(s) URLs — used for user-provided external links. */
export function safeExternalUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function isExternalHref(href: string): boolean {
  return /^(https?:)?\/\//i.test(href) || href.startsWith('mailto:');
}

/**
 * Prevents open redirects: accepts only same-site absolute paths under one of
 * the allowed prefixes, otherwise returns the fallback.
 */
export function safeRedirectPath(
  value: unknown,
  fallback: string,
  allowedPrefixes: readonly string[] = ['/admin', '/preview'],
): string {
  if (typeof value !== 'string') return fallback;
  const path = value.trim();
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\') || HAS_URL_NOISE.test(path)) {
    return fallback;
  }

  let parsed: URL;
  try {
    parsed = new URL(path, 'http://localhost');
  } catch {
    return fallback;
  }
  if (parsed.origin !== 'http://localhost') return fallback;

  const allowed = allowedPrefixes.some(
    (prefix) => parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`),
  );
  if (!allowed || parsed.pathname.startsWith('/admin/login')) return fallback;

  return `${parsed.pathname}${parsed.search}`;
}
