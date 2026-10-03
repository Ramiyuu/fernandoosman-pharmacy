import { Award, ArrowUpRight, Download, FileText } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { Container } from '@/components/layout/container';
import { isLocale } from '@/i18n/config';
import { i18nFor } from '@/i18n/server';
import { buildMetadata } from '@/lib/seo/metadata';
import { publicImageUrl } from '@/lib/storage/public-url';
import { getSiteProfile } from '@/services/public-content.service';
import { safeExternalUrl } from '@/utils/url';

export async function generateMetadata({ params }: PageProps<'/[lang]/certificates'>): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const { t } = i18nFor(lang);
  return buildMetadata({
    title: t.certificates.title,
    description: t.certificates.description,
    path: '/certificates',
    locale: lang,
  });
}

export default async function CertificatesPage({ params }: PageProps<'/[lang]/certificates'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const copy = i18nFor(lang).t.certificates;
  const profile = await getSiteProfile(lang);
  return (
    <Container className="pt-14 sm:pt-20">
      <header className="mb-12 max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{copy.heading}</h1>
        <p className="mt-5 font-serif text-xl text-muted">{copy.intro}</p>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        {profile?.certifications.map((c, i) => {
          const img = publicImageUrl('profile-images', c.image_path);
          const url = safeExternalUrl(c.url);
          return (
            <article key={i} data-spotlight className="certificate-card overflow-hidden rounded-xl border border-rule bg-white shadow-raise">
              {img ? (
                <div className="relative aspect-[16/9] border-b border-rule bg-mist">
                  <Image
                    src={img}
                    alt={c.name}
                    fill
                    sizes="(min-width:768px) 50vw,100vw"
                    className="object-contain p-5"
                  />
                </div>
              ) : null}
              <div className="p-7">
                <Award className="mb-4 size-7 text-teal-700" aria-hidden="true" />
                <p className="text-sm text-muted">
                  {c.issuer} · {c.issue_date || c.year}
                </p>
                <h2 className="mt-2 text-xl font-semibold">{c.name}</h2>
                {c.description ? <p className="mt-3 leading-relaxed text-muted">{c.description}</p> : null}
                {c.skills ? <p className="mt-3 text-sm text-teal-700">{c.skills}</p> : null}
                {c.credential_id ? (
                  <p className="mt-3 break-all text-xs text-muted">
                    {copy.credential}
                    {c.credential_id}
                  </p>
                ) : null}
                {c.expiration_date ? (
                  <p className="mt-2 text-xs text-muted">
                    {copy.expires}
                    {c.expiration_date}
                  </p>
                ) : null}
                <div className="mt-6 flex flex-wrap gap-5 text-sm font-medium text-azure-700">
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
                      {copy.verify} <ArrowUpRight size={16} aria-hidden="true" />
                    </a>
                  ) : null}
                  {c.pdf_file_id ? (
                    <>
                      <a
                        href={`/api/files/${c.pdf_file_id}`}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex items-center gap-2"
                      >
                        <FileText size={16} aria-hidden="true" /> {copy.viewPdf}
                      </a>
                      <a href={`/api/files/${c.pdf_file_id}?download=1`} className="inline-flex items-center gap-2">
                        <Download size={16} aria-hidden="true" /> {copy.download}
                      </a>
                    </>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {!profile?.certifications.length ? (
        <p className="rounded-xl border border-rule bg-mist p-8 text-muted">
          {copy.empty}
        </p>
      ) : null}
    </Container>
  );
}
