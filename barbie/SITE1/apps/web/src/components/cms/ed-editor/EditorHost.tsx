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
import { useCallback, useEffect, useRef, useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { Copy, Eye, EyeOff, LayoutTemplate, Loader2, Monitor, Redo2, Save, Smartphone, Tablet, Undo2 } from 'lucide-react';
import { ApiError } from '@/lib/api-client';
import { createPage, updatePage, publishPage, type CmsPageDTO } from '@/lib/cms-api';
import { PAGE_TEMPLATES } from '@/lib/page-templates';
import { SandboxEditor, type SandboxEditorHandle, type Section } from './SandboxEditor';
import { extractEdSections } from './EdRenderer';
import { useEditorStore } from './editor/store';

type AutosaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

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
  // Slot для палитры виджетов из SandboxEditor — портал рисует туда тайлы.
  // useState (не useRef), потому что нужен re-render когда DOM-узел появится.
  const [paletteSlot, setPaletteSlot] = useState<HTMLDivElement | null>(null);

  // Popover с метаданными страницы (slug/title/published) — открывается по
  // клику на ED-логотип в левом краю sticky-полосы.
  const [metaOpen, setMetaOpen] = useState(false);
  const metaWrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!metaOpen) return;
    const onDown = (e: MouseEvent) => {
      if (metaWrapRef.current && !metaWrapRef.current.contains(e.target as Node)) setMetaOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMetaOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [metaOpen]);
  const onHistoryChange = useCallback((s: { canUndo: boolean; canRedo: boolean }) => {
    setCanUndo(s.canUndo);
    setCanRedo(s.canRedo);
  }, []);

  // Φ4: autosave debounce 1s — после первого manual save (когда pageId уже есть).
  // mode='create' до первого Save кнопка остаётся mandatory (нет slug/title flow).
  const saveRef = useRef<((publish: boolean) => Promise<void>) | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('idle');

  const onChange = useCallback(
    (next: Section[]) => {
      setSections(next);
      if (!pageId) {
        setAutosaveStatus('dirty');
        return;
      }
      setAutosaveStatus('dirty');
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = setTimeout(() => {
        saveRef.current?.(false).catch(() => {/* error выставит save() в notice/error */});
      }, 1000);
    },
    [pageId],
  );

  // Φ5: preview-mode toggle (Eye / EyeOff в topbar).
  const previewMode = useEditorStore((s) => s.previewMode);
  const setPreviewMode = useEditorStore((s) => s.setPreviewMode);
  const clipboardElement = useEditorStore((s) => s.clipboardElement);

  // Φ7: Templates dropdown — клон заранее заготовленного дерева в редактор.
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const templatesWrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!templatesOpen) return;
    const onDown = (e: MouseEvent) => {
      if (templatesWrapRef.current && !templatesWrapRef.current.contains(e.target as Node)) {
        setTemplatesOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [templatesOpen]);

  const loadTemplate = useCallback((templateId: string) => {
    const tpl = PAGE_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    if (sections.length > 0 && !confirm(`Заменить текущее содержимое страницы шаблоном "${tpl.name}"?`)) {
      return;
    }
    const next = tpl.build();
    setSections(next);
    useEditorStore.getState().loadSections(next);
    setTemplatesOpen(false);
  }, [sections.length]);

  async function save(publish: boolean) {
    if (!slug.trim() || !title.trim()) {
      setError('Slug и title обязательны');
      return;
    }
    setSaving(true);
    setError(null);
    setAutosaveStatus('saving');
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
      setAutosaveStatus('saved');
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      setAutosaveStatus('error');
      setError(
        err instanceof ApiError
          ? (err.body.message ?? `HTTP ${err.status} (${err.body.code ?? 'unknown'})`)
          : String(err),
      );
    } finally {
      setSaving(false);
    }
  }

  // keep save ref live for autosave timer (defined after save fn to capture latest)
  useEffect(() => {
    saveRef.current = save;
  });

  // cleanup autosave timer on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, []);

  const devices: { mode: DeviceMode; icon: typeof Monitor; label: string }[] = [
    { mode: 'desktop', icon: Monitor, label: 'Desktop' },
    { mode: 'tablet', icon: Tablet, label: 'Tablet' },
    { mode: 'mobile', icon: Smartphone, label: 'Mobile' },
  ];

  return (
    // -mx-7 -mb-8 → escape main padding для full-width; flex-1 + min-h-0 → высота.
    <div className="flex flex-col -mx-7 -mb-8 flex-1 min-h-0 bg-bg-elev">
      <div className="sticky top-0 z-50 flex items-center justify-between gap-3 px-4 py-2.5 border-y border-line bg-bg-elev flex-shrink-0 flex-wrap">
        {/* Left: ED logo (click → metadata popover) + palette slot.
            Логотип бордовый square 28×28; SandboxEditor портит сюда tiles + stats. */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <div ref={metaWrapRef} className="relative">
            <button
              type="button"
              onClick={() => setMetaOpen((v) => !v)}
              aria-expanded={metaOpen}
              aria-label="Свойства страницы"
              title="Свойства страницы (slug, title, статус)"
              className="w-7 h-7 rounded-[7px] flex items-center justify-center font-extrabold text-[12px] tracking-[-1px] cursor-pointer transition-colors mr-2.5 select-none"
              style={{
                background: 'rgb(var(--accent-2))',
                color: 'rgb(var(--bg))',
                border: metaOpen ? '1px solid rgb(var(--gold))' : '1px solid transparent',
              }}
            >
              ED
            </button>
            {metaOpen && (
              <div
                className="absolute left-0 top-[calc(100%+6px)] z-[60] w-[280px] bg-surface border border-line-strong rounded-xl shadow-[8px_12px_30px_rgba(0,0,0,0.55)] p-3.5 flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10.5px] uppercase tracking-widest text-text-mute">
                    {mode === 'edit' ? 'Правка страницы' : 'Новая страница'}
                  </div>
                  {published && (
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-md bg-green-500/10 text-green-400">
                      published
                    </span>
                  )}
                </div>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-widest text-text-mute">Тенант</span>
                  <span className="text-[12px] font-mono text-gold px-2 py-1 bg-bg border border-line rounded-md">{tenantSlug}</span>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-widest text-text-mute">Slug</span>
                  <input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="slug страницы"
                    disabled={mode === 'edit'}
                    title={mode === 'edit' ? 'Slug нельзя изменить после создания' : undefined}
                    className="px-2 py-1 text-[12px] font-mono bg-bg border border-line rounded-md outline-none disabled:opacity-50"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-widest text-text-mute">Title</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="заголовок"
                    className="px-2 py-1 text-[12px] bg-bg border border-line rounded-md outline-none"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Palette slot — SandboxEditor портит сюда тайлы виджетов + stats */}
          <div ref={setPaletteSlot} className="flex items-center gap-1 flex-shrink-0" />
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

          {/* Φ7: Templates dropdown */}
          <div ref={templatesWrapRef} className="relative">
            <button
              onClick={() => setTemplatesOpen((v) => !v)}
              title="Загрузить шаблон страницы"
              className={`px-2 py-1.5 rounded-md border transition-colors flex items-center gap-1.5 text-[12px] ${
                templatesOpen
                  ? 'bg-accent-2/15 text-accent-2 border-accent-2/40'
                  : 'bg-bg text-text-dim border-line hover:bg-surface-2'
              }`}
            >
              <LayoutTemplate size={13} />
              <span>Шаблоны</span>
            </button>
            {templatesOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] z-[60] w-[320px] bg-surface border border-line-strong rounded-xl shadow-[8px_12px_30px_rgba(0,0,0,0.55)] p-2 flex flex-col gap-1">
                <div className="text-[10px] uppercase tracking-widest text-text-mute px-3 py-2 border-b border-line">
                  Выбери шаблон страницы
                </div>
                {PAGE_TEMPLATES.map((tpl) => {
                  const Icon = LucideIcons[tpl.iconName as keyof typeof LucideIcons] as
                    | React.ComponentType<{ size?: number }>
                    | undefined;
                  return (
                    <button
                      key={tpl.id}
                      onClick={() => loadTemplate(tpl.id)}
                      className="flex items-start gap-3 p-2.5 text-left rounded-md hover:bg-bg transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-md flex items-center justify-center bg-bg border border-line text-accent-2 flex-shrink-0">
                        {Icon && <Icon size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-text group-hover:text-accent-2 transition-colors">
                          {tpl.name}
                        </div>
                        <div className="text-[10.5px] text-text-mute leading-snug mt-0.5">
                          {tpl.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Φ5: preview mode toggle + copy/paste hint */}
          <button
            onClick={() => setPreviewMode(!previewMode)}
            title={previewMode ? 'Выйти из preview (показать chrome)' : 'Preview mode (скрыть edit UI)'}
            className={`px-2 py-1.5 rounded-md border transition-colors flex items-center gap-1.5 text-[12px] ${
              previewMode
                ? 'bg-accent-2/15 text-accent-2 border-accent-2/40'
                : 'bg-bg text-text-dim border-line hover:bg-surface-2'
            }`}
          >
            {previewMode ? <EyeOff size={13} /> : <Eye size={13} />}
            <span>Preview</span>
          </button>

          {clipboardElement && (
            <div
              title={`В буфере: ${clipboardElement.type} · Ctrl+V для вставки`}
              className="px-2 py-1.5 text-[11px] text-text-mute bg-bg border border-line rounded-md flex items-center gap-1.5"
            >
              <Copy size={12} /> {clipboardElement.type}
            </div>
          )}

          {/* Φ5: autosave status indicator */}
          {autosaveStatus === 'saving' && (
            <span className="text-[11px] text-text-dim flex items-center gap-1.5">
              <Loader2 size={11} className="animate-spin" /> Сохранение…
            </span>
          )}
          {autosaveStatus === 'saved' && (
            <span className="text-[11px] text-green-300">Сохранено</span>
          )}
          {autosaveStatus === 'dirty' && pageId && (
            <span className="text-[11px] text-amber-300">● Не сохранено</span>
          )}

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
          paletteSlot={paletteSlot}
        />
      </div>
    </div>
  );
}
