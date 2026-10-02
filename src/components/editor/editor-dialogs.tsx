'use client';

import { useState, type FormEvent, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { safeHref } from '@/utils/url';

interface PromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  submitLabel: string;
  children: ReactNode;
  onSubmit: () => boolean | void;
  extraAction?: ReactNode;
}

function PromptDialog({ open, onOpenChange, title, description, submitLabel, children, onSubmit, extraAction }: PromptDialogProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (onSubmit() !== false) onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogTitle>{title}</DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {children}
          <DialogFooter>
            {extraAction}
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function LinkDialog({ open, onOpenChange, initialHref, onApply, onRemove }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialHref: string;
  onApply: (href: string) => void;
  onRemove: () => void;
}) {
  const [href, setHref] = useState(initialHref);
  const [error, setError] = useState<string | null>(null);
  return (
    <PromptDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initialHref ? 'Edit link' : 'Add link'}
      submitLabel="Apply link"
      extraAction={
        initialHref ? (
          <Button variant="danger-ghost" onClick={() => { onRemove(); onOpenChange(false); }}>
            Remove link
          </Button>
        ) : null
      }
      onSubmit={() => {
        const value = href.trim();
        const normalized = /^(https?:|mailto:|\/|#)/i.test(value) ? value : `https://${value}`;
        if (!safeHref(normalized)) {
          setError('Enter a web address (https://…), an email link (mailto:…) or a site path (/articles/…).');
          return false;
        }
        onApply(normalized);
      }}
    >
      <Field id="editor-link" label="URL" error={error ?? undefined}>
        <Input id="editor-link" value={href} onChange={(event) => setHref(event.target.value)} placeholder="https://doi.org/10.1000/xyz" autoComplete="off" />
      </Field>
    </PromptDialog>
  );
}

export function MathDialog({ open, onOpenChange, initialLatex, display, onApply }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialLatex: string;
  display: boolean;
  onApply: (latex: string) => void;
}) {
  const [latex, setLatex] = useState(initialLatex);
  return (
    <PromptDialog
      open={open}
      onOpenChange={onOpenChange}
      title={display ? 'Formula (own line)' : 'Inline formula'}
      description="Write the formula in LaTeX, for example \frac{a}{b} or \bar{x} \pm 1.96 \cdot SE."
      submitLabel={initialLatex ? 'Update formula' : 'Insert formula'}
      onSubmit={() => {
        if (!latex.trim()) return false;
        onApply(latex.trim().slice(0, 2000));
      }}
    >
      <Field id="editor-latex" label="LaTeX">
        <Textarea id="editor-latex" value={latex} onChange={(event) => setLatex(event.target.value)} rows={4} className="font-mono" spellCheck={false} />
      </Field>
    </PromptDialog>
  );
}

export function CitationDialog({ open, onOpenChange, referenceCount, onApply }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referenceCount: number;
  onApply: (refs: string) => void;
}) {
  const [value, setValue] = useState('1');
  const [error, setError] = useState<string | null>(null);
  return (
    <PromptDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Cite references"
      description={
        referenceCount > 0
          ? `Enter reference numbers from the References list (1 to ${referenceCount}), separated by commas.`
          : 'Add references in the References section first, then cite them by number.'
      }
      submitLabel="Insert citation"
      onSubmit={() => {
        const numbers = value.split(',').map((part) => Number(part.trim()));
        const valid = numbers.length > 0 && numbers.length <= 10 && numbers.every((n) => Number.isInteger(n) && n >= 1 && n <= Math.max(referenceCount, 1));
        if (!valid) {
          setError(`Use numbers between 1 and ${Math.max(referenceCount, 1)}.`);
          return false;
        }
        onApply([...new Set(numbers)].sort((a, b) => a - b).join(','));
      }}
    >
      <Field id="editor-citation" label="Reference numbers" error={error ?? undefined}>
        <Input id="editor-citation" value={value} onChange={(event) => setValue(event.target.value)} inputMode="numeric" />
      </Field>
    </PromptDialog>
  );
}

export function ImageDetailsDialog({ open, onOpenChange, previewUrl, onApply }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewUrl: string | null;
  onApply: (details: { alt: string; caption: string }) => void;
}) {
  const [alt, setAlt] = useState('');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <PromptDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Describe the image"
      description="Alternative text is read aloud by screen readers. Describe what the figure shows."
      submitLabel="Insert image"
      onSubmit={() => {
        if (!alt.trim()) {
          setError('Add a short description of the image.');
          return false;
        }
        onApply({ alt: alt.trim().slice(0, 300), caption: caption.trim().slice(0, 300) });
      }}
    >
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- local preview inside the admin dialog
        <img src={previewUrl} alt="" className="max-h-48 w-full rounded-md border border-rule object-contain" />
      ) : null}
      <Field id="editor-image-alt" label="Alternative text" required error={error ?? undefined}>
        <Input id="editor-image-alt" value={alt} onChange={(event) => setAlt(event.target.value)} />
      </Field>
      <Field id="editor-image-caption" label="Caption" hint="Optional, shown under the figure.">
        <Input id="editor-image-caption" value={caption} onChange={(event) => setCaption(event.target.value)} />
      </Field>
    </PromptDialog>
  );
}
