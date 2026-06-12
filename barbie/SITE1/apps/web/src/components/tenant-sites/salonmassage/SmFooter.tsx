import { asset } from '@/lib/asset';
/**
 * SmFooter — футер реплики SalonMassage (классы .sm-footer/.fcols из _style.css).
 * Статика; используется на листинге и профиле (на главной — инлайн-вариант).
 */
export function SmFooter({ base = 'imperiumspa' }: { base?: string } = {}) {
  return (
    <footer className="sm-footer">
      <div className="wrap">
        <div className="fcols">
          <div>
            <div className="logo">SALON<b>&middot;</b>MASSAGE</div>
            <p>Премиальный салон массажа в центре Москвы.</p>
          </div>
          <div>
            <h4>Разделы</h4>
            <ul>
              <li><a href={asset(`/${base}#services`)}>Услуги</a></li>
              <li><a href={asset(`/${base}/models`)}>Анкеты</a></li>
              <li><a href={asset(`/${base}#contacts`)}>Контакты</a></li>
            </ul>
          </div>
          <div>
            <h4>Контакты</h4>
            <ul>
              <li>+7 (495) 000-00-00</li>
              <li>Москва, Красные Ворота</li>
            </ul>
          </div>
        </div>
        <div className="fbot">
          <div>
            <span className="age">18+</span>
            Сайт не является публичной офертой.
          </div>
          <div>&copy; 2026 salonmassage.ru</div>
        </div>
      </div>
    </footer>
  );
}
