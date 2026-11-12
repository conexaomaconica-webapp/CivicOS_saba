/**
 * Limpeza de HTML vindo de editores/colagens (Word, Google Docs, sites).
 * Remove estilos inline, classes, spans, comentários e tags vazias que incham a descrição
 * sem aparecer na tela. Mantém apenas formatação básica (parágrafos, listas, negrito,
 * itálico, sublinhado, links, títulos e alinhamento de texto).
 */

const ALLOWED_TAGS = 'p|br|ul|ol|li|strong|b|em|i|u|a|div|h1|h2|h3|h4|h5|h6';

function keepSafeAttributes(tag: string, attrs: string): string {
  let kept = '';
  if (tag === 'a') {
    const href = attrs.match(/\bhref\s*=\s*("([^"]*)"|'([^']*)')/i);
    const url = (href?.[2] ?? href?.[3] ?? '').trim();
    if (/^(https?:|mailto:|tel:)/i.test(url)) kept += ` href="${url.replace(/"/g, '&quot;')}" rel="noopener noreferrer"`;
    return kept;
  }
  const align = attrs.match(/text-align\s*:\s*(left|center|right|justify)/i);
  if (align) kept += ` style="text-align: ${align[1]!.toLowerCase()};"`;
  return kept;
}

export function cleanRichTextHtml(html: string | null | undefined): string {
  if (!html) return '';
  let out = String(html);

  // Blocos que nunca devem existir na descrição
  out = out
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(style|script|xml|title|head)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/?(meta|link|o:p)\b[^>]*>/gi, '')
    .replace(/<(span|font)\b[^>]*>/gi, '')
    .replace(/<\/(span|font)>/gi, '');

  // Mantém só atributos seguros (href em links, text-align em blocos)
  out = out.replace(/<([a-z][a-z0-9]*)\b([^>]*?)(\/?)>/gi, (_m, rawTag: string, attrs: string, selfClose: string) => {
    const tag = rawTag.toLowerCase();
    return `<${tag}${keepSafeAttributes(tag, attrs)}${selfClose}>`;
  });

  // Remove tags fora da lista permitida (preserva o texto interno)
  out = out.replace(new RegExp(`</?(?!(?:${ALLOWED_TAGS})\\b)[a-z][a-z0-9:]*\\b[^>]*>`, 'gi'), '');

  // Espaços e tags vazias
  out = out.replace(/&nbsp;/gi, ' ').replace(/[ \t]{2,}/g, ' ');
  const emptyTag = /<(p|div|li|strong|b|em|i|u|h[1-6])\b[^>]*>(?:\s|<br\s*\/?>)*<\/\1>/gi;
  for (let i = 0; i < 4 && emptyTag.test(out); i += 1) out = out.replace(emptyTag, '');

  return out.trim();
}

/** Quantidade de caracteres visíveis (sem tags HTML). */
export function visibleTextLength(html: string | null | undefined): number {
  if (!html) return 0;
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim().length;
}
