import type { Metadata } from 'next';

import { PDF_UPLOAD } from '@/config/uploads';
import { AdminPage } from '@/features/admin/components/admin-page';
import { CvManager } from '@/features/profile/components/cv-manager';
import { ProfileForm, type ProfileFormValues } from '@/features/profile/components/profile-form';
import { requireAdminPage } from '@/lib/auth/session';
import { failQuery } from '@/services/errors';
import type { CertificationEntry, EducationEntry, ExperienceEntry, LanguageSkill, SkillGroup } from '@/types/content';

export const metadata: Metadata = { title: 'Profile & CV' };

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

export default async function ProfileAdminPage() {
  const session = await requireAdminPage('profile:write');
  const { data: profile, error } = await session.supabase.from('site_profile').select('*').eq('id', 1).maybeSingle();
  if (error) failQuery('admin.profile', error);

  let currentCv = null;
  if (profile?.cv_file_id) {
    const { data } = await session.supabase
      .from('article_files')
      .select('id, original_filename, size_bytes, created_at')
      .eq('id', profile.cv_file_id)
      .maybeSingle();
    currentCv = data;
  }

  const initial: ProfileFormValues = {
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
    <AdminPage title="Profile & CV" description="Public information about you. Changes go live immediately after saving.">
      <div className="space-y-6">
        <CvManager current={currentCv} maxBytes={PDF_UPLOAD.maxBytes} />
        <ProfileForm initial={initial} />
      </div>
    </AdminPage>
  );
}
