'use client';

import { Copy, Download } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

/** One-time backup codes, shown only right after they are generated. */
export function BackupCodes({ codes }: { codes: string[] }) {
  const text = `${codes.join('\n')}\n`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Backup codes copied.');
    } catch {
      toast.error('Copying is blocked by the browser. Select the codes and copy them by hand.');
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'admin-backup-codes.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-navy-800">
        Each code signs you in once if you lose your phone. Keep them somewhere safe, such as a password manager. They will not be
        shown again.
      </p>
      <ol className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg border border-rule bg-mist p-4 text-sm tabular text-ink sm:grid-cols-2">
        {codes.map((code) => (
          <li key={code} className="font-medium tracking-wider">
            {code}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => void copy()}>
          <Copy aria-hidden="true" /> Copy
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={download}>
          <Download aria-hidden="true" /> Download .txt
        </Button>
      </div>
    </div>
  );
}
