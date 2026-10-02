import { describe, expect, it } from 'vitest';

import { compile, sql } from './sql';

describe('sql template', () => {
  it('turns every interpolated value into a bind parameter', () => {
    const hostile = "x'; drop table public.articles; --";
    const query = compile(sql`select * from public.articles where slug = ${hostile} and status = ${'published'}`);
    expect(query.text).toBe('select * from public.articles where slug = $1 and status = $2');
    expect(query.values).toEqual([hostile, 'published']);
  });

  it('composes fragments and keeps parameter numbering consistent', () => {
    const conditions = [sql`deleted_at is null`, sql`title ilike ${'%a%'}`, sql`status = ${'draft'}`];
    const where = sql.join(conditions, sql` and `);
    const query = compile(sql`select id from t where ${where} limit ${20} offset ${40}`);
    expect(query.text).toBe('select id from t where deleted_at is null and title ilike $1 and status = $2 limit $3 offset $4');
    expect(query.values).toEqual(['%a%', 'draft', 20, 40]);
  });

  it('handles empty fragments', () => {
    expect(compile(sql`select 1 ${sql.empty}`).text).toBe('select 1 ');
    expect(compile(sql`select ${sql.join([])}`).text).toBe('select ');
  });
});
