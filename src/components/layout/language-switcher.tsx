'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type MouseEvent } from 'react';

import { HTML_LANG, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, LOCALES, otherLocale, type Locale } from '@/i18n/config';
import { switchLocalePath } from '@/i18n/routing';
import { cn } from '@/utils/cn';

interface LanguageSwitcherProps {
  locale: Locale;
  /** "Language" in the current locale (group label). */
  label: string;
  /** "Read in English" / "Ler em português", in the target language. */
  switchTo: string;
  className?: string;
}

/**
 * EN | PT segmented switch. The other language's link goes to the same page
 * there: pages whose slug differs per language (articles, projects) publish
 * an hreflang <link>, which wins over the default same-slug mapping. The
 * choice is remembered in a functional cookie so "/" opens in that language.
 */
export function LanguageSwitcher({ locale, label, switchTo, className }: LanguageSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState<Locale | null>(null);
  const target = otherLocale(locale);
  const fallback = switchLocalePath(pathname, target);
  const shown = pending ?? locale;

  const onSwitch = (event: MouseEvent<HTMLAnchorElement>) => {
    document.cookie = `${LOCALE_COOKIE}=${target}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
    setPending(target);
    const alternate = document.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${HTML_LANG[target]}"]`);
    if (!alternate?.href || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    const url = new URL(alternate.href);
    const destination = `${url.pathname}${url.search}`;
    if (destination !== fallback) {
      event.preventDefault();
      router.push(destination);
    }
  };

  return (
    <div role="group" aria-label={label} className={cn('lang-switch', className)} data-active={shown}>
      <span className="lang-switch-thumb" aria-hidden="true" />
      {LOCALES.map((code) =>
        code === locale ? (
          <span key={code} className="lang-switch-option" aria-current="true" lang={HTML_LANG[code]}>
            {code.toUpperCase()}
          </span>
        ) : (
          <Link
            key={code}
            href={fallback}
            hrefLang={HTML_LANG[code]}
            lang={HTML_LANG[code]}
            onClick={onSwitch}
            className="lang-switch-option"
            aria-label={switchTo}
            title={switchTo}
            prefetch={false}
          >
            {code.toUpperCase()}
          </Link>
        ),
      )}
    </div>
  );
}
