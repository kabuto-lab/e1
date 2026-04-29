'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { TipTapToolbar } from './TipTapToolbar';

interface TipTapEditorProps {
  content?: object | null;
  onChange?: (json: object) => void;
  placeholder?: string;
  isWpAdmin?: boolean;
}

export function TipTapEditor({ content, onChange, placeholder, isWpAdmin }: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: placeholder ?? 'Начните писать здесь...' }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
    ],
    content: content ?? undefined,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: 'outline-none',
      },
    },
    immediatelyRender: false,
  });

  return (
    <div className={`flex flex-col rounded-b-lg overflow-hidden ${isWpAdmin ? 'border border-t-0 border-[#c3c4c7]' : 'border border-t-0 border-white/[0.08]'}`}>
      <TipTapToolbar editor={editor} isWpAdmin={isWpAdmin} />
      <div
        className={`cms-editor px-6 py-5 text-sm ${isWpAdmin ? 'text-[#1d2327]' : 'text-white/85'}`}
        onClick={() => editor?.chain().focus().run()}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
