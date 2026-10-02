'use client';

import { Archive, ArchiveRestore, Eye, EyeOff, ExternalLink, MoreHorizontal, Pencil, RotateCcw, Send, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useActionRunner } from '@/hooks/use-action-runner';
import type { ContentStatus } from '@/types/database.types';

import { deleteArticleAction, purgeArticleAction, restoreArticleAction, setArticleStatusAction } from '../actions';

interface ArticleRowActionsProps {
  id: string;
  title: string;
  slug: string;
  status: ContentStatus;
  deleted: boolean;
}

type Pending = null | 'trash' | 'purge' | 'unpublish';

export function ArticleRowActions({ id, title, slug, status, deleted }: ArticleRowActionsProps) {
  const { run } = useActionRunner();
  const [confirm, setConfirm] = useState<Pending>(null);
  const label = title || 'Untitled draft';

  const changeStatus = (next: ContentStatus) => run(() => setArticleStatusAction({ id, status: next }));

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${label}`}>
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {deleted ? (
            <>
              <DropdownMenuItem onSelect={() => run(() => restoreArticleAction(id)).catch(() => undefined)}>
                <RotateCcw aria-hidden="true" /> Restore as draft
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem tone="danger" onSelect={() => setConfirm('purge')}>
                <Trash2 aria-hidden="true" /> Delete permanently
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem asChild>
                <Link href={`/admin/articles/${id}`}>
                  <Pencil aria-hidden="true" /> Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/preview/articles/${id}`} target="_blank">
                  <Eye aria-hidden="true" /> Preview
                </Link>
              </DropdownMenuItem>
              {status === 'published' ? (
                <DropdownMenuItem asChild>
                  <Link href={`/articles/${slug}`} target="_blank">
                    <ExternalLink aria-hidden="true" /> View on site
                  </Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              {status !== 'published' ? (
                <DropdownMenuItem onSelect={() => changeStatus('published').catch(() => undefined)}>
                  <Send aria-hidden="true" /> Publish
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => setConfirm('unpublish')}>
                  <EyeOff aria-hidden="true" /> Unpublish
                </DropdownMenuItem>
              )}
              {status === 'archived' ? (
                <DropdownMenuItem onSelect={() => changeStatus('draft').catch(() => undefined)}>
                  <ArchiveRestore aria-hidden="true" /> Move to drafts
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => changeStatus('archived').catch(() => undefined)}>
                  <Archive aria-hidden="true" /> Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem tone="danger" onSelect={() => setConfirm('trash')}>
                <Trash2 aria-hidden="true" /> Move to trash
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirm === 'trash'}
        onOpenChange={(open) => setConfirm(open ? 'trash' : null)}
        title="Move article to trash?"
        description={
          <>
            “{label}” will be removed from the public site immediately. You can restore it from the trash later.
          </>
        }
        confirmLabel="Move to trash"
        onConfirm={() => run(() => deleteArticleAction(id))}
      />
      <ConfirmDialog
        open={confirm === 'purge'}
        onOpenChange={(open) => setConfirm(open ? 'purge' : null)}
        title="Delete article?"
        description={
          <>
            This action cannot be undone. “{label}”, its references and all attached PDFs will be deleted permanently.
          </>
        }
        confirmLabel="Delete article"
        onConfirm={() => run(() => purgeArticleAction(id))}
      />
      <ConfirmDialog
        open={confirm === 'unpublish'}
        onOpenChange={(open) => setConfirm(open ? 'unpublish' : null)}
        title="Unpublish article?"
        description={<>“{label}” will disappear from the public site and return to drafts.</>}
        confirmLabel="Unpublish"
        tone="primary"
        onConfirm={() => changeStatus('draft').then(() => undefined)}
      />
    </>
  );
}
