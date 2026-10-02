/**
 * Tagged template for SQL. Interpolated values ALWAYS become bind parameters
 * ($1, $2…), so user input can never change the structure of a query. Only
 * other `sql` fragments are spliced in as SQL text, which is how optional
 * clauses are composed:
 *
 *   const where = query ? sql`and title ilike ${pattern}` : sql.empty;
 *   db.many(sql`select id from articles where deleted_at is null ${where}`);
 */

const FRAGMENT = Symbol('sql.fragment');

export interface SqlFragment {
  readonly [FRAGMENT]: true;
  readonly strings: readonly string[];
  readonly values: readonly unknown[];
}

export interface CompiledQuery {
  text: string;
  values: unknown[];
}

function isFragment(value: unknown): value is SqlFragment {
  return typeof value === 'object' && value !== null && FRAGMENT in value;
}

function fragment(strings: readonly string[], values: readonly unknown[]): SqlFragment {
  return { [FRAGMENT]: true, strings, values };
}

export function sql(strings: TemplateStringsArray, ...values: unknown[]): SqlFragment {
  return fragment([...strings], values);
}

sql.empty = fragment([''], []);

/** Joins fragments with a separator fragment, e.g. sql.join(conditions, sql` and `). */
sql.join = (parts: readonly SqlFragment[], separator: SqlFragment = sql`, `): SqlFragment => {
  if (parts.length === 0) return sql.empty;
  const strings: string[] = [''];
  const values: unknown[] = [];
  parts.forEach((part, index) => {
    if (index > 0) {
      values.push(separator);
      strings.push('');
    }
    values.push(part);
    strings.push('');
  });
  return fragment(strings, values);
};

export function compile(query: SqlFragment): CompiledQuery {
  const values: unknown[] = [];
  const walk = (part: SqlFragment): string => {
    let text = part.strings[0] ?? '';
    part.values.forEach((value, index) => {
      if (isFragment(value)) {
        text += walk(value);
      } else {
        values.push(value);
        text += `$${values.length}`;
      }
      text += part.strings[index + 1] ?? '';
    });
    return text;
  };
  return { text: walk(query), values };
}
