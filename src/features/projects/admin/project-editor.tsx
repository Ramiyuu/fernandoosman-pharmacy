'use client';

import type { JSONContent } from '@tiptap/core';
import { ArrowLeft, ImagePlus, LoaderCircle, Plus, Save, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch, type FieldPath } from 'react-hook-form';
import { toast } from 'sonner';

import { RichTextEditor } from '@/components/editor/rich-text-editor';
import { ImageField } from '@/components/forms/image-field';
import { TagInput } from '@/components/forms/tag-input';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Field } from '@/components/ui/field';
import { Input, NativeSelect, Textarea } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ACCEPTED_IMAGE_TYPES, uploadImage } from '@/features/files/client/upload-image';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';
import { EMPTY_DOC } from '@/lib/content/rich-text';
import { publicImageUrl } from '@/lib/storage/public-url';
import type { ProjectInput } from '@/schemas/project.schema';
import type { EditorProject } from '@/services/admin/projects.admin';

import { deleteProjectAction, saveProjectAction } from '../actions';

type ProjectFormValues = Omit<ProjectInput, 'id' | 'content' | 'started_on' | 'completed_on' | 'repository_url' | 'live_url' | 'sort_order'> & {
  started_on: string;
  completed_on: string;
  repository_url: string;
  live_url: string;
  sort_order: number;
};

function toFormValues(project: EditorProject | null): ProjectFormValues {
  return {
    title: project?.title ?? '',
    slug: project?.slug ?? '',
    summary: project?.summary ?? '',
    status: project?.status ?? 'draft',
    progress: project?.progress ?? 'in_progress',
    cover_image_path: project?.cover_image_path ?? null,
    cover_image_alt: project?.cover_image_alt ?? '',
    gallery: project?.gallery ?? [],
    repository_url: project?.repository_url ?? '',
    live_url: project?.live_url ?? '',
    links: project?.links ?? [],
    technologies: project?.technologies ?? [],
    tags: project?.tags ?? [],
    started_on: project?.started_on ?? '',
    completed_on: project?.completed_on ?? '',
    featured: project?.featured ?? false,
    sort_order: project?.sort_order ?? 0,
  };
}

export function ProjectEditor({ project, tagSuggestions }: { project: EditorProject | null; tagSuggestions: string[] }) {
  const router = useRouter();
  const form = useForm<ProjectFormValues>({ defaultValues: toFormValues(project) });
  const { register, control, handleSubmit, setError, formState } = form;
  const links = useFieldArray({ control, name: 'links' });
  const coverAlt = useWatch({ control, name: 'cover_image_alt' });
  const gallery = useFieldArray({ control, name: 'gallery' });
  const contentRef = useRef<JSONContent>(project?.content ?? EMPTY_DOC);
  const [contentDirty, setContentDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const galleryInput = useRef<HTMLInputElement>(null);

  useUnsavedChangesWarning((formState.isDirty || contentDirty) && !saving);

  const submitValues = async (values: ProjectFormValues) => {
    setSaving(true);
    const result = await saveProjectAction({ ...values, id: project?.id ?? null, content: contentRef.current }).catch(() => null);
    setSaving(false);
    if (!result || !result.ok) {
      for (const [field, messages] of Object.entries(result?.fieldErrors ?? {})) {
        if (messages?.[0]) setError(field as FieldPath<ProjectFormValues>, { message: messages[0] });
      }
      toast.error(result?.error ?? 'Could not reach the server.');
      return;
    }
    toast.success(result.message ?? 'Saved.');
    form.reset(values);
    setContentDirty(false);
    if (!project) router.replace(`/admin/projects/${result.data.id}`);
    else router.refresh();
  };

  const addGalleryImage = async (file: File) => {
    setGalleryUploading(true);
    try {
      const uploaded = await uploadImage(file, 'project');
      gallery.append({ path: uploaded.path, alt: '' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setGalleryUploading(false);
    }
  };

  const errors = formState.errors;

  return (
    <form onSubmit={(event) => void handleSubmit(submitValues)(event)} noValidate>
      <div className="sticky top-0 z-20 border-b border-rule bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[90rem] flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-10">
          <Link href="/admin/projects" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden="true" /> Projects
          </Link>
          <p className="text-xs text-muted" role="status">
            {formState.isDirty || contentDirty ? 'Unsaved changes' : project ? 'All changes saved' : 'New project'}
          </p>
          <div className="ml-auto flex gap-2">
            {project ? (
              <Button variant="danger-ghost" size="sm" onClick={() => setConfirmDelete(true)}>
                <Trash2 aria-hidden="true" /> Delete
              </Button>
            ) : null}
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
              {project ? 'Save project' : 'Create project'}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[90rem] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-10">
        <div className="min-w-0 space-y-6">
          <div className="space-y-4 rounded-xl border border-rule bg-white p-5">
            <Field id="project-title" label="Title" required error={errors.title?.message}>
              <Input id="project-title" maxLength={200} aria-invalid={Boolean(errors.title)} {...register('title')} />
            </Field>
            <Field id="project-summary" label="Description" hint="Shown on cards and as the page introduction." error={errors.summary?.message}>
              <Textarea id="project-summary" rows={3} maxLength={600} {...register('summary')} />
            </Field>
          </div>

          <RichTextEditor
            label="Project details"
            initialContent={project?.content ?? EMPTY_DOC}
            onChange={(content) => {
              contentRef.current = content;
              setContentDirty(true);
            }}
            imageBucket="project"
            placeholder="Goal, data, methods, results and what you learned."
          />

          <section className="space-y-4 rounded-xl border border-rule bg-white p-5" aria-labelledby="gallery-heading">
            <div className="flex items-center justify-between">
              <h2 id="gallery-heading" className="text-base font-semibold text-ink">
                Gallery
              </h2>
              <Button variant="secondary" size="sm" disabled={galleryUploading || gallery.fields.length >= 12} onClick={() => galleryInput.current?.click()}>
                {galleryUploading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <ImagePlus aria-hidden="true" />} Add image
              </Button>
              <input
                ref={galleryInput}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file) void addGalleryImage(file);
                }}
              />
            </div>
            {gallery.fields.length === 0 ? <p className="text-sm text-muted">No gallery images.</p> : null}
            <ul className="grid gap-4 sm:grid-cols-2">
              {gallery.fields.map((field, index) => {
                const src = publicImageUrl('project-images', field.path);
                return (
                  <li key={field.id} className="space-y-2">
                    <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-rule bg-mist">
                      {src ? <Image src={src} alt="" fill sizes="300px" className="object-cover" /> : null}
                    </div>
                    <div className="flex gap-2">
                      <Input aria-label={`Alternative text for image ${index + 1}`} placeholder="Alternative text" {...register(`gallery.${index}.alt`)} />
                      <Button variant="danger-ghost" size="icon" onClick={() => gallery.remove(index)} aria-label={`Remove image ${index + 1}`}>
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="space-y-4 rounded-xl border border-rule bg-white p-4">
            <div className="grid grid-cols-2 gap-3">
              <Field id="project-status" label="Visibility">
                <NativeSelect id="project-status" {...register('status')}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </NativeSelect>
              </Field>
              <Field id="project-progress" label="Status">
                <NativeSelect id="project-progress" {...register('progress')}>
                  <option value="planned">Planned</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                </NativeSelect>
              </Field>
              <Field id="project-start" label="Started">
                <Input id="project-start" type="date" {...register('started_on')} />
              </Field>
              <Field id="project-end" label="Completed" error={errors.completed_on?.message}>
                <Input id="project-end" type="date" {...register('completed_on')} />
              </Field>
            </div>
            <Field id="project-slug" label="URL slug" hint="Leave empty to generate from the title." error={errors.slug?.message}>
              <Input id="project-slug" spellCheck={false} {...register('slug')} />
            </Field>
            <div className="grid grid-cols-2 items-end gap-3">
              <Field id="project-order" label="Sort order">
                <Input id="project-order" type="number" {...register('sort_order', { valueAsNumber: true })} />
              </Field>
              <Controller
                control={control}
                name="featured"
                render={({ field }) => (
                  <label className="flex h-10 items-center gap-2 text-sm text-navy-900">
                    <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Featured project" /> Featured
                  </label>
                )}
              />
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-rule bg-white p-4">
            <Field id="project-tech" label="Technologies">
              <Controller control={control} name="technologies" render={({ field }) => <TagInput id="project-tech" value={field.value} onChange={field.onChange} max={20} maxLength={40} placeholder="e.g. Python" />} />
            </Field>
            <Field id="project-tags" label="Tags">
              <Controller control={control} name="tags" render={({ field }) => <TagInput id="project-tags" value={field.value} onChange={field.onChange} suggestions={tagSuggestions} />} />
            </Field>
          </section>

          <section className="space-y-4 rounded-xl border border-rule bg-white p-4">
            <Controller
              control={control}
              name="cover_image_path"
              render={({ field }) => (
                <ImageField
                  id="project-cover"
                  label="Cover image"
                  bucket="project"
                  path={field.value ?? null}
                  onPathChange={field.onChange}
                  alt={coverAlt}
                  onAltChange={(alt) => form.setValue('cover_image_alt', alt, { shouldDirty: true })}
                />
              )}
            />
          </section>

          <section className="space-y-4 rounded-xl border border-rule bg-white p-4">
            <Field id="project-repo" label="Repository URL" error={errors.repository_url?.message}>
              <Input id="project-repo" type="url" placeholder="https://github.com/…" {...register('repository_url')} />
            </Field>
            <Field id="project-live" label="Live URL" error={errors.live_url?.message}>
              <Input id="project-live" type="url" placeholder="https://" {...register('live_url')} />
            </Field>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-navy-900">Other links</legend>
              {links.fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-[1fr_auto] gap-2">
                  <div className="space-y-1.5">
                    <Input aria-label={`Label for link ${index + 1}`} placeholder="Label" {...register(`links.${index}.label`)} />
                    <Input aria-label={`URL for link ${index + 1}`} placeholder="https://" {...register(`links.${index}.url`)} />
                  </div>
                  <Button variant="danger-ghost" size="icon" onClick={() => links.remove(index)} aria-label={`Remove link ${index + 1}`}>
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              ))}
              {errors.links ? <p className="text-sm text-danger-700">Check the links: each needs a label and a full URL.</p> : null}
              <Button variant="secondary" size="sm" onClick={() => links.append({ label: '', url: '' })} disabled={links.fields.length >= 10}>
                <Plus aria-hidden="true" /> Add link
              </Button>
            </fieldset>
          </section>
        </aside>
      </div>

      {project ? (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete project?"
          description={<>This action cannot be undone. “{project.title}” will be removed from the site.</>}
          confirmLabel="Delete project"
          onConfirm={async () => {
            const result = await deleteProjectAction(project.id);
            if (!result.ok) {
              toast.error(result.error);
              throw new Error(result.error);
            }
            toast.success('Project deleted.');
            form.reset(form.getValues());
            router.push('/admin/projects');
          }}
        />
      ) : null}
    </form>
  );
}
