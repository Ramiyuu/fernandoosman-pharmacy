import Image from 'next/image';

import type { ImageBucket } from '@/config/uploads';
import { publicImageUrl } from '@/lib/storage/public-url';
import { cn } from '@/utils/cn';

import { FigureMotif } from './figure-motif';

interface CoverImageProps {
  bucket: ImageBucket;
  path: string | null;
  alt: string;
  seed: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}

/** Cover image from storage, or a generated figure motif when none was uploaded. */
export function CoverImage({ bucket, path, alt, seed, sizes, priority, className }: CoverImageProps) {
  const src = publicImageUrl(bucket, path);
  return (
    <div className={cn('relative overflow-hidden bg-mist', className)}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <FigureMotif seed={seed} className="absolute inset-0 size-full" />
      )}
    </div>
  );
}
