'use server';

import { ok, type ActionResult } from '@/lib/action-result';
import { invalidInput } from '@/lib/validation';
import { guardAction } from '@/lib/auth/action-guard';
import { failFromDbError } from '@/lib/db-errors';
import { revalidatePublicContent } from '@/lib/revalidate';
import { siteProfileSchema, siteSettingsSchema, type SiteProfileInput, type SiteSettingsInput } from '@/schemas/profile.schema';
import { logActivity } from '@/services/activity-log.service';
import type { Json } from '@/types/database.types';

export async function saveSiteProfileAction(input: SiteProfileInput): Promise<ActionResult> {
  const guard = await guardAction('profile:write');
  if (!guard.ok) return guard;
  const { supabase, userId } = guard.session;

  const parsed = siteProfileSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const data = parsed.data;

  const { error } = await supabase
    .from('site_profile')
    .update({
      ...data,
      languages: data.languages as unknown as Json,
      education: data.education as unknown as Json,
      experience: data.experience as unknown as Json,
      skills: data.skills as unknown as Json,
      certifications: data.certifications as unknown as Json,
      updated_by: userId,
    })
    .eq('id', 1);
  if (error) return failFromDbError('site_profile.save', error);

  await logActivity(supabase, userId, { action: 'profile_updated', entityType: 'profile', summary: 'Updated public profile' });
  revalidatePublicContent();
  return ok(undefined, 'Profile saved.');
}

export async function saveSettingsAction(input: SiteSettingsInput): Promise<ActionResult> {
  const guard = await guardAction('settings:write');
  if (!guard.ok) return guard;
  const { supabase, userId } = guard.session;

  const parsed = siteSettingsSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const rows = (Object.entries(parsed.data) as Array<[string, unknown]>).map(([key, value]) => ({
    key,
    value: value as Json,
    is_public: true,
    updated_by: userId,
  }));
  const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' });
  if (error) return failFromDbError('settings.save', error);

  await logActivity(supabase, userId, { action: 'settings_updated', entityType: 'settings', summary: 'Updated site settings' });
  revalidatePublicContent();
  return ok(undefined, 'Settings saved.');
}

export async function removeCvAction(): Promise<ActionResult> {
  const guard = await guardAction('profile:write');
  if (!guard.ok) return guard;
  const { supabase, userId } = guard.session;

  const { error } = await supabase.from('site_profile').update({ cv_file_id: null, updated_by: userId }).eq('id', 1);
  if (error) return failFromDbError('site_profile.cv', error);
  await logActivity(supabase, userId, { action: 'cv_updated', entityType: 'profile', summary: 'Unpublished CV PDF' });
  revalidatePublicContent();
  return ok(undefined, 'The CV PDF is no longer public. The file is still listed under Files.');
}
