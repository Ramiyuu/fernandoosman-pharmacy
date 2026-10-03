import 'server-only';

import { headers } from 'next/headers';
import { cache } from 'react';

import { DEFAULT_LOCALE, isLocale, LOCALE_HEADER, type Locale } from './config';
import { dictionaryFor, type Dictionary } from './dictionaries';
import { localizePath } from './routing';

export const getDictionary = dictionaryFor;

/**
 * Locale of the current public request, set by the proxy from the URL prefix.
 * Anything outside the public site (admin, preview, API) reads English.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const value = (await headers()).get(LOCALE_HEADER);
  return isLocale(value) ? value : DEFAULT_LOCALE;
});

export interface I18n {
  locale: Locale;
  t: Dictionary;
  /** Public URL of an internal path in the current locale: href('/articles/x'). */
  href: (internalPath: string) => string;
}

export function i18nFor(locale: Locale): I18n {
  return { locale, t: getDictionary(locale), href: (path) => localizePath(locale, path) };
}

export async function getI18n(): Promise<I18n> {
  return i18nFor(await getLocale());
}
