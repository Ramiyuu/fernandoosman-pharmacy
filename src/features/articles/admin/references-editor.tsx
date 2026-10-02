'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useFieldArray, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import type { ArticleFormValues } from './article-form-values';

interface ReferencesEditorProps {
  control: Control<ArticleFormValues>;
  register: UseFormRegister<ArticleFormValues>;
  errors?: FieldErrors<ArticleFormValues>['references'];
}

const EMPTY_REFERENCE = { title: '', authors: '', journal: '', year: '', doi: '', url: '', pmid: '' };

/** Numbered reference list; in-text citations [n] point at these numbers. */
export function ReferencesEditor({ control, register, errors }: ReferencesEditorProps) {
  const { fields, append, remove, move } = useFieldArray({ control, name: 'references' });

  return (
    <section aria-labelledby="references-editor-heading" className="rounded-xl border border-rule bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-rule px-5 py-4">
        <div>
          <h2 id="references-editor-heading" className="text-base font-semibold text-ink">
            References
          </h2>
          <p className="text-sm text-muted">Shown as a numbered list at the end. Cite them in the text with the citation button.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => append(EMPTY_REFERENCE)}>
          <Plus aria-hidden="true" /> Add reference
        </Button>
      </header>

      {fields.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">No references yet.</p>
      ) : (
        <ol className="divide-y divide-rule">
          {fields.map((field, index) => {
            const fieldErrors = errors?.[index];
            const base = `references.${index}` as const;
            return (
              <li key={field.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[2rem_1fr_auto]">
                <span className="pt-2 text-sm font-semibold text-muted tabular">[{index + 1}]</span>
                <div className="grid gap-3 sm:grid-cols-6">
                  <div className="sm:col-span-6">
                    <label htmlFor={`${base}.title`} className="sr-only">
                      Title of reference {index + 1}
                    </label>
                    <Input id={`${base}.title`} placeholder="Title" aria-invalid={Boolean(fieldErrors?.title)} {...register(`${base}.title`)} />
                    {fieldErrors?.title ? <p className="mt-1 text-xs text-danger-700">{fieldErrors.title.message}</p> : null}
                  </div>
                  <Input className="sm:col-span-3" placeholder="Authors (e.g. Cox DR, Smith J)" aria-label={`Authors of reference ${index + 1}`} {...register(`${base}.authors`)} />
                  <Input className="sm:col-span-2" placeholder="Journal" aria-label={`Journal of reference ${index + 1}`} {...register(`${base}.journal`)} />
                  <Input className="sm:col-span-1" placeholder="Year" inputMode="numeric" aria-label={`Year of reference ${index + 1}`} {...register(`${base}.year`)} />
                  <div className="sm:col-span-2">
                    <Input placeholder="DOI (10.xxxx/…)" aria-label={`DOI of reference ${index + 1}`} aria-invalid={Boolean(fieldErrors?.doi)} {...register(`${base}.doi`)} />
                    {fieldErrors?.doi ? <p className="mt-1 text-xs text-danger-700">{fieldErrors.doi.message}</p> : null}
                  </div>
                  <div className="sm:col-span-3">
                    <Input placeholder="URL (https://…)" aria-label={`URL of reference ${index + 1}`} aria-invalid={Boolean(fieldErrors?.url)} {...register(`${base}.url`)} />
                    {fieldErrors?.url ? <p className="mt-1 text-xs text-danger-700">{fieldErrors.url.message}</p> : null}
                  </div>
                  <Input className="sm:col-span-1" placeholder="PMID" inputMode="numeric" aria-label={`PMID of reference ${index + 1}`} {...register(`${base}.pmid`)} />
                </div>
                <div className="flex gap-1 sm:flex-col">
                  <Button variant="ghost" size="icon-sm" disabled={index === 0} onClick={() => move(index, index - 1)} aria-label={`Move reference ${index + 1} up`}>
                    <ArrowUp aria-hidden="true" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" disabled={index === fields.length - 1} onClick={() => move(index, index + 1)} aria-label={`Move reference ${index + 1} down`}>
                    <ArrowDown aria-hidden="true" />
                  </Button>
                  <Button variant="danger-ghost" size="icon-sm" onClick={() => remove(index)} aria-label={`Remove reference ${index + 1}`}>
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
