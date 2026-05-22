'use client';

/**
 * EditorHost — шелл ED-редактора: топбар (slug/title, undo/redo, device-mode,
 * Save/Publish) + холст `SandboxEditor`.
 *
 * Один компонент на два режима:
 *   - mode='create' → первый save() создаёт страницу (createPage); далее id
 *     запоминается и повторные save() уже обновляют (updatePage) — без
 *     дублей страниц при пере-сохранении;
 *   - mode='edit'   → initialPage передаётся роутом, дерево берётся из
 *     `initialPage.body`, save() обновляет существующую страницу.
 *
 * Тело сохраняется одним блоком `{ type:'custom', data:{ ed: Section[] } }`
 * (M1 — см. план §6; типизированный `custom_canvas` — fast-follow).
 */
import { useCallback, useRef, useState } from 'react';
import { Eye, Loader2, Monitor, Redo2, Save, Smartphone, Tablet, Undo2 } from 'lucide-react';
import { ApiError } from '@/lib/api-client';
import { createPage, updatePage, publishPage, type CmsPageDTO } from '@/lib/cms-api';
import { SandboxEditor, type SandboxEditorHandle, type Section } from './SandboxEditor';
import { extractEdSections } from './EdRenderer';

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

export interface EditorHostProps {
  mode: 'create' | 'edit';
  tenantSlug: string;
  /** Для mode='edit' — страница, загруженная роутом. */
  initialPage?: CmsPageDTO;
}

export function EditorHost({ mode, tenantSlug, initialPage }: EditorHostProps) {
  const [slug, setSlug] = useState(initialPage?.slug ?? 'home');
  const [title, setTitle] = useState(initialPage?.title ?? 'Главная');
  const [published, setPublished] = useState(initialPage?.status === 'published');
  // null → ещё не создана (mode=create до первого save); иначе — id страницы.
  const [pageId, setPageId] = useState<string | null>(initialPage?.id ?? null);
  const [sections, setSections] = useState<Section[]>(
    initialPage ? extractEdSections(initialPage.body) : [],
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const editorRef = useRef<SandboxEditorHandle>(null);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const onHistoryChange = useCallback((s: { canUndo: boolean; canRedo: boolean }) => {
    setCanUndo(s.canUndo);
    setCanRedo(s.canRedo);
  }, []);

  const onChange = useCallback((next: Section[]) => setSections(next), []);

  async function save(publish: boolean) {
    if (!slug.trim() || !title.trim()) {
      setError('Slug и title обязательны');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = [{ type: 'custom', data: { ed: sections } }];
      let id = pageId;
      if (id) {
        // PATCH: slug immutable — шлём только изменяемые поля.
        await updatePage(id, tenantSlug, { title: title.trim(), body });
      } else {
        const created = await createPage(tenantSlug, {
          slug: slug.trim(),
          locale: 'ru',
          title: title.trim(),
          body,
        });
        id = created.id;
        setPageId(created.id);
      }
      if (publish && id) {
        await publishPage(id, tenantSlug);
        setPublished(true);
      }
      setNotice(publish ? 'Сохранено и опубликовано' : 'Сохранено');
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (err.body.message ?? `HTTP ${err.status} (${err.body.code ?? 'unknown'})`)
          : String(err),
      );
    } finally {
      setSaving(false);
    }
  }

  const devices: { mode: DeviceMode; icon: typeof Monitor; label: string }[] = [
    { mode: 'desktop', icon: Monitor, label: 'Desktop' },
    { mode: 'tablet', icon: Tablet, label: 'Tablet' },
    { mode: 'mobile', icon: Smartphone, label: 'Mobile' },
  ];

  return (
    // -mx-7 -mb-8 → escape main padding для full-width; flex-1 + min-h-0 → высота.
    <div className="flex flex-col -mx-7 -mb-8 flex-1 min-h-0 bg-bg-elev">
      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-2.5 border-y border-line bg-bg-elev flex-shrink-0 flex-wrap">
        {/* Left: metadata */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-[11px] uppercase tracking-widest text-text-mute">
            ED-editor · {mode === 'edit' ? 'правка' : 'новая'}
          </div>
          <span className="text-[12px] font-mono text-gold">{tenantSlug}</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="slug страницы"
            className="px-2 py-1 text-[12px] font-mono bg-bg border border-line rounded-md outline-none w-[140px]"
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="title"
            className="px-2 py-1 text-[12px] bg-bg border border-line rounded-md outline-none w-[220px]"
          />
          {published && (
            <span className="text-[10.5px] uppercase font-mono px-1.5 py-0.5 rounded-md bg-green-500/10 text-green-400">
              published
            </span>
          )}
        </div>

        {/* Right: editor controls + save/publish */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-bg border border-line rounded-md overflow-hidden">
            <button
              onClick={() => editorRef.current?.undo()}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="px-2 py-1.5 text-text-dim hover:text-accent-2 disabled:opacity-30 disabled:hover:text-text-dim transition-colors"
            >
              <Undo2 size={14} />
            </button>
            <div className="w-px h-5 bg-line" />
            <button
              onClick={() => editorRef.current?.redo()}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              className="px-2 py-1.5 text-text-dim hover:text-accent-2 disabled:opacity-30 disabled:hover:text-text-dim transition-colors"
            >
              <Redo2 size={14} />
            </button>
          </div>

          <div className="flex items-center bg-bg border border-line rounded-md overflow-hidden">
            {devices.map(({ mode: dm, icon: Icon, label }) => {
              const active = deviceMode === dm;
              return (
                <button
                  key={dm}
                  onClick={() => setDeviceMode(dm)}
                  title={label}
                  className={`px-2 py-1.5 transition-colors ${active ? 'bg-accent-2/15 text-accent-2' : 'text-text-dim hover:text-text'}`}
                >
                  <Icon size={14} />
                </button>
              );
            })}
          </div>

          {notice && <span className="text-[11.5px] text-green-300">{notice}</span>}
          {error && <span className="text-[11.5px] text-red-300">{error}</span>}

          <a
            href={slug.trim() === 'home' ? `/${tenantSlug}` : `/${tenantSlug}/${slug.trim()}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Открыть публичную страницу (показывает опубликованную версию)"
            className="px-3 py-1.5 text-[12px] bg-bg border border-line rounded-md hover:bg-surface-2 flex items-center gap-1.5"
          >
            <Eye size={12} /> Просмотреть
          </a>
          <button
            onClick={() => save(false)}
            disabled={saving}
            className="px-3 py-1.5 text-[12px] bg-bg border border-line rounded-md hover:bg-surface-2 disabled:opacity-50"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : 'Сохранить'}
          </button>
          <button
            onClick={() => save(true)}
            disabled={saving}
            className="px-3 py-1.5 text-[12px] bg-gold text-bg font-semibold rounded-md disabled:opacity-50 flex items-center gap-1.5"
          >
            <Save size={12} /> Опубликовать
          </button>
        </div>
      </div>

      {/* Editor canvas */}
      <div className="flex-1 overflow-hidden min-h-0">
        <SandboxEditor
          ref={editorRef}
          embedded
          initialSections={sections}
          onChange={onChange}
          deviceMode={deviceMode}
          onDeviceModeChange={setDeviceMode}
          onHistoryChange={onHistoryChange}
        />
      </div>
    </div>
  );
}
