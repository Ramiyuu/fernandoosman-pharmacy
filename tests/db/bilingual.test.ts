import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { actAs, createTestDatabase, createUser, type TestUser } from './test-database';

/**
 * Language versions (0016): one row per language, linked to the original,
 * listings that prefer the visitor's language, and the copy-to-translate RPCs.
 */

let db: PGlite;
let admin: TestUser;
let original: string;
let untranslated: string;
let topic: string;

type Card = { id: string; slug: string; language: string; translation_group: string };

async function value<T>(sql: string, params: unknown[] = []): Promise<T> {
  return (await actAs(db, 'web_anon', null, () => db.query<{ value: T }>(sql, params))).rows[0].value;
}

beforeAll(async () => {
  db = await createTestDatabase({ seed: false });
  admin = await createUser(db, 'bilingual@test.example', 'admin');
  topic = (
    await db.query<{ id: string }>(
      `insert into public.topics (name, name_pt, slug) values ('Clinical Research', 'Pesquisa Clínica', 'clinical-research') returning id`,
    )
  ).rows[0].id;
  original = (
    await db.query<{ id: string }>(
      `insert into public.articles (title, slug, excerpt, status, published_at, language, featured)
       values ('Hazard ratios explained', 'hazard-ratios', 'What an HR does and does not say.', 'published', now() - interval '2 days', 'en', true)
       returning id`,
    )
  ).rows[0].id;
  untranslated = (
    await db.query<{ id: string }>(
      `insert into public.articles (title, slug, status, published_at, language)
       values ('Only in English', 'only-english', 'published', now() - interval '1 day', 'en') returning id`,
    )
  ).rows[0].id;
  await db.query(`insert into public.article_topics (article_id, topic_id) values ($1, $2), ($3, $2)`, [original, topic, untranslated]);
  await db.query(
    `insert into public.article_references (article_id, position, title, doi) values ($1, 0, 'A trial', '10.1000/xyz')`,
    [original],
  );
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe('bilingual content', () => {
  let translation: string;

  it('copies an article into a draft in the other language', async () => {
    const result = await actAs(db, 'web_admin', admin, () =>
      db.query<{ value: { id: string; created: boolean } }>(
        `select public.admin_create_article_translation($1, 'pt') as value`,
        [original],
      ),
    );
    translation = result.rows[0].value.id;
    expect(result.rows[0].value.created).toBe(true);

    const row = (
      await db.query<{ language: string; status: string; translation_of_article_id: string; slug: string; featured: boolean }>(
        'select * from public.articles where id = $1',
        [translation],
      )
    ).rows[0];
    expect(row).toMatchObject({ language: 'pt', status: 'draft', translation_of_article_id: original, featured: false });
    expect(row.slug).toBe('hazard-ratios-pt');

    const references = await db.query('select * from public.article_references where article_id = $1', [translation]);
    const topics = await db.query('select * from public.article_topics where article_id = $1', [translation]);
    expect(references.rows).toHaveLength(1);
    expect(topics.rows).toHaveLength(1);
  });

  it('returns the existing version instead of creating a second one', async () => {
    const again = await actAs(db, 'web_admin', admin, () =>
      db.query<{ value: { id: string; created: boolean } }>(
        `select public.admin_create_article_translation($1, 'pt') as value`,
        [original],
      ),
    );
    expect(again.rows[0].value).toEqual({ id: translation, created: false });
    // Asking a version for its own language is a mistake, not a lookup.
    await expect(
      actAs(db, 'web_admin', admin, () => db.query(`select public.admin_create_article_translation($1, 'pt')`, [translation])),
    ).rejects.toMatchObject({ code: 'FOT01' });
  });

  it('refuses chains, same-language links and duplicate languages', async () => {
    await expect(
      db.query(`update public.articles set translation_of_article_id = $1 where id = $2`, [translation, untranslated]),
    ).rejects.toMatchObject({ code: 'FOT01' });
    await expect(
      db.query(`update public.articles set translation_of_article_id = $1 where id = $2`, [original, untranslated]),
    ).rejects.toMatchObject({ code: 'FOT01' });
    await expect(
      db.query(
        `insert into public.articles (title, slug, language, translation_of_article_id) values ('Outra', 'outra', 'pt', $1)`,
        [original],
      ),
    ).rejects.toMatchObject({ code: 'FOT01' });
  });

  it('shows each text once per listing, in the visitor language when published', async () => {
    const before = await value<{ items: Card[] }>(`select public.get_published_articles(p_locale => 'pt') as value`);
    // The Portuguese draft is not public yet: both English originals show.
    expect(before.items.map((item) => item.slug).sort()).toEqual(['hazard-ratios', 'only-english']);

    await db.query(`update public.articles set status = 'published', title = 'Hazard ratio, explicado' where id = $1`, [translation]);

    const pt = await value<{ total: number; items: Card[] }>(`select public.get_published_articles(p_locale => 'pt') as value`);
    expect(pt.total).toBe(2);
    expect(pt.items.map((item) => item.slug).sort()).toEqual(['hazard-ratios-pt', 'only-english']);

    const en = await value<{ items: Card[] }>(`select public.get_published_articles(p_locale => 'en') as value`);
    expect(en.items.map((item) => item.slug).sort()).toEqual(['hazard-ratios', 'only-english']);

    const group = pt.items.find((item) => item.slug === 'hazard-ratios-pt');
    expect(group?.translation_group).toBe(original);
  });

  it('links the two versions on the article page', async () => {
    const detail = await value<{ translation: { slug: string; language: string } | null }>(
      `select public.get_article_by_slug('hazard-ratios') as value`,
    );
    expect(detail.translation).toEqual(expect.objectContaining({ slug: 'hazard-ratios-pt', language: 'pt' }));
  });

  it('serves the featured article in the visitor language', async () => {
    const featured = await value<Card>(`select public.get_featured_article('pt') as value`);
    expect(featured.slug).toBe('hazard-ratios-pt');
    const english = await value<Card>(`select public.get_featured_article('en') as value`);
    expect(english.slug).toBe('hazard-ratios');
  });

  it('counts a text published in both languages once', async () => {
    const metrics = await value<{ articles_published: number; references_reviewed: number }>(
      `select public.get_public_metrics('pt') as value`,
    );
    expect(metrics.articles_published).toBe(2);
    expect(metrics.references_reviewed).toBe(1);

    const topics = await actAs(db, 'web_anon', null, () =>
      db.query<{ name_pt: string; article_count: number }>(`select * from public.get_topics_with_counts('pt')`),
    );
    expect(topics.rows[0]).toMatchObject({ name_pt: 'Pesquisa Clínica' });
    expect(Number(topics.rows[0].article_count)).toBe(2);
  });

  it('finds a text by either version and returns it once, in the visitor language', async () => {
    const results = await value<{ total: number; items: Card[] }>(`select public.search_content('hazard', 10, 0, 'pt') as value`);
    expect(results.total).toBe(1);
    expect(results.items[0].slug).toBe('hazard-ratios-pt');
  });

  it('lists every version with its group in the sitemap', async () => {
    const entries = await value<{ articles: Array<{ slug: string; language: string; group: string }> }>(
      `select public.get_sitemap_entries() as value`,
    );
    const group = entries.articles.filter((entry) => entry.group === original).map((entry) => entry.language).sort();
    expect(group).toEqual(['en', 'pt']);
  });

  it('copies projects too, and keeps their language when saved', async () => {
    const project = (
      await db.query<{ id: string }>(
        `insert into public.projects (title, slug, status, published_at) values ('Dashboard', 'dashboard', 'published', now()) returning id`,
      )
    ).rows[0].id;
    const copy = await actAs(db, 'web_admin', admin, () =>
      db.query<{ value: { id: string; created: boolean } }>(
        `select public.admin_create_project_translation($1, 'pt') as value`,
        [project],
      ),
    );
    const id = copy.rows[0].value.id;
    await actAs(db, 'web_admin', admin, () =>
      db.query(`select public.admin_save_project($1, $2::jsonb, '{}')`, [
        id,
        JSON.stringify({ title: 'Painel', slug: 'painel', status: 'published', language: 'pt' }),
      ]),
    );
    const listed = await value<{ items: Card[] }>(`select public.get_published_projects(12, 0, 'pt') as value`);
    expect(listed.items.map((item) => item.slug)).toEqual(['painel']);
    const detail = await value<{ translation: { slug: string } | null }>(`select public.get_project_by_slug('painel') as value`);
    expect(detail.translation?.slug).toBe('dashboard');
  });
});
