import { asset } from '@/lib/asset';
import { MdpShell } from '@/components/tenant-sites/mdp/MdpShell';

export const metadata = {
  title: 'Забронировать — Barbie Spa · Эротический массаж для пар',
  description: 'Забронируйте программу эротического массажа для пар в салонах сети Barbie в Москве.',
};

/* Доп. стили страницы брони — заскоуплены под .mdp-site, чтобы не пересекаться
   с общим massazh-dlya-par.css. page-hero фон → webp. */
const CSS = `
.mdp-site .page-hero{min-height:46vh;display:flex;align-items:flex-end;position:relative;background:linear-gradient(180deg,rgba(10,10,12,.55),rgba(10,10,12,.92)),url('${asset('/tenants/massazh-dlya-par/photo_2022-11-09_19-11-37.webp')}') center/cover no-repeat;padding:130px 0 46px}
.mdp-site .page-hero .upper{color:var(--accent);display:block;margin-bottom:12px}
.mdp-site .page-hero h1{font-size:clamp(2.4rem,5.5vw,4rem)}
.mdp-site .crumbs{font-family:'Montserrat',sans-serif;font-size:.78rem;letter-spacing:.08em;color:var(--muted);margin-top:14px}
.mdp-site .crumbs a:hover{color:var(--accent)}
.mdp-site .book{padding:80px 0}
.mdp-site .book-grid{display:grid;grid-template-columns:1fr 1fr;gap:50px;align-items:start}
.mdp-site .book-info h2{font-size:2.3rem;color:var(--accent);margin-bottom:16px}
.mdp-site .book-info p{color:var(--muted);margin-bottom:22px}
.mdp-site .book-info ul{list-style:none;margin:24px 0}
.mdp-site .book-info li{padding:12px 0;border-bottom:1px solid var(--line);display:flex;gap:12px;align-items:flex-start;color:var(--ink)}
.mdp-site .book-info li::before{content:"\\2726";color:var(--accent);flex-shrink:0}
.mdp-site .book-call{margin-top:30px;padding:24px;background:var(--bg-3);border:1px solid var(--line);border-radius:6px}
.mdp-site .book-call span{font-family:'Montserrat',sans-serif;font-size:.72rem;letter-spacing:.15em;text-transform:uppercase;color:var(--muted)}
.mdp-site .book-call b{display:block;font-family:'Cormorant Garamond',serif;font-size:2rem;color:var(--accent);margin-top:6px}
.mdp-site .form-card{background:var(--bg-2);border:1px solid var(--line);border-radius:8px;padding:38px 34px}
.mdp-site .form-card h3{font-size:1.9rem;color:var(--accent);margin-bottom:6px}
.mdp-site .form-card .sub{color:var(--muted);font-size:.92rem;margin-bottom:26px}
.mdp-site .field{margin-bottom:20px}
.mdp-site .field label{display:block;font-family:'Montserrat',sans-serif;font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
.mdp-site .field input,.mdp-site .field select{width:100%;background:var(--bg);border:1px solid var(--line);border-radius:3px;color:var(--ink);font-family:'Manrope',sans-serif;font-size:1rem;padding:13px 14px;transition:.2s}
.mdp-site .field input:focus,.mdp-site .field select:focus{outline:none;border-color:var(--accent)}
.mdp-site .form-card .btn{display:inline-block;width:100%;text-align:center;background:var(--accent);color:#1a1407;margin-left:0}
.mdp-site .note{font-size:.78rem;color:var(--muted);margin-top:16px;text-align:center}
@media(max-width:900px){.mdp-site .book-grid{grid-template-columns:1fr;gap:34px}}
`;

export default function Page() {
  return (
    <MdpShell>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <section className="page-hero">
        <div className="wrap">
          <span className="upper">Онлайн-запись</span>
          <h1>Забронировать</h1>
          <div className="crumbs">
            <a href={asset("/massazh-dlya-par")}>Главная</a> &nbsp;/&nbsp; Забронировать
          </div>
        </div>
      </section>

      <section className="book">
        <div className="wrap">
          <div className="book-grid">
            <div className="book-info">
              <h2>Записаться на программу</h2>
              <p>
                Оставьте заявку — администратор перезвонит, подтвердит время, поможет выбрать программу и салон. Полная
                конфиденциальность гарантирована.
              </p>
              <ul>
                <li>Программы для пар: с одной или двумя девушками, классические и LUX</li>
                <li>6 салонов в центре Москвы с уютными апартаментами</li>
                <li>Работаем круглосуточно, 24/7</li>
                <li>Индивидуальный подход и полная анонимность</li>
              </ul>
              <div className="book-call">
                <span>Звоните напрямую</span>
                <b>+7 (916) 007-32-59</b>
              </div>
            </div>

            <form className="form-card">
              <h3>Заявка на бронь</h3>
              <div className="sub">Заполните форму — это займёт меньше минуты.</div>
              <div className="field">
                <label>Ваше имя *</label>
                <input type="text" placeholder="Как к вам обращаться" required />
              </div>
              <div className="field">
                <label>Ваш телефон *</label>
                <input type="tel" placeholder="+7 (___) ___-__-__" required />
              </div>
              <div className="field">
                <label>Название программы *</label>
                <select required defaultValue="">
                  <option value="">— выберите программу —</option>
                  <option>Программа с одной девушкой</option>
                  <option>Программа с двумя девушками</option>
                  <option>Программа с одной девушкой LUX</option>
                  <option>Программа с двумя девушками LUX</option>
                </select>
              </div>
              <button className="btn" type="submit">
                Отправить заявку
              </button>
              <div className="note">
                Нажимая кнопку, вы соглашаетесь на обработку данных. Это демонстрационный прототип.
              </div>
            </form>
          </div>
        </div>
      </section>
    </MdpShell>
  );
}
