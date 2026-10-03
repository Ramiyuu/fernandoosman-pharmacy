import type { Locale } from '@/i18n/config';
import { dictionaryFor } from '@/i18n/dictionaries';
import { getI18n } from '@/i18n/server';
import type { SiteProfile } from '@/types/content';

import { ProfileCardView } from './profile-card-view';

export function semesterLabel(
  profile: Pick<SiteProfile, 'current_semester' | 'total_semesters'>,
  locale: Locale = 'en',
): string | null {
  if (!profile.current_semester) return null;
  return dictionaryFor(locale).profile.semester(profile.current_semester, profile.total_semesters);
}

export async function ProfileCard({ profile }: { profile: SiteProfile }) {
  const { locale, t, href } = await getI18n();
  return (
    <ProfileCardView
      profile={profile}
      cvHref={href('/cv')}
      copy={{
        ...t.profile,
        portrait: t.about.portrait(profile.full_name),
        semester: semesterLabel(profile, locale),
      }}
    />
  );
}
