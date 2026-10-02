import type { Metadata } from 'next';

import { AdminPage } from '@/features/admin/components/admin-page';
import { TaxonomyManager } from '@/features/taxonomy/components/taxonomy-manager';
import { requireAdminPage } from '@/lib/auth/session';
import { getTopicsAndCategories } from '@/services/admin/taxonomy.admin';

export const metadata: Metadata = { title: 'Topics & categories' };

export default async function TopicsAdminPage() {
  const session = await requireAdminPage('taxonomy:write');
  const { topics, categories } = await getTopicsAndCategories(session.db);

  return (
    <AdminPage title="Topics & categories" description="Topics group articles by subject; categories describe the article format.">
      <section aria-labelledby="topics-admin-heading" className="space-y-3">
        <h2 id="topics-admin-heading" className="text-lg font-semibold text-ink">
          Topics
        </h2>
        <p className="text-sm text-muted">An article can belong to several topics. Each topic has its own public page.</p>
        <TaxonomyManager kind="topic" items={topics} />
      </section>
      <section aria-labelledby="categories-admin-heading" className="mt-12 space-y-3">
        <h2 id="categories-admin-heading" className="text-lg font-semibold text-ink">
          Categories
        </h2>
        <p className="text-sm text-muted">
          One per article. The home page metrics count the categories with slugs <code>paper-review</code> and{' '}
          <code>research-note</code>.
        </p>
        <TaxonomyManager kind="category" items={categories} />
      </section>
    </AdminPage>
  );
}
