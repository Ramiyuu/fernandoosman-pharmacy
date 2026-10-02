import 'server-only';

import type { Db } from '@/lib/db/client';
import { sql } from '@/lib/db/sql';
import type { ContentStatus, FileKind, FileStatus, FileVisibility } from '@/types/database.types';

import { failQuery } from '../errors';

export interface AdminDocument {
  id: string;
  kind: FileKind;
  original_filename: string;
  label: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  visibility: FileVisibility;
  status: FileStatus;
  created_at: string;
  is_current_cv: boolean;
  article: { id: string; title: string; slug: string; status: ContentStatus; deleted_at: string | null } | null;
}

export interface AdminImage {
  id: string;
  bucket: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  created_at: string;
}

export async function listDocuments(db: Db): Promise<{ total: number; items: AdminDocument[] }> {
  try {
    const row = await db.one<{ value: { total: number; items: AdminDocument[] } }>(
      sql`select public.admin_list_files(p_limit => 200, p_offset => 0) as value`,
    );
    return row.value;
  } catch (error) {
    failQuery('admin.files.documents', error);
  }
}

export async function listImages(db: Db): Promise<AdminImage[]> {
  try {
    return await db.many<AdminImage>(sql`
      select id, bucket, storage_path, original_filename, mime_type, size_bytes, width, height, created_at
      from public.media_files order by created_at desc limit 200`);
  } catch (error) {
    failQuery('admin.files.images', error);
  }
}
