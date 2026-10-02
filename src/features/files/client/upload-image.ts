import type { ImageBucketKey } from '@/config/uploads';

export interface UploadedImage {
  id: string;
  bucket: string;
  path: string;
  url: string;
  width: number;
  height: number;
}

export const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/avif,image/gif';

/** Uploads an image through the validating Route Handler. Throws with a user-facing message. */
export async function uploadImage(file: File, bucket: ImageBucketKey): Promise<UploadedImage> {
  const body = new FormData();
  body.append('file', file);

  let response: Response;
  try {
    response = await fetch(`/api/admin/uploads/image?bucket=${bucket}`, { method: 'POST', body, credentials: 'same-origin' });
  } catch {
    throw new Error('Upload failed: the server could not be reached.');
  }

  const payload = (await response.json().catch(() => null)) as (UploadedImage & { error?: string }) | null;
  if (!response.ok || !payload || payload.error) {
    throw new Error(payload?.error ?? `Upload failed (${response.status}).`);
  }
  return payload;
}
