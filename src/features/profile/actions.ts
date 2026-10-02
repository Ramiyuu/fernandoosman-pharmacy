'use server';

import { ok, type ActionResult } from '@/lib/action-result';
import { guardAction } from '@/lib/auth/action-guard';
import { sql } from '@/lib/db/sql';
import { failFromDbError } from '@/lib/db-errors';
import { revalidatePublicContent } from '@/lib/revalidate';
import { invalidInput } from '@/lib/validation';
import {
  siteProfileSchema,
  siteSettingsSchema,
  type SiteProfileInput,
  type SiteSettingsInput,
} from '@/schemas/profile.schema';
import { logActivity } from '@/services/activity-log.service';

export async function saveSiteProfileAction(input: SiteProfileInput): Promise<ActionResult> {
  const guard = await guardAction('profile:write');
  if (!guard.ok) return guard;
  const { db, userId } = guard.session;

  const parsed = siteProfileSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const data = parsed.data;
  const json = (value: unknown) => JSON.stringify(value);

  try {
    await db.execute(sql`
      update public.site_profile set
        expected_graduation = ${data.expected_graduation},
        current_studies = ${data.current_studies}::text[],
        scientific_interests = ${data.scientific_interests}::text[],
        website_url = ${data.website_url ?? null},
        full_name = ${data.full_name},
        headline = ${data.headline},
        focus_areas = ${data.focus_areas}::text[],
        short_bio = ${data.short_bio},
        bio = ${data.bio},
        photo_path = ${data.photo_path},
        course = ${data.course},
        university = ${data.university},
        current_semester = ${data.current_semester}::integer,
        total_semesters = ${data.total_semesters}::integer,
        location = ${data.location},
        languages = ${json(data.languages)}::jsonb,
        interests = ${data.interests}::text[],
        linkedin_url = ${data.linkedin_url},
        github_url = ${data.github_url},
        lattes_url = ${data.lattes_url},
        orcid_url = ${data.orcid_url},
        professional_email = ${data.professional_email},
        education = ${json(data.education)}::jsonb,
        experience = ${json(data.experience)}::jsonb,
        skills = ${json(data.skills)}::jsonb,
        certifications = ${json(data.certifications)}::jsonb,
        updated_by = ${userId}
      where id = 1`);
  } catch (error) {
    return failFromDbError('site_profile.save', error);
  }

  await logActivity(db, userId, {
    action: 'profile_updated',
    entityType: 'profile',
    summary: 'Updated public profile',
  });
  revalidatePublicContent();
  return ok(undefined, 'Profile saved.');
}

export async function saveSettingsAction(input: SiteSettingsInput): Promise<ActionResult> {
  const guard = await guardAction('settings:write');
  if (!guard.ok) return guard;
  const { db, userId } = guard.session;

  const parsed = siteSettingsSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  try {
    await db.transaction(async (tx) => {
      for (const [key, value] of Object.entries(parsed.data)) {
        await tx.execute(sql`
          insert into public.settings (key, value, is_public, updated_by)
          values (${key}, ${JSON.stringify(value)}::jsonb, true, ${userId})
          on conflict (key) do update set value = excluded.value, is_public = true, updated_by = excluded.updated_by`);
      }
    });
  } catch (error) {
    return failFromDbError('settings.save', error);
  }

  await logActivity(db, userId, {
    action: 'settings_updated',
    entityType: 'settings',
    summary: 'Updated site settings',
  });
  revalidatePublicContent();
  return ok(undefined, 'Settings saved.');
}

export async function removeCvAction(): Promise<ActionResult> {
  const guard = await guardAction('profile:write');
  if (!guard.ok) return guard;
  const { db, userId } = guard.session;

  try {
    await db.execute(sql`update public.site_profile set cv_file_id = null, updated_by = ${userId} where id = 1`);
  } catch (error) {
    return failFromDbError('site_profile.cv', error);
  }
  await logActivity(db, userId, { action: 'cv_updated', entityType: 'profile', summary: 'Unpublished CV PDF' });
  revalidatePublicContent();
  return ok(undefined, 'The CV PDF is no longer public. The file is still listed under Files.');
}
