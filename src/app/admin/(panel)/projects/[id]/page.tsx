import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ProjectEditor } from '@/features/projects/admin/project-editor';
import { requireAdminPage } from '@/lib/auth/session';
import { isUuid } from '@/lib/storage/paths';
import { getProjectForEditor, getTagSuggestions } from '@/services/admin/projects.admin';

export const metadata: Metadata = { title: 'Edit project' };

export default async function EditProjectPage({ params }: PageProps<'/admin/projects/[id]'>) {
  const session = await requireAdminPage('projects:write');
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const [project, tags] = await Promise.all([getProjectForEditor(session.supabase, id), getTagSuggestions(session.supabase)]);
  if (!project) notFound();
  return <ProjectEditor key={project.id} project={project} tagSuggestions={tags} />;
}
