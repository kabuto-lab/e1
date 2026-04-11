/**
 * Inlays plan-site-soprovozhdenie.html layout into platform-blueprint.html
 * (План → Тех. задание). Run: node scripts/embed-plan-site-in-blueprint.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(__dirname, "..");
const planPath = path.join(repo, "apps/web/public/plan-site-soprovozhdenie.html");
const bpPath = path.join(repo, "apps/web/public/platform-blueprint.html");

const plan = fs.readFileSync(planPath, "utf8");
const start = plan.indexOf('<div class="layout">');
const end = plan.indexOf('\n  <a href="#" class="to-top"');
if (start < 0 || end < 0) {
  console.error("Could not find layout / to-top markers in plan-site-soprovozhdenie.html");
  process.exit(1);
}
let frag = plan.slice(start, end).trim();
frag = frag
  .replace(/id="toc-filter"/g, 'id="plan-site-toc-filter"')
  .replace(/for="toc-filter"/g, 'for="plan-site-toc-filter"')
  .replace(/\bid="doc-toc"/g, 'id="plan-site-doc-toc"');

const toTopBlock = `
  <a href="#" class="plan-site-to-top" id="plan-site-to-top" title="Наверх">↑</a>`;

const wrapped = `<div class="plan-site-embed" id="plan-site-embed">\n${frag}\n${toTopBlock}\n</div>`;

/** Replace first matching outer <div class="plan-site-embed" id="plan-site-embed">…</div> */
function replacePlanSiteEmbed(html, replacement) {
  const open = '<div class="plan-site-embed" id="plan-site-embed">';
  const i0 = html.indexOf(open);
  if (i0 < 0) {
    return null;
  }
  let depth = 1;
  let i = i0 + open.length;
  while (i < html.length && depth > 0) {
    const openAt = html.indexOf("<div", i);
    const closeAt = html.indexOf("</div>", i);
    if (closeAt < 0) {
      return null;
    }
    if (openAt >= 0 && openAt < closeAt) {
      depth++;
      i = openAt + 4;
    } else {
      depth--;
      i = closeAt + 6;
    }
  }
  if (depth !== 0) {
    return null;
  }
  return html.slice(0, i0) + replacement + html.slice(i);
}

let bp = fs.readFileSync(bpPath, "utf8");
const next = replacePlanSiteEmbed(bp, wrapped);
if (!next) {
  console.error("Could not find or parse plan-site-embed block in platform-blueprint.html");
  process.exit(1);
}
fs.writeFileSync(bpPath, next, "utf8");
console.log("OK: embedded plan-site layout into platform-blueprint.html");
