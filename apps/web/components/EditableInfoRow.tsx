'use client';

import { useState, useRef } from 'react';
import { Pencil, Check, X, Loader2 } from 'lucide-react';

interface EditableInfoRowProps {
  icon: React.ElementType;
  label: string;
  value: string | null;
  placeholder?: string;
  inputType?: 'text' | 'tel' | 'email';
  onSave: (value: string) => Promise<void>;
}

export default function EditableInfoRow({
  icon: Icon,
  label,
  value,
  placeholder,
  inputType = 'text',
  onSave,
}: EditableInfoRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setDraft(value ?? '');
    setError(null);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError(null);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(draft.trim());
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-white/25" />
        <div className="min-w-0 flex-1">
          <p className="mb-1 font-body text-xs text-white/30">{label}</p>
          <div className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              type={inputType}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') save();
                if (e.key === 'Escape') cancelEdit();
              }}
              placeholder={placeholder}
              className="min-w-0 flex-1 rounded-lg border border-[#d4af37]/30 bg-white/[0.04] px-3 py-1.5 font-body text-sm text-white outline-none placeholder:text-white/20 focus:border-[#d4af37]/50"
            />
            <button
              onClick={save}
              disabled={saving}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#d4af37] text-black transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={cancelEdit}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] text-white/40 transition-colors hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {error && <p className="mt-1 font-body text-xs text-red-400">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-3">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-white/25" />
      <div className="min-w-0 flex-1">
        <p className="font-body text-xs text-white/30">{label}</p>
        <p className="mt-0.5 truncate font-body text-sm text-white/80">{value || '-'}</p>
      </div>
      <button
        onClick={startEdit}
        className="opacity-0 group-hover:opacity-100 rounded-lg p-1 text-white/30 transition-all hover:text-[#d4af37]"
        title={`Изменить: ${label}`}
      >
        <Pencil className="h-4 w-4" />
      </button>
    </div>
  );
}
