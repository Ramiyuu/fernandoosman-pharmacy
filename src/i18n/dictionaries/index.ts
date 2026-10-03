import type { Locale } from '../config';

import { en, type Dictionary } from './en';
import { pt } from './pt';

const DICTIONARIES: Record<Locale, Dictionary> = { en, pt };

/** The interface copy for a locale (usable on the server and in shared modules). */
export function dictionaryFor(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

export type { Dictionary };
