import type { Metadata } from 'next';
import Link from 'next/link';

import { StatusPage } from '@/components/feedback/status-page';
import { buttonVariants } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Page not found', robots: { index: false } };

export default function NotFound() {
  return (
    <StatusPage
      code="404"
      title="This page does not exist"
      description="The link may be outdated, or the article may have been moved or unpublished."
      actions={
        <>
          <Link href="/articles" className={buttonVariants({ variant: 'dark' })}>
            Browse articles
          </Link>
          <Link href="/search" className={buttonVariants({ variant: 'secondary' })}>
            Search the site
          </Link>
        </>
      }
    />
  );
}
