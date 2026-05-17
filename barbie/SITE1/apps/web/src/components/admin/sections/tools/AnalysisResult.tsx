'use client';

import { Card } from '@/components/admin/primitives/Card';
import type { SiteAnalysis } from '@/lib/tools-api';

export function AnalysisResult({
  analysis,
  onGenerate,
}: {
  analysis: SiteAnalysis;
  onGenerate: () => void;
}) {
  const { identity, typography, palette, structure, images, notes } = analysis;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Identity ───────────────────────────────────────────────────── */}
      <Card
        title="Identity"
        sub={`${identity.httpStatus} · ${(identity.bytesFetched / 1024).toFixed(1)} KB · ${identity.durationMs} ms`}
      >
        <dl className="grid grid-cols-[160px_1fr] gap-y-2 gap-x-4 text-[13px]">
          <Row label="URL">
            <a href={identity.finalUrl} target="_blank" rel="noopener noreferrer" className="text-gold font-mono break-all hover:underline">
              {identity.finalUrl}
            </a>
          </Row>
          {identity.title && <Row label="Title">{identity.title}</Row>}
          {identity.description && <Row label="Description">{identity.description}</Row>}
          {identity.ogTitle && <Row label="OG Title">{identity.ogTitle}</Row>}
          {identity.ogDescription && <Row label="OG Description">{identity.ogDescription}</Row>}
          {identity.ogImage && (
            <Row label="OG Image">
              <a
                href={identity.ogImage}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold font-mono text-[11px] break-all hover:underline"
              >
                {identity.ogImage}
              </a>
            </Row>
          )}
          {identity.lang && <Row label="Lang">{identity.lang}</Row>}
          {identity.favicon && (
            <Row label="Favicon">
              <a href={identity.favicon} target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] text-text-dim hover:underline">
                {identity.favicon}
              </a>
            </Row>
          )}
        </dl>
      </Card>

      {/* ── Typography ─────────────────────────────────────────────────── */}
      <Card title="Typography" sub={`${typography.fontFamilies.length} семейств · ${typography.googleFonts.length} Google Fonts · ${typography.stylesheets.length} stylesheet'ов`}>
        {typography.fontFamilies.length > 0 && (
          <Subhead label="Font families (style declarations)">
            <div className="flex flex-wrap gap-2">
              {typography.fontFamilies.map((f) => (
                <span key={f} className="px-2 py-1 bg-bg-elev border border-line rounded text-[12px]" style={{ fontFamily: `'${f}', sans-serif` }}>
                  {f}
                </span>
              ))}
            </div>
          </Subhead>
        )}
        {typography.googleFonts.length > 0 && (
          <Subhead label="Google Fonts">
            <div className="flex flex-wrap gap-2">
              {typography.googleFonts.map((f) => (
                <span key={f} className="px-2 py-1 bg-gold/10 border border-gold/30 rounded text-[12px] text-gold font-mono">
                  {f}
                </span>
              ))}
            </div>
          </Subhead>
        )}
        {typography.stylesheets.length > 0 && (
          <Subhead label="External stylesheets">
            <ul className="space-y-1 max-h-[160px] overflow-y-auto">
              {typography.stylesheets.map((s, i) => (
                <li key={i} className="font-mono text-[11px] text-text-dim break-all">
                  {s}
                </li>
              ))}
            </ul>
          </Subhead>
        )}
        {typography.fontFamilies.length === 0 && typography.googleFonts.length === 0 && (
          <div className="text-[13px] text-text-mute">Шрифты не обнаружены в inline-стилях.</div>
        )}
      </Card>

      {/* ── Palette ────────────────────────────────────────────────────── */}
      <Card title="Palette" sub={`HEX: ${palette.hex.length} · RGB(A): ${palette.rgb.length}`}>
        {palette.hex.length > 0 && (
          <Subhead label="HEX (top by frequency)">
            <div className="grid grid-cols-4 max-[1280px]:grid-cols-3 max-[820px]:grid-cols-2 gap-2">
              {palette.hex.map((c) => (
                <Swatch key={c.value} value={c.value} count={c.count} />
              ))}
            </div>
          </Subhead>
        )}
        {palette.rgb.length > 0 && (
          <Subhead label="RGB / RGBA">
            <div className="grid grid-cols-2 max-[820px]:grid-cols-1 gap-2">
              {palette.rgb.map((c) => (
                <Swatch key={c.value} value={c.value} count={c.count} />
              ))}
            </div>
          </Subhead>
        )}
        {palette.hex.length === 0 && palette.rgb.length === 0 && (
          <div className="text-[13px] text-text-mute">Цветовые значения не обнаружены.</div>
        )}
      </Card>

      {/* ── Structure ──────────────────────────────────────────────────── */}
      <Card title="Structure" sub={`h1:${structure.h1Count} · h2:${structure.h2Count} · h3:${structure.h3Count} · sections:${structure.sectionCount}`}>
        {structure.h1Texts.length > 0 && (
          <Subhead label="H1">
            <ul className="space-y-1">{structure.h1Texts.map((t, i) => <li key={i} className="text-[14px] font-display">{t}</li>)}</ul>
          </Subhead>
        )}
        {structure.h2Texts.length > 0 && (
          <Subhead label="H2">
            <ul className="space-y-1">{structure.h2Texts.map((t, i) => <li key={i} className="text-[13px] text-text-dim">{t}</li>)}</ul>
          </Subhead>
        )}
        {structure.ctaTexts.length > 0 && (
          <Subhead label="CTA / кнопки">
            <div className="flex flex-wrap gap-2">
              {structure.ctaTexts.map((t, i) => (
                <span key={i} className="px-2.5 py-1 bg-bg-elev border border-line rounded text-[12px]">{t}</span>
              ))}
            </div>
          </Subhead>
        )}
      </Card>

      {/* ── Images ─────────────────────────────────────────────────────── */}
      {images.length > 0 && (
        <Card title="Images" sub={`${images.length} картинок`}>
          <div className="grid grid-cols-5 max-[1280px]:grid-cols-3 max-[820px]:grid-cols-2 gap-3">
            {images.map((img, i) => (
              <a
                key={i}
                href={img.src}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-square bg-bg-elev border border-line rounded overflow-hidden hover:border-gold/40 transition-colors"
                title={img.alt ?? img.src}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt={img.alt ?? ''}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </Card>
      )}

      {/* ── Notes ──────────────────────────────────────────────────────── */}
      {notes.length > 0 && (
        <Card title="Notes">
          <ul className="space-y-1">
            {notes.map((n, i) => (
              <li key={i} className="text-[12px] text-text-mute font-mono">— {n}</li>
            ))}
          </ul>
        </Card>
      )}

      {/* ── Generate prototype CTA ─────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 px-5 py-4 bg-surface-2 border border-gold/30 rounded-lg">
        <div>
          <div className="text-[14px] font-semibold">Построить примерный прототип реплики?</div>
          <div className="text-[12px] text-text-mute mt-0.5">
            Возьмём палитру, типографику и структуру выше — соберём single-file HTML preview.
            Генератор пока в разработке (stub).
          </div>
        </div>
        <button
          onClick={onGenerate}
          className="px-4 py-2.5 bg-gold text-bg font-semibold rounded-md text-[13px] whitespace-nowrap"
        >
          Создать прототип
        </button>
      </div>
    </div>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────────

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="font-mono text-[11.5px] uppercase tracking-widest text-text-mute pt-0.5">{label}</dt>
      <dd className="text-[13px] text-text-dim min-w-0">{children}</dd>
    </>
  );
}

function Subhead({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="font-mono text-[11.5px] uppercase tracking-widest text-text-mute mb-2">{label}</div>
      {children}
    </div>
  );
}

function Swatch({ value, count }: { value: string; count: number }) {
  const isHex = value.startsWith('#');
  const cssColor = isHex ? value : value;
  return (
    <div className="flex items-center gap-2 p-1.5 bg-bg-elev border border-line rounded">
      <div
        className="w-8 h-8 rounded flex-shrink-0 border border-line"
        style={{ background: cssColor }}
      />
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[11px] uppercase truncate">{value}</div>
        <div className="font-mono text-[11.5px] text-text-mute">×{count}</div>
      </div>
    </div>
  );
}
