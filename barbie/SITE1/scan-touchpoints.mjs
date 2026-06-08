// Throwaway tool: headless-Chromium render scan of donor sites to resolve
// disputed booking/popup/footer touch-points (JS-rendered modals/CTAs).
// Uses SITE1/node_modules/playwright (hoisted 1.60). Run: node scan-touchpoints.mjs
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const SITES = [
  ['5massage.ru', 'https://5massage.ru', 'vanilia'],
  ['barbiespa.ru', 'https://barbiespa.ru', 'vanilia'],
  ['eroticmassaj.ru', 'https://eroticmassaj.ru', 'vanilia'],
  ['etalonspa.ru', 'https://etalonspa.ru', 'vanilia'],
  ['dachaspa.ru', 'https://dachaspa.ru', 'vanilia'],
  ['imperiumspa.ru', 'https://imperiumspa.ru', 'salonmassage'],
  ['massazh-dlya-par.ru', 'https://massazh-dlya-par.ru', 'salonmassage'],
  ['nebesaspa.com', 'https://nebesaspa.com', 'nebesa'],
  ['outcall-massage.ru', 'https://outcall-massage.ru', 'nebesa'],
  ['roxy-spa.ru', 'https://roxy-spa.ru', 'roxy'],
  ['soho-spa.com', 'https://soho-spa.com', 'roxy'],
  ['pentagon.ru', 'https://pentagon.ru', 'pentagon'],
];

const EXTRACT = () => {
  const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const txt = (el) => norm(el.innerText || el.textContent || '');
  const abs = (h) => { try { return new URL(h, location.href).href; } catch { return h || ''; } };
  const uniq = (a) => [...new Set(a)].filter(Boolean);

  const links = [...document.querySelectorAll('a[href]')];
  const tel = uniq(links.filter((a) => /^tel:/i.test(a.getAttribute('href') || '')).map((a) => a.getAttribute('href')));
  const tg = uniq(links.map((a) => a.href).filter((h) => /\/\/t\.me\//i.test(h)));
  const wa = uniq(links.map((a) => a.href).filter((h) => /wa\.me|whatsapp/i.test(h)));

  // booking CTAs
  const bookRe = /запис|забронир|book/i;
  const cands = [...document.querySelectorAll('a,button,[onclick]')];
  const booking = cands.filter((el) => bookRe.test(txt(el))).slice(0, 8).map((el) => ({
    tag: el.tagName.toLowerCase(),
    text: txt(el).slice(0, 40),
    href: el.tagName === 'A' ? abs(el.getAttribute('href') || '') : '',
    onclick: (el.getAttribute('onclick') || '').slice(0, 90),
    data: Object.fromEntries([...el.attributes].filter((a) => /^data-/.test(a.name)).map((a) => [a.name, a.value.slice(0, 70)])),
  }));

  // footer
  const footEl = document.querySelector('footer, [class*=footer], [id*=footer]');
  let footer = null;
  if (footEl) {
    const fl = [...footEl.querySelectorAll('a[href]')];
    footer = {
      tel: uniq(fl.filter((a) => /^tel:/i.test(a.getAttribute('href') || '')).map((a) => a.getAttribute('href'))),
      tg: uniq(fl.map((a) => a.href).filter((h) => /\/\/t\.me\//i.test(h))),
      wa: uniq(fl.map((a) => a.href).filter((h) => /wa\.me|whatsapp/i.test(h))),
      cta: fl.filter((a) => /запис|связ|заявк|подобр|контакт/i.test(txt(a))).slice(0, 5)
        .map((a) => ({ text: txt(a).slice(0, 30), href: abs(a.getAttribute('href') || '') })),
    };
  }

  // popups / modals (incl. hidden — capture promo intent + links)
  const popSel = '[class*=popup],[class*=modal],[id*=popup],[id*=modal],[class*=overlay],[class*=exit-],[class*=promo],[class*=marquiz],.fancybox-container';
  const popup = [...document.querySelectorAll(popSel)].slice(0, 14).map((el) => {
    const cs = getComputedStyle(el);
    const visible = cs.display !== 'none' && cs.visibility !== 'hidden' && el.offsetParent !== null && el.offsetHeight > 20;
    const cls = typeof el.className === 'string' ? el.className.split(' ').slice(0, 2).join('.') : '';
    return {
      sel: (el.id ? '#' + el.id : '') + (cls ? '.' + cls : ''),
      visible,
      text: txt(el).slice(0, 90),
      links: uniq([...el.querySelectorAll('a[href]')].map((a) => abs(a.getAttribute('href') || ''))).slice(0, 4),
    };
  }).filter((p) => p.text || p.links.length);

  const quiz = /marquiz/i.test(document.documentElement.outerHTML)
    ? 'marquiz'
    : (document.querySelector('[class*=quiz],[id*=quiz],[href*=quiz]') ? 'quiz-el' : '');

  // floating chat widget (operator): fixed/sticky links to messenger/tel
  const floatingChat = links.filter((a) => {
    const cs = getComputedStyle(a);
    const fixed = cs.position === 'fixed' || cs.position === 'sticky';
    const par = a.closest('[class*=fixed],[class*=float],[class*=widget],[class*=sticky]');
    return (fixed || par) && /t\.me|wa\.me|whatsapp|^tel:/i.test((a.getAttribute('href') || '') + a.href);
  }).slice(0, 8).map((a) => ({ href: abs(a.getAttribute('href') || a.href), text: txt(a).slice(0, 30) }));

  return { title: document.title.slice(0, 90), tel, tg, wa, booking, footer, popup, quiz, floatingChat };
};

const run = async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  const out = [];
  for (const [name, url, tpl] of SITES) {
    const rec = { name, url, tpl };
    const ctx = await browser.newContext({
      viewport: { width: 1366, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      locale: 'ru-RU',
      ignoreHTTPSErrors: true,
    });
    const page = await ctx.newPage();
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await page.waitForTimeout(4000);                       // initial JS
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); // reveal footer / scroll-popups
      await page.waitForTimeout(2500);
      await page.evaluate(() => {                              // best-effort exit-intent + timers
        document.dispatchEvent(new MouseEvent('mouseout', { clientY: -10, bubbles: true }));
        document.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(2500);
      Object.assign(rec, await page.evaluate(EXTRACT));
      console.log(`OK   ${name}  tel=${rec.tel.length} tg=${rec.tg.length} wa=${rec.wa.length} book=${rec.booking.length} pop=${rec.popup.length} quiz=${rec.quiz} foot=${rec.footer ? 'y' : 'n'} chat=${rec.floatingChat.length}`);
    } catch (e) {
      rec.error = String(e).slice(0, 160);
      console.log(`FAIL ${name}  ${rec.error}`);
    } finally {
      await ctx.close().catch(() => {});
    }
    out.push(rec);
  }
  await browser.close();
  writeFileSync('touchpoints-render.json', JSON.stringify(out, null, 2), 'utf8');
  console.log('\nWROTE touchpoints-render.json');
};
run().catch((e) => { console.error('FATAL', e); process.exit(1); });
