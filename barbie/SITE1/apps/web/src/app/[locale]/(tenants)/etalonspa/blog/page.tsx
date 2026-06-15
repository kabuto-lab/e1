import { EtalonShell } from '@/components/tenant-sites/etalon/EtalonShell';

export const metadata = {
  title: 'Блог — Etalon',
  description: 'Статьи о техниках, программах и философии чувственного релакса от салона Etalon.',
};

const blogStyles = `
.blog-list{display:grid;grid-template-columns:1fr 1fr;gap:22px}
.post{background:var(--bg-2);border:1px solid var(--line);border-radius:12px;padding:28px;transition:.25s}
.post:hover{border-color:var(--accent);transform:translateY(-4px)}
.post .date{color:var(--accent-2);font-size:12px;letter-spacing:1px;margin-bottom:10px}
.post h3{font-size:24px;color:#fff;margin-bottom:12px;line-height:1.2}
.post p{color:var(--muted);font-size:14px}
@media(max-width:920px){.blog-list{grid-template-columns:1fr}}
`;

export default function Page() {
  return (
    <EtalonShell>
      <style dangerouslySetInnerHTML={{ __html: blogStyles }} />

      <section className="page-hero">
        <div className="wrap">
          <span className="hero-tag">Журнал</span>
          <h1>Блог об <em>эротическом массаже</em></h1>
          <p>Статьи о техниках, программах и философии чувственного релакса от салона Etalon.</p>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="blog-list">
            <article className="post"><div className="date">17.12.2024</div><h3>Etalon — место для истинного наслаждения</h3><p>В центре Москвы, среди шума мегаполиса, находится уникальное пространство — настоящий островок чувственности и гармонии для тех, кто ценит комфорт, эстетику и профессиональный подход.</p></article>
            <article className="post"><div className="date">13.12.2024</div><h3>Релакс-массаж помогает снять стресс и обрести гармонию</h3><p>В современном мире мужчины всё чаще ищут способы расслабления. Эротический массаж — идеальный выбор для тех, кто хочет избавиться от усталости и обрести внутреннюю гармонию.</p></article>
            <article className="post"><div className="date">11.12.2024</div><h3>Искусство расслабления: массаж для мужчин в Москве</h3><p>В суете мегаполиса так важно найти место, где можно по-настоящему отдохнуть. Салон Etalon сочетает расслабление, гармонию и чувственное наслаждение.</p></article>
            <article className="post"><div className="date">09.12.2024</div><h3>Как формируется цена на боди-массаж?</h3><p>Боди-массаж способен подарить невероятное наслаждение. Разбираемся, из чего складывается стоимость таких услуг и почему она может отличаться.</p></article>
            <article className="post"><div className="date">05.12.2024</div><h3>Подходящая программа для каждого мужчины</h3><p>Каждый мужчина заслуживает качественного отдыха. В Etalon мы предлагаем не просто массаж, а уникальный опыт, который поможет забыть о стрессе.</p></article>
            <article className="post"><div className="date">03.12.2024</div><h3>Массаж не только для мужчин, но и для женщин</h3><p>В современном мире женщины часто забывают о себе. Приходите на одну из наших программ и подарите себе наслаждение, расслабление и новый взгляд на отдых.</p></article>
            <article className="post"><div className="date">21.11.2024</div><h3>Каким парам подойдёт эротический массаж?</h3><p>Эротический массаж для пар — уникальная возможность внести разнообразие в совместный отдых и укрепить эмоциональную связь и доверие.</p></article>
            <article className="post"><div className="date">15.11.2024</div><h3>Массаж «Ветка сакуры» — техника, покорившая многих</h3><p>Техника вдохновлена красотой восточных традиций. Она подарит глубокое расслабление, избавит от стресса и наполнит энергией.</p></article>
          </div>
        </div>
      </section>
    </EtalonShell>
  );
}
