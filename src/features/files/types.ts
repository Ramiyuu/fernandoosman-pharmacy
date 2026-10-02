import type { FileStatus, FileVisibility } from '@/types/database.types';

/** A stored PDF as returned by POST /api/admin/uploads/pdf. */
export interface UploadedFile {
  id: string;
  original_filename: string;
  label: string;
  size_bytes: number;
  visibility: FileVisibility;
  status: FileStatus;
  created_at: string;
}
