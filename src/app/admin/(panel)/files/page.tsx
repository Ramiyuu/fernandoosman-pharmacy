import type { Metadata } from 'next';
import Link from 'next/link';

import { AdminPage, EmptyState } from '@/features/admin/components/admin-page';
import { DocumentsTable, ImagesTable } from '@/features/files/components/files-table';
import { requireAdminPage } from '@/lib/auth/session';
import { listDocuments, listImages } from '@/services/admin/files.admin';
import { cn } from '@/utils/cn';
import { sql } from '@/lib/db/sql';
import { VideosTable } from '@/features/files/components/videos-table';

export const metadata: Metadata = { title: 'Files' };

export default async function FilesPage({ searchParams }: PageProps<'/admin/files'>) {
  const session = await requireAdminPage('files:write');
  const tab = (await searchParams).tab === 'images' ? 'images' : 'documents';
  const [documents, images] = await Promise.all([listDocuments(session.db), listImages(session.db)]);
  const videos = await session.db.many<{ id: string; filename: string; size_bytes: number; ready: boolean }>(
    sql`select id, filename, size_bytes, ready from public.videos order by created_at desc limit 200`,
  );

  return (
    <AdminPage
      title="Files"
      description="PDFs and images stored in the private R2 bucket. Images have public URLs; PDF access follows publication and visibility."
      wide
    >
      <nav aria-label="File type" className="mb-4 flex gap-1 rounded-lg bg-white p-1 ring-1 ring-rule sm:inline-flex">
        {[
          { value: 'documents', label: `PDF documents (${documents.total})` },
          { value: 'images', label: `Images (${images.length})` },
        ].map((option) => (
          <Link
            key={option.value}
            href={option.value === 'documents' ? '/admin/files' : '/admin/files?tab=images'}
            aria-current={tab === option.value ? 'page' : undefined}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm text-navy-800 hover:bg-navy-50',
              tab === option.value && 'bg-navy-900 text-white hover:bg-navy-900',
            )}
          >
            {option.label}
          </Link>
        ))}
      </nav>

      {tab === 'documents' ? (
        documents.items.length > 0 ? (
          <DocumentsTable documents={documents.items} />
        ) : (
          <EmptyState
            title="No PDFs yet."
            description="Attach PDFs from the article editor, or upload the CV under Profile & CV."
          />
        )
      ) : images.length > 0 ? (
        <ImagesTable images={images} />
      ) : (
        <EmptyState title="No images yet." description="Images uploaded in editors and forms appear here." />
      )}
      <VideosTable videos={videos} />
    </AdminPage>
  );
}
