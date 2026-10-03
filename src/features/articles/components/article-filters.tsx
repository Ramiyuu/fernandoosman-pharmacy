'use client';

import Form from 'next/form';
import Link from 'next/link';

import { NativeSelect } from '@/components/ui/input';
import type { ArticleFilterOptions, ArticleFilters } from '@/types/content';
import { languageLabel } from '@/utils/format';

interface ArticleFiltersProps {
  options: ArticleFilterOptions;
  active: ArticleFilters;
  /** Localised /articles path the form submits to. */
  action: string;
  labels: {
    ariaLabel: string;
    topic: string;
    category: string;
    tag: string;
    language: string;
    year: string;
    all: string;
    apply: string;
    clear: string;
  };
}

/**
 * A plain GET form: filtered listings have shareable, crawlable URLs and work
 * without JavaScript (the Apply button). With JavaScript, changing a select
 * submits immediately via client-side navigation.
 */
export function ArticleFiltersBar({ options, active, action, labels }: ArticleFiltersProps) {
  const fields = [
    { name: 'topic', label: labels.topic, value: active.topic ?? '', options: options.topics.map((o) => ({ value: o.slug, label: `${o.name} (${o.count})` })) },
    { name: 'category', label: labels.category, value: active.category ?? '', options: options.categories.map((o) => ({ value: o.slug, label: `${o.name} (${o.count})` })) },
    { name: 'tag', label: labels.tag, value: active.tag ?? '', options: options.tags.map((o) => ({ value: o.slug, label: `${o.name} (${o.count})` })) },
    { name: 'language', label: labels.language, value: active.language ?? '', options: options.languages.map((code) => ({ value: code, label: languageLabel(code) })) },
    { name: 'year', label: labels.year, value: active.year ? String(active.year) : '', options: options.years.map((year) => ({ value: String(year), label: String(year) })) },
  ];

  return (
    <Form
      action={action}
      className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(5,minmax(0,1fr))_auto] md:items-end"
      onChange={(event) => event.currentTarget.requestSubmit()}
      aria-label={labels.ariaLabel}
    >
      {fields.map((field) => (
        <div key={field.name} className="flex flex-col gap-1">
          <label htmlFor={`filter-${field.name}`} className="text-xs font-medium text-muted">
            {field.label}
          </label>
          <NativeSelect id={`filter-${field.name}`} name={field.name} defaultValue={field.value} key={field.value}>
            <option value="">{labels.all}</option>
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      ))}
      <div className="col-span-2 flex items-center gap-3 md:col-span-1">
        <noscript>
          <button type="submit" className="h-10 rounded-md bg-navy-900 px-4 text-sm text-white">
            {labels.apply}
          </button>
        </noscript>
        <Link href={action} className="text-sm text-azure-700 hover:underline">
          {labels.clear}
        </Link>
      </div>
    </Form>
  );
}
