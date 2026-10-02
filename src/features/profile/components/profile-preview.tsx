'use client';

import { useWatch, type Control } from 'react-hook-form';

import { Tagline, Wordmark } from '@/components/brand/brand';
import type { SiteProfile } from '@/types/content';

import { ProfileCard } from './profile-card';
import type { ProfileFormValues } from './profile-form';

const toSemester = (value: string) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 20 ? parsed : null;
};

/**
 * Live preview of how the profile appears on the home page, updated as the
 * form changes (before saving). Uses the same components as the public site.
 */
export function ProfilePreview({ control }: { control: Control<ProfileFormValues> }) {
  const values = useWatch({ control }) as ProfileFormValues;

  const profile: SiteProfile = {
    full_name: values.full_name || 'Your name',
    headline: values.headline ?? '',
    focus_areas: (values.focus_areas ?? []).filter(Boolean),
    short_bio: values.short_bio ?? '',
    bio: values.bio ?? '',
    photo_path: values.photo_path ?? null,
    course: values.course ?? '',
    university: values.university ?? '',
    current_semester: toSemester(values.current_semester ?? ''),
    total_semesters: toSemester(values.total_semesters ?? ''),
    location: values.location ?? '',
    languages: (values.languages ?? []).filter((language) => language?.name),
    interests: (values.interests ?? []).filter(Boolean),
    linkedin_url: values.linkedin_url || null,
    github_url: values.github_url || null,
    lattes_url: values.lattes_url || null,
    orcid_url: values.orcid_url || null,
    professional_email: values.professional_email || null,
    cv_file_id: null,
    education: [],
    experience: [],
    skills: [],
    certifications: [],
    updated_at: new Date(0).toISOString(),
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-rule bg-white p-5">
        <Wordmark name={profile.full_name} className="text-lg leading-snug tracking-[0.1em]" />
        <span className="brand-gradient mt-3 block h-[2px] w-12 rounded-full" aria-hidden="true" />
        <Tagline items={profile.focus_areas} className="mt-3 text-xs font-light" />
        {profile.headline ? <p className="mt-3 text-sm font-semibold text-navy-900">{profile.headline}</p> : null}
      </div>
      <ProfileCard profile={profile} />
    </div>
  );
}
