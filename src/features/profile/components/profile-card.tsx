import { FileText, GraduationCap, Languages, MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { LinkedInIcon } from '@/components/icons/brand-icons';
import { buttonVariants } from '@/components/ui/button';
import { publicImageUrl } from '@/lib/storage/public-url';
import type { SiteProfile } from '@/types/content';
import { safeExternalUrl } from '@/utils/url';

export function semesterLabel(profile: Pick<SiteProfile, 'current_semester' | 'total_semesters'>): string | null {
  if (!profile.current_semester) return null;
  return profile.total_semesters
    ? `Semester ${profile.current_semester} of ${profile.total_semesters}`
    : `Semester ${profile.current_semester}`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function ProfileCard({ profile }: { profile: SiteProfile }) {
  const photo = publicImageUrl('profile-images', profile.photo_path);
  const linkedin = safeExternalUrl(profile.linkedin_url);
  const semester = semesterLabel(profile);
  const studyLine = [profile.course, profile.university].filter(Boolean).join(', ');

  return (
    <aside aria-label="Profile summary" className="rounded-xl border border-rule bg-mist p-6">
      <div className="flex items-center gap-4">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-navy-900">
          {photo ? (
            <Image src={photo} alt={`Portrait of ${profile.full_name}`} fill sizes="80px" className="object-cover" priority />
          ) : (
            <span className="flex size-full items-center justify-center text-2xl font-semibold text-teal-200" aria-hidden="true">
              {initials(profile.full_name)}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold text-ink">{profile.full_name}</p>
          <p className="text-sm text-muted">{profile.headline}</p>
        </div>
      </div>

      <dl className="mt-6 space-y-3 text-sm">
        {studyLine || semester ? (
          <div className="flex gap-3">
            <dt className="sr-only">Studies</dt>
            <GraduationCap className="mt-0.5 size-4 shrink-0 text-teal-600" aria-hidden="true" />
            <dd className="text-navy-900">
              {studyLine}
              {semester ? <span className="block text-muted">{semester}</span> : null}
            </dd>
          </div>
        ) : null}
        {profile.languages.length > 0 ? (
          <div className="flex gap-3">
            <dt className="sr-only">Languages</dt>
            <Languages className="mt-0.5 size-4 shrink-0 text-teal-600" aria-hidden="true" />
            <dd className="text-navy-900">
              {profile.languages.map((language) => `${language.name}${language.level ? ` (${language.level})` : ''}`).join(', ')}
            </dd>
          </div>
        ) : null}
        {profile.location ? (
          <div className="flex gap-3">
            <dt className="sr-only">Location</dt>
            <MapPin className="mt-0.5 size-4 shrink-0 text-teal-600" aria-hidden="true" />
            <dd className="text-navy-900">{profile.location}</dd>
          </div>
        ) : null}
      </dl>

      {profile.interests.length > 0 ? (
        <div className="mt-6">
          <p className="text-sm font-medium text-ink">Professional interests</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {profile.interests.map((interest) => (
              <li key={interest} className="rounded-sm bg-white px-2 py-1 text-xs text-navy-800 ring-1 ring-rule ring-inset">
                {interest}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2 border-t border-rule pt-5">
        {linkedin ? (
          <a href={linkedin} target="_blank" rel="noopener noreferrer me" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
            <LinkedInIcon className="size-3.5 text-azure-700" /> LinkedIn
          </a>
        ) : null}
        <Link href="/cv" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
          <FileText aria-hidden="true" /> Curriculum vitae
        </Link>
      </div>
    </aside>
  );
}
