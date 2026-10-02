import { AdminPage, Panel } from '@/features/admin/components/admin-page';
import { requireAdminPage } from '@/lib/auth/session';
import { sql } from '@/lib/db/sql';
import { formatDateTime } from '@/utils/format';
export const metadata = { title: 'Analytics & downloads' };
type Total = { kind: string; total: number };
type Popular = { title: string; views: number; downloads: number };
export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { db } = await requireAdminPage();
  const input = (await searchParams).days;
  const days = ['7', '30', '90', '365'].includes(input ?? '') ? Number(input) : 30;
  const { since } = await db.one<{ since: string }>(sql`select (now() - ${days}::int * interval '1 day') as since`);
  const [totals, files, articles, projects, topics, daily, recent] = await Promise.all([
    db.many<Total>(
      sql`select kind, count(*)::int total from public.analytics_events where created_at >= ${since}::timestamptz group by kind`,
    ),
    db.many<Popular>(sql`select f.original_filename title, count(*) filter(where e.kind = 'file_view')::int views, count(*) filter(where e.kind = 'file_download')::int downloads
      from public.analytics_events e join public.article_files f on f.id = e.file_id where e.created_at >= ${since}::timestamptz group by f.id order by downloads desc limit 20`),
    db.many<Popular>(sql`select a.title, count(*) filter(where e.kind = 'article_view')::int views, count(*) filter(where e.kind = 'file_download')::int downloads
      from public.analytics_events e join public.articles a on a.id = e.article_id where e.created_at >= ${since}::timestamptz group by a.id order by views desc limit 20`),
    db.many<Popular>(sql`select p.title, count(*) filter(where e.kind = 'project_view')::int views, count(*) filter(where e.kind = 'file_download')::int downloads
      from public.analytics_events e join public.projects p on p.id = e.project_id where e.created_at >= ${since}::timestamptz group by p.id order by views desc limit 20`),
    db.many<{
      title: string;
      total: number;
    }>(sql`select t.name title, count(*)::int total from public.analytics_events e
      join public.article_topics at on at.article_id = e.article_id join public.topics t on t.id = at.topic_id
      where e.kind = 'article_view' and e.created_at >= ${since}::timestamptz group by t.id order by total desc limit 10`),
    db.many<{
      event_day: string;
      views: number;
      downloads: number;
    }>(sql`select to_char(created_at at time zone 'UTC','YYYY-MM-DD') as event_day,
      count(*) filter(where kind <> 'file_download')::int views, count(*) filter(where kind = 'file_download')::int downloads
      from public.analytics_events where created_at >= ${since}::timestamptz group by event_day order by event_day`),
    db.many<{
      title: string;
      created_at: string;
    }>(sql`select f.original_filename title, e.created_at from public.analytics_events e
      join public.article_files f on f.id = e.file_id where e.kind = 'file_download' and e.created_at >= ${since}::timestamptz order by e.created_at desc limit 20`),
  ]);
  const count = (kind: string) => totals.find((t) => t.kind === kind)?.total ?? 0;
  const max = Math.max(1, ...daily.map((d) => d.views + d.downloads));
  return (
    <AdminPage
      wide
      title="Analytics & downloads"
      description="Published content activity. Views are deduplicated for 30 minutes; downloads for one minute. Admin PDF previews are excluded."
    >
      <form className="mb-6 flex items-end gap-3">
        <label className="text-sm">
          Period
          <select name="days" defaultValue={days} className="ml-3 rounded-md border border-rule bg-white p-2">
            {[7, 30, 90, 365].map((d) => (
              <option value={d} key={d}>
                {d} days
              </option>
            ))}
          </select>
        </label>
        <button className="rounded-md bg-navy-900 px-4 py-2 text-sm text-white">Apply</button>
      </form>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['article_view', 'Article views'],
          ['project_view', 'Project views'],
          ['file_view', 'PDF views'],
          ['file_download', 'PDF downloads'],
        ].map(([key, label]) => (
          <div key={key} className="rounded-xl border border-rule bg-white p-5">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 text-4xl font-semibold tabular">{count(key)}</p>
          </div>
        ))}
      </div>
      <Panel title="Activity over time · UTC">
        <div className="space-y-2">
          {daily.length ? (
            daily.map((d) => (
              <div key={d.event_day} className="grid grid-cols-[6rem_1fr] items-center gap-3 text-xs">
                <span>{d.event_day}</span>
                <div>
                  <div
                    className="h-3 rounded-sm bg-azure-600"
                    style={{ width: `${Math.max(1, ((d.views + d.downloads) / max) * 100)}%` }}
                  />
                  <span className="text-muted">
                    {d.views} views · {d.downloads} downloads
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted">Activity will appear after visitors open published content.</p>
          )}
        </div>
      </Panel>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {[
          ['Most downloaded PDFs', files],
          ['Articles', articles],
          ['Projects', projects],
        ].map(([title, items]) => (
          <Panel key={String(title)} title={String(title)}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-rule">
                    <th className="pb-3">Content</th>
                    <th className="p-2">Views</th>
                    <th className="p-2">Downloads</th>
                  </tr>
                </thead>
                <tbody>
                  {(items as Popular[]).map((row, i) => (
                    <tr key={i} className="border-b border-rule">
                      <td className="py-3 pr-3">{row.title}</td>
                      <td className="p-2 tabular">{row.views}</td>
                      <td className="p-2 tabular">{row.downloads}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!(items as Popular[]).length ? (
                <p className="py-4 text-sm text-muted">No activity in this period.</p>
              ) : null}
            </div>
          </Panel>
        ))}
        <Panel title="Popular topics">
          <ul className="space-y-3 text-sm">
            {topics.map((t) => (
              <li className="flex justify-between gap-4" key={t.title}>
                <span>{t.title}</span>
                <strong>{t.total}</strong>
              </li>
            ))}
          </ul>
          {!topics.length ? <p className="text-sm text-muted">No topic views yet.</p> : null}
        </Panel>
        <Panel title="Recent downloads">
          <ul className="space-y-3 text-sm">
            {recent.map((r, i) => (
              <li key={i}>
                <p>{r.title}</p>
                <time className="text-xs text-muted">{formatDateTime(r.created_at)}</time>
              </li>
            ))}
          </ul>
          {!recent.length ? <p className="text-sm text-muted">No downloads yet.</p> : null}
        </Panel>
      </div>
      <p className="mt-6 text-xs text-muted">
        Counts represent requests for signed download links, not proof that a file was saved. Privacy controls and
        disabled JavaScript can reduce measured views. Events are retained for 365 days.
      </p>
    </AdminPage>
  );
}
