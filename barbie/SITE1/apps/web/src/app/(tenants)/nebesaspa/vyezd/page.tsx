import { asset } from '@/lib/asset';
import { NebesaShell } from '@/components/tenant-sites/nebesa/NebesaShell';

export const metadata = {
  title: 'Выезд — НЕБОСВОД · спа-салон',
  description:
    'Эротический массаж с выездом в Москве от салона НЕБОСВОД. Квалифицированные мастера и программы на выезд в удобной для вас обстановке.',
};

export default function Page() {
  return (
    <NebesaShell>
      <section className="progs">
        <div className="wrap">
          <h2 className="h2">Выезд</h2>

          <p>
            Эротический массаж с выездом — популярная практика, которая позволяет насладиться
            приятным отдыхом в удобной обстановке. В нашем салоне представлено немало программ,
            которые помогут расслабиться там, где вам комфортно.
          </p>
          <p>
            Наши мастера обладают высокой квалификацией и опытом, что позволяет создавать уникальные
            сеансы, направленные на полное расслабление и восстановление сил — классический массаж
            или что-то более экзотическое.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, margin: '14px 0' }}>
            <img
              style={{ width: '100%', borderRadius: 12 }}
              src={asset("/tenants/nebesaspa-clone/img_2103-hdr-1024x683.webp")}
              alt="Массаж на выезд"
            />
          </div>

          <div className="progs-track">
            <article className="pcard">
              <div className="nm">Облачное Прикосновение</div>
              <div className="price">
                от 10 000 ₽ <span>90 мин</span>
              </div>
              <p>Нежный релакс с выездом — мягкое погружение в атмосферу удовольствия.</p>
            </article>

            <article className="pcard">
              <div className="nm">Созвездие Кассиопеи</div>
              <div className="price">
                от 18 000 ₽ <span>120 мин</span>
              </div>
              <p>VIP-программа на выезд для тех, кто ценит премиальный сервис.</p>
            </article>

            <article className="pcard">
              <div className="nm">Двойной звездопад</div>
              <div className="price">
                от 30 000 ₽ <span>120 мин</span>
              </div>
              <p>Программа с двумя девушками с выездом — двойное наслаждение.</p>
            </article>
          </div>

          <p style={{ marginTop: 18 }}>
            Закажите выезд мастера в удобное время — позвоните{' '}
            <a href="tel:+79120767814">+7 912 076-78-14</a> или напишите нам через{' '}
            <a href={asset("/nebesaspa/contacts")}>контакты</a>.
          </p>
          <p style={{ marginTop: 14 }}>
            <a className="btn btn-blue" href="tel:+79120767814">
              Заказать выезд
            </a>
          </p>
        </div>
      </section>
    </NebesaShell>
  );
}
