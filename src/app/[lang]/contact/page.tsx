import { Mail } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LinkedInIcon } from '@/components/icons/brand-icons';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/section-header';
import { contactRetentionDays, describeRetention } from '@/config/privacy';
import { ContactForm } from '@/features/contact/components/contact-form';
import { isLocale } from '@/i18n/config';
import { i18nFor } from '@/i18n/server';
import { buildMetadata } from '@/lib/seo/metadata';
import { getSiteProfile, getSiteSettings } from '@/services/public-content.service';
import { safeExternalUrl } from '@/utils/url';

export async function generateMetadata({ params }: PageProps<'/[lang]/contact'>): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const { t } = i18nFor(lang);
  return buildMetadata({ title: t.contact.title, description: t.contact.description, path: '/contact', locale: lang });
}

export default async function ContactPage({ params }: PageProps<'/[lang]/contact'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const { t, href } = i18nFor(lang);
  const [settings, profile] = await Promise.all([getSiteSettings(lang), getSiteProfile(lang)]);
  const linkedin = safeExternalUrl(profile?.linkedin_url);
  const { form, validation } = t.contact;

  return (
    <Container>
      <PageHeader title={t.contact.title} description={settings.contact.intro || t.contact.introFallback} />
      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_18rem]">
        <div className="max-w-2xl">
          <ContactForm
            locale={lang}
            privacyHref={href('/privacy')}
            copy={{
              ...form,
              retention: form.retention(describeRetention(contactRetentionDays(), lang)),
              validation: {
                name: validation.name,
                email: validation.email,
                message: validation.message,
                consent: validation.consent,
                tooLong: { 120: validation.tooLong(120), 200: validation.tooLong(200), 5000: validation.tooLong(5000) },
              },
            }}
          />
        </div>
        <aside className="space-y-4 text-sm">
          {profile?.professional_email ? (
            <a href={`mailto:${profile.professional_email}`} className="flex items-center gap-2 text-navy-900 hover:underline">
              <Mail className="size-4 text-teal-600" aria-hidden="true" /> {profile.professional_email}
            </a>
          ) : null}
          {linkedin ? (
            <a href={linkedin} target="_blank" rel="noopener noreferrer me" className="flex items-center gap-2 text-navy-900 hover:underline">
              <LinkedInIcon className="size-4 text-azure-700" /> LinkedIn
            </a>
          ) : null}
        </aside>
      </div>
    </Container>
  );
}
