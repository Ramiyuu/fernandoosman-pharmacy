'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
export function FootnoteControl({ onInsert }: { onInsert: (id: string, text: string) => void }) {
  const [text, setText] = useState('');
  return (
    <details className="border-b border-rule px-4 py-3 text-sm">
      <summary className="cursor-pointer font-medium">Footnotes</summary>
      <div className="mt-3 flex flex-wrap gap-2">
        <Input
          aria-label="Footnote text"
          value={text}
          maxLength={1000}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add an explanatory note"
        />
        <Button
          variant="secondary"
          size="sm"
          disabled={!text.trim()}
          onClick={() => {
            onInsert(crypto.randomUUID(), text.trim());
            setText('');
          }}
        >
          Insert footnote
        </Button>
      </div>
    </details>
  );
}
