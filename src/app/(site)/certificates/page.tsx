import Image from 'next/image';
import { Award, ArrowUpRight, Download, FileText } from 'lucide-react';
import { Container } from '@/components/layout/container';
import { buildMetadata } from '@/lib/seo/metadata';
import { publicImageUrl } from '@/lib/storage/public-url';
import { getSiteProfile } from '@/services/public-content.service';
import { safeExternalUrl } from '@/utils/url';
export async function generateMetadata() {
  return buildMetadata({
    title: 'Certificates',
    description: 'Continuing education and professional certificates.',
    path: '/certificates',
  });
}
export default async function CertificatesPage() {
  const profile = await getSiteProfile();
  return (
    <Container className="pt-14 sm:pt-20">
      <header className="mb-12 max-w-2xl">
        <p className="mb-4 text-sm font-medium text-teal-700">Continuing education</p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Learning, documented.</h1>
        <p className="mt-5 font-serif text-xl text-muted">
          Certificates and credentials from my academic and professional development.
        </p>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        {profile?.certifications.map((c, i) => {
          const img = publicImageUrl('profile-images', c.image_path);
          const url = safeExternalUrl(c.url);
          return (
            <article key={i} className="overflow-hidden rounded-xl border border-rule bg-white shadow-raise">
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
                  <p className="mt-3 break-all text-xs text-muted">Credential: {c.credential_id}</p>
                ) : null}
                {c.expiration_date ? <p className="mt-2 text-xs text-muted">Expires: {c.expiration_date}</p> : null}
                <div className="mt-6 flex flex-wrap gap-5 text-sm font-medium text-azure-700">
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
                      Verify credential <ArrowUpRight size={16} />
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
                        <FileText size={16} /> View PDF
                      </a>
                      <a href={`/api/files/${c.pdf_file_id}?download=1`} className="inline-flex items-center gap-2">
                        <Download size={16} /> Download
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
          Certificates will appear here as they are added to the portfolio.
        </p>
      ) : null}
    </Container>
  );
}
