import { LinkedInIcon } from '@/components/icons/brand-icons';
import { getI18n } from '@/i18n/server';

export async function ShareLinks({ url, title }: { url: string; title: string }) {
  const { t } = await getI18n();
  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  const email = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted">{t.article.share}</span>
      <a
        href={linkedin}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md border border-rule px-2.5 py-1.5 text-navy-900 hover:border-navy-700"
      >
        <LinkedInIcon className="size-3.5" /> LinkedIn
      </a>
      <a href={email} className="inline-flex items-center rounded-md border border-rule px-2.5 py-1.5 text-navy-900 hover:border-navy-700">
        {t.article.email}
      </a>
    </div>
  );
}
