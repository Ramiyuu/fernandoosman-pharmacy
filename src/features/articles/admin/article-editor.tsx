'use client';

import type { JSONContent } from '@tiptap/core';
import { Archive, ArrowLeft, Eye, EyeOff, LoaderCircle, MoreHorizontal, Save, Send, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, type FieldPath } from 'react-hook-form';
import { toast } from 'sonner';

import { RichTextEditor } from '@/components/editor/rich-text-editor';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { describedBy, Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { StatusBadge } from '@/features/admin/components/admin-page';
import { useDebouncedEffect } from '@/hooks/use-debounced-effect';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';
import { EMPTY_DOC } from '@/lib/content/rich-text';
import type { EditorArticle, EditorOptions } from '@/services/admin/articles.admin';
import type { ContentStatus } from '@/types/database.types';
import { formatDate, formatDateTime } from '@/utils/format';
import { slugify } from '@/utils/slugify';

import { deleteArticleAction, saveArticleAction, setArticleStatusAction } from '../actions';

import { toArticleInput, toFormValues, type ArticleFormValues } from './article-form-values';
import { ArticleSettingsPanel } from './article-settings-panel';
import { AttachmentsPanel } from './attachments-panel';
import { ReferencesEditor } from './references-editor';

type SaveState = 'saved' | 'dirty' | 'saving' | 'error';

interface ArticleEditorProps {
  article: EditorArticle | null;
  options: EditorOptions;
  maxPdfBytes: number;
}

const AUTOSAVE_DELAY_MS = 2500;

function isEmptyDoc(content: JSONContent): boolean {
  return !content.content || content.content.every((node) => node.type === 'paragraph' && !node.content?.length);
}

export function ArticleEditor({ article, options, maxPdfBytes }: ArticleEditorProps) {
  const router = useRouter();
  const form = useForm<ArticleFormValues>({ defaultValues: toFormValues(article) });
  const { register, getValues, setValue, setError, clearErrors, formState } = form;

  const [articleId, setArticleId] = useState<string | null>(article?.id ?? null);
  const [status, setStatus] = useState<ContentStatus>(article?.status ?? 'draft');
  const [publishedAt, setPublishedAt] = useState<string | null>(article?.published_at ?? null);
  const [readingTime, setReadingTime] = useState(article?.reading_time ?? 1);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(article?.updated_at ?? null);
  const [version, setVersion] = useState(0);
  const [savedVersion, setSavedVersion] = useState(0);
  const [referenceCount, setReferenceCount] = useState(article?.references.length ?? 0);
  const [busy, setBusy] = useState<null | 'publish' | 'status' | 'trash'>(null);
  const [confirm, setConfirm] = useState<null | 'unpublish' | 'trash'>(null);

  const idRef = useRef(articleId);
  const contentRef = useRef<JSONContent>(article?.content ?? EMPTY_DOC);
  const versionRef = useRef(0);
  const savingRef = useRef(false);
  const queuedRef = useRef(false);
  const slugTouched = useRef(Boolean(article));
  const saveRef = useRef<(options: { autosave: boolean }) => Promise<boolean>>(async () => false);

  const bump = useCallback(() => {
    versionRef.current += 1;
    setVersion(versionRef.current);
  }, []);

  // Every form change bumps the version; the title drives the slug until the slug is edited by hand.
  useEffect(() => {
    return form.subscribe({
      formState: { values: true },
      callback: ({ values, name }) => {
        if (name === 'title' && !slugTouched.current) {
          setValue('slug', slugify(values.title ?? ''));
        }
        if (name === 'references' || name?.startsWith('references.')) {
          setReferenceCount(values.references?.length ?? 0);
        }
        bump();
      },
    });
  }, [form, setValue, bump]);

  const dirty = version !== savedVersion;
  useUnsavedChangesWarning(dirty || saveState === 'saving');

  const save = useCallback(
    async ({ autosave }: { autosave: boolean }): Promise<boolean> => {
      if (savingRef.current) {
        queuedRef.current = true;
        return false;
      }
      const values = getValues();
      if (!idRef.current && autosave && !values.title.trim() && isEmptyDoc(contentRef.current)) return false;

      savingRef.current = true;
      const startVersion = versionRef.current;
      setSaveState('saving');

      const result = await saveArticleAction(toArticleInput(values, idRef.current, contentRef.current), { autosave }).catch(() => null);
      savingRef.current = false;

      if (!result || !result.ok) {
        const message = result?.error ?? 'Could not reach the server. Your changes are still here; try again.';
        setSaveState('error');
        setSaveError(message);
        for (const [field, messages] of Object.entries(result?.fieldErrors ?? {})) {
          if (messages?.[0]) setError(field as FieldPath<ArticleFormValues>, { message: messages[0] });
        }
        if (!autosave || result?.code === 'UNAUTHENTICATED') toast.error(message);
        return false;
      }

      clearErrors();
      setSaveError(null);
      const saved = result.data;
      if (!idRef.current) {
        idRef.current = saved.id;
        setArticleId(saved.id);
        window.history.replaceState(null, '', `/admin/articles/${saved.id}`);
      }
      const changedDuringSave = versionRef.current !== startVersion;
      if (getValues('slug') !== saved.slug) {
        slugTouched.current = true;
        setValue('slug', saved.slug);
      }
      setSavedVersion(changedDuringSave ? startVersion : versionRef.current);
      setStatus(saved.status);
      setReadingTime(saved.reading_time);
      setLastSavedAt(saved.updated_at);
      setSaveState(changedDuringSave ? 'dirty' : 'saved');
      if (!autosave) toast.success(status === 'published' ? 'Changes are live.' : 'Draft saved.');

      if (queuedRef.current) {
        queuedRef.current = false;
        void saveRef.current({ autosave: true });
      }
      return true;
    },
    [getValues, setError, clearErrors, setValue, status],
  );

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  // Autosave drafts only; published content changes only on an explicit save.
  useDebouncedEffect(
    () => {
      if (dirty) void save({ autosave: true });
    },
    version,
    AUTOSAVE_DELAY_MS,
    status === 'draft' && dirty,
  );

  const changeStatus = async (next: ContentStatus) => {
    if (dirty || !idRef.current) {
      const saved = await save({ autosave: false });
      if (!saved || !idRef.current) return;
    }
    setBusy(next === 'published' ? 'publish' : 'status');
    const result = await setArticleStatusAction({ id: idRef.current, status: next }).catch(() => null);
    setBusy(null);
    if (!result || !result.ok) {
      toast.error(result?.error ?? 'Could not reach the server.');
      throw new Error('status change failed');
    }
    setStatus(next);
    if (next === 'published' && !publishedAt) setPublishedAt(new Date().toISOString());
    toast.success(result.message ?? 'Saved.');
  };

  const openPreview = async () => {
    const tab = window.open('', '_blank');
    if (dirty || !idRef.current) {
      const saved = await save({ autosave: false });
      if (!saved || !idRef.current) {
        tab?.close();
        return;
      }
    }
    if (tab) {
      tab.opener = null;
      tab.location.href = `/preview/articles/${idRef.current}`;
    }
  };

  const moveToTrash = async () => {
    if (!idRef.current) return;
    setBusy('trash');
    const result = await deleteArticleAction(idRef.current).catch(() => null);
    setBusy(null);
    if (!result || !result.ok) {
      toast.error(result?.error ?? 'Could not reach the server.');
      throw new Error('delete failed');
    }
    setSavedVersion(versionRef.current);
    toast.success('Moved to trash.');
    router.push('/admin/articles?view=trash');
  };

  const saveLabel = status === 'draft' ? 'Save draft' : 'Save changes';
  const stateText =
    saveState === 'saving'
      ? 'Saving…'
      : saveState === 'error'
        ? `Not saved: ${saveError ?? 'try again.'}`
        : dirty
          ? 'Unsaved changes'
          : lastSavedAt
            ? `Saved ${formatDateTime(lastSavedAt)}`
            : 'Not saved yet';

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save({ autosave: false });
      }}
      className="min-h-dvh"
      noValidate
    >
      <div className="sticky top-0 z-20 border-b border-rule bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[90rem] flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-10">
          <Link href="/admin/articles" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden="true" /> Articles
          </Link>
          <StatusBadge status={status} />
          <p className="text-xs text-muted" role="status" aria-live="polite">
            {saveState === 'saving' ? <LoaderCircle className="mr-1 inline size-3 animate-spin" aria-hidden="true" /> : null}
            {stateText}
            {status === 'draft' ? <span className="sr-only"> Drafts save automatically.</span> : null}
          </p>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => void openPreview()} disabled={saveState === 'saving'}>
              <Eye aria-hidden="true" /> Preview
            </Button>
            <Button type="submit" variant="secondary" size="sm" disabled={saveState === 'saving'}>
              <Save aria-hidden="true" /> {saveLabel}
            </Button>
            {status === 'published' ? (
              <Button size="sm" variant="secondary" onClick={() => setConfirm('unpublish')} disabled={busy !== null}>
                <EyeOff aria-hidden="true" /> Unpublish
              </Button>
            ) : (
              <Button size="sm" onClick={() => void changeStatus('published').catch(() => undefined)} disabled={busy !== null || saveState === 'saving'}>
                {busy === 'publish' ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />} Publish
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="More actions" disabled={!articleId}>
                  <MoreHorizontal aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {status !== 'archived' ? (
                  <DropdownMenuItem onSelect={() => void changeStatus('archived').catch(() => undefined)}>
                    <Archive aria-hidden="true" /> Archive
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={() => void changeStatus('draft').catch(() => undefined)}>
                    <Archive aria-hidden="true" /> Move to drafts
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem tone="danger" onSelect={() => setConfirm('trash')}>
                  <Trash2 aria-hidden="true" /> Move to trash
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[90rem] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-10">
        <div className="min-w-0 space-y-6">
          <div className="space-y-4 rounded-xl border border-rule bg-white p-5">
            <div>
              <label htmlFor="article-title" className="sr-only">
                Title
              </label>
              <Textarea
                id="article-title"
                rows={2}
                placeholder="Article title"
                maxLength={200}
                className="min-h-0 resize-none border-0 px-0 text-3xl leading-tight font-semibold tracking-tight focus-visible:outline-none"
                aria-invalid={Boolean(formState.errors.title)}
                {...register('title')}
              />
              {formState.errors.title ? <p className="text-sm text-danger-700">{formState.errors.title.message}</p> : null}
            </div>
            <Field id="article-subtitle" label="Subtitle" error={formState.errors.subtitle?.message}>
              <Input id="article-subtitle" maxLength={300} {...register('subtitle')} />
            </Field>
            <Field
              id="article-excerpt"
              label="Summary"
              hint="Shown on cards, in search results and social previews (at least 20 characters to publish)."
              error={formState.errors.excerpt?.message}
            >
              <Textarea id="article-excerpt" rows={3} maxLength={600} aria-describedby={describedBy('article-excerpt', true)} {...register('excerpt')} />
            </Field>
          </div>

          <RichTextEditor
            label="Article content"
            initialContent={article?.content ?? EMPTY_DOC}
            onChange={(content) => {
              contentRef.current = content;
              bump();
            }}
            imageBucket="article"
            referenceCount={referenceCount}
            placeholder="Write the article. Use Sections to insert the study review structure."
          />

          <ReferencesEditor control={form.control} register={register} errors={formState.errors.references} />

          {articleId ? (
            <AttachmentsPanel articleId={articleId} initialFiles={article?.files ?? []} maxBytes={maxPdfBytes} />
          ) : (
            <section className="rounded-xl border border-dashed border-rule-strong bg-white p-5 text-sm text-muted">
              Attachments become available once the draft is saved (add a title to start).
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border border-rule bg-white p-4 text-sm">
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-muted">Status</dt>
                <dd className="mt-1">
                  <StatusBadge status={status} />
                </dd>
              </div>
              <div>
                <dt className="text-muted">Reading time</dt>
                <dd className="mt-1 text-ink tabular">{readingTime} min</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted">First published</dt>
                <dd className="mt-1 text-ink">{publishedAt ? formatDate(publishedAt) : 'Not yet'}</dd>
              </div>
            </dl>
            {status === 'published' && articleId ? (
              <Link href={`/articles/${getValues('slug')}`} target="_blank" className="mt-3 inline-block text-azure-700 hover:underline">
                View on site
              </Link>
            ) : null}
          </section>
          <ArticleSettingsPanel
            form={form}
            options={options}
            onSlugEdited={(value) => {
              slugTouched.current = value.trim() !== '';
            }}
          />
        </aside>
      </div>

      <ConfirmDialog
        open={confirm === 'unpublish'}
        onOpenChange={(open) => setConfirm(open ? 'unpublish' : null)}
        title="Unpublish article?"
        description="The article will disappear from the public site and return to drafts."
        confirmLabel="Unpublish"
        tone="primary"
        onConfirm={() => changeStatus('draft')}
      />
      <ConfirmDialog
        open={confirm === 'trash'}
        onOpenChange={(open) => setConfirm(open ? 'trash' : null)}
        title="Move article to trash?"
        description="It will be removed from the public site immediately. You can restore it from the trash."
        confirmLabel="Move to trash"
        onConfirm={moveToTrash}
      />
    </form>
  );
}
