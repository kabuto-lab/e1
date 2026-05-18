'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Globe, Loader2, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/admin/primitives/Card';
import { ApiError } from '@/lib/api-client';
import { toolsApi, type SiteAnalysis } from '@/lib/tools-api';
import {
  tenantsApi,
  type BootstrapDesign,
  type BootstrapMenuItem,
  type BootstrapTenantResult,
} from '@/lib/tenants-api';

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

type Step = 1 | 2 | 3 | 'success';

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

  // Step success
  const [result, setResult] = useState<BootstrapTenantResult | null>(null);

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
    try {
      const a = await toolsApi.analyzeSite(url.trim());
      setAnalysis(a);

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

  // ── Step 3: submit ──────────────────────────────────────────────────────
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
        <div className="flex gap-3">
          <a
            href={`/${result.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 bg-gold text-bg font-semibold rounded-md text-[13px]"
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
      <StepIndicator step={step as 1 | 2 | 3} />

      {step === 1 && (
        <Card title="Шаг 1 · Источник" sub="введи URL — анализатор вытянет design + меню">
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
                className="px-3 py-1.5 bg-bg-elev border border-line rounded text-[12px] flex items-center gap-1.5"
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

          <Nav
            onBack={() => setStep(2)}
            onNext={submit}
            nextLabel={busy ? 'Создаю…' : 'Создать тенант'}
            nextDisabled={busy || !slug.trim() || !name.trim()}
            nextBusy={busy}
          />
          {error && <ErrorBox text={error} />}
        </>
      )}
    </div>
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
              className="w-9 h-9 bg-transparent border border-line rounded cursor-pointer"
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
                  className="w-7 h-7 rounded border border-line hover:border-gold transition-colors"
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
