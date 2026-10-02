'use client';

import { LoaderCircle, Plus, Save, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Controller, useFieldArray, useForm, type FieldPath } from 'react-hook-form';
import { toast } from 'sonner';

import { ResourceUpload } from '@/features/files/components/resource-upload';
import { ImageField } from '@/components/forms/image-field';
import { TagInput } from '@/components/forms/tag-input';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';
import type { SiteProfileInput } from '@/schemas/profile.schema';

import { saveSiteProfileAction } from '../actions';
import { ProfilePreview } from './profile-preview';

type ProfileFormValues = Omit<
  SiteProfileInput,
  | 'current_semester'
  | 'total_semesters'
  | 'linkedin_url'
  | 'github_url'
  | 'lattes_url'
  | 'orcid_url'
  | 'professional_email'
> & {
  current_semester: string;
  total_semesters: string;
  linkedin_url: string;
  github_url: string;
  lattes_url: string;
  orcid_url: string;
  professional_email: string;
};

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-rule bg-white">
      <header className="border-b border-rule px-5 py-4">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {description ? <p className="text-sm text-muted">{description}</p> : null}
      </header>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

export function ProfileForm({ initial }: { initial: ProfileFormValues }) {
  const router = useRouter();
  const form = useForm<ProfileFormValues>({ defaultValues: initial });
  const { register, control, handleSubmit, setError, formState } = form;
  const { errors } = formState;
  const languages = useFieldArray({ control, name: 'languages' });
  const education = useFieldArray({ control, name: 'education' });
  const experience = useFieldArray({ control, name: 'experience' });
  const skills = useFieldArray({ control, name: 'skills' });
  const certifications = useFieldArray({ control, name: 'certifications' });

  useUnsavedChangesWarning(formState.isDirty && !formState.isSubmitting);

  const onSubmit = handleSubmit(async (values) => {
    const result = await saveSiteProfileAction(values).catch(() => null);
    if (!result || !result.ok) {
      for (const [field, messages] of Object.entries(result?.fieldErrors ?? {})) {
        if (messages?.[0]) setError(field as FieldPath<ProfileFormValues>, { message: messages[0] });
      }
      toast.error(result?.error ?? 'Could not reach the server.');
      return;
    }
    toast.success('Profile saved.');
    form.reset(values);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
      <div className="min-w-0 space-y-6">
        <Section
          title="Identity"
          description="Shown in the hero, profile card, About page and search results. Everything here, including a new photo, goes live when you click Save profile."
        >
          <div className="grid gap-6 md:grid-cols-[12rem_1fr]">
            <Controller
              control={control}
              name="photo_path"
              render={({ field }) => (
                <ImageField
                  id="profile-photo"
                  label="Profile photo"
                  bucket="profile"
                  path={field.value ?? null}
                  onPathChange={field.onChange}
                  aspect="portrait"
                />
              )}
            />
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="profile-name" label="Full name" required error={errors.full_name?.message}>
                  <Input id="profile-name" {...register('full_name')} />
                </Field>
                <Field id="profile-headline" label="Headline" error={errors.headline?.message}>
                  <Input id="profile-headline" placeholder="Pharmacy Student" {...register('headline')} />
                </Field>
              </div>
              <Field id="profile-focus" label="Focus areas" hint="Shown under the headline, e.g. Clinical Research.">
                <Controller
                  control={control}
                  name="focus_areas"
                  render={({ field }) => (
                    <TagInput id="profile-focus" value={field.value} onChange={field.onChange} max={6} maxLength={60} />
                  )}
                />
              </Field>
              <Field id="profile-short-bio" label="Short description" error={errors.short_bio?.message}>
                <Textarea id="profile-short-bio" rows={2} maxLength={400} {...register('short_bio')} />
              </Field>
            </div>
          </div>
          <Field
            id="profile-bio"
            label="Biography"
            hint="Shown on the About page. Separate paragraphs with a blank line."
            error={errors.bio?.message}
          >
            <Textarea id="profile-bio" rows={8} maxLength={6000} {...register('bio')} />
          </Field>
        </Section>

        <Section title="Academic focus">
          <Field id="graduation" label="Expected graduation">
            <Input id="graduation" {...register('expected_graduation')} />
          </Field>
          <Field id="website" label="Website">
            <Input id="website" type="url" {...register('website_url')} />
          </Field>
          <Field id="current-studies" label="Current studies">
            <Controller
              control={control}
              name="current_studies"
              render={({ field }) => (
                <TagInput
                  id="current-studies"
                  value={field.value ?? []}
                  onChange={field.onChange}
                  max={20}
                  maxLength={60}
                />
              )}
            />
          </Field>
          <Field id="scientific-interests" label="Scientific interests">
            <Controller
              control={control}
              name="scientific_interests"
              render={({ field }) => (
                <TagInput
                  id="scientific-interests"
                  value={field.value ?? []}
                  onChange={field.onChange}
                  max={20}
                  maxLength={60}
                />
              )}
            />
          </Field>
        </Section>
        <Section title="Studies and location">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field id="profile-course" label="Course">
              <Input id="profile-course" {...register('course')} />
            </Field>
            <Field id="profile-university" label="University">
              <Input id="profile-university" {...register('university')} />
            </Field>
            <Field
              id="profile-semester"
              label="Current semester (período)"
              hint="Shown as “Semester 6 of 10”."
              error={errors.current_semester?.message}
            >
              <Input id="profile-semester" type="number" min={1} max={20} {...register('current_semester')} />
            </Field>
            <Field
              id="profile-total"
              label="Total semesters"
              hint="Length of the course."
              error={errors.total_semesters?.message}
            >
              <Input id="profile-total" type="number" min={1} max={20} {...register('total_semesters')} />
            </Field>
          </div>
          <Field id="profile-location" label="General location" hint="Keep it general, e.g. a country or region.">
            <Input id="profile-location" {...register('location')} />
          </Field>
          <Field id="profile-interests" label="Areas of interest">
            <Controller
              control={control}
              name="interests"
              render={({ field }) => (
                <TagInput
                  id="profile-interests"
                  value={field.value}
                  onChange={field.onChange}
                  max={20}
                  maxLength={60}
                />
              )}
            />
          </Field>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-navy-900">Languages</legend>
            {languages.fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <Input
                  aria-label={`Language ${index + 1}`}
                  placeholder="Language"
                  {...register(`languages.${index}.name`)}
                />
                <Input
                  aria-label={`Level for language ${index + 1}`}
                  placeholder="Level (e.g. Advanced, C1)"
                  {...register(`languages.${index}.level`)}
                />
                <Button
                  variant="danger-ghost"
                  size="icon"
                  onClick={() => languages.remove(index)}
                  aria-label={`Remove language ${index + 1}`}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={() => languages.append({ name: '', level: '' })}>
              <Plus aria-hidden="true" /> Add language
            </Button>
          </fieldset>
        </Section>

        <Section title="Links and contact">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="profile-linkedin" label="LinkedIn" error={errors.linkedin_url?.message}>
              <Input
                id="profile-linkedin"
                type="url"
                placeholder="https://www.linkedin.com/in/…"
                {...register('linkedin_url')}
              />
            </Field>
            <Field id="profile-github" label="GitHub" error={errors.github_url?.message}>
              <Input id="profile-github" type="url" placeholder="https://github.com/…" {...register('github_url')} />
            </Field>
            <Field id="profile-lattes" label="Lattes CV" error={errors.lattes_url?.message}>
              <Input id="profile-lattes" type="url" placeholder="http://lattes.cnpq.br/…" {...register('lattes_url')} />
            </Field>
            <Field id="profile-orcid" label="ORCID" error={errors.orcid_url?.message}>
              <Input id="profile-orcid" type="url" placeholder="https://orcid.org/…" {...register('orcid_url')} />
            </Field>
          </div>
          <Field
            id="profile-email"
            label="Professional email"
            hint="Displayed publicly on the About and Contact pages."
            error={errors.professional_email?.message}
          >
            <Input id="profile-email" type="email" {...register('professional_email')} />
          </Field>
        </Section>

        <Section title="Education" description="Rendered on /cv.">
          {education.fields.map((field, index) => (
            <div key={field.id} className="grid gap-2 rounded-lg border border-rule p-3 sm:grid-cols-2">
              <Input
                aria-label="Institution"
                placeholder="Institution"
                {...register(`education.${index}.institution`)}
              />
              <Input aria-label="Degree" placeholder="Degree" {...register(`education.${index}.degree`)} />
              <Input aria-label="Start" placeholder="Start (e.g. 2023)" {...register(`education.${index}.start`)} />
              <Input aria-label="End" placeholder="End (e.g. Expected 2028)" {...register(`education.${index}.end`)} />
              <Textarea
                aria-label="Description"
                placeholder="Description"
                rows={2}
                className="sm:col-span-2"
                {...register(`education.${index}.description`)}
              />
              <Input
                aria-label="Field of study"
                placeholder="Field of study"
                {...register(`education.${index}.field`)}
              />
              <Input aria-label="Activities" placeholder="Activities" {...register(`education.${index}.activities`)} />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  defaultChecked={field.visible !== false}
                  {...register(`education.${index}.visible`)}
                />{' '}
                Public
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register(`education.${index}.current`)} /> Current
              </label>
              <label className="text-sm">
                Display order
                <Input type="number" min="0" {...register(`education.${index}.order`)} />
              </label>
              <Controller
                control={control}
                name={`education.${index}.logo`}
                render={({ field: logo }) => (
                  <ImageField
                    id={`education-logo-${index}`}
                    label="Logo"
                    bucket="profile"
                    path={logo.value ?? null}
                    onPathChange={logo.onChange}
                  />
                )}
              />
              <Button
                variant="danger-ghost"
                size="sm"
                className="justify-self-start"
                onClick={() => education.remove(index)}
              >
                <Trash2 aria-hidden="true" /> Remove
              </Button>
            </div>
          ))}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => education.append({ institution: '', degree: '', start: '', end: '', description: '' })}
          >
            <Plus aria-hidden="true" /> Add education
          </Button>
        </Section>

        <Section title="Experience" description="Internships, research, extension projects, jobs.">
          {experience.fields.map((field, index) => (
            <div key={field.id} className="grid gap-2 rounded-lg border border-rule p-3 sm:grid-cols-2">
              <Input
                aria-label="Organisation"
                placeholder="Organisation"
                {...register(`experience.${index}.organization`)}
              />
              <Input aria-label="Role" placeholder="Role" {...register(`experience.${index}.role`)} />
              <Input aria-label="Start" placeholder="Start" {...register(`experience.${index}.start`)} />
              <Input aria-label="End" placeholder="End" {...register(`experience.${index}.end`)} />
              <Textarea
                aria-label="Description"
                placeholder="Description"
                rows={2}
                className="sm:col-span-2"
                {...register(`experience.${index}.description`)}
              />
              <Input
                aria-label="Employment type"
                placeholder="Employment type"
                {...register(`experience.${index}.employment_type`)}
              />
              <Input aria-label="Location" placeholder="Location" {...register(`experience.${index}.location`)} />
              <Input aria-label="Skills" placeholder="Skills" {...register(`experience.${index}.skills`)} />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  defaultChecked={field.visible !== false}
                  {...register(`experience.${index}.visible`)}
                />{' '}
                Public
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register(`experience.${index}.current`)} /> Current
              </label>
              <label className="text-sm">
                Display order
                <Input type="number" min="0" {...register(`experience.${index}.order`)} />
              </label>
              <Controller
                control={control}
                name={`experience.${index}.logo`}
                render={({ field: logo }) => (
                  <ImageField
                    id={`experience-logo-${index}`}
                    label="Logo"
                    bucket="profile"
                    path={logo.value ?? null}
                    onPathChange={logo.onChange}
                  />
                )}
              />
              <Button
                variant="danger-ghost"
                size="sm"
                className="justify-self-start"
                onClick={() => experience.remove(index)}
              >
                <Trash2 aria-hidden="true" /> Remove
              </Button>
            </div>
          ))}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => experience.append({ organization: '', role: '', start: '', end: '', description: '' })}
          >
            <Plus aria-hidden="true" /> Add experience
          </Button>
        </Section>

        <Section title="Skills and certifications">
          {skills.fields.map((field, index) => (
            <div key={field.id} className="grid gap-2 rounded-lg border border-rule p-3 sm:grid-cols-[14rem_1fr_auto]">
              <Input aria-label="Skill group" placeholder="Group (e.g. Data)" {...register(`skills.${index}.group`)} />
              <Controller
                control={control}
                name={`skills.${index}.items`}
                render={({ field: itemsField }) => (
                  <TagInput
                    id={`skills-${index}`}
                    value={itemsField.value}
                    onChange={itemsField.onChange}
                    max={20}
                    maxLength={60}
                    placeholder="Add a skill"
                  />
                )}
              />
              <Button
                variant="danger-ghost"
                size="icon"
                onClick={() => skills.remove(index)}
                aria-label="Remove skill group"
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={() => skills.append({ group: '', items: [] })}>
            <Plus aria-hidden="true" /> Add skill group
          </Button>

          <div className="space-y-2 border-t border-rule pt-4">
            {certifications.fields.map((field, index) => (
              <div key={field.id} className="grid gap-3 rounded-lg border border-rule p-4 sm:grid-cols-2">
                <Input
                  aria-label="Certification"
                  placeholder="Certification"
                  {...register(`certifications.${index}.name`)}
                />
                <Input aria-label="Issuer" placeholder="Issuer" {...register(`certifications.${index}.issuer`)} />
                <Input aria-label="Year" placeholder="Year" {...register(`certifications.${index}.year`)} />
                <Input aria-label="URL" placeholder="https://" {...register(`certifications.${index}.url`)} />
                <Input
                  aria-label="Issue date"
                  placeholder="Issue date"
                  {...register(`certifications.${index}.issue_date`)}
                />
                <Input
                  aria-label="Expiration date"
                  placeholder="Expiration date"
                  {...register(`certifications.${index}.expiration_date`)}
                />
                <Input
                  aria-label="Credential ID"
                  placeholder="Credential ID"
                  {...register(`certifications.${index}.credential_id`)}
                />
                <Input
                  aria-label="Certificate description"
                  placeholder="Certificate description"
                  {...register(`certifications.${index}.description`)}
                />
                <Input
                  aria-label="Certificate skills"
                  placeholder="Certificate skills"
                  {...register(`certifications.${index}.skills`)}
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    defaultChecked={field.visible !== false}
                    {...register(`certifications.${index}.visible`)}
                  />{' '}
                  Public certificate
                </label>
                <Controller
                  control={control}
                  name={`certifications.${index}.image_path`}
                  render={({ field: img }) => (
                    <ImageField
                      id={`certificate-image-${index}`}
                      label="Certificate image"
                      bucket="profile"
                      path={img.value ?? null}
                      onPathChange={img.onChange}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name={`certifications.${index}.pdf_file_id`}
                  render={({ field: pdf }) => <ResourceUpload value={pdf.value ?? null} onChange={pdf.onChange} />}
                />
                <Button
                  variant="danger-ghost"
                  size="icon"
                  onClick={() => certifications.remove(index)}
                  aria-label="Remove certification"
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            ))}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => certifications.append({ name: '', issuer: '', year: '', url: '' })}
            >
              <Plus aria-hidden="true" /> Add certification
            </Button>
          </div>
        </Section>
      </div>

      <aside aria-labelledby="profile-preview-heading" className="space-y-3 xl:sticky xl:top-6">
        <div>
          <h2 id="profile-preview-heading" className="text-base font-semibold text-ink">
            Preview
          </h2>
          <p className="text-sm text-muted">How the home page shows your profile. Updates as you type.</p>
        </div>
        <ProfilePreview control={control} />
      </aside>

      <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-rule bg-mist/95 py-4 backdrop-blur xl:col-span-2">
        {formState.isDirty ? (
          <p className="text-sm font-medium text-warning-700">Unsaved changes: click Save profile to publish them</p>
        ) : null}
        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <Save aria-hidden="true" />
          )}{' '}
          Save profile
        </Button>
      </div>
    </form>
  );
}

export type { ProfileFormValues };
