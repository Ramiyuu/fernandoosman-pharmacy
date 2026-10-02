import type { Metadata } from 'next';

import { PDF_UPLOAD } from '@/config/uploads';
import { AdminPage } from '@/features/admin/components/admin-page';
import { CvManager } from '@/features/profile/components/cv-manager';
import { ProfileForm, type ProfileFormValues } from '@/features/profile/components/profile-form';
import { requireAdminPage } from '@/lib/auth/session';
import { sql } from '@/lib/db/sql';
import { failQuery } from '@/services/errors';
import type { CertificationEntry, EducationEntry, ExperienceEntry, LanguageSkill, SkillGroup } from '@/types/content';
import type { SiteProfileRow } from '@/types/database.types';

export const metadata: Metadata = { title: 'Profile & CV' };

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

export default async function ProfileAdminPage() {
  const session = await requireAdminPage('profile:write');
  let profile: SiteProfileRow | null;
  let currentCv: { id: string; original_filename: string; size_bytes: number; created_at: string } | null = null;
  try {
    profile = await session.db.maybeOne<SiteProfileRow>(sql`select * from public.site_profile where id = 1`);
    if (profile?.cv_file_id) {
      currentCv = await session.db.maybeOne(sql`
        select id, original_filename, size_bytes, created_at from public.article_files where id = ${profile.cv_file_id}`);
    }
  } catch (error) {
    failQuery('admin.profile', error);
  }

  const initial: ProfileFormValues = {
    expected_graduation: profile?.expected_graduation ?? '',
    current_studies: profile?.current_studies ?? [],
    scientific_interests: profile?.scientific_interests ?? [],
    website_url: profile?.website_url ?? '',
    full_name: profile?.full_name ?? '',
    headline: profile?.headline ?? '',
    focus_areas: profile?.focus_areas ?? [],
    short_bio: profile?.short_bio ?? '',
    bio: profile?.bio ?? '',
    photo_path: profile?.photo_path ?? null,
    course: profile?.course ?? '',
    university: profile?.university ?? '',
    current_semester: profile?.current_semester ? String(profile.current_semester) : '',
    total_semesters: profile?.total_semesters ? String(profile.total_semesters) : '',
    location: profile?.location ?? '',
    languages: asArray<LanguageSkill>(profile?.languages),
    interests: profile?.interests ?? [],
    linkedin_url: profile?.linkedin_url ?? '',
    github_url: profile?.github_url ?? '',
    lattes_url: profile?.lattes_url ?? '',
    orcid_url: profile?.orcid_url ?? '',
    professional_email: profile?.professional_email ?? '',
    education: asArray<EducationEntry>(profile?.education),
    experience: asArray<ExperienceEntry>(profile?.experience),
    skills: asArray<SkillGroup>(profile?.skills),
    certifications: asArray<CertificationEntry>(profile?.certifications),
  };

  return (
    <AdminPage
      wide
      title="Profile & CV"
      description="Your photo, name, semester, links and CV as visitors see them. Changes go live as soon as you save."
    >
      <div className="space-y-6">
        <ProfileForm initial={initial} />
        <CvManager current={currentCv} maxBytes={PDF_UPLOAD.maxBytes} />
      </div>
    </AdminPage>
  );
}
