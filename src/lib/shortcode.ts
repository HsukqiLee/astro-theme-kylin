/**
 * Process content directives after markdown rendering.
 * - :::type ... :::  standard markdown container directives (replaces the old [tip] shortcode)
 * - [block] / [ruby] legacy shortcodes still present in old content
 */
export function processShortcodes(html: string): string {
  let out = html || '';
  const Q = '(?:&quot;|&#39;|["\'])?';

  // :::info / :::warning / :::danger / :::tip ...  standard md container directives
  // rendered as a normal Bulma message (same width as article content, not full-bleed)
  out = out.replace(/<p>:::(info|warning|warn|danger|tip|success|primary|note)\s*([^<]*)<\/p>/g, (m, type, title) => {
    const t = type === 'warn' ? 'warning' : type;
    const ttl = (title || '').trim();
    return (
      `<article class="message is-${t}"><div class="message-body">` +
      (ttl ? `<p class="message-title"><strong>${ttl}</strong></p>` : '')
    );
  });
  // :::  ->  message box close
  out = out.replace(/<p>:::<\/p>/g, '</div></article>');

  // [block type=xxx]...[/block]  ->  notification box
  out = out.replace(new RegExp(`\\[block\\s+type=${Q}([\\w-]+)${Q}\\]([\\s\\S]*?)\\[\\/block\\]`, 'gi'), (m, type, inner) => {
    return `<div class="notification is-${type}">${inner}</div>`;
  });

  // [ruby title=xxx]...[/ruby]  ->  ruby annotation
  out = out.replace(new RegExp(`\\[ruby\\s+title=${Q}([^"'\\]]+)${Q}\\]([\\s\\S]*?)\\[\\/ruby\\]`, 'gi'), (m, title, inner) => {
    return `<ruby>${inner}<rp>(</rp><rt>${title}</rt><rp>)</rp></ruby>`;
  });

  return out;
}
