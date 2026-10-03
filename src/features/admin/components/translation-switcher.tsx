'use client';

import { Languages, LoaderCircle, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { LOCALES, type Locale } from '@/i18n/config';
import type { ContentStatus } from '@/types/database.types';
import { cn } from '@/utils/cn';

export interface TextVersion {
  id: string;
  language: Locale;
  title: string;
  status: ContentStatus;
}

const NAMES: Record<Locale, string> = { en: 'English', pt: 'Portuguese' };

interface TranslationSwitcherProps {
  /** null while the text has not been saved yet. */
  currentId: string | null;
  currentLanguage: Locale;
  versions: TextVersion[];
  /** Admin URL of a version, e.g. /admin/articles/<id>. */
  basePath: string;
  /** Saves pending changes, creates the copy and opens it. */
  onCreate: (language: Locale) => Promise<void>;
}

/**
 * EN | PT tabs for the language versions of one article or project. A
 * missing language shows "Create … version", which copies this text into a
 * new draft in that language, ready to translate.
 */
export function TranslationSwitcher({ currentId, currentLanguage, versions, basePath, onCreate }: TranslationSwitcherProps) {
  const [creating, setCreating] = useState<Locale | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Language versions">
      <Languages className="size-4 text-muted" aria-hidden="true" />
      {LOCALES.map((language) => {
        const version =
          language === currentLanguage
            ? { id: currentId, status: undefined }
            : versions.find((candidate) => candidate.language === language);
        const label = language.toUpperCase();

        if (language === currentLanguage) {
          return (
            <span
              key={language}
              aria-current="true"
              title={`${NAMES[language]} (this version)`}
              className="inline-flex h-8 items-center rounded-md bg-navy-900 px-2.5 text-xs font-semibold tracking-wide text-white"
            >
              {label}
            </span>
          );
        }

        if (version?.id) {
          return (
            <Link
              key={language}
              href={`${basePath}/${version.id}`}
              title={`Open the ${NAMES[language]} version`}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-rule-strong bg-white px-2.5 text-xs font-semibold tracking-wide text-navy-900 hover:border-navy-700"
            >
              {label}
              {version.status && version.status !== 'published' ? (
                <span className="font-normal text-muted capitalize">{version.status}</span>
              ) : null}
            </Link>
          );
        }

        return (
          <button
            key={language}
            type="button"
            disabled={!currentId || creating !== null}
            onClick={async () => {
              setCreating(language);
              try {
                await onCreate(language);
              } finally {
                setCreating(null);
              }
            }}
            title={currentId ? undefined : 'Save this text first'}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-md border border-dashed border-teal-600 px-2.5 text-xs font-medium text-teal-700 hover:bg-teal-50',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {creating === language ? (
              <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="size-3.5" aria-hidden="true" />
            )}
            Create {NAMES[language]} version
          </button>
        );
      })}
    </div>
  );
}
