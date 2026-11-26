export interface TocNode {
  level: number;
  id: string;
  title: string;
  children: TocNode[];
}

function slugify(s: string): string {
  const base = s
    .toLowerCase()
    .replace(/[^\w一-龥-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'section';
}

/**
 * Adds ids to h1-h6 in rendered HTML and builds a nested TOC tree.
 */
export function processContent(html: string): { html: string; toc: TocNode[] } {
  const seen = new Map<string, number>();
  const headings: TocNode[] = [];

  const processed = html.replace(/<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi, (m, lvl, attrs, inner) => {
    const text = inner.replace(/<[^>]+>/g, '').trim();
    if (!text) return m;
    let id = slugify(text);
    const n = seen.get(id) || 0;
    seen.set(id, n + 1);
    if (n > 0) id = `${id}-${n}`;
    headings.push({ level: parseInt(lvl, 10), id, title: text, children: [] });
    return `<h${lvl} id="${id}"${attrs}>${inner}</h${lvl}>`;
  });

  // build tree from flat headings (only h2-h6 go into TOC, like the original theme)
  const roots: TocNode[] = [];
  const stack: TocNode[] = [];
  for (const h of headings) {
    if (h.level < 2) continue;
    while (stack.length && stack[stack.length - 1].level >= h.level) stack.pop();
    if (stack.length) stack[stack.length - 1].children.push(h);
    else roots.push(h);
    stack.push(h);
  }

  return { html: processed, toc: roots };
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export function renderTocHtml(nodes: TocNode[]): string {
  if (!nodes.length) return '';
  let html = '<ul class="menu-list">';
  for (const n of nodes) {
    html += `<li><a class="is-flex" href="#${esc(n.id)}"><span>${esc(n.title)}</span></a>`;
    html += renderTocHtml(n.children);
    html += '</li>';
  }
  html += '</ul>';
  return html;
}
