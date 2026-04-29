'use client';

import type { Editor } from '@tiptap/react';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Quote, Minus, Undo2, Redo2, Code, Link2, Unlink,
} from 'lucide-react';
import { useCallback } from 'react';

interface TipTapToolbarProps {
  editor: Editor | null;
  isWpAdmin?: boolean;
}

export function TipTapToolbar({ editor, isWpAdmin: L }: TipTapToolbarProps) {
  if (!editor) return null;

  const btn = (active: boolean, disabled?: boolean) =>
    `flex h-8 w-8 items-center justify-center rounded transition-colors ${disabled ? 'opacity-30 cursor-not-allowed' : ''} ${
      active
        ? L ? 'bg-[#2271b1] text-white' : 'bg-[#d4af37] text-black'
        : L ? 'text-[#50575e] hover:bg-[#f0f0f1] hover:text-[#1d2327]' : 'text-white/50 hover:bg-white/[0.08] hover:text-white'
    }`;

  const sep = `w-px mx-0.5 self-stretch ${L ? 'bg-[#dcdcde]' : 'bg-white/[0.1]'}`;

  const setLink = useCallback(() => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL ссылки', prev ?? 'https://');
    if (url === null) return;
    if (url === '') { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  return (
    <div className={`sticky top-0 z-20 flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5 ${
      L ? 'border-[#c3c4c7] bg-white' : 'border-white/[0.08] bg-[#111]'
    }`}>
      {/* Heading select */}
      <select
        value={
          editor.isActive('heading', { level: 1 }) ? '1' :
          editor.isActive('heading', { level: 2 }) ? '2' :
          editor.isActive('heading', { level: 3 }) ? '3' : '0'
        }
        onChange={(e) => {
          const v = e.target.value;
          if (v === '0') editor.chain().focus().setParagraph().run();
          else editor.chain().focus().toggleHeading({ level: parseInt(v) as 1 | 2 | 3 }).run();
        }}
        className={`mr-1 h-8 rounded border px-2 text-xs ${
          L ? 'border-[#8c8f94] bg-white text-[#2c3338]' : 'border-white/15 bg-black/40 text-white/80'
        }`}
      >
        <option value="0">Параграф</option>
        <option value="1">Заголовок 1</option>
        <option value="2">Заголовок 2</option>
        <option value="3">Заголовок 3</option>
      </select>

      <div className={sep} />

      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))} title="Жирный (Ctrl+B)">
        <Bold className="h-4 w-4" strokeWidth={2.5} />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))} title="Курсив (Ctrl+I)">
        <Italic className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btn(editor.isActive('underline'))} title="Подчёркнутый (Ctrl+U)">
        <UnderlineIcon className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={btn(editor.isActive('strike'))} title="Зачёркнутый">
        <Strikethrough className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} className={btn(editor.isActive('code'))} title="Код">
        <Code className="h-4 w-4" />
      </button>

      <div className={sep} />

      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive('bulletList'))} title="Маркированный список">
        <List className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive('orderedList'))} title="Нумерованный список">
        <ListOrdered className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive('blockquote'))} title="Цитата">
        <Quote className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btn(false)} title="Горизонтальный разделитель">
        <Minus className="h-4 w-4" />
      </button>

      <div className={sep} />

      <button type="button" onClick={setLink} className={btn(editor.isActive('link'))} title="Ссылка">
        <Link2 className="h-4 w-4" />
      </button>
      {editor.isActive('link') && (
        <button type="button" onClick={() => editor.chain().focus().unsetLink().run()} className={btn(false)} title="Убрать ссылку">
          <Unlink className="h-4 w-4" />
        </button>
      )}

      <div className={sep} />

      <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className={btn(false, !editor.can().undo())} title="Отменить (Ctrl+Z)">
        <Undo2 className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className={btn(false, !editor.can().redo())} title="Повторить (Ctrl+Y)">
        <Redo2 className="h-4 w-4" />
      </button>
    </div>
  );
}
