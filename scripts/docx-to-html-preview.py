# -*- coding: utf-8 -*-
"""One-off: extract DOCX to structured JSON + HTML (semantic sections)."""
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
W_VAL = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val"
W_P = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p"


def find_docx(root: Path) -> Path:
    docs = list(root.glob("*.docx"))
    if not docs:
        raise SystemExit("No .docx in repo root")
    return docs[0]


def paragraph_text_and_style(p: ET.Element) -> tuple[str | None, str]:
    texts: list[str] = []
    for t in p.findall(".//w:t", NS):
        if t.text:
            texts.append(t.text)
        if t.tail:
            texts.append(t.tail)
    style = None
    p_pr = p.find("w:pPr", NS)
    if p_pr is not None:
        p_style = p_pr.find("w:pStyle", NS)
        if p_style is not None:
            style = p_style.get(W_VAL)
    return style, "".join(texts).strip()


def is_heading(style: str | None, text: str) -> bool:
    if not text:
        return False
    s = (style or "").lower()
    if "heading" in s or s.startswith("heading"):
        return True
    if s in ("title", "subtitle"):
        return True
    return False


def heading_level(style: str | None) -> int:
    s = (style or "").lower()
    m = re.search(r"heading\s*(\d+)", s)
    if m:
        return min(6, max(1, int(m.group(1))))
    if "title" in s:
        return 1
    return 2


def main() -> None:
    repo = Path(__file__).resolve().parents[1]
    docx_path = find_docx(repo)
    out_dir = repo / "apps" / "web" / "public"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_html = out_dir / "plan-site-soprovozhdenie.html"

    with zipfile.ZipFile(docx_path, "r") as z:
        xml = z.read("word/document.xml")
    root = ET.fromstring(xml)

    body = root.find("w:body", NS)
    if body is None:
        raise SystemExit("No w:body in document.xml")

    blocks: list[dict] = []
    # Все w:p в теле документа по порядку, включая ячейки таблиц
    for p in body.iter(W_P):
        style, text = paragraph_text_and_style(p)
        if not text:
            continue
        if is_heading(style, text):
            blocks.append(
                {
                    "type": "heading",
                    "level": heading_level(style),
                    "text": text,
                    "style": style,
                }
            )
        else:
            blocks.append({"type": "p", "text": text})

    # Split into pages: each top-level heading (level 1) starts a new section
    sections: list[dict] = []
    current: dict | None = None
    for b in blocks:
        if b["type"] == "heading" and b["level"] == 1:
            if current:
                sections.append(current)
            current = {"title": b["text"], "items": []}
        else:
            if current is None:
                current = {"title": "Введение", "items": []}
            current["items"].append(b)
    if current:
        sections.append(current)

    # HTML escape
    def esc(s: str) -> str:
        return (
            s.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
        )

    nav_items = []
    page_html_parts = []
    for idx, sec in enumerate(sections):
        sid = f"page-{idx + 1}"
        nav_items.append(f'<a class="nav-link" href="#{sid}">{esc(sec["title"])}</a>')
        inner: list[str] = []
        for it in sec["items"]:
            if it["type"] == "heading":
                tag = f"h{min(6, max(2, it['level']))}"
                inner.append(f"<{tag}>{esc(it['text'])}</{tag}>")
            else:
                inner.append(f"<p>{esc(it['text'])}</p>")
        page_html_parts.append(
            f'<article class="page" id="{sid}" aria-labelledby="{sid}-title">\n'
            f'  <header class="page-header"><h2 id="{sid}-title">{esc(sec["title"])}</h2></header>\n'
            f'  <div class="page-body">\n    {"\n    ".join(inner)}\n  </div>\n</article>'
        )

    html = f"""<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>План по сайту — сопровождение</title>
  <style>
    :root {{
      --bg: #0a0a0a;
      --fg: #e8e6e3;
      --muted: #9a9590;
      --accent: #d4af37;
      --border: #2a2826;
      --max: 52rem;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: Inter, system-ui, sans-serif;
      background: var(--bg);
      color: var(--fg);
      line-height: 1.55;
      font-size: 1rem;
    }}
    .layout {{
      display: grid;
      grid-template-columns: minmax(200px, 260px) 1fr;
      min-height: 100vh;
    }}
    @media (max-width: 900px) {{
      .layout {{ grid-template-columns: 1fr; }}
      aside {{ position: sticky; top: 0; z-index: 2; border-bottom: 1px solid var(--border); }}
    }}
    aside {{
      padding: 1.25rem 1rem;
      border-right: 1px solid var(--border);
      background: #0f0f0f;
    }}
    aside h1 {{
      font-family: Unbounded, system-ui, sans-serif;
      font-size: 0.95rem;
      font-weight: 600;
      margin: 0 0 0.75rem;
      color: var(--accent);
      letter-spacing: 0.02em;
    }}
    .nav-link {{
      display: block;
      color: var(--muted);
      text-decoration: none;
      font-size: 0.85rem;
      padding: 0.35rem 0;
      border-left: 2px solid transparent;
      padding-left: 0.5rem;
      margin-left: -0.5rem;
    }}
    .nav-link:hover {{ color: var(--fg); border-left-color: var(--accent); }}
    main {{ padding: 1.5rem 1.25rem 3rem; max-width: calc(var(--max) + 4rem); }}
    .page {{
      margin-bottom: 3rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid var(--border);
    }}
    .page:last-child {{ border-bottom: none; }}
    .page-header h2 {{
      font-family: Unbounded, system-ui, sans-serif;
      font-size: 1.35rem;
      font-weight: 600;
      margin: 0 0 1rem;
      color: var(--accent);
    }}
    .page-body h3, .page-body h4, .page-body h5, .page-body h6 {{
      font-family: Unbounded, system-ui, sans-serif;
      margin: 1.25rem 0 0.5rem;
      font-weight: 600;
      color: var(--fg);
    }}
    .page-body h3 {{ font-size: 1.1rem; }}
    .page-body h4 {{ font-size: 1rem; }}
    .page-body p {{ margin: 0 0 0.75rem; color: #d6d2cc; }}
    .source-note {{
      font-size: 0.8rem;
      color: var(--muted);
      margin-bottom: 1.5rem;
    }}
  </style>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Unbounded:wght@500;600&display=swap" rel="stylesheet" />
</head>
<body>
  <div class="layout">
    <aside>
      <h1>Содержание</h1>
      <nav aria-label="Разделы документа">
        {"".join(nav_items)}
      </nav>
    </aside>
    <main>
      <p class="source-note">Конвертировано из DOCX: смысловые блоки сгруппированы по заголовкам первого уровня (Heading 1). При необходимости правьте разбиение в исходнике.</p>
      {"".join(page_html_parts)}
    </main>
  </div>
</body>
</html>
"""

    out_html.write_text(html, encoding="utf-8")
    print(f"Wrote {out_html}")
    print(f"Sections: {len(sections)}, blocks: {len(blocks)}")


if __name__ == "__main__":
    main()
