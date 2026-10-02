import type { Metadata } from 'next';

import { ProjectEditor } from '@/features/projects/admin/project-editor';
import { requireAdminPage } from '@/lib/auth/session';
import { getTagSuggestions } from '@/services/admin/projects.admin';

export const metadata: Metadata = { title: 'New project' };

export default async function NewProjectPage() {
  const session = await requireAdminPage('projects:write');
  const tags = await getTagSuggestions(session.supabase);
  return <ProjectEditor project={null} tagSuggestions={tags} />;
}
