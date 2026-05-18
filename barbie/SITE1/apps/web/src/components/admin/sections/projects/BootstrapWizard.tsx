'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Database,
  Globe,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/admin/primitives/Card';
import { ApiError } from '@/lib/api-client';
import { toolsApi, type ScreenshotResult, type SiteAnalysis } from '@/lib/tools-api';
import {
  tenantsApi,
  type BootstrapDesign,
  type BootstrapMenuItem,
  type BootstrapTenantResult,
} from '@/lib/tenants-api';
import {
  wpImportApi,
  type WpImportEvent,
  type WpImportOptions,
  type WpProbeResult,
} from '@/lib/wp-import-api';

/**
 * BootstrapWizard — 3-step мастер импорта тенанта из URL.
 *
 *  Step 1: URL → POST /v1/tools/analyze-site (тот же анализатор, что в /admin/tools)
 *  Step 2: пользователь редактирует design / menu / favicon, prefilled из analysis
 *  Step 3: slug / name / customDomain → POST /v1/platform/tenants/bootstrap
 *
 * Шаги намеренно держим в одном компоненте — общее состояние (analysis, design,
 * menu, identity) живёт здесь, sub-step'ы могут читать его без props-prop'инга.
 * Если разрастётся — выделим step-компоненты с явными props.
 */

type Step = 1 | 2 | 3 | 'success' | 'wp-importing' | 'wp-success';

const DEFAULT_WP_OPTIONS: WpImportOptions = {
  pages: true,
  media: true,
  menu: true,
  posts: true,
};

const DEFAULT_DESIGN: BootstrapDesign = {
  bg: '#FFFFFF',
  headColor: '#0A0A0A',
  headFont: 'Unbounded',
  accColor: '#D4AF37',
  accFont: 'Unbounded',
  bodyColor: '#1A1A1A',
  bodyFont: 'Inter',
};

const DEFAULT_MENU: BootstrapMenuItem[] = [
  { label: 'Главная', href: '/', sortOrder: 0 },
  { label: 'Услуги', href: '/services', sortOrder: 1 },
  { label: 'Контакты', href: '/contacts', sortOrder: 2 },
];

export function BootstrapWizard() {
  const router = useRouter();
  // mode=html → пропускаем WP-detection, остаёмся в design-only flow.
  // mode=blank → пропускаем URL/analyze совсем; bootstrap с FALLBACK_DESIGN
  //              + пустым меню → редирект в ED-editor создавать страницы с нуля.
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const htmlMode = mode === 'html';
  const blankMode = mode === 'blank';

  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [url, setUrl] = useState('https://');
  const [analysis, setAnalysis] = useState<SiteAnalysis | null>(null);

  // Step 2
  const [design, setDesign] = useState<BootstrapDesign>(DEFAULT_DESIGN);
  const [menuItems, setMenuItems] = useState<BootstrapMenuItem[]>([]);
  const [importFavicon, setImportFavicon] = useState(true);

  // Step 3
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [customDomain, setCustomDomain] = useState('');

  // Step success (обычный bootstrap)
  const [result, setResult] = useState<BootstrapTenantResult | null>(null);

  // WP-import state (живёт сквозь step 2 → wp-importing → wp-success)
  const [wpProbe, setWpProbe] = useState<WpProbeResult | null>(null);
  const [wpOptions, setWpOptions] = useState<WpImportOptions>(DEFAULT_WP_OPTIONS);
  const [wpEvents, setWpEvents] = useState<WpImportEvent[]>([]);
  const [wpResult, setWpResult] = useState<{
    tenantId: string;
    slug: string;
    customDomain?: string;
    pagesImported: number;
    postsImported: number;
    mediaImported: number;
    mediaFailed: number;
    menuItemsImported: number;
  } | null>(null);
  const esRef = useRef<EventSource | null>(null);

  // Screenshot preview state — общий для всех режимов wizard'а после Step 1
  const [shotLoading, setShotLoading] = useState(false);
  const [shotResult, setShotResult] = useState<ScreenshotResult | null>(null);
  const [shotFullPage, setShotFullPage] = useState(false);
  const [shotError, setShotError] = useState<string | null>(null);
  const [shotOpen, setShotOpen] = useState(false);

  async function openPreview(fullPage = false) {
    if (!analysis) return;
    setShotOpen(true);
    setShotError(null);
    // Кеш по (url + fullPage) — если уже captured этот вариант, открываем мгновенно
    if (shotResult && shotFullPage === fullPage) return;
    setShotLoading(true);
    setShotFullPage(fullPage);
    try {
      const r = await toolsApi.screenshot(analysis.identity.finalUrl, fullPage);
      setShotResult(r);
    } catch (err) {
      setShotError(formatErr(err));
    } finally {
      setShotLoading(false);
    }
  }

  useEffect(() => {
    return () => {
      esRef.current?.close();
    };
  }, []);

  const hostname = useMemo(() => {
    try {
      return analysis ? new URL(analysis.identity.finalUrl).hostname : '';
    } catch {
      return '';
    }
  }, [analysis]);

  // ── Step 1: analyze ─────────────────────────────────────────────────────
  async function analyze(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setBusy(true);
    setAnalysis(null);
    setWpProbe(null);
    try {
      // В html-mode не вызываем wp-probe вообще — пользователь явно отказался
      // от WP-маршрута. Иначе — analyze + probe параллельно (probe не критичен).
      const [a, probe] = await Promise.all([
        toolsApi.analyzeSite(url.trim()),
        htmlMode ? Promise.resolve(null) : wpImportApi.probe(url.trim()).catch(() => null),
      ]);
      setAnalysis(a);
      setWpProbe(probe);

      // Prefill step 2 design из guessedRoles + первой пары typography
      const headFontGuess = a.typography.googleFonts[0] ?? a.typography.fontFamilies[0] ?? DEFAULT_DESIGN.headFont;
      const bodyFontGuess = a.typography.googleFonts[1] ?? a.typography.fontFamilies[1] ?? headFontGuess;
      setDesign({
        bg: a.guessedRoles.bg,
        headColor: a.guessedRoles.head,
        headFont: headFontGuess,
        accColor: a.guessedRoles.acc,
        accFont: headFontGuess,
        bodyColor: a.guessedRoles.head,
        bodyFont: bodyFontGuess,
      });

      // Prefill menu из navigation (fallback на skeleton)
      if (a.navigation.length > 0) {
        setMenuItems(
          a.navigation.slice(0, 12).map((n, i) => ({
            label: n.label,
            href: normalizeHref(n.href, a.identity.finalUrl),
            sortOrder: i,
          })),
        );
      } else {
        setMenuItems(DEFAULT_MENU);
      }

      // Prefill step 3 identity из hostname/title
      try {
        const u = new URL(a.identity.finalUrl);
        const host = u.hostname.replace(/^www\./, '');
        const tld = host.lastIndexOf('.');
        const slugGuess = (tld > 0 ? host.slice(0, tld) : host)
          .replace(/[^a-z0-9-]+/gi, '-')
          .toLowerCase()
          .slice(0, 64);
        setSlug(slugGuess);
        setName(a.identity.title ?? a.identity.ogTitle ?? host);
        setCustomDomain(host);
      } catch {
        // best-effort, не критично
      }

      setStep(2);
    } catch (err) {
      setError(formatErr(err));
    } finally {
      setBusy(false);
    }
  }

  // ── WP-import: kickoff + SSE subscribe ─────────────────────────────────
  async function submitWp(): Promise<void> {
    if (!analysis) return;
    setError(null);
    setBusy(true);
    setWpEvents([]);
    setStep('wp-importing');
    try {
      const { jobId } = await wpImportApi.kickoff({
        sourceUrl: analysis.identity.finalUrl,
        slug: slug.trim(),
        name: name.trim(),
        customDomain: customDomain.trim() || undefined,
        importOptions: wpOptions,
        maxMediaItems: 200,
      });

      esRef.current = wpImportApi.stream(
        jobId,
        (ev) => {
          setWpEvents((prev) => [...prev, ev]);
          if (ev.type === 'done') {
            const p = ev.payload as Record<string, unknown> | undefined;
            setWpResult({
              tenantId: String(p?.tenantId ?? ''),
              slug: String(p?.slug ?? ''),
              customDomain: typeof p?.customDomain === 'string' ? p.customDomain : undefined,
              pagesImported: Number(p?.pagesImported ?? 0),
              postsImported: Number(p?.postsImported ?? 0),
              mediaImported: Number(p?.mediaImported ?? 0),
              mediaFailed: Number(p?.mediaFailed ?? 0),
              menuItemsImported: Number(p?.menuItemsImported ?? 0),
            });
            setStep('wp-success');
            setBusy(false);
          } else if (ev.type === 'error') {
            setError(ev.error?.message ?? ev.message);
            setBusy(false);
          }
        },
        () => {
          // SSE network error — оставляем юзера на progress-вью с error баннером
          setError('Поток прервался; импорт может быть продолжается на сервере.');
        },
      );
    } catch (err) {
      setError(formatErr(err));
      setBusy(false);
      setStep(3); // вернёмся к форме идентичности
    }
  }

  // ── mode=blank submit: пустой тенант + дефолтный дизайн ────────────────
  async function submitBlank(): Promise<void> {
    if (!slug.trim() || !name.trim()) {
      setError('Slug и Имя обязательны');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      // sourceUrl обязателен на бэке (BootstrapTenantDto.IsUrl). Для blank-кейса
      // используем self-referential `https://{slug}.spa.me` — это канонический
      // NAS-URL тенанта, по которому он действительно будет доступен.
      const placeholderSource = `https://${slug.trim()}.spa.me`;
      const res = await tenantsApi.bootstrap({
        slug: slug.trim(),
        name: name.trim(),
        sourceUrl: placeholderSource,
        customDomain: customDomain.trim() || undefined,
        design: DEFAULT_DESIGN,
        menuItems: [],
      });
      setResult(res);
      setStep('success');
    } catch (err) {
      setError(formatErr(err));
    } finally {
      setBusy(false);
    }
  }

  // ── Step 3: submit (обычный bootstrap, design-only) ────────────────────
  async function submit(): Promise<void> {
    if (!analysis) return;
    setError(null);
    setBusy(true);
    try {
      const payload = {
        slug: slug.trim(),
        name: name.trim(),
        sourceUrl: analysis.identity.finalUrl,
        customDomain: customDomain.trim() || undefined,
        design,
        menuItems: menuItems.filter((m) => m.label.trim() && m.href.trim()),
        faviconUrl: importFavicon && analysis.identity.favicon ? analysis.identity.favicon : undefined,
      };
      const res = await tenantsApi.bootstrap(payload);
      setResult(res);
      setStep('success');
    } catch (err) {
      setError(formatErr(err));
    } finally {
      setBusy(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  // mode=blank — отдельный mini-flow без URL/analyze
  if (blankMode && step !== 'success') {
    return (
      <div className="flex flex-col gap-4 max-w-[640px]">
        <Card
          title="Создание с нуля"
          sub="Пустой тенант с дефолтным дизайном NAS → перейдёшь в ED-редактор страниц"
        >
          <div className="grid gap-4">
            <Field label="Slug" hint="URL-safe (2-64), будет частью /{slug} и {slug}.spa.me">
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="my-spa"
                className="w-full h-10 bg-bg-elev border border-line rounded-md px-3 font-mono text-[14px] outline-none focus:border-gold/40"
              />
            </Field>
            <Field label="Имя" hint="Отображаемое название бренда">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Spa"
                className="w-full h-10 bg-bg-elev border border-line rounded-md px-3 text-[14px] outline-none focus:border-gold/40"
              />
            </Field>
            <Field
              label="Custom domain (опц.)"
              hint="если оставить пусто — будет доступен только как /{slug}"
            >
              <input
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="my-spa.ru"
                className="w-full h-10 bg-bg-elev border border-line rounded-md px-3 font-mono text-[14px] outline-none focus:border-gold/40"
              />
            </Field>
          </div>
        </Card>
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/admin/projects')}
            disabled={busy}
            className="px-4 py-2.5 bg-bg-elev border border-line rounded-md text-[13px]"
          >
            Отмена
          </button>
          <button
            onClick={submitBlank}
            disabled={busy || !slug.trim() || !name.trim()}
            className="px-4 py-2.5 bg-gold text-bg font-semibold rounded-md text-[13px] flex items-center gap-2 disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Создаю…
              </>
            ) : (
              'Создать и открыть редактор'
            )}
          </button>
        </div>
        {error && <ErrorBox text={error} />}
      </div>
    );
  }

  if (step === 'success' && result) {
    return (
      <Card title="Тенант создан" sub={`id: ${result.id}`}>
        <dl className="grid grid-cols-[160px_1fr] gap-y-2 gap-x-4 text-[13px] mb-5">
          <Row label="Slug">
            <span className="font-mono text-gold">{result.slug}</span>
          </Row>
          <Row label="Имя">{result.name}</Row>
          {result.customDomain && (
            <Row label="Custom domain">
              <span className="font-mono text-text-dim">{result.customDomain}</span>
            </Row>
          )}
          <Row label="Source">
            <span className="font-mono text-[11px] text-text-mute break-all">{result.bootstrapSourceUrl}</span>
          </Row>
          <Row label="Menu items">{result.menuItemsCreated}</Row>
          {result.faviconKey && (
            <Row label="Favicon">
              <span className="font-mono text-[11px] text-text-dim break-all">{result.faviconKey}</span>
            </Row>
          )}
          {result.faviconError && (
            <Row label="Favicon">
              <span className="text-red text-[12px]">не скачался: {result.faviconError}</span>
            </Row>
          )}
        </dl>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => router.push(`/admin/cms/new?tenant=${result.slug}`)}
            className="px-4 py-2.5 bg-gold text-bg font-semibold rounded-md text-[13px]"
          >
            {blankMode ? 'Открыть ED-редактор страниц' : 'Создать страницу в ED-редакторе'}
          </button>
          <a
            href={`/${result.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 bg-bg-elev border border-line rounded-md text-[13px]"
          >
            Открыть /{result.slug}
          </a>
          <button
            onClick={() => router.push('/admin/projects')}
            className="px-4 py-2.5 bg-bg-elev border border-line rounded-md text-[13px]"
          >
            К списку проектов
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {(step === 1 || step === 2 || step === 3) && <StepIndicator step={step} />}

      {step === 1 && (
        <Card
          title="Шаг 1 · Источник"
          sub={
            htmlMode
              ? 'HTML-режим · только site-analyzer, без WP REST API'
              : 'введи URL — анализатор вытянет design + меню (+ WP-импорт если есть /wp-json)'
          }
        >
          <form onSubmit={analyze} className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-mute pointer-events-none" />
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/"
                  disabled={busy}
                  className="w-full h-11 bg-bg-elev border border-line rounded-md pl-10 pr-4 text-[14px] font-mono outline-none focus:border-gold/40 placeholder:text-text-mute disabled:opacity-50"
                />
              </div>
              <button
                type="submit"
                disabled={busy || !url.trim()}
                className="px-5 h-11 bg-gold text-bg font-semibold rounded-md disabled:opacity-50 flex items-center gap-2"
              >
                {busy ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Анализирую…
                  </>
                ) : (
                  <>
                    Анализировать
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
            <div className="text-[11px] text-text-mute font-mono tracking-wider">
              http/https · ≤ 2MB · 10s timeout · публичные IP only
            </div>
            {error && <ErrorBox text={error} />}
          </form>
        </Card>
      )}

      {step === 2 && analysis && (
        <>
          <div className="flex items-center justify-between px-3 py-2 bg-bg-elev border border-line rounded-md">
            <div className="font-mono text-[11.5px] text-text-mute truncate flex-1 min-w-0">
              <span className="text-text-dim">источник:</span>{' '}
              <span className="text-text">{analysis.identity.finalUrl}</span>
            </div>
            <button
              type="button"
              onClick={() => openPreview(false)}
              className="px-3 py-1.5 bg-bg border border-line rounded-md text-[12px] flex items-center gap-1.5 hover:border-gold/40 ml-3 flex-shrink-0"
            >
              <Camera size={13} /> Превью
            </button>
          </div>

          {analysis.isSpa && (
            <div className="px-4 py-3 bg-yellow-500/5 border border-yellow-500/30 rounded-md text-[12px] text-yellow-200">
              ⚠ Похоже, исходный сайт — SPA-shell (заголовков и секций не нашли). Content
              мог быть отрендерен JS — design tokens и menu могут быть бедными.
            </div>
          )}

          <Card title="Шаг 2.1 · Design tokens" sub="цвета + шрифты · pre-filled из палитры">
            <DesignEditor design={design} setDesign={setDesign} palette={analysis.palette.hex.map((c) => c.value)} fonts={[...analysis.typography.googleFonts, ...analysis.typography.fontFamilies]} />
          </Card>

          <Card
            title="Шаг 2.2 · Меню"
            sub={`${menuItems.length} пунктов · из <nav>/<header> исходного сайта`}
            actions={
              <button
                onClick={() =>
                  setMenuItems((prev) => [
                    ...prev,
                    { label: '', href: '/', sortOrder: prev.length },
                  ])
                }
                className="px-3 py-1.5 bg-bg-elev border border-line rounded-md text-[12px] flex items-center gap-1.5"
              >
                <Plus size={12} /> добавить
              </button>
            }
          >
            <MenuEditor items={menuItems} setItems={setMenuItems} />
          </Card>

          <Card title="Шаг 2.3 · Favicon" sub={analysis.identity.favicon ? 'найден на исходном сайте' : 'не найден на исходном сайте'}>
            {analysis.identity.favicon ? (
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={importFavicon}
                  onChange={(e) => setImportFavicon(e.target.checked)}
                  className="mt-1"
                />
                <div className="min-w-0">
                  <div className="text-[13px]">Импортировать с исходного сайта</div>
                  <div className="font-mono text-[11px] text-text-mute break-all mt-0.5">
                    {analysis.identity.favicon}
                  </div>
                  <div className="text-[11px] text-text-mute mt-1">
                    Сервер сам скачает (SSRF-protected) и положит в S3 + tenant_design_tokens.faviconKey
                  </div>
                </div>
              </label>
            ) : (
              <div className="text-[12px] text-text-mute">
                Favicon не извлечён. Загрузишь вручную позже в /admin/design.
              </div>
            )}
          </Card>

          <Nav onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={false} />
          {error && <ErrorBox text={error} />}
        </>
      )}

      {step === 3 && analysis && (
        <>
          <Card title="Шаг 3 · Идентификация" sub="как тенант будет адресоваться">
            <div className="grid gap-4 max-w-[640px]">
              <Field label="Slug" hint="URL-safe (2-64), будет частью /{slug} и {slug}.spa.me">
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full h-10 bg-bg-elev border border-line rounded-md px-3 font-mono text-[14px] outline-none focus:border-gold/40"
                />
              </Field>
              <Field label="Имя" hint="отображаемое название бренда">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 bg-bg-elev border border-line rounded-md px-3 text-[14px] outline-none focus:border-gold/40"
                />
              </Field>
              <Field label="Custom domain (опц.)" hint={`оставь '${hostname}' чтобы сохранить или удали для default {slug}.spa.me`}>
                <input
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  className="w-full h-10 bg-bg-elev border border-line rounded-md px-3 font-mono text-[14px] outline-none focus:border-gold/40"
                />
              </Field>
            </div>
          </Card>

          {wpProbe?.isWp && (
            <Card
              title="WordPress-донор обнаружен"
              sub={`${wpProbe.siteName ?? 'без имени'} · можно импортировать весь контент`}
            >
              <div className="flex items-start gap-3">
                <Database size={20} className="text-gold mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="text-[12.5px] text-text-dim mb-3">
                    Помимо design + favicon импортнём:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                    <WpOptToggle
                      label="Pages"
                      hint={
                        wpProbe.counts.pages > 0
                          ? `${wpProbe.counts.pages} стр. → cms_pages`
                          : wpProbe.counts.pages === -1
                            ? 'есть, кол-во неизвестно'
                            : 'нет'
                      }
                      enabled={wpOptions.pages && wpProbe.counts.pages !== 0}
                      disabled={wpProbe.counts.pages === 0}
                      onChange={(v) => setWpOptions((p) => ({ ...p, pages: v }))}
                    />
                    <WpOptToggle
                      label="Media"
                      hint={
                        wpProbe.counts.media > 0
                          ? `${wpProbe.counts.media} файлов → S3 + media`
                          : wpProbe.counts.media === -1
                            ? 'есть, кол-во неизвестно'
                            : 'нет'
                      }
                      enabled={wpOptions.media && wpProbe.counts.media !== 0}
                      disabled={wpProbe.counts.media === 0}
                      onChange={(v) => setWpOptions((p) => ({ ...p, media: v }))}
                    />
                    <WpOptToggle
                      label="Menu"
                      hint={
                        wpProbe.counts.menus > 0
                          ? `${wpProbe.counts.menus} меню → tenant_menu_items`
                          : 'нет (endpoint недоступен)'
                      }
                      enabled={wpOptions.menu && wpProbe.counts.menus !== 0}
                      disabled={wpProbe.counts.menus === 0}
                      onChange={(v) => setWpOptions((p) => ({ ...p, menu: v }))}
                    />
                    <WpOptToggle
                      label="Posts (blog)"
                      hint={
                        wpProbe.counts.posts > 0
                          ? `${wpProbe.counts.posts} постов → cms_pages с blog-* slug`
                          : wpProbe.counts.posts === -1
                            ? 'есть, кол-во неизвестно'
                            : 'нет'
                      }
                      enabled={wpOptions.posts && wpProbe.counts.posts !== 0}
                      disabled={wpProbe.counts.posts === 0}
                      onChange={(v) => setWpOptions((p) => ({ ...p, posts: v }))}
                    />
                  </div>
                  {wpProbe.notes.length > 0 && (
                    <ul className="text-[11px] text-text-mute list-disc list-inside mb-3">
                      {wpProbe.notes.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    onClick={submitWp}
                    disabled={busy || !slug.trim() || !name.trim()}
                    className="px-4 py-2.5 bg-gold text-bg font-semibold rounded-md text-[13px] flex items-center gap-2 disabled:opacity-50"
                  >
                    <Database size={14} />
                    {busy ? 'Запускаю…' : 'Импортировать всё (WP)'}
                  </button>
                  <div className="text-[11px] text-text-mute mt-2">
                    Минуты, не секунды. Прогресс пойдёт live в следующем шаге.
                  </div>
                </div>
              </div>
            </Card>
          )}

          <Nav
            onBack={() => setStep(2)}
            onNext={submit}
            nextLabel={busy ? 'Создаю…' : 'Только design (без WP)'}
            nextDisabled={busy || !slug.trim() || !name.trim()}
            nextBusy={busy}
          />
          {error && <ErrorBox text={error} />}
        </>
      )}

      {step === 'wp-importing' && (
        <Card
          title="Импортирую WordPress-донор"
          sub={`SSE-stream · ${wpEvents.length} событий · последний: ${wpEvents[wpEvents.length - 1]?.type ?? '…'}`}
        >
          <WpProgressLog events={wpEvents} />
          {error && <ErrorBox text={error} />}
          {!error && busy && (
            <div className="mt-3 text-[12px] text-text-mute flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              импорт идёт; не закрывай вкладку
            </div>
          )}
        </Card>
      )}

      {step === 'wp-success' && wpResult && (
        <Card title="WordPress-импорт завершён" sub={`tenantId: ${wpResult.tenantId}`}>
          <dl className="grid grid-cols-[200px_1fr] gap-y-2 gap-x-4 text-[13px] mb-5">
            <Row label="Slug">
              <span className="font-mono text-gold">{wpResult.slug}</span>
            </Row>
            {wpResult.customDomain && (
              <Row label="Custom domain">
                <span className="font-mono text-text-dim">{wpResult.customDomain}</span>
              </Row>
            )}
            <Row label="Pages импортировано">{wpResult.pagesImported}</Row>
            <Row label="Posts импортировано">{wpResult.postsImported}</Row>
            <Row label="Media импортировано">
              {wpResult.mediaImported}
              {wpResult.mediaFailed > 0 && (
                <span className="text-yellow-300 ml-2">
                  · {wpResult.mediaFailed} не скачалось
                </span>
              )}
            </Row>
            <Row label="Menu items">{wpResult.menuItemsImported}</Row>
          </dl>
          <details className="mb-4">
            <summary className="text-[12px] text-text-mute cursor-pointer">
              Полный лог ({wpEvents.length})
            </summary>
            <div className="mt-2">
              <WpProgressLog events={wpEvents} />
            </div>
          </details>
          <div className="flex gap-3">
            <a
              href={`/${wpResult.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-gold text-bg font-semibold rounded-md text-[13px]"
            >
              Открыть /{wpResult.slug}
            </a>
            <button
              onClick={() => router.push('/admin/projects')}
              className="px-4 py-2.5 bg-bg-elev border border-line rounded-md text-[13px]"
            >
              К списку проектов
            </button>
          </div>
        </Card>
      )}

      {shotOpen && (
        <ScreenshotModal
          loading={shotLoading}
          result={shotResult}
          error={shotError}
          fullPage={shotFullPage}
          sourceUrl={analysis?.identity.finalUrl ?? ''}
          onToggleFullPage={(v) => openPreview(v)}
          onClose={() => setShotOpen(false)}
        />
      )}
    </div>
  );
}

function ScreenshotModal({
  loading,
  result,
  error,
  fullPage,
  sourceUrl,
  onToggleFullPage,
  onClose,
}: {
  loading: boolean;
  result: ScreenshotResult | null;
  error: string | null;
  fullPage: boolean;
  sourceUrl: string;
  onToggleFullPage: (v: boolean) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-bg-elev border border-line rounded-md shadow-2xl flex flex-col max-h-[92vh] max-w-[1400px] w-full"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-line flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Camera size={14} className="text-gold flex-shrink-0" />
            <div className="font-mono text-[12px] text-text-mute truncate">{sourceUrl}</div>
            {result?.cached && (
              <span className="text-[10px] font-mono uppercase tracking-wider bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded-md flex-shrink-0">
                cached
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => onToggleFullPage(!fullPage)}
              disabled={loading}
              className={`px-2.5 py-1 text-[11.5px] rounded-md border transition-colors ${
                fullPage
                  ? 'bg-gold/10 border-gold/40 text-gold'
                  : 'bg-bg border-line text-text-mute hover:border-text/40'
              }`}
            >
              {fullPage ? 'Full-page' : 'Viewport'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 grid place-items-center rounded-md border border-line text-text-mute hover:text-text"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-bg">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-text-mute">
              <Loader2 className="animate-spin" size={28} />
              <div className="text-[12px] font-mono">
                Делаю снимок через headless Chromium…
              </div>
              <div className="text-[11px] text-text-dim">
                первый запрос 3-5s, повторные мгновенно из кеша
              </div>
            </div>
          )}
          {!loading && error && (
            <div className="px-4 py-3 bg-red/5 border border-red/30 rounded-md text-[12.5px] text-red-300">
              <div className="font-semibold mb-1">Не удалось сделать снимок</div>
              <div className="font-mono text-[11px]">{error}</div>
            </div>
          )}
          {!loading && !error && result && (
            <div className="flex justify-center">
              <img
                src={result.url}
                alt={`Screenshot of ${sourceUrl}`}
                className="max-w-full border border-line rounded-md shadow-lg"
                style={{ background: '#fff' }}
              />
            </div>
          )}
        </div>

        {result && (
          <div className="px-4 py-2 border-t border-line text-[11px] font-mono text-text-mute flex items-center gap-4 flex-shrink-0">
            <span>{result.width} × {result.height}px</span>
            {result.sizeBytes > 0 && <span>{Math.round(result.sizeBytes / 1024)}KB</span>}
            <span>{result.durationMs > 0 ? `${result.durationMs}ms` : 'из кеша'}</span>
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-gold hover:underline"
            >
              открыть в новой вкладке
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function WpOptToggle({
  label,
  hint,
  enabled,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  enabled: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={`flex items-start gap-2.5 p-2.5 border rounded-md cursor-pointer ${
        disabled
          ? 'border-line/40 opacity-50 cursor-not-allowed'
          : enabled
            ? 'border-gold/40 bg-gold/5'
            : 'border-line hover:border-line/80'
      }`}
    >
      <input
        type="checkbox"
        checked={enabled}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5"
      />
      <div className="min-w-0">
        <div className="text-[13px] font-semibold">{label}</div>
        <div className="text-[11px] text-text-mute mt-0.5">{hint}</div>
      </div>
    </label>
  );
}

function WpProgressLog({ events }: { events: WpImportEvent[] }) {
  // Sticky-bottom: показываем последние 20 событий, иначе list растёт.
  const tail = events.slice(-20);
  return (
    <ul className="font-mono text-[11.5px] text-text-dim border border-line rounded-md p-2.5 max-h-[280px] overflow-y-auto space-y-0.5">
      {tail.map((ev, i) => {
        const isError = ev.type === 'error' || ev.type === 'media.failed';
        const isDone = ev.type === 'done';
        const cls = isError
          ? 'text-red-300'
          : isDone
            ? 'text-green-300'
            : ev.type === 'tenant.created'
              ? 'text-gold'
              : '';
        const prog = ev.current && ev.total ? ` (${ev.current}/${ev.total})` : '';
        return (
          <li key={`${i}-${ev.type}`} className={cls}>
            <span className="text-text-mute mr-1.5">[{ev.type}]</span>
            {ev.message}
            {prog}
          </li>
        );
      })}
      {tail.length === 0 && <li className="text-text-mute italic">ожидание событий…</li>}
    </ul>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const labels = ['Источник', 'Design + меню', 'Идентификация'];
  return (
    <div className="flex items-center gap-2 text-[12px] font-mono">
      {labels.map((label, i) => {
        const n = i + 1;
        const active = step === n;
        const done = step > n;
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] border ${
                active
                  ? 'bg-gold text-bg border-gold'
                  : done
                    ? 'bg-bg-elev border-gold/50 text-gold'
                    : 'bg-bg-elev border-line text-text-mute'
              }`}
            >
              {n}
            </div>
            <span className={active ? 'text-text' : done ? 'text-text-dim' : 'text-text-mute'}>
              {label}
            </span>
            {i < labels.length - 1 && <span className="text-text-mute mx-1">·</span>}
          </div>
        );
      })}
    </div>
  );
}

function Nav({
  onBack,
  onNext,
  nextLabel = 'Далее',
  nextDisabled = false,
  nextBusy = false,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextBusy?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <button
        onClick={onBack}
        className="px-4 py-2 bg-bg-elev border border-line rounded-md text-[13px] flex items-center gap-2"
      >
        <ArrowLeft size={14} /> Назад
      </button>
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="px-5 py-2.5 bg-gold text-bg font-semibold rounded-md text-[13px] disabled:opacity-50 flex items-center gap-2"
      >
        {nextBusy && <Loader2 size={14} className="animate-spin" />}
        {nextLabel}
        {!nextBusy && <ArrowRight size={14} />}
      </button>
    </div>
  );
}

function DesignEditor({
  design,
  setDesign,
  palette,
  fonts,
}: {
  design: BootstrapDesign;
  setDesign: (d: BootstrapDesign) => void;
  palette: string[];
  fonts: string[];
}) {
  const colorRows: { key: keyof BootstrapDesign; label: string }[] = [
    { key: 'bg', label: 'Фон' },
    { key: 'headColor', label: 'Heading color' },
    { key: 'accColor', label: 'Accent color' },
    { key: 'bodyColor', label: 'Body color' },
  ];
  const fontRows: { key: keyof BootstrapDesign; label: string }[] = [
    { key: 'headFont', label: 'Heading font' },
    { key: 'accFont', label: 'Accent font' },
    { key: 'bodyFont', label: 'Body font' },
  ];

  return (
    <div className="grid grid-cols-2 max-[820px]:grid-cols-1 gap-5">
      <div className="space-y-3">
        {colorRows.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3">
            <label className="w-32 font-mono text-[11px] uppercase tracking-widest text-text-mute">
              {label}
            </label>
            <input
              type="color"
              value={String(design[key])}
              onChange={(e) => setDesign({ ...design, [key]: e.target.value.toUpperCase() })}
              className="w-9 h-9 bg-transparent border border-line rounded-md cursor-pointer"
            />
            <input
              type="text"
              value={String(design[key])}
              onChange={(e) => setDesign({ ...design, [key]: e.target.value })}
              className="flex-1 h-9 bg-bg-elev border border-line rounded-md px-2.5 font-mono text-[12px] outline-none focus:border-gold/40"
            />
          </div>
        ))}
        {palette.length > 0 && (
          <div className="pt-2">
            <div className="font-mono text-[10.5px] uppercase tracking-widest text-text-mute mb-1.5">
              извлечённая палитра — кликни чтобы выбрать
            </div>
            <div className="flex flex-wrap gap-1.5">
              {palette.slice(0, 16).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setDesign({ ...design, accColor: c })}
                  title={`${c} → accent`}
                  className="w-7 h-7 rounded-md border border-line hover:border-gold transition-colors"
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="space-y-3">
        {fontRows.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3">
            <label className="w-32 font-mono text-[11px] uppercase tracking-widest text-text-mute">
              {label}
            </label>
            <input
              type="text"
              value={String(design[key])}
              onChange={(e) => setDesign({ ...design, [key]: e.target.value })}
              list={`fonts-${key}`}
              className="flex-1 h-9 bg-bg-elev border border-line rounded-md px-2.5 text-[13px] outline-none focus:border-gold/40"
              style={{ fontFamily: `'${String(design[key])}', sans-serif` }}
            />
            <datalist id={`fonts-${key}`}>
              {fonts.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </div>
        ))}
        <div className="pt-2 px-3 py-3 bg-bg-elev border border-line rounded-md" style={{ background: design.bg }}>
          <div
            className="text-[18px] mb-1"
            style={{ color: design.headColor, fontFamily: `'${design.headFont}', sans-serif` }}
          >
            Preview heading
          </div>
          <div
            className="text-[13px]"
            style={{ color: design.bodyColor, fontFamily: `'${design.bodyFont}', sans-serif` }}
          >
            Body text · accent → <span style={{ color: design.accColor, fontFamily: `'${design.accFont}', sans-serif` }}>highlight</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuEditor({
  items,
  setItems,
}: {
  items: BootstrapMenuItem[];
  setItems: (items: BootstrapMenuItem[]) => void;
}) {
  if (items.length === 0) {
    return <div className="text-[12px] text-text-mute">Пусто. Добавь пункты выше.</div>;
  }
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex items-center gap-2">
          <input
            value={it.label}
            placeholder="Услуги"
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...it, label: e.target.value };
              setItems(next);
            }}
            className="w-44 h-9 bg-bg-elev border border-line rounded-md px-2.5 text-[13px] outline-none focus:border-gold/40"
          />
          <input
            value={it.href}
            placeholder="/services"
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...it, href: e.target.value };
              setItems(next);
            }}
            className="flex-1 h-9 bg-bg-elev border border-line rounded-md px-2.5 font-mono text-[12px] outline-none focus:border-gold/40"
          />
          <button
            onClick={() => setItems(items.filter((_, j) => j !== i).map((m, j) => ({ ...m, sortOrder: j })))}
            className="w-9 h-9 border border-line rounded-md flex items-center justify-center text-text-mute hover:text-red hover:border-red/40"
            title="удалить"
          >
            <Trash2 size={14} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="font-mono text-[11px] uppercase tracking-widest text-text-mute mb-1.5">
        {label}
      </div>
      {children}
      {hint && <div className="text-[11px] text-text-mute mt-1">{hint}</div>}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="font-mono text-[11.5px] uppercase tracking-widest text-text-mute pt-0.5">
        {label}
      </dt>
      <dd className="text-[13px] text-text-dim min-w-0">{children}</dd>
    </>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div className="px-3 py-2 text-[13px] text-red border border-red/30 bg-red/10 rounded-md">
      {text}
    </div>
  );
}

function normalizeHref(href: string, baseHref: string): string {
  try {
    const u = new URL(href);
    const base = new URL(baseHref);
    if (u.hostname === base.hostname) {
      return u.pathname + u.search;
    }
    return href;
  } catch {
    return href;
  }
}

function formatErr(err: unknown): string {
  if (err instanceof ApiError) {
    return err.body.message ?? `HTTP ${err.status} (${err.body.code ?? 'unknown'})`;
  }
  return String(err);
}
