// Авто-скоупер CSS: node scope-css.mjs <in.css> <out.css> <.rootClass>
// Префиксует каждый селектор корневым классом (для заскоупленных tenant-стилей).
// :root → .root ; html/body → .root ; @keyframes-шаги не трогаем; @media рекурсивно.
import postcss from 'postcss';
import { readFileSync, writeFileSync } from 'node:fs';

const [, , inPath, outPath, rootSel] = process.argv;
if (!inPath || !outPath || !rootSel) { console.error('usage: node scope-css.mjs <in> <out> <.root>'); process.exit(1); }

const css = readFileSync(inPath, 'utf8');
const root = postcss.parse(css);

root.walkRules((rule) => {
  // пропускаем шаги внутри @keyframes
  let p = rule.parent;
  while (p) { if (p.type === 'atrule' && /keyframes/i.test(p.name)) return; p = p.parent; }
  rule.selectors = rule.selectors.map((sRaw) => {
    const s = sRaw.trim();
    if (!s) return s;
    if (s.startsWith(rootSel)) return s;
    if (s === ':root') return rootSel;
    if (s === 'html' || s === 'body') return rootSel;
    if (/^(html|body)\b/.test(s)) return rootSel + s.replace(/^(html|body)/, '');
    if (s.startsWith('from') || s.startsWith('to') || /^\d/.test(s)) return s; // keyframe-safety
    return rootSel + ' ' + s;
  });
});

writeFileSync(outPath, root.toString(), 'utf8');
console.log(`scoped ${inPath} → ${outPath} under ${rootSel}`);
