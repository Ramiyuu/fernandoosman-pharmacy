import type { Metadata } from 'next';
import Link from 'next/link';

import { StatusPage } from '@/components/feedback/status-page';
import { buttonVariants } from '@/components/ui/button';
import { getI18n } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.notFound, robots: { index: false } };
}

export default async function NotFound() {
  const { t, href } = await getI18n();
  return (
    <StatusPage
      code="404"
      title={t.errors.notFoundTitle}
      description={t.errors.notFoundBody}
      actions={
        <>
          <Link href={href('/articles')} className={buttonVariants({ variant: 'dark' })}>
            {t.errors.browseArticles}
          </Link>
          <Link href={href('/search')} className={buttonVariants({ variant: 'secondary' })}>
            {t.errors.searchSite}
          </Link>
        </>
      }
    />
  );
}
