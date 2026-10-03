import { Mail } from 'lucide-react';
import Link from 'next/link';

import { LogoMark, Motto, Tagline, Wordmark } from '@/components/brand/brand';
import { GitHubIcon, LinkedInIcon } from '@/components/icons/brand-icons';
import { PUBLIC_NAV } from '@/config/site';
import { getI18n } from '@/i18n/server';
import type { SiteProfile } from '@/types/content';
import { safeExternalUrl } from '@/utils/url';

import { Container } from './container';

export async function SiteFooter({
  siteName,
  tagline,
  profile,
}: {
  siteName: string;
  tagline: string;
  profile: SiteProfile | null;
}) {
  const { t, href } = await getI18n();
  const linkedin = safeExternalUrl(profile?.linkedin_url);
  const github = safeExternalUrl(profile?.github_url);
  const email = profile?.professional_email;
  const year = new Date().getUTCFullYear();

  return (
    <footer className="mt-24 border-t border-rule bg-mist">
      <Container className="grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm">
          <div className="flex items-center gap-3">
            <LogoMark height={30} />
            <Wordmark name={siteName} className="text-[0.8125rem]" />
          </div>
          {profile?.focus_areas.length ? (
            <Tagline items={profile.focus_areas} className="mt-4 text-sm leading-relaxed font-light" />
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-muted">{tagline}</p>
          )}
        </div>
        <nav aria-label={t.footer.footerNav}>
          <p className="text-sm font-medium text-ink">{t.footer.explore}</p>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {PUBLIC_NAV.map((item) => (
              <li key={item.href}>
                <Link href={href(item.href)} className="text-muted hover:text-ink">
                  {t.nav[item.key]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="text-sm font-medium text-ink">{t.footer.connect}</p>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {linkedin ? (
              <li>
                <a href={linkedin} target="_blank" rel="noopener noreferrer me" className="inline-flex items-center gap-2 text-muted hover:text-ink">
                  <LinkedInIcon className="size-4" /> LinkedIn
                </a>
              </li>
            ) : null}
            {github ? (
              <li>
                <a href={github} target="_blank" rel="noopener noreferrer me" className="inline-flex items-center gap-2 text-muted hover:text-ink">
                  <GitHubIcon className="size-4" /> GitHub
                </a>
              </li>
            ) : null}
            {email ? (
              <li>
                <a href={`mailto:${email}`} className="inline-flex items-center gap-2 text-muted hover:text-ink">
                  <Mail className="size-4" aria-hidden="true" /> {email}
                </a>
              </li>
            ) : null}
            <li>
              <Link href={href('/contact')} className="text-muted hover:text-ink">
                {t.footer.contactForm}
              </Link>
            </li>
          </ul>
        </div>
      </Container>
      <Container className="pb-2">
        <Motto />
      </Container>
      <Container className="flex flex-wrap justify-between gap-x-6 gap-y-2 py-6 text-xs text-muted">
        <p>{t.footer.disclaimer(year, siteName)}</p>
        <Link href={href('/privacy')} className="hover:text-ink">
          {t.footer.privacy}
        </Link>
      </Container>
    </footer>
  );
}
