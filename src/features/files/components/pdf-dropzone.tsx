'use client';

import { CircleAlert, FileUp, LoaderCircle, X } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { formatBytes } from '@/utils/format';

import type { UploadItem } from '../client/use-pdf-uploads';

const PHASE_LABEL: Record<UploadItem['phase'], string> = {
  checking: 'Checking',
  uploading: 'Uploading',
  verifying: 'Verifying',
  done: 'Uploaded',
  error: 'Failed',
};

interface PdfDropzoneProps {
  items: UploadItem[];
  onFiles: (files: FileList | File[]) => void;
  onDismiss: (key: string) => void;
  maxBytes: number;
  disabled?: boolean;
  multiple?: boolean;
  hint?: string;
}

/** Drag-and-drop area with a keyboard-accessible button and live upload progress. */
export function PdfDropzone({ items, onFiles, onDismiss, maxBytes, disabled, multiple = true, hint }: PdfDropzoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled && event.dataTransfer.files.length > 0) onFiles(event.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-rule-strong bg-mist px-4 py-8 text-center transition-colors',
          dragging && 'border-teal-500 bg-teal-50',
          disabled && 'opacity-60',
        )}
      >
        <FileUp className="size-6 text-navy-700" aria-hidden="true" />
        <p className="text-sm text-navy-900">Drag PDF files here, or</p>
        <Button variant="secondary" size="sm" disabled={disabled} onClick={() => input.current?.click()}>
          Upload PDF
        </Button>
        <p className="text-xs text-muted">{hint ?? `PDF only, up to ${formatBytes(maxBytes)} each.`}</p>
        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          multiple={multiple}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            if (event.target.files?.length) onFiles(event.target.files);
            event.target.value = '';
          }}
        />
      </div>

      {items.length > 0 ? (
        <ul className="space-y-2" aria-live="polite">
          {items.map((item) => (
            <li key={item.key} className="rounded-lg border border-rule bg-white px-3 py-2.5">
              <div className="flex items-center gap-3">
                {item.phase === 'error' ? (
                  <CircleAlert className="size-4 shrink-0 text-danger-700" aria-hidden="true" />
                ) : (
                  <LoaderCircle className={cn('size-4 shrink-0 text-navy-700', item.phase !== 'done' && 'animate-spin')} aria-hidden="true" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                  <p className={cn('text-xs', item.phase === 'error' ? 'text-danger-700' : 'text-muted')}>
                    {item.phase === 'error' ? item.error : `${PHASE_LABEL[item.phase]}${item.phase === 'uploading' ? ` ${item.progress}%` : ''}, ${formatBytes(item.size)}`}
                  </p>
                </div>
                {item.phase === 'error' ? (
                  <Button variant="ghost" size="icon-sm" onClick={() => onDismiss(item.key)} aria-label={`Dismiss ${item.name}`}>
                    <X aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
              {item.phase === 'uploading' || item.phase === 'verifying' ? (
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-mist"
                  role="progressbar"
                  aria-label={`Upload progress for ${item.name}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={item.progress}
                >
                  <div className="h-full bg-teal-500 transition-[width]" style={{ width: `${item.progress}%` }} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
