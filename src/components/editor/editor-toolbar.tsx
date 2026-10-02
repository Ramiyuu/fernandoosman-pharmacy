'use client';

import type { Editor } from '@tiptap/react';
import { useEditorState } from '@tiptap/react';
import {
  Bold,
  ChevronDown,
  Code,
  Heading2,
  Heading3,
  Heading4,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  type LucideIcon,
  MessageSquareQuote,
  Minus,
  Pilcrow,
  Quote,
  Radical,
  Redo2,
  Sigma,
  SquareCode,
  Strikethrough,
  Subscript,
  Superscript,
  Table,
  Underline,
  Undo2,
} from 'lucide-react';
import type { ReactNode } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CALLOUT_VARIANTS, type CalloutVariant } from '@/lib/content/rich-text';
import { cn } from '@/utils/cn';

import { STUDY_SECTIONS, sectionContent, studyReviewTemplate } from './study-sections';

const CALLOUT_LABELS: Record<CalloutVariant, string> = {
  info: 'Info',
  note: 'Note',
  warning: 'Caution',
  'key-point': 'Key point',
};

interface ToolbarProps {
  editor: Editor;
  onLink: () => void;
  onImage: () => void;
  onMath: (display: boolean) => void;
  onCitation: () => void;
  imageUploading: boolean;
}

function ToolButton({ label, icon: Icon, active, disabled, onClick }: { label: string; icon: LucideIcon; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={active === undefined ? undefined : active}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-md text-navy-800 transition-colors hover:bg-navy-50 disabled:opacity-40',
        active && 'bg-navy-900 text-white hover:bg-navy-800',
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-rule" aria-hidden="true" />;
}

function MenuButton({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm text-navy-800 hover:bg-navy-50">
        {label}
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-96 overflow-y-auto">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function EditorToolbar({ editor, onLink, onImage, onMath, onCitation, imageUploading }: ToolbarProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive('bold'),
      italic: current.isActive('italic'),
      underline: current.isActive('underline'),
      strike: current.isActive('strike'),
      code: current.isActive('code'),
      subscript: current.isActive('subscript'),
      superscript: current.isActive('superscript'),
      link: current.isActive('link'),
      h2: current.isActive('heading', { level: 2 }),
      h3: current.isActive('heading', { level: 3 }),
      h4: current.isActive('heading', { level: 4 }),
      bulletList: current.isActive('bulletList'),
      orderedList: current.isActive('orderedList'),
      blockquote: current.isActive('blockquote'),
      codeBlock: current.isActive('codeBlock'),
      callout: current.isActive('callout'),
      table: current.isActive('table'),
      canUndo: current.can().undo(),
      canRedo: current.can().redo(),
    }),
  });

  const chain = () => editor.chain().focus();

  return (
    <div role="toolbar" aria-label="Formatting" className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-rule bg-white/95 px-2 py-1.5 backdrop-blur">
      <ToolButton label="Undo" icon={Undo2} disabled={!state.canUndo} onClick={() => chain().undo().run()} />
      <ToolButton label="Redo" icon={Redo2} disabled={!state.canRedo} onClick={() => chain().redo().run()} />
      <Divider />
      <ToolButton label="Paragraph" icon={Pilcrow} onClick={() => chain().setParagraph().run()} />
      <ToolButton label="Heading 2" icon={Heading2} active={state.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()} />
      <ToolButton label="Heading 3" icon={Heading3} active={state.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()} />
      <ToolButton label="Heading 4" icon={Heading4} active={state.h4} onClick={() => chain().toggleHeading({ level: 4 }).run()} />
      <Divider />
      <ToolButton label="Bold" icon={Bold} active={state.bold} onClick={() => chain().toggleBold().run()} />
      <ToolButton label="Italic" icon={Italic} active={state.italic} onClick={() => chain().toggleItalic().run()} />
      <ToolButton label="Underline" icon={Underline} active={state.underline} onClick={() => chain().toggleUnderline().run()} />
      <ToolButton label="Strikethrough" icon={Strikethrough} active={state.strike} onClick={() => chain().toggleStrike().run()} />
      <ToolButton label="Inline code" icon={Code} active={state.code} onClick={() => chain().toggleCode().run()} />
      <ToolButton label="Subscript" icon={Subscript} active={state.subscript} onClick={() => chain().toggleSubscript().run()} />
      <ToolButton label="Superscript" icon={Superscript} active={state.superscript} onClick={() => chain().toggleSuperscript().run()} />
      <ToolButton label="Link" icon={LinkIcon} active={state.link} onClick={onLink} />
      <Divider />
      <ToolButton label="Bulleted list" icon={List} active={state.bulletList} onClick={() => chain().toggleBulletList().run()} />
      <ToolButton label="Numbered list" icon={ListOrdered} active={state.orderedList} onClick={() => chain().toggleOrderedList().run()} />
      <ToolButton label="Quote" icon={Quote} active={state.blockquote} onClick={() => chain().toggleBlockquote().run()} />
      <ToolButton label="Code block" icon={SquareCode} active={state.codeBlock} onClick={() => chain().toggleCodeBlock().run()} />
      <ToolButton label="Divider" icon={Minus} onClick={() => chain().setHorizontalRule().run()} />
      <Divider />
      <ToolButton label="Insert image" icon={ImagePlus} disabled={imageUploading} onClick={onImage} />
      <ToolButton label="Inline formula" icon={Radical} onClick={() => onMath(false)} />
      <ToolButton label="Formula on its own line" icon={Sigma} onClick={() => onMath(true)} />
      <ToolButton label="Cite references" icon={MessageSquareQuote} onClick={onCitation} />
      <Divider />

      <MenuButton label="Callout">
        {CALLOUT_VARIANTS.map((variant) => (
          <DropdownMenuItem key={variant} onSelect={() => chain().setCallout(variant).run()}>
            {CALLOUT_LABELS[variant]}
          </DropdownMenuItem>
        ))}
        {state.callout ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => chain().unsetCallout().run()}>Remove callout</DropdownMenuItem>
          </>
        ) : null}
      </MenuButton>

      <MenuButton
        label={
          <>
            <Table className="size-4" aria-hidden="true" /> <span className="sr-only sm:not-sr-only">Table</span>
          </>
        }
      >
        <DropdownMenuItem onSelect={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>Insert 3 × 3 table</DropdownMenuItem>
        {state.table ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => chain().addRowAfter().run()}>Add row below</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => chain().addColumnAfter().run()}>Add column right</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => chain().deleteRow().run()}>Delete row</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => chain().deleteColumn().run()}>Delete column</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => chain().toggleHeaderRow().run()}>Toggle header row</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem tone="danger" onSelect={() => chain().deleteTable().run()}>
              Delete table
            </DropdownMenuItem>
          </>
        ) : null}
      </MenuButton>

      <MenuButton label="Sections">
        <DropdownMenuItem onSelect={() => chain().insertContent(studyReviewTemplate()).run()}>Insert full study review template</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Insert one section</DropdownMenuLabel>
        {STUDY_SECTIONS.map((title) => (
          <DropdownMenuItem key={title} onSelect={() => chain().insertContent(sectionContent(title)).run()}>
            {title}
          </DropdownMenuItem>
        ))}
      </MenuButton>
    </div>
  );
}
