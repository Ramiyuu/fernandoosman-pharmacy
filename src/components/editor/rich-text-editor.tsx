'use client';

import type { JSONContent } from '@tiptap/core';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { ImageBucketKey } from '@/config/uploads';
import { ACCEPTED_IMAGE_TYPES, uploadImage } from '@/features/files/client/upload-image';

import { CitationDialog, ImageDetailsDialog, LinkDialog, MathDialog } from './editor-dialogs';
import { createEditorExtensions } from './editor-extensions';
import { FootnoteControl } from './footnote-control';
import { VideoControls } from './video-controls';
import { EditorToolbar } from './editor-toolbar';

import 'katex/dist/katex.min.css';

interface RichTextEditorProps {
  initialContent: JSONContent;
  onChange: (content: JSONContent) => void;
  imageBucket: ImageBucketKey;
  referenceCount?: number;
  placeholder?: string;
  label: string;
}

type MathState = { display: boolean; latex: string; pos?: number } | null;

export function RichTextEditor({
  initialContent,
  onChange,
  imageBucket,
  referenceCount = 0,
  placeholder = 'Start writing…',
  label,
}: RichTextEditorProps) {
  const onChangeRef = useRef(onChange);
  const fileInput = useRef<HTMLInputElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [math, setMath] = useState<MathState>(null);
  const [citationOpen, setCitationOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const countWords = (current: Editor) => setWordCount(Number(current.storage.characterCount.words()) || 0);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    extensions: createEditorExtensions({
      placeholder,
      onEditMath: (kind, latex, pos) => setMath({ display: kind === 'block', latex, pos }),
    }),
    content: initialContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'article-body rich-editor min-h-[28rem] px-5 py-6 sm:px-8 focus:outline-none',
        'aria-label': label,
        'aria-multiline': 'true',
        role: 'textbox',
      },
    },
    // ProseMirror stores node/mark attrs in null-prototype objects, which React
    // does not serialise as plain objects when calling a Server Action (their
    // attributes would be lost: links, images, formulas, citations). A JSON
    // round-trip turns the document into plain data.
    onCreate: ({ editor: current }) => countWords(current),
    onUpdate: ({ editor: current }) => {
      countWords(current);
      onChangeRef.current(JSON.parse(JSON.stringify(current.getJSON())) as JSONContent);
    },
  });

  useEffect(
    () => () => {
      if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl);
    },
    [pendingImage],
  );

  if (!editor) {
    return (
      <div
        className="min-h-[32rem] animate-pulse rounded-xl border border-rule bg-white"
        aria-busy="true"
        aria-label="Loading editor"
      />
    );
  }

  const insertImage = async (details: { alt: string; caption: string }) => {
    if (!pendingImage) return;
    setImageUploading(true);
    try {
      const uploaded = await uploadImage(pendingImage.file, imageBucket);
      editor
        .chain()
        .focus()
        .setImage({
          src: uploaded.url,
          alt: details.alt,
          title: details.caption || undefined,
          width: uploaded.width,
          height: uploaded.height,
        })
        .run();
      toast.success('Image inserted.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setImageUploading(false);
      URL.revokeObjectURL(pendingImage.previewUrl);
      setPendingImage(null);
    }
  };

  const applyMath = (latex: string) => {
    if (!math) return;
    const chain = editor.chain().focus();
    if (math.pos !== undefined) {
      if (math.display) chain.updateBlockMath({ latex, pos: math.pos }).run();
      else chain.updateInlineMath({ latex, pos: math.pos }).run();
    } else if (math.display) {
      chain.insertBlockMath({ latex }).run();
    } else {
      chain.insertInlineMath({ latex }).run();
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-rule bg-white focus-within:border-teal-500">
      <EditorToolbar
        editor={editor}
        imageUploading={imageUploading}
        onLink={() => setLinkOpen(true)}
        onImage={() => fileInput.current?.click()}
        onMath={(display) => setMath({ display, latex: '' })}
        onCitation={() => setCitationOpen(true)}
      />
      <VideoControls
        onInsert={(src, title) => editor.chain().focus().insertContent({ type: 'video', attrs: { src, title } }).run()}
      />
      <FootnoteControl
        onInsert={(id, text) => editor.chain().focus().insertContent({ type: 'footnote', attrs: { id, text } }).run()}
      />
      <EditorContent editor={editor} />
      <div className="flex justify-end border-t border-rule px-4 py-2 text-xs text-muted tabular">
        {wordCount} {wordCount === 1 ? 'word' : 'words'}
      </div>

      <input
        ref={fileInput}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) setPendingImage({ file, previewUrl: URL.createObjectURL(file) });
        }}
      />

      {linkOpen ? (
        <LinkDialog
          open
          onOpenChange={setLinkOpen}
          initialHref={String(editor.getAttributes('link').href ?? '')}
          onApply={(href) => editor.chain().focus().extendMarkRange('link').setLink({ href }).run()}
          onRemove={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()}
        />
      ) : null}
      {math ? (
        <MathDialog
          open
          onOpenChange={(open) => (!open ? setMath(null) : undefined)}
          initialLatex={math.latex}
          display={math.display}
          onApply={applyMath}
        />
      ) : null}
      {citationOpen ? (
        <CitationDialog
          open
          onOpenChange={setCitationOpen}
          referenceCount={referenceCount}
          onApply={(refs) => editor.chain().focus().insertCitation(refs).run()}
        />
      ) : null}
      {pendingImage ? (
        <ImageDetailsDialog
          open
          onOpenChange={(open) => {
            if (!open && !imageUploading) {
              URL.revokeObjectURL(pendingImage.previewUrl);
              setPendingImage(null);
            }
          }}
          previewUrl={pendingImage.previewUrl}
          onApply={(details) => void insertImage(details)}
        />
      ) : null}
    </div>
  );
}
