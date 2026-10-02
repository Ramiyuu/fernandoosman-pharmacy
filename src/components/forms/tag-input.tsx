'use client';

import { X } from 'lucide-react';
import { useId, useState, type KeyboardEvent } from 'react';

import { Input } from '@/components/ui/input';

interface TagInputProps {
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
  suggestions?: string[];
  max?: number;
  maxLength?: number;
  placeholder?: string;
  describedBy?: string;
}

/** Free-text chips: Enter or comma adds, Backspace on empty input removes the last one. */
export function TagInput({ id, value, onChange, suggestions = [], max = 15, maxLength = 50, placeholder, describedBy }: TagInputProps) {
  const [draft, setDraft] = useState('');
  const listId = useId();

  const add = (raw: string) => {
    const tag = raw.trim().replace(/\s+/g, ' ').slice(0, maxLength);
    if (!tag || value.length >= max) return;
    if (value.some((existing) => existing.toLowerCase() === tag.toLowerCase())) return;
    onChange([...value, tag]);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      add(draft);
      setDraft('');
    } else if (event.key === 'Backspace' && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div>
      {value.length > 0 ? (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <li key={tag} className="inline-flex items-center gap-1 rounded-sm bg-navy-50 py-0.5 pr-1 pl-2 text-xs text-navy-900 ring-1 ring-rule ring-inset">
              {tag}
              <button
                type="button"
                onClick={() => onChange(value.filter((item) => item !== tag))}
                className="rounded-sm p-0.5 text-muted hover:bg-navy-100 hover:text-ink"
                aria-label={`Remove ${tag}`}
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Input
        id={id}
        value={draft}
        list={listId}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (draft.trim()) {
            add(draft);
            setDraft('');
          }
        }}
        placeholder={value.length >= max ? `Maximum of ${max} reached` : placeholder}
        disabled={value.length >= max}
        aria-describedby={describedBy}
        maxLength={maxLength}
      />
      <datalist id={listId}>
        {suggestions
          .filter((suggestion) => !value.includes(suggestion))
          .slice(0, 100)
          .map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
      </datalist>
    </div>
  );
}
