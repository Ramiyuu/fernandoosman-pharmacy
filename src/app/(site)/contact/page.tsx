import { Mail } from 'lucide-react';
import type { Metadata } from 'next';

import { LinkedInIcon } from '@/components/icons/brand-icons';
import { Container } from '@/components/layout/container';
import { contactRetentionDays, describeRetention } from '@/config/privacy';
import { PageHeader } from '@/components/layout/section-header';
import { ContactForm } from '@/features/contact/components/contact-form';
import { buildMetadata } from '@/lib/seo/metadata';
import { getSiteProfile, getSiteSettings } from '@/services/public-content.service';
import { safeExternalUrl } from '@/utils/url';

export const metadata: Metadata = buildMetadata({
  title: 'Contact',
  description: 'Get in touch about internships, research collaborations or questions about an article.',
  path: '/contact',
});

export default async function ContactPage() {
  const [settings, profile] = await Promise.all([getSiteSettings(), getSiteProfile()]);
  const linkedin = safeExternalUrl(profile?.linkedin_url);

  return (
    <Container>
      <PageHeader title="Contact" description={settings.contact.intro || 'Send a message and I will reply by email.'} />
      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_18rem]">
        <div className="max-w-2xl">
          <ContactForm retention={describeRetention(contactRetentionDays())} />
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
