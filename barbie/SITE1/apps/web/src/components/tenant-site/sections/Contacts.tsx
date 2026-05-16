import type { Tenant } from '@/lib/tenants';

export function Contacts({ tenant }: { tenant: Tenant }) {
  return (
    <section
      id="section-3"
      className="container py-16 md:py-24 border-t"
      style={{ borderColor: 'color-mix(in srgb, var(--body-color) 15%, transparent)' }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <h2 className="text-3xl md:text-5xl mb-8">
            {tenant.navigation[3] ?? 'Связь'}
          </h2>
          <p className="opacity-70 mb-6 leading-relaxed">
            Запись по предварительному звонку или через защищённый канал. Время ответа — до 10 минут.
          </p>
          <div className="space-y-3">
            {tenant.phones.map((p, i) => (
              <a
                key={i}
                href={`tel:${p.replace(/[^+\d]/g, '')}`}
                className="block accent text-2xl md:text-3xl"
                style={{ fontFamily: 'var(--acc-font)', color: 'var(--acc-color)' }}
              >
                {p}
              </a>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          {tenant.address.city && (
            <div>
              <div
                className="text-xs uppercase tracking-[0.3em] mb-2 opacity-60"
                style={{ color: 'var(--acc-color)' }}
              >
                Адрес
              </div>
              <div className="text-lg">
                {tenant.address.city}
                {tenant.address.street && <>, {tenant.address.street}</>}
              </div>
              {tenant.address.metro && (
                <div className="text-sm opacity-60 mt-1">м. {tenant.address.metro}</div>
              )}
            </div>
          )}
          {tenant.workingHours && (
            <div>
              <div
                className="text-xs uppercase tracking-[0.3em] mb-2 opacity-60"
                style={{ color: 'var(--acc-color)' }}
              >
                Часы
              </div>
              <div className="text-lg">{tenant.workingHours}</div>
            </div>
          )}
          {(tenant.social.telegram || tenant.social.instagram || tenant.social.whatsapp) && (
            <div>
              <div
                className="text-xs uppercase tracking-[0.3em] mb-3 opacity-60"
                style={{ color: 'var(--acc-color)' }}
              >
                Каналы
              </div>
              <div className="flex flex-wrap gap-4">
                {tenant.social.telegram && (
                  <a
                    href={`https://t.me/${tenant.social.telegram.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Telegram
                  </a>
                )}
                {tenant.social.instagram && <a href="#">Instagram</a>}
                {tenant.social.whatsapp && <a href="#">WhatsApp</a>}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
