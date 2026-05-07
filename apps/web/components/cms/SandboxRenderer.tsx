import React from 'react';
import * as LucideIcons from 'lucide-react';

// ─── Shared types (mirror of sandbox/page.tsx) ────────────────────────────────

interface HeadingProps { text: string; tag: 'h1'|'h2'|'h3'|'h4'; align: 'left'|'center'|'right'; color: string; fontSize: number; }
interface TextProps { content: string; align: 'left'|'center'|'right'; color: string; }
interface ButtonProps { label: string; align: 'left'|'center'|'right'; style: 'primary'|'secondary'|'outline'; size: 'sm'|'md'|'lg'; }
interface DividerProps { lineStyle: 'solid'|'dashed'|'dotted'; color: string; weight: number; }
interface SpacerProps { height: number; }
interface IconBoxProps { icon: keyof typeof LucideIcons; title: string; description: string; iconColor: string; layout: 'top'|'left'; }
interface CtaProps { headline: string; description: string; buttonText: string; align: 'left'|'center'|'right'; }
interface ImageProps { url?: string; alt?: string; }
interface ElStyle {
  paddingTop: number; paddingRight: number; paddingBottom: number; paddingLeft: number;
  background: string; borderRadius: number; opacity: number; customCss: string;
}

interface CanvasElement {
  id: string;
  type: string;
  heading?: HeadingProps;
  text?: TextProps;
  button?: ButtonProps;
  divider?: DividerProps;
  spacer?: SpacerProps;
  iconBox?: IconBoxProps;
  cta?: CtaProps;
  image?: ImageProps;
  elStyle?: ElStyle;
}

interface Column { id: string; span: number; elements: CanvasElement[]; }
interface Section { id: string; columns: Column[]; padding: string; }

// ─── Widget renderer (read-only) ──────────────────────────────────────────────

function WidgetView({ el }: { el: CanvasElement }) {
  switch (el.type) {
    case 'heading': {
      const p = el.heading!;
      const style: React.CSSProperties = { textAlign: p.align, color: p.color, fontSize: p.fontSize, margin: 0, fontWeight: 700, lineHeight: 1.2 };
      if (p.tag === 'h1') return <h1 style={style}>{p.text}</h1>;
      if (p.tag === 'h3') return <h3 style={style}>{p.text}</h3>;
      if (p.tag === 'h4') return <h4 style={style}>{p.text}</h4>;
      return <h2 style={style}>{p.text}</h2>;
    }
    case 'text': {
      const p = el.text!;
      return <p style={{ textAlign: p.align, color: p.color, margin: 0, lineHeight: 1.7, fontSize: 15 }}>{p.content}</p>;
    }
    case 'button': {
      const p = el.button!;
      const pad = { sm: '6px 14px', md: '10px 22px', lg: '14px 30px' };
      const fs  = { sm: 13, md: 15, lg: 17 };
      const styles: Record<string, React.CSSProperties> = {
        primary:   { background: '#00ffcc', color: '#1e1e1e', border: 'none' },
        secondary: { background: '#555', color: '#fff', border: 'none' },
        outline:   { background: 'transparent', color: '#00ffcc', border: '2px solid #00ffcc' },
      };
      return (
        <div style={{ textAlign: p.align }}>
          <button style={{ ...styles[p.style], padding: pad[p.size], fontSize: fs[p.size], borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>{p.label}</button>
        </div>
      );
    }
    case 'divider': {
      const p = el.divider!;
      return <hr style={{ borderStyle: p.lineStyle, borderColor: p.color, borderWidth: `${p.weight}px 0 0 0`, margin: 0 }} />;
    }
    case 'spacer': {
      const p = el.spacer!;
      return <div style={{ height: p.height }} />;
    }
    case 'icon-box': {
      const p = el.iconBox!;
      const IconComp = LucideIcons[p.icon] as React.ComponentType<{ size?: number; color?: string }> | undefined;
      return (
        <div style={{ display: 'flex', flexDirection: p.layout === 'top' ? 'column' : 'row', gap: 12 }}>
          <div>{IconComp && <IconComp size={36} color={p.iconColor} />}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 4 }}>{p.title}</div>
            <div style={{ color: '#aaa', fontSize: 14, lineHeight: 1.5 }}>{p.description}</div>
          </div>
        </div>
      );
    }
    case 'cta': {
      const p = el.cta!;
      return (
        <div style={{ textAlign: p.align, padding: '16px 0' }}>
          <h3 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 8, marginTop: 0 }}>{p.headline}</h3>
          <p style={{ color: '#aaa', fontSize: 14, marginBottom: 18, marginTop: 0 }}>{p.description}</p>
          <button style={{ background: '#00ffcc', color: '#1e1e1e', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>{p.buttonText}</button>
        </div>
      );
    }
    case 'image': {
      const p = el.image;
      if (p?.url) return <img src={p.url} alt={p.alt || ''} style={{ width: '100%', borderRadius: 8, display: 'block' }} />;
      return null;
    }
    default:
      return null;
  }
}

// ─── Public renderer ──────────────────────────────────────────────────────────

export function SandboxRenderer({ sections }: { sections: unknown[] }) {
  const typedSections = sections as Section[];
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {typedSections.map(section => (
        <div key={section.id} style={{ padding: section.padding, borderTop: '1px solid #2a2a2a' }}>
          <div style={{ display: 'flex', gap: 16, maxWidth: 1200, margin: '0 auto' }}>
            {section.columns.map(col => (
              <div key={col.id} style={{ flex: col.span }}>
                {col.elements.map(el => {
                  const s = el.elStyle;
                  return (
                    <div
                      key={el.id}
                      style={{
                        padding: s ? `${s.paddingTop}px ${s.paddingRight}px ${s.paddingBottom}px ${s.paddingLeft}px` : '12px',
                        background: s?.background ?? 'transparent',
                        borderRadius: s?.borderRadius ?? 0,
                        opacity: s ? s.opacity / 100 : 1,
                      }}
                    >
                      <WidgetView el={el} />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
