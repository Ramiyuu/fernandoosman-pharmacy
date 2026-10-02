import type { Metadata } from 'next';

import { AdminPage } from '@/features/admin/components/admin-page';
import { TaxonomyManager } from '@/features/taxonomy/components/taxonomy-manager';
import { requireAdminPage } from '@/lib/auth/session';
import { getTagsWithUsage } from '@/services/admin/taxonomy.admin';

export const metadata: Metadata = { title: 'Tags' };

export default async function TagsAdminPage() {
  const session = await requireAdminPage('taxonomy:write');
  const tags = await getTagsWithUsage(session.supabase);

  return (
    <AdminPage title="Tags" description="Keywords shared by articles and projects. Tags are also created from the editors.">
      <TaxonomyManager kind="tag" items={tags} />
    </AdminPage>
  );
}
