'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { TOPIC_ICON_NAMES, TopicIcon } from '@/components/icons/topic-icon';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, NativeSelect, Textarea } from '@/components/ui/input';
import { tableClasses } from '@/features/admin/components/admin-page';
import { useActionRunner } from '@/hooks/use-action-runner';
import { cn } from '@/utils/cn';

import { deleteTaxonomyAction, saveCategoryAction, saveTagAction, saveTopicAction } from '../actions';

type Kind = 'topic' | 'category' | 'tag';

export interface TaxonomyItem {
  id: string;
  name: string;
  name_pt?: string;
  slug: string;
  description?: string;
  description_pt?: string;
  icon?: string;
  sort_order?: number;
  usage: number;
  usageLabel: string;
}

const LABELS: Record<Kind, { singular: string; plural: string }> = {
  topic: { singular: 'topic', plural: 'topics' },
  category: { singular: 'category', plural: 'categories' },
  tag: { singular: 'tag', plural: 'tags' },
};

interface Draft {
  id: string | null;
  name: string;
  name_pt: string;
  slug: string;
  description: string;
  description_pt: string;
  icon: string;
  sort_order: string;
}

const emptyDraft = (kind: Kind): Draft => ({
  id: null,
  name: '',
  name_pt: '',
  slug: '',
  description: '',
  description_pt: '',
  icon: kind === 'topic' ? 'flask-conical' : '',
  sort_order: '0',
});

export function TaxonomyManager({ kind, items }: { kind: Kind; items: TaxonomyItem[] }) {
  const { run } = useActionRunner();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toDelete, setToDelete] = useState<TaxonomyItem | null>(null);
  const [saving, setSaving] = useState(false);
  const label = LABELS[kind];

  const openEditor = (item?: TaxonomyItem) => {
    setErrors({});
    setDraft(
      item
        ? {
            id: item.id,
            name: item.name,
            name_pt: item.name_pt ?? '',
            slug: item.slug,
            description: item.description ?? '',
            description_pt: item.description_pt ?? '',
            icon: item.icon ?? 'flask-conical',
            sort_order: String(item.sort_order ?? 0),
          }
        : emptyDraft(kind),
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    try {
      const action =
        kind === 'topic'
          ? () =>
              saveTopicAction({
                id: draft.id,
                name: draft.name,
                name_pt: draft.name_pt,
                slug: draft.slug,
                description: draft.description,
                description_pt: draft.description_pt,
                icon: draft.icon,
                sort_order: draft.sort_order,
              })
          : kind === 'category'
            ? () =>
                saveCategoryAction({
                  id: draft.id,
                  name: draft.name,
                  name_pt: draft.name_pt,
                  slug: draft.slug,
                  description: draft.description,
                  description_pt: draft.description_pt,
                  sort_order: draft.sort_order,
                })
            : () => saveTagAction({ id: draft.id, name: draft.name });
      await run(action);
      setDraft(null);
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'Could not save.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => openEditor()}>
          <Plus aria-hidden="true" /> New {label.singular}
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-rule-strong bg-white p-8 text-center text-sm text-muted">No {label.plural} yet.</p>
      ) : (
        <div className={tableClasses.wrapper}>
          <table className={cn(tableClasses.table, 'min-w-[32rem]')}>
            <thead className={tableClasses.head}>
              <tr>
                <th scope="col" className={tableClasses.th}>Name</th>
                {kind !== 'tag' ? <th scope="col" className={tableClasses.th}>Description</th> : null}
                <th scope="col" className={tableClasses.th}>Used by</th>
                <th scope="col" className={cn(tableClasses.th, 'w-24')}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className={tableClasses.row}>
                  <td className={tableClasses.td}>
                    <div className="flex items-center gap-2">
                      {kind === 'topic' && item.icon ? <TopicIcon name={item.icon} className="size-4 text-teal-600" /> : null}
                      <span className="font-medium text-ink">{item.name}</span>
                      {kind !== 'tag' ? (
                        item.name_pt ? (
                          <span className="text-sm text-muted" lang="pt-BR">
                            / {item.name_pt}
                          </span>
                        ) : (
                          <span className="rounded-sm bg-warning-50 px-1.5 py-0.5 text-[0.6875rem] font-medium text-warning-700">
                            PT missing
                          </span>
                        )
                      ) : null}
                    </div>
                    <p className="text-xs text-muted">{item.slug}</p>
                  </td>
                  {kind !== 'tag' ? <td className={cn(tableClasses.td, 'max-w-md text-muted')}>{item.description}</td> : null}
                  <td className={cn(tableClasses.td, 'whitespace-nowrap text-muted')}>{item.usageLabel}</td>
                  <td className={tableClasses.td}>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditor(item)} aria-label={`Edit ${item.name}`}>
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button variant="danger-ghost" size="icon-sm" onClick={() => setToDelete(item)} aria-label={`Delete ${item.name}`}>
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={draft !== null} onOpenChange={(open) => (!open ? setDraft(null) : undefined)}>
        <DialogContent className="max-w-lg">
          <DialogTitle>{draft?.id ? `Edit ${label.singular}` : `New ${label.singular}`}</DialogTitle>
          <DialogDescription className="sr-only">Fill in the details and save.</DialogDescription>
          {draft ? (
            <form onSubmit={submit} className="mt-4 space-y-4">
              <Field id="taxonomy-name" label={kind === 'tag' ? 'Name' : 'Name (English)'} required>
                <Input id="taxonomy-name" value={draft.name} maxLength={kind === 'tag' ? 50 : 80} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
              </Field>
              {kind !== 'tag' ? (
                <Field id="taxonomy-name-pt" label="Name (Portuguese)" hint="Shown on /pt pages. Empty uses the English name.">
                  <Input
                    id="taxonomy-name-pt"
                    lang="pt-BR"
                    value={draft.name_pt}
                    maxLength={80}
                    onChange={(event) => setDraft({ ...draft, name_pt: event.target.value })}
                  />
                </Field>
              ) : null}
              {kind !== 'tag' ? (
                <>
                  <Field id="taxonomy-slug" label="Slug" hint="Leave empty to generate from the name.">
                    <Input id="taxonomy-slug" value={draft.slug} spellCheck={false} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} />
                  </Field>
                  <Field id="taxonomy-description" label="Description (English)">
                    <Textarea id="taxonomy-description" rows={3} maxLength={500} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
                  </Field>
                  <Field id="taxonomy-description-pt" label="Description (Portuguese)">
                    <Textarea
                      id="taxonomy-description-pt"
                      lang="pt-BR"
                      rows={3}
                      maxLength={500}
                      value={draft.description_pt}
                      onChange={(event) => setDraft({ ...draft, description_pt: event.target.value })}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    {kind === 'topic' ? (
                      <Field id="taxonomy-icon" label="Icon">
                        <div className="flex items-center gap-2">
                          <TopicIcon name={draft.icon} className="size-5 shrink-0 text-teal-600" />
                          <NativeSelect id="taxonomy-icon" value={draft.icon} onChange={(event) => setDraft({ ...draft, icon: event.target.value })}>
                            {TOPIC_ICON_NAMES.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </NativeSelect>
                        </div>
                      </Field>
                    ) : null}
                    <Field id="taxonomy-order" label="Sort order">
                      <Input id="taxonomy-order" type="number" value={draft.sort_order} onChange={(event) => setDraft({ ...draft, sort_order: event.target.value })} />
                    </Field>
                  </div>
                </>
              ) : null}
              {errors.form ? (
                <p role="alert" className="text-sm text-danger-700">
                  {errors.form}
                </p>
              ) : null}
              <DialogFooter>
                <Button variant="secondary" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  Save {label.singular}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => (!open ? setToDelete(null) : undefined)}
        title={`Delete ${label.singular}?`}
        description={
          <>
            This action cannot be undone.
            {toDelete && toDelete.usage > 0 ? ` “${toDelete.name}” is used by ${toDelete.usageLabel}; it will be removed from them.` : ` “${toDelete?.name}” is not used anywhere.`}
          </>
        }
        confirmLabel={`Delete ${label.singular}`}
        onConfirm={() => (toDelete ? run(() => deleteTaxonomyAction(kind, toDelete.id)) : undefined)}
      />
    </div>
  );
}
