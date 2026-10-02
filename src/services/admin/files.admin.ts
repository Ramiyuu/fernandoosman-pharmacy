import 'server-only';

import type { ServerSupabase } from '@/lib/supabase/server';
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

export async function listDocuments(supabase: ServerSupabase): Promise<{ total: number; items: AdminDocument[] }> {
  const { data, error } = await supabase.rpc('admin_list_files', { p_limit: 200, p_offset: 0 });
  if (error) failQuery('admin.files.documents', error);
  return data as unknown as { total: number; items: AdminDocument[] };
}

export async function listImages(supabase: ServerSupabase): Promise<AdminImage[]> {
  const { data, error } = await supabase
    .from('media_files')
    .select('id, bucket, storage_path, original_filename, mime_type, size_bytes, width, height, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) failQuery('admin.files.images', error);
  return data ?? [];
}
