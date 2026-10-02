'use client';

import type { ReactNode } from 'react';
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form';

import { TagInput } from '@/components/forms/tag-input';
import { ImageField } from '@/components/forms/image-field';
import { describedBy, Field } from '@/components/ui/field';
import { Input, NativeSelect, Textarea } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { EditorOptions } from '@/services/admin/articles.admin';
import { cn } from '@/utils/cn';

import type { ArticleFormValues } from './article-form-values';

function Group({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('space-y-4 rounded-xl border border-rule bg-white p-4', className)}>
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Counter({ value, max }: { value: string; max: number }) {
  return (
    <span className={cn('text-xs tabular', value.length > max ? 'text-danger-700' : 'text-muted')} aria-hidden="true">
      {value.length}/{max}
    </span>
  );
}

interface ArticleSettingsPanelProps {
  form: UseFormReturn<ArticleFormValues>;
  options: EditorOptions;
  onSlugEdited: (value: string) => void;
}

export function ArticleSettingsPanel({ form, options, onSlugEdited }: ArticleSettingsPanelProps) {
  const { register, control, formState: { errors } } = form;
  const [seoTitle, seoDescription, title, excerpt, slug, coverAlt] = useWatch({
    control,
    name: ['seo_title', 'seo_description', 'title', 'excerpt', 'slug', 'cover_image_alt'],
  });

  const slugField = register('slug');

  return (
    <div className="space-y-4">
      <Group title="Organisation">
        <Field id="article-slug" label="URL slug" error={errors.slug?.message} hint={`/articles/${slug || 'generated-from-title'}`}>
          <Input
            id="article-slug"
            {...slugField}
            onChange={(event) => {
              void slugField.onChange(event);
              onSlugEdited(event.target.value);
            }}
            aria-invalid={Boolean(errors.slug)}
            aria-describedby={describedBy('article-slug', true)}
            spellCheck={false}
          />
        </Field>

        <Field id="article-category" label="Category" error={errors.category_id?.message}>
          <NativeSelect id="article-category" {...register('category_id')}>
            <option value="">No category</option>
            {options.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <fieldset>
          <legend className="text-sm font-medium text-navy-900">Topics</legend>
          {options.topics.length === 0 ? (
            <p className="mt-1 text-sm text-muted">Create topics under Topics &amp; categories.</p>
          ) : (
            <div className="mt-2 grid gap-1.5">
              {options.topics.map((topic) => (
                <label key={topic.id} className="flex items-center gap-2 text-sm text-navy-900">
                  <input type="checkbox" value={topic.id} className="size-4 accent-teal-600" {...register('topic_ids')} />
                  {topic.name}
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <Field id="article-tags" label="Tags" hint="Press Enter or comma to add.">
          <Controller
            control={control}
            name="tags"
            render={({ field }) => (
              <TagInput
                id="article-tags"
                value={field.value}
                onChange={field.onChange}
                suggestions={options.tags}
                placeholder="e.g. Survival analysis"
                describedBy="article-tags-description"
              />
            )}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field id="article-language" label="Language">
            <NativeSelect id="article-language" {...register('language')}>
              <option value="en">English</option>
              <option value="pt">Português</option>
            </NativeSelect>
          </Field>
          <Field id="article-translation" label="Translation of">
            <NativeSelect id="article-translation" {...register('translation_of_article_id')}>
              <option value="">None</option>
              {options.articles.map((article) => (
                <option key={article.id} value={article.id}>
                  [{article.language.toUpperCase()}] {article.title || 'Untitled'}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <Controller
          control={control}
          name="featured"
          render={({ field }) => (
            <div className="flex items-start justify-between gap-3">
              <div>
                <label htmlFor="article-featured" className="text-sm font-medium text-navy-900">
                  Feature on the home page
                </label>
                <p className="text-xs text-muted">Replaces the currently featured article.</p>
              </div>
              <Switch id="article-featured" checked={field.value} onCheckedChange={field.onChange} />
            </div>
          )}
        />
      </Group>

      <Group title="Cover image">
        <Controller
          control={control}
          name="cover_image_path"
          render={({ field }) => (
            <ImageField
              id="article-cover"
              label="Cover"
              bucket="article"
              path={field.value}
              onPathChange={field.onChange}
              alt={coverAlt}
              onAltChange={(alt) => form.setValue('cover_image_alt', alt, { shouldDirty: true })}
            />
          )}
        />
      </Group>

      <Group title="Study discussed">
        <Field id="article-doi" label="DOI" error={errors.doi?.message} hint="For example 10.1056/NEJMoa2034577">
          <Input id="article-doi" {...register('doi')} aria-invalid={Boolean(errors.doi)} aria-describedby={describedBy('article-doi', true)} spellCheck={false} />
        </Field>
        <Field id="article-external" label="Link to the study" error={errors.external_url?.message}>
          <Input id="article-external" type="url" placeholder="https://" {...register('external_url')} aria-invalid={Boolean(errors.external_url)} aria-describedby={describedBy('article-external', Boolean(errors.external_url))} />
        </Field>
      </Group>

      <Group title="Search engines">
        <Field id="article-seo-title" label="SEO title" aside={<Counter value={seoTitle} max={70} />} hint="Leave empty to use the article title.">
          <Input id="article-seo-title" maxLength={120} {...register('seo_title')} aria-describedby={describedBy('article-seo-title', true)} />
        </Field>
        <Field id="article-seo-description" label="SEO description" aside={<Counter value={seoDescription} max={160} />} hint="Leave empty to use the summary.">
          <Textarea id="article-seo-description" rows={3} maxLength={320} {...register('seo_description')} aria-describedby={describedBy('article-seo-description', true)} />
        </Field>
        <div className="rounded-md bg-mist p-3" aria-label="Search result preview">
          <p className="truncate text-sm text-azure-700">{seoTitle || title || 'Article title'}</p>
          <p className="truncate text-xs text-success-700">/articles/{slug}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted">{seoDescription || excerpt || 'Summary shown in search results.'}</p>
        </div>
      </Group>
    </div>
  );
}
