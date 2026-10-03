import { Plus, Star } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { AdminPage, EmptyState, StatusBadge, tableClasses } from '@/features/admin/components/admin-page';
import { PROGRESS_LABELS } from '@/features/projects/components/project-card';
import { requireAdminPage } from '@/lib/auth/session';
import { listAdminProjects } from '@/services/admin/projects.admin';
import { cn } from '@/utils/cn';
import { formatDate } from '@/utils/format';

export const metadata: Metadata = { title: 'Projects' };

export default async function AdminProjectsPage() {
  const session = await requireAdminPage('projects:write');
  const projects = await listAdminProjects(session.db);

  return (
    <AdminPage
      title="Projects"
      description="Data projects shown on the portfolio."
      actions={
        <Link href="/admin/projects/new" className={buttonVariants()}>
          <Plus aria-hidden="true" /> New project
        </Link>
      }
    >
      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet."
          action={
            <Link href="/admin/projects/new" className={buttonVariants()}>
              <Plus aria-hidden="true" /> New project
            </Link>
          }
        />
      ) : (
        <div className={tableClasses.wrapper}>
          <table className={tableClasses.table}>
            <thead className={tableClasses.head}>
              <tr>
                <th scope="col" className={tableClasses.th}>Title</th>
                <th scope="col" className={tableClasses.th}>Visibility</th>
                <th scope="col" className={tableClasses.th}>Status</th>
                <th scope="col" className={tableClasses.th}>Language</th>
                <th scope="col" className={tableClasses.th}>Order</th>
                <th scope="col" className={tableClasses.th}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className={tableClasses.row}>
                  <td className={tableClasses.td}>
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/projects/${project.id}`} className="font-medium text-ink hover:underline">
                        {project.title}
                      </Link>
                      {project.featured ? <Star className="size-3.5 fill-teal-500 text-teal-500" aria-label="Featured" /> : null}
                    </div>
                    <p className="text-xs text-muted">/{project.slug}</p>
                  </td>
                  <td className={tableClasses.td}>
                    <StatusBadge status={project.status} />
                  </td>
                  <td className={tableClasses.td}>{PROGRESS_LABELS[project.progress]}</td>
                  <td className={cn(tableClasses.td, 'whitespace-nowrap text-xs')}>
                    <span className="font-semibold text-ink uppercase">{project.language}</span>
                    {(project.group_languages ?? '')
                      .split(',')
                      .filter((code) => code && code !== project.language)
                      .map((code) => (
                        <span key={code} className="ml-1.5 text-muted uppercase" title="Another language version exists">
                          + {code}
                        </span>
                      ))}
                  </td>
                  <td className={`${tableClasses.td} tabular`}>{project.sort_order}</td>
                  <td className={`${tableClasses.td} text-muted`}>{formatDate(project.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminPage>
  );
}
