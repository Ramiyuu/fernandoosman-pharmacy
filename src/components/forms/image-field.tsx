'use client';

import { ImagePlus, LoaderCircle, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IMAGE_BUCKETS, type ImageBucketKey } from '@/config/uploads';
import { ACCEPTED_IMAGE_TYPES, uploadImage } from '@/features/files/client/upload-image';
import { publicImageUrl } from '@/lib/storage/public-url';
import { cn } from '@/utils/cn';

interface ImageFieldProps {
  id: string;
  label: string;
  bucket: ImageBucketKey;
  path: string | null;
  onPathChange: (path: string | null) => void;
  alt?: string;
  onAltChange?: (alt: string) => void;
  aspect?: 'wide' | 'portrait';
}

export function ImageField({ id, label, bucket, path, onPathChange, alt, onAltChange, aspect = 'wide' }: ImageFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const url = publicImageUrl(IMAGE_BUCKETS[bucket], path);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const uploaded = await uploadImage(file, bucket);
      onPathChange(uploaded.path);
      toast.success('Image uploaded.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <p id={`${id}-label`} className="text-sm font-medium text-navy-900">
        {label}
      </p>
      <div className={cn('relative overflow-hidden rounded-lg border border-rule bg-mist', aspect === 'wide' ? 'aspect-[16/9]' : 'aspect-[4/5] max-w-48')}>
        {url ? (
          <Image src={url} alt={alt ?? ''} fill sizes="320px" className="object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-sm text-muted">No image</span>
        )}
        {uploading ? (
          <span className="absolute inset-0 flex items-center justify-center bg-white/70" role="status">
            <LoaderCircle className="size-5 animate-spin text-navy-700" aria-hidden="true" />
            <span className="sr-only">Uploading</span>
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" disabled={uploading} onClick={() => input.current?.click()} aria-describedby={`${id}-label`}>
          <ImagePlus aria-hidden="true" /> {url ? 'Replace' : 'Upload'}
        </Button>
        {url ? (
          <Button variant="danger-ghost" size="sm" disabled={uploading} onClick={() => onPathChange(null)}>
            <Trash2 aria-hidden="true" /> Remove
          </Button>
        ) : null}
      </div>
      {onAltChange ? (
        <div className="space-y-1">
          <label htmlFor={`${id}-alt`} className="text-xs font-medium text-muted">
            Alternative text
          </label>
          <Input id={`${id}-alt`} value={alt ?? ''} onChange={(event) => onAltChange(event.target.value)} maxLength={300} placeholder="Describe the image" />
        </div>
      ) : null}
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void handleFile(file);
        }}
      />
      <p className="text-xs text-muted">JPG, PNG, WebP, AVIF or GIF, up to 4 MB.</p>
    </div>
  );
}
