'use client';

import { LoaderCircle, Save } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { TagInput } from '@/components/forms/tag-input';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { saveSettingsAction } from '@/features/profile/actions';
import type { SiteSettings } from '@/types/content';

export function SettingsForm({ initial }: { initial: SiteSettings }) {
  const form = useForm<SiteSettings>({ defaultValues: initial });
  const { register, control, handleSubmit, formState } = form;

  const onSubmit = handleSubmit(async (values) => {
    const result = await saveSettingsAction(values).catch(() => null);
    if (!result || !result.ok) {
      toast.error(result?.error ?? 'Could not reach the server.');
      return;
    }
    toast.success('Settings saved.');
    form.reset(values);
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-xl border border-rule bg-white p-5">
      <h2 className="text-base font-semibold text-ink">Site</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="settings-name" label="Site name" required>
          <Input id="settings-name" maxLength={80} {...register('site.name')} />
        </Field>
        <Field id="settings-tagline" label="Tagline" hint="Shown in the footer.">
          <Input id="settings-tagline" maxLength={200} {...register('site.tagline')} />
        </Field>
      </div>
      <Field id="settings-description" label="Default description" hint="Used for the home page and share previews.">
        <Textarea id="settings-description" rows={3} maxLength={320} {...register('site.description')} />
      </Field>
      <Field id="settings-keywords" label="Keywords">
        <Controller control={control} name="site.keywords" render={({ field }) => <TagInput id="settings-keywords" value={field.value} onChange={field.onChange} max={20} maxLength={60} />} />
      </Field>
      <Field id="settings-contact" label="Contact page introduction">
        <Textarea id="settings-contact" rows={3} maxLength={600} {...register('contact.intro')} />
      </Field>

      <h2 className="border-t border-rule pt-4 text-base font-semibold text-ink">Portuguese version</h2>
      <p className="-mt-2 text-sm text-muted">Shown on the Portuguese site (/pt). Empty fields use the English text.</p>
      <div className="grid gap-4 sm:grid-cols-2" lang="pt-BR">
        <Field id="settings-tagline-pt" label="Tagline (PT)">
          <Input id="settings-tagline-pt" maxLength={200} {...register('site.tagline_pt')} />
        </Field>
        <Field id="settings-description-pt" label="Default description (PT)">
          <Textarea id="settings-description-pt" rows={3} maxLength={320} {...register('site.description_pt')} />
        </Field>
      </div>
      <Field id="settings-contact-pt" label="Contact page introduction (PT)">
        <Textarea id="settings-contact-pt" lang="pt-BR" rows={3} maxLength={600} {...register('contact.intro_pt')} />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={formState.isSubmitting || !formState.isDirty}>
          {formState.isSubmitting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />} Save settings
        </Button>
      </div>
    </form>
  );
}
