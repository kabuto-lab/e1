# -*- coding: utf-8 -*-
"""
Собирает apps/web/public/plan-site-soprovozhdenie.html в структуру оглавления из шаблона.
Источник: текущий HTML с article#page-N (тело из DOCX).
"""
from __future__ import annotations

import html as html_module
import re
from pathlib import Path

from bs4 import BeautifulSoup

REPO = Path(__file__).resolve().parents[1]
SRC = REPO / "apps" / "web" / "public" / "plan-site-soprovozhdenie.html"
OUT = SRC

# id статьи → (заголовок в шапке, список номеров исходных page-N по порядку)
STRUCTURE: list[tuple[str, str, list[int]]] = [
    ("project-overview", "Проект для PM — премиальная платформа сопровождения", [36, 37]),
    ("concept", "Концепция и общие принципы", [11]),
    ("payment-model", "Модель и схема оплаты", [4, 5, 7]),
    ("hold-capture", "Двухстадийная оплата (Hold / Capture)", [2]),
    ("payment-system", "Платёжная система и реализация", [1, 3, 6]),
    ("avoid-block", "Как не получить блокировку", [8]),
    ("mvp-payment", "Минимальный MVP оплаты", [9]),
    ("client-view", "Как это видит клиент", [10]),
    # Дубли 12–15: общий блок + срезы под оглавление (как в макете пользователя)
    ("product-concept", "Общая концепция продукта", [12, 13, 14, 15]),
    ("profile-card", "Карточка анкеты и подлинность", [12, 15]),
    ("filters-rating", "Подбор, фильтры и рейтинг надёжности", [13, 14]),
    ("managers-crm", "Работа с менеджерами и CRM", [16, 17, 18]),
    ("blacklists", "Чёрные списки анкет и клиентов", [19, 20, 27, 28, 29]),
    ("escrow", "Безопасная сделка (эскроу)", [22, 33]),
    ("legal", "Юридическая модель", [23, 34]),
    ("design-structure", "Визуальный стиль и структура сайта", [24, 25, 35]),
    ("tg-wa-logic", "Общая логика системы TG + WA", [38, 39, 40, 51, 52]),
    ("ticket-system", "Карточка заявки, статусы, распределение", [41, 42, 43, 44, 45, 46, 49, 50]),
    ("anti-leak", "Защита от слива контактов", [30, 47]),
    ("wa-setup", "Работа с WhatsApp", [48]),
    ("channels-setup", "Как настроить Telegram и WhatsApp", list(range(53, 61))),
    ("tz-developers", "ТЗ разработчикам", [61, 62, 63]),
    ("roadmap", "Роадмап и детализированный план", [64, 65, 68]),
    ("risks", "Оценка рисков", [66]),
    ("marketing", "Маркетинг, контент-план и запуск", [67, 69]),
    ("team-training", "Обучение сотрудников", [70]),
    ("monitoring", "Мониторинг и отчётность", [71]),
    ("raw-draft", "Сырой файл (черновик)", [26]),
    ("additional-notes", "Дополнительные заметки и уточнения", [21, 31, 32]),
]

HEAD = """<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>План по сайту — сопровождение</title>
  <style>
    :root {
      --bg: #0a0a0a;
      --fg: #e8e6e3;
      --muted: #9a9590;
      --accent: #d4af37;
      --border: #2a2826;
      --max: 56rem;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      font-family: Inter, system-ui, sans-serif;
      background: var(--bg);
      color: var(--fg);
      line-height: 1.6;
      font-size: 1rem;
    }
    .layout {
      display: grid;
      grid-template-columns: minmax(280px, 320px) 1fr;
      min-height: 100vh;
    }
    @media (max-width: 900px) {
      .layout { grid-template-columns: 1fr; }
      aside { position: sticky; top: 0; z-index: 10; border-bottom: 1px solid var(--border); max-height: 60vh; }
    }
    aside {
      padding: 1.75rem 1.25rem;
      border-right: 1px solid var(--border);
      background: #0f0f0f;
      position: sticky;
      top: 0;
      align-self: start;
      max-height: 100vh;
      overflow-y: auto;
    }
    aside h1 {
      font-family: Unbounded, system-ui, sans-serif;
      font-size: 1.15rem;
      font-weight: 600;
      margin: 0 0 1.25rem;
      color: var(--accent);
      letter-spacing: 0.02em;
    }
    .toc-filter-label {
      display: block;
      font-size: 0.73rem;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--muted);
      margin-bottom: 0.45rem;
    }
    .toc-filter {
      width: 100%;
      margin-bottom: 1.5rem;
      padding: 0.55rem 0.7rem;
      font: inherit;
      font-size: 0.87rem;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--fg);
    }
    .toc-filter:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.25);
    }

    .nav-section { margin-bottom: 2rem; }
    .nav-section-title {
      font-family: Unbounded, system-ui, sans-serif;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.09em;
      color: var(--muted);
      margin: 0 0 0.6rem;
      padding-bottom: 0.35rem;
      border-bottom: 1px solid var(--border);
    }
    .nav-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .nav-link {
      display: block;
      color: var(--muted);
      text-decoration: none;
      font-size: 0.86rem;
      line-height: 1.45;
      padding: 0.4rem 0.75rem;
      border-left: 2.5px solid transparent;
      margin-left: -0.75rem;
      transition: all 0.2s ease;
    }
    .nav-link:hover {
      color: var(--fg);
      border-left-color: rgba(212, 175, 55, 0.5);
    }
    .nav-link.nav-link--active {
      color: var(--fg);
      border-left-color: var(--accent);
      background: rgba(212, 175, 55, 0.1);
    }

    main { padding: 2rem 1.75rem 5rem; max-width: calc(var(--max) + 6rem); margin: 0 auto; }
    .doc-intro {
      padding: 1.5rem 1.75rem;
      margin-bottom: 2.5rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: #111;
    }
    .doc-intro h2 { color: var(--accent); margin-bottom: 1rem; }

    .page {
      margin-bottom: 4rem;
      padding-bottom: 3rem;
      border-bottom: 1px solid var(--border);
      scroll-margin-top: 90px;
    }
    .page:last-child { border-bottom: none; }

    .page-header h2 {
      font-family: Unbounded, system-ui, sans-serif;
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--accent);
      margin: 0 0 1.25rem;
    }
    .source-note {
      font-size: 0.82rem;
      color: var(--muted);
      margin: 2.5rem 0 3.5rem;
      font-style: italic;
    }

    .merged-block { margin-bottom: 2rem; }
    .merged-block:last-child { margin-bottom: 0; }
    .merged-from {
      font-family: Unbounded, system-ui, sans-serif;
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--fg);
      margin: 0 0 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border);
    }

    .page-body h3, .page-body h4, .page-body h5, .page-body h6 {
      font-family: Unbounded, system-ui, sans-serif;
      margin: 1.25rem 0 0.5rem;
      font-weight: 600;
      color: var(--fg);
    }
    .page-body h3 { font-size: 1.1rem; }
    .page-body h4 { font-size: 1rem; }
    .page-body p { margin: 0 0 0.75rem; color: #d6d2cc; }
    .page-body ol, .page-body ul {
      margin: 0 0 0.85rem;
      padding-left: 1.35rem;
      color: #d6d2cc;
    }
    .page-body li { margin-bottom: 0.35rem; }

    .to-top {
      position: fixed;
      bottom: 30px;
      right: 30px;
      background: var(--accent);
      color: #000;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.6rem;
      box-shadow: 0 6px 20px rgba(212, 175, 55, 0.35);
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s;
      z-index: 100;
    }
    .to-top.show { opacity: 1; visibility: visible; }
  </style>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Unbounded:wght@500;600&display=swap" rel="stylesheet" />
</head>
<body>
  <div class="layout">
    <aside>
      <h1>План по сайту</h1>
      <label class="toc-filter-label" for="toc-filter">Поиск по разделам</label>
      <input type="search" id="toc-filter" class="toc-filter" placeholder="Начните вводить…" autocomplete="off" />

      <nav aria-label="Содержание" id="doc-toc">

        <section class="nav-section">
          <h2 class="nav-section-title">Общее описание проекта</h2>
          <ul class="nav-list">
            <li><a class="nav-link" href="#project-overview">Проект для PM — премиальная платформа</a></li>
            <li><a class="nav-link" href="#concept">Концепция и общие принципы</a></li>
          </ul>
        </section>

        <section class="nav-section">
          <h2 class="nav-section-title">Оплата и финансовая модель</h2>
          <ul class="nav-list">
            <li><a class="nav-link" href="#payment-model">Модель и схема оплаты</a></li>
            <li><a class="nav-link" href="#hold-capture">Двухстадийная оплата (Hold / Capture)</a></li>
            <li><a class="nav-link" href="#payment-system">Платёжная система и реализация</a></li>
            <li><a class="nav-link" href="#avoid-block">Как не получить блокировку</a></li>
            <li><a class="nav-link" href="#mvp-payment">Минимальный MVP оплаты</a></li>
            <li><a class="nav-link" href="#client-view">Как это видит клиент</a></li>
          </ul>
        </section>

        <section class="nav-section">
          <h2 class="nav-section-title">Продукт и функционал</h2>
          <ul class="nav-list">
            <li><a class="nav-link" href="#product-concept">Общая концепция продукта</a></li>
            <li><a class="nav-link" href="#profile-card">Карточка анкеты и подлинность</a></li>
            <li><a class="nav-link" href="#filters-rating">Подбор, фильтры и рейтинг надёжности</a></li>
            <li><a class="nav-link" href="#managers-crm">Работа с менеджерами и CRM</a></li>
            <li><a class="nav-link" href="#blacklists">Чёрные списки анкет и клиентов</a></li>
            <li><a class="nav-link" href="#escrow">Безопасная сделка (эскроу)</a></li>
            <li><a class="nav-link" href="#legal">Юридическая модель</a></li>
            <li><a class="nav-link" href="#design-structure">Визуальный стиль и структура сайта</a></li>
          </ul>
        </section>

        <section class="nav-section">
          <h2 class="nav-section-title">Заявки и коммуникация (TG + WA)</h2>
          <ul class="nav-list">
            <li><a class="nav-link" href="#tg-wa-logic">Общая логика системы</a></li>
            <li><a class="nav-link" href="#ticket-system">Карточка заявки, статусы, распределение</a></li>
            <li><a class="nav-link" href="#anti-leak">Защита от слива контактов</a></li>
            <li><a class="nav-link" href="#wa-setup">Работа с WhatsApp</a></li>
          </ul>
        </section>

        <section class="nav-section">
          <h2 class="nav-section-title">Настройка каналов и ТЗ</h2>
          <ul class="nav-list">
            <li><a class="nav-link" href="#channels-setup">Как настроить TG и WA</a></li>
            <li><a class="nav-link" href="#tz-developers">ТЗ разработчикам (TG/WA и сайт)</a></li>
          </ul>
        </section>

        <section class="nav-section">
          <h2 class="nav-section-title">Запуск и управление</h2>
          <ul class="nav-list">
            <li><a class="nav-link" href="#roadmap">Роадмап и детализированный план</a></li>
            <li><a class="nav-link" href="#risks">Оценка рисков</a></li>
            <li><a class="nav-link" href="#marketing">Маркетинг, контент-план и запуск</a></li>
            <li><a class="nav-link" href="#team-training">Обучение сотрудников</a></li>
            <li><a class="nav-link" href="#monitoring">Мониторинг и отчётность</a></li>
          </ul>
        </section>

        <section class="nav-section">
          <h2 class="nav-section-title">Черновики и вспомогательное</h2>
          <ul class="nav-list">
            <li><a class="nav-link" href="#raw-draft">Сырой файл (черновик)</a></li>
            <li><a class="nav-link" href="#additional-notes">Дополнительные заметки и уточнения</a></li>
          </ul>
        </section>

      </nav>
    </aside>

    <main id="main-doc">
      <div class="doc-intro">
        <h2>Как читать документ</h2>
        <p>Слева — удобное смысловое оглавление, сгруппированное по темам. Справа — весь материал в логичном порядке.</p>
        <p>Используйте поиск по разделам для быстрого перехода. Скролл автоматически подсвечивает текущий раздел.</p>
      </div>

      <p class="source-note">Конвертировано и перегруппировано из DOCX. Исходные фрагменты помечены подзаголовками с названиями разделов из файла. Разделы «Общая концепция продукта», «Карточка анкеты» и «Подбор и фильтры» частично пересекаются по тексту — так задано оглавлением.</p>

"""

FOOT = """
    </main>
  </div>

  <a href="#" class="to-top" id="to-top" title="Наверх">↑</a>

  <script>
    function setActiveLink() {
      const sections = document.querySelectorAll('.page');
      const navLinks = document.querySelectorAll('.nav-link');
      let current = '';

      sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (scrollY >= sectionTop - 180) current = section.getAttribute('id');
      });

      navLinks.forEach(link => {
        link.classList.remove('nav-link--active');
        if (link.getAttribute('href') === '#' + current) link.classList.add('nav-link--active');
      });
    }
    window.addEventListener('scroll', setActiveLink);
    setActiveLink();

    document.getElementById('toc-filter').addEventListener('input', function() {
      const term = this.value.toLowerCase().trim();
      document.querySelectorAll('.nav-section').forEach(section => {
        let visible = false;
        section.querySelectorAll('.nav-link').forEach(link => {
          const match = link.textContent.toLowerCase().includes(term);
          link.style.display = match ? 'block' : 'none';
          if (match) visible = true;
        });
        section.style.display = visible || term === '' ? 'block' : 'none';
      });
    });

    const toTop = document.getElementById('to-top');
    window.addEventListener('scroll', () => {
      toTop.classList.toggle('show', window.scrollY > 700);
    });
    toTop.addEventListener('click', function(e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  </script>
</body>
</html>
"""


def load_pages(html: str) -> dict[int, tuple[str, str]]:
    soup = BeautifulSoup(html, "html.parser")
    out: dict[int, tuple[str, str]] = {}
    for art in soup.find_all("article", class_="page"):
        aid = art.get("id") or ""
        m = re.match(r"page-(\d+)$", aid)
        if not m:
            continue
        n = int(m.group(1))
        header = art.find("header", class_="page-header")
        h2 = header.find("h2") if header else None
        title = h2.get_text(strip=True) if h2 else f"Раздел {n}"
        body = art.find("div", class_="page-body")
        if not body:
            continue
        inner = body.decode_contents()
        out[n] = (title, inner)
    return out


def build_article(article_id: str, header_title: str, source_nums: list[int], pages: dict[int, tuple[str, str]]) -> str:
    h2_safe = html_module.escape(header_title)
    parts: list[str] = []
    for num in source_nums:
        if num not in pages:
            parts.append(
                f'<section class="merged-block"><p class="missing">[Исходный фрагмент page-{num} не найден в файле.]</p></section>'
            )
            continue
        src_title, inner = pages[num]
        safe = html_module.escape(src_title)
        parts.append(
            f'<section class="merged-block" aria-label="{safe}">'
            f'<h3 class="merged-from">{safe}</h3>{inner}</section>'
        )
    body = "\n".join(parts)
    return (
        f'<article class="page" id="{article_id}">\n'
        f'  <header class="page-header"><h2>{h2_safe}</h2></header>\n'
        f'  <div class="page-body">\n{body}\n  </div>\n'
        f"</article>"
    )


def main() -> None:
    raw = SRC.read_text(encoding="utf-8")
    pages = load_pages(raw)
    if len(pages) < 60:
        raise SystemExit(f"Expected many page-* articles, got {len(pages)}")

    chunks = [build_article(aid, title, nums, pages) for aid, title, nums in STRUCTURE]
    OUT.write_text(HEAD + "\n".join(chunks) + FOOT, encoding="utf-8")
    print(f"Wrote {OUT} ({len(STRUCTURE)} articles, {len(pages)} source pages)")


if __name__ == "__main__":
    main()
