import { INTL_LOCALE, LOCALE_NAMES, type Locale } from '@/i18n/config';

// Formatters are created once per locale. Dates are shown in UTC so server
// and client render the same string.
const cacheBy = <T>(create: (tag: string) => T) => {
  const store = new Map<Locale, T>();
  return (locale: Locale): T => {
    let value = store.get(locale);
    if (!value) {
      value = create(INTL_LOCALE[locale]);
      store.set(locale, value);
    }
    return value;
  };
};

const dateFormatter = cacheBy(
  (tag) => new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }),
);
const dateTimeFormatter = cacheBy(
  (tag) =>
    new Intl.DateTimeFormat(tag, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }),
);
const monthYearFormatter = cacheBy((tag) => new Intl.DateTimeFormat(tag, { month: 'short', year: 'numeric', timeZone: 'UTC' }));
const numberFormatter = cacheBy((tag) => new Intl.NumberFormat(tag));

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "23 Jun 2026" / "23 de jun. de 2026" (UTC). */
export function formatDate(value: string | Date | null | undefined, locale: Locale = 'en'): string {
  const date = toDate(value);
  return date ? dateFormatter(locale).format(date) : '';
}

export function formatDateTime(value: string | Date | null | undefined, locale: Locale = 'en'): string {
  const date = toDate(value);
  return date ? `${dateTimeFormatter(locale).format(date)} UTC` : '';
}

export function formatMonthYear(value: string | Date | null | undefined, locale: Locale = 'en'): string {
  const date = toDate(value);
  return date ? monthYearFormatter(locale).format(date) : '';
}

export function formatNumber(value: number, locale: Locale = 'en'): string {
  return numberFormatter(locale).format(value);
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`;
}

export function toIsoDate(value: string | Date | null | undefined): string | undefined {
  return toDate(value)?.toISOString();
}

export const LANGUAGE_LABELS: Record<string, string> = LOCALE_NAMES;

/** A language named in itself ("English", "Português"). */
export function languageLabel(code: string): string {
  return LANGUAGE_LABELS[code] ?? code.toUpperCase();
}
