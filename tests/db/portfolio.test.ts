import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDatabase, createUser, actAs, type TestUser } from './test-database';
import type { PGlite } from '@electric-sql/pglite';
let db: PGlite;
let admin: TestUser;
let article: string;
let file: string;
beforeAll(async () => {
  db = await createTestDatabase({ seed: false });
  admin = await createUser(db, 'portfolio@test.example', 'admin');
  article = (
    await db.query<{ id: string }>(
      `insert into public.articles(title,slug,status,published_at) values('Test','test','published',now()) returning id`,
    )
  ).rows[0].id;
  file = (
    await db.query<{ id: string }>(
      `insert into public.article_files(kind,original_filename,internal_name,storage_path,size_bytes,status,visibility) values('resource','certificate.pdf','11111111-1111-4111-8111-111111111111.pdf','resources/11111111-1111-4111-8111-111111111111.pdf',100,'ready','public') returning id`,
    )
  ).rows[0].id;
}, 30000);
afterAll(async () => {
  await db?.close();
});
describe('portfolio migrations and access', () => {
  it('initializes editable truthful profile without seed', async () => {
    const row = (
      await db.query<{ full_name: string; current_semester: number | null }>('select * from public.site_profile')
    ).rows[0];
    expect(row.full_name).toBe('Fernando Osman');
    expect(row.current_semester).toBeNull();
  });
  it('hides unattached certificate documents', async () => {
    const result = await actAs(db, 'web_anon', null, () =>
      db.query('select id from public.article_files where id=$1', [file]),
    );
    expect(result.rows).toHaveLength(0);
  });
  it('publishes only a visible certificate attachment', async () => {
    await db.query('update public.site_profile set certifications=$1::jsonb', [
      JSON.stringify([{ name: 'Certificate', pdf_file_id: file, visible: true }]),
    ]);
    const result = await actAs(db, 'web_anon', null, () =>
      db.query('select id from public.article_files where id=$1', [file]),
    );
    expect(result.rows).toHaveLength(1);
    await db.query('update public.site_profile set certifications=$1::jsonb', [
      JSON.stringify([{ name: 'Certificate', pdf_file_id: file, visible: false }]),
    ]);
    const hidden = await actAs(db, 'web_anon', null, () =>
      db.query('select id from public.article_files where id=$1', [file]),
    );
    expect(hidden.rows).toHaveLength(0);
  });
  it('deduplicates analytics and forbids public access', async () => {
    const query = `insert into public.analytics_events(kind,entity_id,article_id,session_hash,window_start) values('article_view',$1,$1,repeat('a',64),'2026-10-02T12:00:00Z') on conflict do nothing`;
    await actAs(db, 'web_server', null, () => db.query(query, [article]));
    await actAs(db, 'web_server', null, () => db.query(query, [article]));
    await expect(actAs(db, 'web_anon', null, () => db.query('select * from public.analytics_events'))).rejects.toThrow(
      /permission denied/,
    );
    expect(
      (await actAs(db, 'web_admin', admin, () => db.query('select * from public.analytics_events'))).rows,
    ).toHaveLength(1);
    expect(
      (await actAs(db, 'web_admin', null, () => db.query('select * from public.analytics_events'))).rows,
    ).toHaveLength(0);
  });
  it('keeps file views and downloads separate', async () => {
    for (const kind of ['file_view', 'file_download'])
      await actAs(db, 'web_server', null, () =>
        db.query(
          `insert into public.analytics_events(kind,entity_id,file_id,session_hash,window_start) values($1,$2,$2,repeat('b',64),now())`,
          [kind, file],
        ),
      );
    expect(
      (
        await actAs(db, 'web_admin', admin, () =>
          db.query('select distinct kind from public.analytics_events where file_id=$1', [file]),
        )
      ).rows,
    ).toHaveLength(2);
  });
  it('protects videos when an article becomes a draft', async () => {
    await db.query(
      `insert into public.videos(article_id,filename,mime_type,size_bytes,storage_key,ready) values($1,'test.mp4','video/mp4',100,'videos/11111111-1111-4111-8111-111111111111.mp4',true)`,
      [article],
    );
    expect((await actAs(db, 'web_anon', null, () => db.query('select * from public.videos'))).rows).toHaveLength(1);
    await db.query(`update public.articles set status='draft' where id=$1`, [article]);
    expect((await actAs(db, 'web_anon', null, () => db.query('select * from public.videos'))).rows).toHaveLength(0);
  });
  it('persists complete scientific references through the existing RPC', async () => {
    await actAs(db, 'web_admin', admin, () =>
      db.query(`select public.admin_save_article($1,$2::jsonb,'{}','{}',$3::jsonb)`, [
        article,
        JSON.stringify({ title: 'Test', pmid: '123456', content: { type: 'doc', content: [] } }),
        JSON.stringify([{ title: 'Study', authors: 'A Author', volume: '12', issue: '2', pages: '10-20' }]),
      ]),
    );
    const ref = (
      await db.query<{ volume: string; issue: string; pages: string }>(
        'select * from public.article_references where article_id=$1',
        [article],
      )
    ).rows[0];
    expect(ref).toMatchObject({ volume: '12', issue: '2', pages: '10-20' });
  });
});
