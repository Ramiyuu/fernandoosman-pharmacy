import { Pencil, Plus, UserRound } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { AdminPage, Panel, StatusBadge } from '@/features/admin/components/admin-page';
import { semesterLabel } from '@/features/profile/components/profile-card';
import { requireAdminPage } from '@/lib/auth/session';
import { publicImageUrl } from '@/lib/storage/public-url';
import { getDashboard } from '@/services/admin/dashboard.admin';
import { getSiteProfile } from '@/services/public-content.service';
import type { ActivityAction } from '@/types/database.types';
import { formatBytes, formatDate, formatDateTime } from '@/utils/format';

export const metadata: Metadata = { title: 'Dashboard' };

const ACTION_LABELS: Record<ActivityAction, string> = {
  video_uploaded: 'Uploaded video',
  video_deleted: 'Deleted video',
  login: 'Signed in',
  logout: 'Signed out',
  article_created: 'Created article',
  article_updated: 'Edited article',
  article_published: 'Published article',
  article_unpublished: 'Unpublished article',
  article_archived: 'Archived article',
  article_deleted: 'Moved article to trash',
  article_restored: 'Restored article',
  article_purged: 'Deleted article permanently',
  pdf_uploaded: 'Uploaded PDF',
  pdf_deleted: 'Deleted PDF',
  image_uploaded: 'Uploaded image',
  image_deleted: 'Deleted image',
  project_created: 'Created project',
  project_updated: 'Edited project',
  project_deleted: 'Deleted project',
  taxonomy_updated: 'Changed taxonomy',
  profile_updated: 'Edited profile',
  settings_updated: 'Changed settings',
  cv_updated: 'Updated CV',
  contact_deleted: 'Deleted message',
  two_factor_enabled: 'Turned on two-factor authentication',
  backup_codes_regenerated: 'Generated new backup codes',
  password_changed: 'Changed password',
  sessions_revoked: 'Signed out other devices',
};

function Stat({ label, value, href }: { label: string; value: string | number; href?: string }) {
  const body = (
    <>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-ink tabular">{value}</p>
    </>
  );
  return href ? (
    <Link href={href} className="rounded-xl border border-rule bg-white p-5 transition-colors hover:border-rule-strong">
      {body}
    </Link>
  ) : (
    <div className="rounded-xl border border-rule bg-white p-5">{body}</div>
  );
}

export default async function DashboardPage() {
  const session = await requireAdminPage();
  const [{ stats, recentArticles, activity }, profile] = await Promise.all([
    getDashboard(session.db),
    getSiteProfile(),
  ]);
  const photo = publicImageUrl('profile-images', profile?.photo_path);
  const semester = profile ? semesterLabel(profile) : null;
  const totalStorage = stats.storage.documents_bytes + stats.storage.images_bytes;
  const documentsShare = totalStorage > 0 ? (stats.storage.documents_bytes / totalStorage) * 100 : 0;

  return (
    <AdminPage
      title="Dashboard"
      description={`Signed in as ${session.profile.displayName || session.email}`}
      actions={
        <Link href="/admin/articles/new" className={buttonVariants()}>
          <Plus aria-hidden="true" /> New article
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <Stat label="Articles published" value={stats.articles_published} href="/admin/articles?view=published" />
        <Stat label="Draft articles" value={stats.articles_draft} href="/admin/articles?view=draft" />
        <Stat label="Total projects" value={stats.projects_total} href="/admin/projects" />
        <Stat label="Total PDFs" value={stats.pdfs_total} href="/admin/files" />
        <Stat label="Topics" value={stats.topics_total} href="/admin/topics" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel
          title="Your public profile"
          actions={
            <Link href="/admin/profile" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
              <Pencil aria-hidden="true" /> Edit
            </Link>
          }
        >
          <div className="flex items-center gap-4">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-navy-900">
              {photo ? (
                <Image src={photo} alt="" fill sizes="64px" className="object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center text-navy-200" title="No photo yet">
                  <UserRound className="size-7" aria-hidden="true" />
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{profile?.full_name || 'No name yet'}</p>
              <p className="truncate text-sm text-muted">{profile?.headline || 'Add a headline'}</p>
              <p className="text-sm text-muted">{semester ?? 'Semester not set'}</p>
            </div>
          </div>
        </Panel>

        <Panel title="Last publication">
          {stats.last_publication ? (
            <div>
              <Link
                href={`/admin/articles/${stats.last_publication.id}`}
                className="font-medium text-ink hover:underline"
              >
                {stats.last_publication.title}
              </Link>
              <p className="mt-1 text-sm text-muted">{formatDate(stats.last_publication.published_at)}</p>
              <Link
                href={`/articles/${stats.last_publication.slug}`}
                target="_blank"
                className="mt-3 inline-block text-sm text-azure-700 hover:underline"
              >
                View on site
              </Link>
            </div>
          ) : (
            <p className="text-sm text-muted">Nothing published yet.</p>
          )}
        </Panel>

        <Panel title="Storage usage" description="Ready files tracked by the database">
          <p className="text-3xl font-semibold text-ink tabular">{formatBytes(totalStorage)}</p>
          <div
            className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-mist"
            role="img"
            aria-label={`Documents ${Math.round(documentsShare)}%, images ${Math.round(100 - documentsShare)}%`}
          >
            <span className="bg-navy-700" style={{ width: `${documentsShare}%` }} />
            <span className="bg-teal-500" style={{ width: `${totalStorage > 0 ? 100 - documentsShare : 0}%` }} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="flex items-center gap-2 text-muted">
                <span className="size-2.5 rounded-sm bg-navy-700" aria-hidden="true" /> PDF documents
              </dt>
              <dd className="mt-0.5 text-ink tabular">
                {formatBytes(stats.storage.documents_bytes)} in {stats.storage.documents_count} files
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-muted">
                <span className="size-2.5 rounded-sm bg-teal-500" aria-hidden="true" /> Images
              </dt>
              <dd className="mt-0.5 text-ink tabular">
                {formatBytes(stats.storage.images_bytes)} in {stats.storage.images_count} files
              </dd>
            </div>
          </dl>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel
          title="Recently edited articles"
          actions={
            <Link href="/admin/articles" className="text-sm text-azure-700 hover:underline">
              All articles
            </Link>
          }
        >
          {recentArticles.length > 0 ? (
            <ul className="-my-2 divide-y divide-rule">
              {recentArticles.map((article) => (
                <li key={article.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link
                    href={`/admin/articles/${article.id}`}
                    className="min-w-0 truncate text-sm font-medium text-ink hover:underline"
                  >
                    {article.title || 'Untitled draft'}
                  </Link>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={article.status} />
                    <span className="hidden text-xs text-muted sm:inline">{formatDate(article.updated_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No articles yet.</p>
          )}
        </Panel>

        <Panel title="Recent activity">
          {activity.length > 0 ? (
            <ol className="-my-2 divide-y divide-rule">
              {activity.map((entry) => (
                <li key={entry.id} className="py-2.5 text-sm">
                  <p className="text-ink">
                    <span className="font-medium">{ACTION_LABELS[entry.action]}</span>
                    {entry.summary && entry.action !== 'login' && entry.action !== 'logout' ? (
                      <span className="text-muted">: {entry.summary}</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted">
                    {entry.actor_name ? `${entry.actor_name}, ` : ''}
                    {formatDateTime(entry.created_at)}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">No activity recorded yet.</p>
          )}
        </Panel>
      </div>

      {stats.messages_new > 0 ? (
        <p className="mt-6 text-sm">
          <Link href="/admin/messages" className="font-medium text-azure-700 hover:underline">
            {stats.messages_new} new {stats.messages_new === 1 ? 'message' : 'messages'} from the contact form
          </Link>
        </p>
      ) : null}
    </AdminPage>
  );
}
