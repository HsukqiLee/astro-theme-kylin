import { Marked, type TokenizerAndRendererExtension, type Tokens } from 'marked';
import { createTexConverter } from './tex';
import { siteConfig } from './config';

/**
 * Typecho's Markdown parser accepts ATX headings without a space
 * after the hashes (e.g. "##Title"). CommonMark (marked) requires the
 * space, so normalize before parsing.
 */
export function normalizeMarkdown(md: string): string {
  return (md || '').replace(/^([ \t]*)(#{1,6})([^\s#])/gm, '$1$2 $3');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// lax strikethrough: Typecho pairs ~~...~~ on a line without GFM flanking rules
const delExtension: TokenizerAndRendererExtension = {
  name: 'del',
  level: 'inline' as const,
  start(src: string) {
    return src.indexOf('~~');
  },
  tokenizer(src: string) {
    const m = /^~~(?=\S)([^\n]*?\S)~~/.exec(src);
    if (m) return { type: 'del', raw: m[0], tokens: this.lexer.inlineTokens(m[1]) } as any;
    return undefined;
  },
  renderer(token: any) {
    return `<del>${this.parser.parseInline(token.tokens)}</del>`;
  }
};

const FN_DEF = /^\[\^([^\]]+)\]:\s*(.+)$/;

const OPEN = '';
const CLOSE = '';

/**
 * Pull TeX spans out of the markdown (outside code fences / inline code)
 * so marked cannot mangle them; returns [src with placeholders, spans].
 */
function extractMath(md: string): [string, { tex: string; display: boolean }[]] {
  const spans: { tex: string; display: boolean }[] = [];
  const parts = md.split(/(```[\s\S]*?```|`[^`\n]+`)/g);
  for (let i = 0; i < parts.length; i += 2) {
    let seg = parts[i];
    seg = seg.replace(/\$\$([\s\S]+?)\$\$/g, (_m, tex) => {
      spans.push({ tex: String(tex).trim(), display: true });
      return OPEN + (spans.length - 1) + CLOSE;
    });
    seg = seg.replace(/\\{1,2}\(([\s\S]+?)\\{1,2}\)/g, (_m, tex) => {
      spans.push({ tex: String(tex).trim(), display: false });
      return OPEN + (spans.length - 1) + CLOSE;
    });
    seg = seg.replace(/\\{1,2}\[([\s\S]+?)\\{1,2}\]/g, (_m, tex) => {
      spans.push({ tex: String(tex).trim(), display: true });
      return OPEN + (spans.length - 1) + CLOSE;
    });
    seg = seg.replace(/\$([^$\n]+?)\$/g, (whole, tex) => {
      // skip currency/prose pairs like "$25 起 … $50": math must look like math
      const t = String(tex).trim();
      const mathy = /[\\^_{}]/.test(t) || (!/[一-鿿]/.test(t) && /[+\-=*/<>0-9a-zA-Z]/.test(t));
      if (!mathy) return whole;
      spans.push({ tex: t, display: false });
      return OPEN + (spans.length - 1) + CLOSE;
    });
    seg = seg.replace(
      /\\begin\{(equation\*?|align\*?|alignat\*?|gather\*?|eqnarray\*?|displaymath|math|multline\*?|flalign\*?|split|cases|aligned|alignedat\*?|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|smallmatrix)\}([\s\S]*?)\\end\{\1\}/g,
      (m) => {
        spans.push({ tex: m.trim(), display: true });
        return OPEN + (spans.length - 1) + CLOSE;
      }
    );
    parts[i] = seg;
  }
  return [parts.join(''), spans];
}

/**
 * Render markdown to HTML using the site's custom code-block markup:
 * figure.highlight > figcaption(lang) > .highlight-body > table(gutter + code),
 * matching the modified Typecho source output so the existing CSS applies.
 * TeX is rendered server-side to SVG; footnotes follow PHP Markdown Extra.
 */
const renderer = {
    code(token: Tokens.Code): string {
      const raw = token.text;
      const info = token.lang || '';
      const lang = String(info).split(/\s+/)[0] || 'text';
      const label = lang.charAt(0).toUpperCase() + lang.slice(1);
      const code = raw.replace(/\n$/, '');
      const lines = code.split('\n');
      const gutter = lines.map((_, i) => `<span class="line">${i + 1}</span>`).join('<br>');
      return (
        `<figure class="highlight ${escapeHtml(lang)} hljs">` +
        `<figcaption class="level is-mobile">` +
        `<div class="level-left"></div>` +
        `<span>${escapeHtml(label)}</span>` +
        `<div class="level-right"></div>` +
        `</figcaption>` +
        `<div class="highlight-body"><table><tbody><tr>` +
        `<td class="gutter"><pre>${gutter}</pre></td>` +
        `<td class="code"><pre>${escapeHtml(code)}</pre></td>` +
        `</tr></tbody></table></div>` +
        `</figure>`
      );
    }
  };

const markdown = new Marked({ gfm: true, extensions: [delExtension], renderer });

export function renderMarkdown(md: string): string {
  const [noMath, spans] = extractMath(normalizeMarkdown(md || ''));

  const defs = new Map<string, string>();
  const kept: string[] = [];
  for (const line of noMath.split('\n')) {
    const m = FN_DEF.exec(line.trimEnd());
    if (m) defs.set(m[1], m[2]);
    else kept.push(line);
  }

  const order: string[] = [];
  const src = kept.join('\n').replace(/\[\^([^\]]+)\](?!:)/g, (whole, id) => {
    if (!defs.has(id)) return whole;
    let n = order.indexOf(id);
    if (n < 0) {
      order.push(id);
      n = order.length - 1;
    }
    return `<sup id="fnref-${n + 1}"><a href="#fn-${n + 1}" class="footnote-ref">${n + 1}</a></sup>`;
  });

  let html = markdown.parse(src) as string;
  if (order.length) {
    const items = order
      .map((id, i) => `<li id="fn-${i + 1}">${markdown.parseInline(defs.get(id) || '')} <a href="#fnref-${i + 1}" class="footnote-backref">&#8617;</a></li>`)
      .join('');
    html += `<div class="footnotes"><hr><ol>${items}</ol></div>`;
  }

  // content tables (with thead) get a horizontal scroll wrapper
  html = html.replace(/<table>(?=\s*<thead>)([\s\S]*?)<\/table>/g, (_m, inner) => `<div class="table-overflow"><table>${inner}</table></div>`);

  // restore math as server-rendered SVG (or raw TeX when the feature is off)
  const seenLabels = new Set<string>();
  let convert: ReturnType<typeof createTexConverter> | null = null;
  html = html.replace(new RegExp(OPEN + '(\\d+)' + CLOSE, 'g'), (_m, idx) => {
    const span = spans[Number(idx)];
    if (!span) return '';
    // duplicate \label{name} makes MathJax bail with an error node; keep first only
    span.tex = span.tex.replace(/\\label\{([^}]*)\}/g, (m2, name) => {
      if (seenLabels.has(name)) return '';
      seenLabels.add(name);
      return m2;
    });
    // some Typecho rows double-escaped TeX backslashes (\\dfrac, \\}, \\end);
    // protect row separators (\\\\), collapse the rest, then restore separators
    if (/\\\\[a-zA-Z{}]/.test(span.tex)) {
      const SEP = '';
      span.tex = span.tex.split('\\\\\\\\').join(SEP).split('\\\\').join('\\').split(SEP).join('\\\\');
    }
    if (!siteConfig.features.mathjax) return escapeHtml(span.display ? `$$${span.tex}$$` : `\\(${span.tex}\\)`);
    if (!convert) convert = createTexConverter();
    const svg = convert(span.tex, span.display);
    if (svg) return svg;
    return `<code class="math-fallback">${escapeHtml(span.tex)}</code>`;
  });

  // Keep links to the migrated blog on this deployment; code examples remain escaped.
  return html.replace(/\b(href|src)=(["'])https?:\/\/blog\.tsinbei\.com\//gi, '$1=$2/');
}
