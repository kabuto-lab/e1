export interface TipTapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function applyMarks(text: string, marks: TipTapNode['marks']): string {
  let out = esc(text);
  for (const m of marks ?? []) {
    switch (m.type) {
      case 'bold': out = `<strong>${out}</strong>`; break;
      case 'italic': out = `<em>${out}</em>`; break;
      case 'underline': out = `<u>${out}</u>`; break;
      case 'strike': out = `<s>${out}</s>`; break;
      case 'code': out = `<code>${out}</code>`; break;
      case 'link': {
        const href = esc(String(m.attrs?.href ?? '#'));
        out = `<a href="${href}" rel="noopener noreferrer">${out}</a>`;
        break;
      }
    }
  }
  return out;
}

export function tiptapJsonToHtml(node: TipTapNode): string {
  const children = () => (node.content ?? []).map(tiptapJsonToHtml).join('');

  switch (node.type) {
    case 'doc': return children();
    case 'paragraph': return `<p>${children()}</p>`;
    case 'heading': {
      const lv = node.attrs?.level ?? 1;
      return `<h${lv}>${children()}</h${lv}>`;
    }
    case 'bulletList': return `<ul>${children()}</ul>`;
    case 'orderedList': return `<ol>${children()}</ol>`;
    case 'listItem': return `<li>${children()}</li>`;
    case 'blockquote': return `<blockquote>${children()}</blockquote>`;
    case 'codeBlock': return `<pre><code>${children()}</code></pre>`;
    case 'horizontalRule': return '<hr />';
    case 'hardBreak': return '<br />';
    case 'text': return applyMarks(node.text ?? '', node.marks);
    default: return children();
  }
}
