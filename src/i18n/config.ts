/**
 * The public site is bilingual. Every public URL starts with the locale
 * (/en/…, /pt/…); the admin panel has no locale prefix and stays in English.
 * This module is shared by the proxy, Server and Client Components.
 */

export const LOCALES = ['en', 'pt'] as const;
export type Locale = (typeof LOCALES)[number];

/** Used when neither the cookie nor the browser's languages name a supported locale. */
export const DEFAULT_LOCALE: Locale = 'en';

/** Remembers the language a visitor picked in the switcher (functional, 1 year). */
export const LOCALE_COOKIE = 'fo-locale';
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Set by the proxy on every public request so any server code can read the locale. */
export const LOCALE_HEADER = 'x-fo-locale';

export const HTML_LANG: Record<Locale, string> = { en: 'en', pt: 'pt-BR' };
export const OG_LOCALE: Record<Locale, string> = { en: 'en_US', pt: 'pt_BR' };
export const INTL_LOCALE: Record<Locale, string> = { en: 'en-GB', pt: 'pt-BR' };

/** Each language named in itself, for the switcher and language labels. */
export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', pt: 'Português' };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'en' ? 'pt' : 'en';
}

/**
 * Picks the visitor's locale from an Accept-Language header, in the order of
 * preference the browser sends (q-values respected). Any pt-* variant maps to
 * pt, any en-* to en.
 */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale | null {
  if (!acceptLanguage) return null;
  const ranked = acceptLanguage
    .split(',')
    .map((part, index) => {
      const [tag, ...params] = part.trim().toLowerCase().split(';');
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      const quality = q ? Number(q.slice(2)) : 1;
      return { tag, quality: Number.isFinite(quality) ? quality : 0, index };
    })
    .filter((entry) => entry.tag && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);
  for (const { tag } of ranked) {
    const base = tag.split('-')[0];
    if (isLocale(base)) return base;
  }
  return null;
}
