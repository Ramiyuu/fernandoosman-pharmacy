import type { Metadata } from 'next';
import Link from 'next/link';

import { AdminPage, EmptyState } from '@/features/admin/components/admin-page';
import { DocumentsTable, ImagesTable } from '@/features/files/components/files-table';
import { requireAdminPage } from '@/lib/auth/session';
import { listDocuments, listImages } from '@/services/admin/files.admin';
import { cn } from '@/utils/cn';

export const metadata: Metadata = { title: 'Files' };

export default async function FilesPage({ searchParams }: PageProps<'/admin/files'>) {
  const session = await requireAdminPage('files:write');
  const tab = (await searchParams).tab === 'images' ? 'images' : 'documents';
  const [documents, images] = await Promise.all([listDocuments(session.db), listImages(session.db)]);

  return (
    <AdminPage title="Files" description="All PDFs (private bucket) and images (public buckets) tracked by the site." wide>
      <nav aria-label="File type" className="mb-4 flex gap-1 rounded-lg bg-white p-1 ring-1 ring-rule sm:inline-flex">
        {[
          { value: 'documents', label: `PDF documents (${documents.total})` },
          { value: 'images', label: `Images (${images.length})` },
        ].map((option) => (
          <Link
            key={option.value}
            href={option.value === 'documents' ? '/admin/files' : '/admin/files?tab=images'}
            aria-current={tab === option.value ? 'page' : undefined}
            className={cn('rounded-md px-3 py-1.5 text-sm text-navy-800 hover:bg-navy-50', tab === option.value && 'bg-navy-900 text-white hover:bg-navy-900')}
          >
            {option.label}
          </Link>
        ))}
      </nav>

      {tab === 'documents' ? (
        documents.items.length > 0 ? (
          <DocumentsTable documents={documents.items} />
        ) : (
          <EmptyState title="No PDFs yet." description="Attach PDFs from the article editor, or upload the CV under Profile & CV." />
        )
      ) : images.length > 0 ? (
        <ImagesTable images={images} />
      ) : (
        <EmptyState title="No images yet." description="Images uploaded in editors and forms appear here." />
      )}
    </AdminPage>
  );
}
