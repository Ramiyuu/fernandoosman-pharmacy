import pg from 'pg';
import { loadEnvFiles } from './lib/load-env.mjs';
loadEnvFiles(process.cwd());
if (!process.env.MIGRATION_DATABASE_URL) throw new Error('Set MIGRATION_DATABASE_URL for maintenance.');
const db = new pg.Client({ connectionString: process.env.MIGRATION_DATABASE_URL });
try {
  await db.connect();
  const removed = await db.query("delete from public.analytics_events where created_at < now() - interval '365 days'");
  // Quarantine objects expire through the required R2 pending/ lifecycle rule.
  await db.query("delete from public.videos where not ready and created_at < now() - interval '1 day'");
  console.log(`Maintenance complete: ${removed.rowCount} expired analytics events removed.`);
} finally {
  await db.end();
}
