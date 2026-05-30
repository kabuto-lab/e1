/**
 * ContactFormPreset — секция с формой записи.
 *
 * Φ6: визуал работает; submit пока mock (alert) — API-интеграция с
 * `lead_applications` отложена до Φ7 финализации. Дизайнер видит, как
 * форма выглядит на канвасе и в публичном рендере, может стилизовать.
 */
'use client';
import { useState } from 'react';
import type { Tenant } from '@/lib/tenants';

export interface ContactFormProps extends Record<string, unknown> {
  eyebrow: string;
  headline: string;
  description: string;
  submitLabel: string;
  showPhone: boolean;
  showService: boolean;
  showMessage: boolean;
}

export const contactFormDefaults: ContactFormProps = {
  eyebrow: 'Запись',
  headline: 'Забронируйте визит',
  description: 'Оставьте контакты — менеджер свяжется в течение 15 минут.',
  submitLabel: 'Отправить',
  showPhone: true,
  showService: true,
  showMessage: true,
};

export function ContactFormPreset({
  props,
}: {
  props: Record<string, unknown>;
  mode?: 'editor' | 'render';
  tenant?: Tenant;
}) {
  const p = { ...contactFormDefaults, ...(props as Partial<ContactFormProps>) };
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [service, setService] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    background: 'color-mix(in srgb, var(--body-color) 5%, transparent)',
    border: '1px solid color-mix(in srgb, var(--body-color) 15%, transparent)',
    borderRadius: 4,
    color: 'var(--body-color)',
    fontFamily: 'var(--body-font)',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <section className="container" style={{ padding: '80px 24px', maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        {p.eyebrow && (
          <div className="accent" style={{ fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 16, fontFamily: 'var(--acc-font)', color: 'var(--acc-color)' }}>
            {p.eyebrow}
          </div>
        )}
        {p.headline && (
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 44px)', margin: '0 0 16px', fontFamily: 'var(--head-font)', color: 'var(--head-color)' }}>
            {p.headline}
          </h2>
        )}
        {p.description && (
          <p style={{ fontSize: 16, opacity: 0.7, margin: 0, maxWidth: 480, marginInline: 'auto' }}>
            {p.description}
          </p>
        )}
      </div>

      {sent ? (
        <div style={{ textAlign: 'center', padding: 40, border: '1px dashed var(--acc-color)', borderRadius: 8 }}>
          <div style={{ fontSize: 18, marginBottom: 8, color: 'var(--acc-color)' }}>Заявка отправлена</div>
          <div style={{ fontSize: 14, opacity: 0.7 }}>Свяжемся с вами в ближайшее время.</div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            // TODO Φ7: POST /v1/leads (lead_applications endpoint)
            setSent(true);
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя *" required style={inputStyle} />
          {p.showPhone && <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Телефон *" required style={inputStyle} type="tel" />}
          {p.showService && <input value={service} onChange={(e) => setService(e.target.value)} placeholder="Услуга" style={inputStyle} />}
          {p.showMessage && <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Сообщение" rows={4} style={{ ...inputStyle, resize: 'vertical' }} />}
          <button
            type="submit"
            style={{
              padding: '16px 40px',
              border: '2px solid var(--acc-color)',
              background: 'transparent',
              color: 'var(--acc-color)',
              fontFamily: 'var(--acc-font)',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              alignSelf: 'center',
              marginTop: 8,
            }}
          >
            {p.submitLabel}
          </button>
        </form>
      )}
    </section>
  );
}
