import { asset } from '@/lib/asset';
import { RoxyShell } from '@/components/tenant-sites/roxy/RoxyShell';

export const metadata = {
  title: 'Акции — ROXY Men`s Relax Club',
  description:
    'Акции салона эротического массажа ROXY. Отдыхайте в удовольствии и с выгодой — не упустите свой шанс!',
};

/**
 * (tenants)/roxy-spa/akczii — внутренняя страница тенанта roxy-spa в едином
 * стиле с главной (RoxyShell + roxy.css). Контент перенесён из прототипа.
 */
export default function Page() {
  return (
    <RoxyShell>
      <section className="rose-bg">
        <div className="wrap">
          <h2 className="sec-title">Акции</h2>
          <p className="sec-sub">
            Отдыхайте в удовольствии и с выгодой! ROXY предлагает выгодные акции для всех желающих
            попробовать волнующий эротический массаж. Заходите, чтобы не упустить свой шанс!
          </p>

          <div className="about">
            <h2>Персональный доступ!</h2>
            <p>
              Доступ в закрытый телеграм-канал с секретными материалами — только для своих.
            </p>
            <a className="btn-outline" href="tel:+74997572501">
              Получить доступ — 8 (499) 757-2501
            </a>
          </div>

          <div className="adv-grid">
            <div className="adv">
              <h3>Коктейльная вечеринка</h3>
              <div className="bar" />
              <p>Коктейльная вечеринка и виски в подарок при заказе программы.</p>
            </div>
            <div className="adv">
              <h3>Тепло возвращается</h3>
              <div className="bar" />
              <p>Сезонная акция — тепло возвращается вместе с вами.</p>
            </div>
            <div className="adv">
              <h3>Будни со скидкой</h3>
              <div className="bar" />
              <p>Приятный бонус любителям отдохнуть по будням!</p>
            </div>
            <div className="adv">
              <h3>Приведи друга</h3>
              <div className="bar" />
              <p>Приводи друзей и получай подарки и скидки.</p>
            </div>
            <div className="adv">
              <h3>Закрытый Telegram</h3>
              <div className="bar" />
              <p>Секретные материалы и спецпредложения в нашем канале.</p>
            </div>
            <div className="adv">
              <h3>Быстрый ответ</h3>
              <div className="bar" />
              <p>Администратор свяжется с вами в течение 5 минут.</p>
            </div>
          </div>

          <div className="about">
            <p>
              Салон не оказывает услуг интимного характера. Посещая наш салон, вы соглашаетесь с
              правилами нашего заведения.
            </p>
            <a className="btn-outline" href={asset("/roxy-spa/kontaktyi")}>
              Связаться с нами
            </a>
          </div>
        </div>
      </section>
    </RoxyShell>
  );
}
