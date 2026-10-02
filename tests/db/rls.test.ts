import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { actAs, createTestDatabase, createUser, rows, type TestUser } from './test-database';

const DRAFT_SLUG = 'paper-review-sglt2-inhibitors-in-heart-failure-draft';
const HAZARD_SLUG = 'understanding-hazard-ratio-in-clinical-trials';

let db: PGlite;
let admin: TestUser;
let editor: TestUser;
let noRole: TestUser;

beforeAll(async () => {
  db = await createTestDatabase();
  admin = await createUser(db, 'admin@example.com', 'admin');
  editor = await createUser(db, 'editor@example.com', 'editor');
  noRole = await createUser(db, 'someone@example.com', null);
}, 120_000);

afterAll(async () => {
  await db?.close();
});

const expectDenied = async (promise: Promise<unknown>) => {
  await expect(promise).rejects.toThrow(/permission denied|row-level security|Not authorized/i);
};

describe('migrations and seed', () => {
  it('creates the expected buckets with a private documents bucket', async () => {
    const buckets = await rows<{ id: string; public: boolean; file_size_limit: number; allowed_mime_types: string[] }>(
      db,
      'select id, public, file_size_limit, allowed_mime_types from storage.buckets order by id',
    );
    const documents = buckets.find((bucket) => bucket.id === 'documents');
    expect(documents).toMatchObject({ public: false, file_size_limit: 31457280, allowed_mime_types: ['application/pdf'] });
    expect(buckets.map((bucket) => bucket.id)).toEqual(['article-images', 'documents', 'profile-images', 'project-images']);
    for (const bucket of buckets) {
      expect(bucket.allowed_mime_types).not.toContain('image/svg+xml');
    }
  });

  it('enables RLS on every table in the public schema', async () => {
    const tables = await rows<{ relname: string; relrowsecurity: boolean }>(
      db,
      "select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'",
    );
    expect(tables.length).toBeGreaterThanOrEqual(16);
    expect(tables.filter((table) => !table.relrowsecurity)).toEqual([]);
  });

  it('creates profiles without a role for new auth users', async () => {
    const [profile] = await rows<{ role: string | null }>(db, 'select role from public.profiles where id = $1', [noRole.id]);
    expect(profile.role).toBeNull();
  });
});

describe('anonymous visitors', () => {
  it('see only published, non-deleted articles', async () => {
    const result = await actAs(db, 'anon', null, () =>
      rows<{ slug: string; status: string }>(db, 'select slug, status from public.articles'),
    );
    expect(result.length).toBe(5);
    expect(result.every((row) => row.status === 'published')).toBe(true);
    expect(result.map((row) => row.slug)).not.toContain(DRAFT_SLUG);
  });

  it('cannot read drafts through RPCs either', async () => {
    const [draft] = await rows<{ id: string }>(db, 'select id from public.articles where slug = $1', [DRAFT_SLUG]);
    const result = await actAs(db, 'anon', null, async () => ({
      bySlug: (await rows<{ value: unknown }>(db, 'select public.get_article_by_slug($1) as value', [DRAFT_SLUG]))[0].value,
      byId: (await rows<{ value: unknown }>(db, 'select public.article_detail_json($1, true) as value', [draft.id]))[0].value,
      card: (await rows<{ value: unknown }>(db, 'select public.article_card_json($1) as value', [draft.id]))[0].value,
    }));
    expect(result).toEqual({ bySlug: null, byId: null, card: null });
  });

  it('cannot write any content table', async () => {
    await actAs(db, 'anon', null, async () => {
      await expectDenied(db.query("insert into public.articles (title, slug) values ('x', 'x')"));
      await expectDenied(db.query("update public.articles set title = 'hacked'"));
      await expectDenied(db.query('delete from public.articles'));
      await expectDenied(db.query("insert into public.tags (name, slug) values ('x', 'x')"));
      await expectDenied(db.query("update public.site_profile set full_name = 'x'"));
      await expectDenied(db.query("insert into public.contacts (name, email, message) values ('a', 'a@b.co', 'hi')"));
    });
  });

  it('cannot read administrative tables', async () => {
    await actAs(db, 'anon', null, async () => {
      await expectDenied(db.query('select * from public.profiles'));
      await expectDenied(db.query('select * from public.contacts'));
      await expectDenied(db.query('select * from public.activity_logs'));
      await expectDenied(db.query('select * from public.media_files'));
    });
  });

  it('cannot call admin RPCs', async () => {
    await actAs(db, 'anon', null, async () => {
      await expectDenied(db.query('select public.admin_dashboard_stats()'));
      await expectDenied(db.query("select public.admin_save_article(null, '{}'::jsonb)"));
      await expectDenied(db.query('select public.admin_list_files()'));
    });
  });

  it('get computed metrics', async () => {
    const [{ metrics }] = await actAs(db, 'anon', null, () =>
      rows<{ metrics: Record<string, unknown> }>(db, 'select public.get_public_metrics() as metrics'),
    );
    expect(metrics).toMatchObject({
      articles_published: 5,
      paper_reviews: 0,
      data_projects: 4,
      references_reviewed: 12,
      current_semester: 6,
    });
    expect(metrics.topics_covered).toBe(5);
    expect((metrics.latest_publication as { slug: string }).slug).toBe('how-to-read-a-clinical-research-paper');
  });

  it('can filter and paginate published articles', async () => {
    const [{ page }] = await actAs(db, 'anon', null, () =>
      rows<{ page: { total: number; items: Array<{ slug: string; tags: unknown[] }> } }>(
        db,
        "select public.get_published_articles(p_topic => 'biostatistics', p_limit => 2, p_offset => 0) as page",
      ),
    );
    expect(page.total).toBe(3);
    expect(page.items).toHaveLength(2);
    expect(page.items[0].tags.length).toBeGreaterThan(0);
  });

  it('can search with full-text search and survives hostile input', async () => {
    const [{ result }] = await actAs(db, 'anon', null, () =>
      rows<{ result: { total: number; items: Array<{ slug: string; headline: string }> } }>(
        db,
        "select public.search_content('hazard rat') as result",
      ),
    );
    expect(result.items[0].slug).toBe(HAZARD_SLUG);
    expect(result.items[0].headline).toContain('[[[');

    const hostile = ["'); drop table public.articles; --", '!!&&||:*()', '%_\\', '   ', 'a'.repeat(5000)];
    for (const query of hostile) {
      await actAs(db, 'anon', null, () => db.query('select public.search_content($1)', [query]));
    }
    const [{ count }] = await rows<{ count: number }>(db, 'select count(*)::int as count from public.articles');
    expect(count).toBe(6);
  });

  it('can only read public settings', async () => {
    const result = await actAs(db, 'anon', null, () => rows<{ key: string }>(db, 'select key from public.settings'));
    await db.query("insert into public.settings (key, value, is_public) values ('private.test', '{}'::jsonb, false)");
    const after = await actAs(db, 'anon', null, () => rows<{ key: string }>(db, 'select key from public.settings'));
    expect(after.map((row) => row.key)).toEqual(result.map((row) => row.key));
    expect(after.map((row) => row.key)).not.toContain('private.test');
  });
});

describe('authenticated users without a role', () => {
  it('are treated like visitors', async () => {
    await actAs(db, 'authenticated', noRole, async () => {
      const visible = await rows<{ status: string }>(db, 'select status from public.articles');
      expect(visible.every((row) => row.status === 'published')).toBe(true);
      await expect(db.query("insert into public.articles (title, slug) values ('x', 'x-new')")).rejects.toThrow(
        /row-level security/i,
      );
      await expectDenied(db.query('select public.admin_dashboard_stats()'));
      const profiles = await rows<{ id: string }>(db, 'select id from public.profiles');
      expect(profiles.map((row) => row.id)).toEqual([noRole.id]);
    });
  });

  it('cannot grant themselves a role', async () => {
    await actAs(db, 'authenticated', noRole, async () => {
      const result = await db.query("update public.profiles set role = 'admin' where id = $1", [noRole.id]);
      expect(result.affectedRows).toBe(0);
    });
    const [profile] = await rows<{ role: string | null }>(db, 'select role from public.profiles where id = $1', [noRole.id]);
    expect(profile.role).toBeNull();
  });
});

describe('admins', () => {
  it('can read drafts and dashboard stats', async () => {
    await actAs(db, 'authenticated', admin, async () => {
      const all = await rows<{ slug: string }>(db, 'select slug from public.articles');
      expect(all.map((row) => row.slug)).toContain(DRAFT_SLUG);
      const [{ stats }] = await rows<{ stats: { articles_draft: number; articles_published: number } }>(
        db,
        'select public.admin_dashboard_stats() as stats',
      );
      expect(stats.articles_draft).toBe(1);
      expect(stats.articles_published).toBe(5);
    });
  });

  it('create, edit and publish an article with unique slugs', async () => {
    await actAs(db, 'authenticated', admin, async () => {
      const [topic] = await rows<{ id: string }>(db, "select id from public.topics where slug = 'biostatistics'");
      const data = {
        title: 'Understanding Hazard Ratio in Clinical Trials',
        excerpt: 'Duplicate title on purpose',
        content: { type: 'doc', content: [] },
        content_text: 'body',
        reading_time: 1,
        featured: true,
      };
      const [{ saved }] = await rows<{ saved: { id: string; slug: string; status: string } }>(
        db,
        'select public.admin_save_article(null, $1::jsonb, $2::uuid[], $3::text[], $4::jsonb) as saved',
        [
          JSON.stringify(data),
          [topic.id],
          ['Survival analysis', 'Brand new tag'],
          JSON.stringify([{ title: 'A reference', doi: '10.1000/xyz123', year: 2020 }]),
        ],
      );
      expect(saved.slug).toBe(`${HAZARD_SLUG}-2`);
      expect(saved.status).toBe('draft');

      const featured = await rows<{ slug: string }>(db, 'select slug from public.articles where featured');
      expect(featured.map((row) => row.slug)).toEqual([saved.slug]);

      const [{ updated }] = await rows<{ updated: { slug: string } }>(
        db,
        'select public.admin_save_article($1, $2::jsonb, $3::uuid[], $4::text[], $5::jsonb) as updated',
        [saved.id, JSON.stringify({ ...data, slug: 'custom-slug', featured: false }), [], ['Brand new tag'], '[]'],
      );
      expect(updated.slug).toBe('custom-slug');

      const tags = await rows<{ slug: string }>(
        db,
        'select t.slug from public.article_tags atg join public.tags t on t.id = atg.tag_id where atg.article_id = $1',
        [saved.id],
      );
      expect(tags.map((row) => row.slug)).toEqual(['brand-new-tag']);

      await db.query("update public.articles set status = 'published' where id = $1", [saved.id]);
      const [published] = await rows<{ published_at: Date | null }>(
        db,
        'select published_at from public.articles where id = $1',
        [saved.id],
      );
      expect(published.published_at).not.toBeNull();
    });

    const visible = await actAs(db, 'anon', null, () =>
      rows<{ slug: string }>(db, "select slug from public.articles where slug = 'custom-slug'"),
    );
    expect(visible).toHaveLength(1);
  });

  it('soft-deleted articles disappear from the public site', async () => {
    await actAs(db, 'authenticated', admin, () =>
      db.query("update public.articles set deleted_at = now() where slug = 'custom-slug'"),
    );
    const visible = await actAs(db, 'anon', null, () =>
      rows<{ slug: string }>(db, "select slug from public.articles where slug = 'custom-slug'"),
    );
    expect(visible).toHaveLength(0);
  });

  it('cannot demote the last active admin', async () => {
    await expect(
      actAs(db, 'authenticated', admin, () => db.query("update public.profiles set role = 'editor' where id = $1", [admin.id])),
    ).rejects.toThrow(/At least one active admin/);
  });

  it('activity log is append-only and bound to the actor', async () => {
    await actAs(db, 'authenticated', admin, async () => {
      await db.query("insert into public.activity_logs (actor_id, action, entity_type) values ($1, 'login', 'auth')", [admin.id]);
      await expect(
        db.query("insert into public.activity_logs (actor_id, action, entity_type) values ($1, 'login', 'auth')", [editor.id]),
      ).rejects.toThrow(/row-level security/i);
      await expectDenied(db.query("update public.activity_logs set summary = 'tampered'"));
      await expectDenied(db.query('delete from public.activity_logs'));
    });
  });
});

describe('article files', () => {
  it('are only public when ready, public and attached to a published article', async () => {
    const [article] = await rows<{ id: string }>(db, 'select id from public.articles where slug = $1', [HAZARD_SLUG]);
    const [draft] = await rows<{ id: string }>(db, 'select id from public.articles where slug = $1', [DRAFT_SLUG]);

    const insertFile = (articleId: string, visibility: string, status: string) =>
      actAs(db, 'authenticated', admin, async () => {
        const fileId = crypto.randomUUID();
        await db.query(
          `insert into public.article_files (id, article_id, original_filename, internal_name, storage_path, size_bytes, visibility, status, uploaded_by)
           values ($1, $2, 'paper.pdf', $3, $4, 1024, $5, $6, $7)`,
          [fileId, articleId, `${fileId}.pdf`, `articles/${articleId}/${fileId}.pdf`, visibility, status, admin.id],
        );
        return fileId;
      });

    const publicReady = await insertFile(article.id, 'public', 'ready');
    const privateReady = await insertFile(article.id, 'private', 'ready');
    const publicPending = await insertFile(article.id, 'public', 'pending');
    const publicOnDraft = await insertFile(draft.id, 'public', 'ready');

    const visible = await actAs(db, 'anon', null, () => rows<{ id: string }>(db, 'select id from public.article_files'));
    expect(visible.map((row) => row.id)).toEqual([publicReady]);
    expect(visible.map((row) => row.id)).not.toContain(privateReady);
    expect(visible.map((row) => row.id)).not.toContain(publicPending);
    expect(visible.map((row) => row.id)).not.toContain(publicOnDraft);

    const [{ detail }] = await actAs(db, 'anon', null, () =>
      rows<{ detail: { files: Array<{ id: string }> } }>(db, 'select public.article_detail_json($1, true) as detail', [
        article.id,
      ]),
    );
    expect(detail.files.map((file) => file.id)).toEqual([publicReady]);
  });

  it('rejects path traversal and non-PDF metadata at the database level', async () => {
    await actAs(db, 'authenticated', admin, async () => {
      const fileId = crypto.randomUUID();
      await expect(
        db.query(
          `insert into public.article_files (article_id, original_filename, internal_name, storage_path, size_bytes, uploaded_by)
           values (null, 'x.pdf', $1, $2, 10, $3)`,
          [`${fileId}.pdf`, `../../etc/${fileId}.pdf`, admin.id],
        ),
      ).rejects.toThrow(/check constraint/i);
      await expect(
        db.query(
          `insert into public.article_files (article_id, original_filename, internal_name, storage_path, mime_type, size_bytes, uploaded_by, status)
           values (null, 'x.html', $1, $2, 'text/html', 10, $3, 'ready')`,
          [`${fileId}.pdf`, `cv/${fileId}.pdf`, admin.id],
        ),
      ).rejects.toThrow(/check constraint/i);
    });
  });

  it('cannot be inserted on behalf of another user', async () => {
    await expect(
      actAs(db, 'authenticated', admin, () => {
        const fileId = crypto.randomUUID();
        return db.query(
          `insert into public.article_files (original_filename, internal_name, storage_path, size_bytes, uploaded_by, kind, status)
           values ('cv.pdf', $1, $2, 10, $3, 'cv', 'ready')`,
          [`${fileId}.pdf`, `cv/${fileId}.pdf`, editor.id],
        );
      }),
    ).rejects.toThrow(/row-level security/i);
  });
});

describe('editors (prepared role)', () => {
  it('can draft their own articles but cannot publish or delete', async () => {
    await actAs(db, 'authenticated', editor, async () => {
      const [{ saved }] = await rows<{ saved: { id: string } }>(
        db,
        "select public.admin_save_article(null, '{\"title\":\"Editor draft\"}'::jsonb) as saved",
      );
      await expect(db.query("update public.articles set status = 'published' where id = $1", [saved.id])).rejects.toThrow(
        /row-level security/i,
      );
      const deleted = await db.query('delete from public.articles where id = $1', [saved.id]);
      expect(deleted.affectedRows).toBe(0);

      const others = await db.query("update public.articles set title = 'x' where slug = $1", [HAZARD_SLUG]);
      expect(others.affectedRows).toBe(0);
      await expectDenied(db.query('select public.admin_save_project(null, \'{"title":"x"}\'::jsonb)'));
    });
  });
});
