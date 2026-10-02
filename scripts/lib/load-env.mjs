import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Loads .env.local and .env (in that order of precedence) for the CLI scripts,
 * the same files Next.js reads. Variables already set in the environment (for
 * example by Railway) always win. Minimal parser: KEY=value, optional quotes,
 * `#` comments.
 */
export function loadEnvFiles(root) {
  for (const name of ['.env.local', '.env']) {
    const file = join(root, name);
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)?\s*$/.exec(line);
      if (!match) continue;
      const [, key, raw = ''] = match;
      if (process.env[key] !== undefined) continue;
      let value = raw.trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      } else {
        value = value.replace(/\s+#.*$/, '');
      }
      process.env[key] = value;
    }
  }
}
