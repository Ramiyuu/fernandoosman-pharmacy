import { DEFAULT_LOCALE, isLocale, type Locale } from './config';

/**
 * Localised first path segments. Route folders under src/app/[lang] use the
 * English segment; the proxy rewrites the Portuguese one onto it, so
 * /pt/artigos/x is served by src/app/[lang]/articles/[slug]. Anything not in
 * this table (slugs, opengraph-image, …) is the same in both languages.
 */
export const ROUTE_SEGMENTS = {
  articles: { en: 'articles', pt: 'artigos' },
  topics: { en: 'topics', pt: 'topicos' },
  projects: { en: 'projects', pt: 'projetos' },
  about: { en: 'about', pt: 'sobre' },
  cv: { en: 'cv', pt: 'cv' },
  contact: { en: 'contact', pt: 'contato' },
  experience: { en: 'experience', pt: 'experiencia' },
  certificates: { en: 'certificates', pt: 'certificados' },
  privacy: { en: 'privacy', pt: 'privacidade' },
  search: { en: 'search', pt: 'busca' },
} as const satisfies Record<string, Record<Locale, string>>;

type RouteKey = keyof typeof ROUTE_SEGMENTS;

const ROUTE_KEYS = Object.keys(ROUTE_SEGMENTS) as RouteKey[];

function splitSuffix(path: string): [string, string] {
  const index = path.search(/[?#]/);
  return index === -1 ? [path, ''] : [path.slice(0, index), path.slice(index)];
}

/**
 * Public URL of an internal (English, unprefixed) path in a locale:
 * localizePath('pt', '/articles/x?tag=y') → '/pt/artigos/x?tag=y'.
 */
export function localizePath(locale: Locale, internalPath: string): string {
  const [path, suffix] = splitSuffix(internalPath.startsWith('/') ? internalPath : `/${internalPath}`);
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return `/${locale}${suffix}`;
  const key = segments[0] as RouteKey;
  if (key in ROUTE_SEGMENTS) segments[0] = ROUTE_SEGMENTS[key][locale];
  return `/${locale}/${segments.join('/')}${suffix}`;
}

export interface ResolvedPublicPath {
  locale: Locale;
  /** Path the route folders understand: /pt/articles/x. */
  internal: string;
  /** The one public URL for this page: /pt/artigos/x. */
  canonical: string;
}

/**
 * Maps a prefixed public pathname to its route. Returns null when the path
 * has no locale prefix. A segment written in the other language (or the
 * English folder name under /pt) resolves too, with `canonical` pointing at
 * the correct spelling so the proxy can redirect.
 */
export function resolvePublicPath(pathname: string): ResolvedPublicPath | null {
  const segments = pathname.split('/').filter(Boolean);
  const [first, second, ...rest] = segments;
  if (!isLocale(first)) return null;
  const locale = first;
  if (second === undefined) return { locale, internal: `/${locale}`, canonical: `/${locale}` };

  const key = ROUTE_KEYS.find((candidate) => ROUTE_SEGMENTS[candidate].en === second || ROUTE_SEGMENTS[candidate].pt === second);
  const internalSegment = key ? ROUTE_SEGMENTS[key].en : second;
  const publicSegment = key ? ROUTE_SEGMENTS[key][locale] : second;
  const tail = rest.length > 0 ? `/${rest.join('/')}` : '';
  return {
    locale,
    internal: `/${locale}/${internalSegment}${tail}`,
    canonical: `/${locale}/${publicSegment}${tail}`,
  };
}

/**
 * Best route for an unprefixed legacy URL (/articles/x, /artigos/x, /about…):
 * the internal path, read in either language.
 */
export function internalPathFromUnprefixed(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return '/';
  const key = ROUTE_KEYS.find(
    (candidate) => ROUTE_SEGMENTS[candidate].en === segments[0] || ROUTE_SEGMENTS[candidate].pt === segments[0],
  );
  if (key) segments[0] = ROUTE_SEGMENTS[key].en;
  return `/${segments.join('/')}`;
}

/**
 * The same page in another locale, for the language switcher (slugs stay the
 * same; pages with translated slugs publish hreflang links the switcher
 * prefers). Works on public pathnames, with or without a query string.
 */
export function switchLocalePath(pathname: string, target: Locale): string {
  const [path, suffix] = splitSuffix(pathname);
  const resolved = resolvePublicPath(path);
  if (!resolved) return localizePath(target, internalPathFromUnprefixed(path) + suffix);
  const internal = resolved.internal.slice(`/${resolved.locale}`.length) || '/';
  return localizePath(target, internal + suffix);
}

/** Strips the locale prefix from a public pathname: '/pt/artigos/x' → '/artigos/x'. */
export function withoutLocale(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (isLocale(segments[0])) segments.shift();
  return `/${segments.join('/')}`;
}

export function localeFromPathname(pathname: string): Locale {
  const first = pathname.split('/').filter(Boolean)[0];
  return isLocale(first) ? first : DEFAULT_LOCALE;
}
