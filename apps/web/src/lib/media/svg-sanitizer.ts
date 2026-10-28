/**
 * Sanitizador e Validador Estrito de Arquivos SVG baseado em Allowlist
 * Protege contra XSS embutido, injeção de scripts, manipuladores de eventos inline,
 * referências externas e ataques XXE, garantindo também boa-formação XML.
 */

const ALLOWED_TAGS = new Set([
  'svg',
  'g',
  'path',
  'circle',
  'rect',
  'polygon',
  'polyline',
  'line',
  'ellipse',
  'defs',
  'lineargradient',
  'radialgradient',
  'stop',
  'mask',
  'clippath',
  'use',
  'title',
  'desc',
  'text',
  'tspan',
  'filter',
  'fegaussianblur',
  'feoffset',
  'feblend',
  'femerge',
  'femergenode',
]);

const ALLOWED_ATTRS = new Set([
  'xmlns',
  'xmlns:xlink',
  'version',
  'viewbox',
  'width',
  'height',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'd',
  'points',
  'fill',
  'fill-rule',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-opacity',
  'opacity',
  'transform',
  'id',
  'class',
  'style',
  'clip-path',
  'mask',
  'gradientunits',
  'gradienttransform',
  'patternunits',
  'offset',
  'stop-color',
  'stop-opacity',
  'font-size',
  'font-family',
  'font-weight',
  'text-anchor',
  'dx',
  'dy',
  'stddeviation',
  'in',
  'result',
  'mode',
  'preserveaspectratio',
  'href',
  'xlink:href',
]);

export interface SvgValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validador de boa formação estrutural de XML para SVG.
 * Garante que tags sejam balanceadas, aspas fechadas e blocos CDATA/comentários íntegros.
 */
function validateXmlWellFormedness(xml: string): { valid: boolean; error?: string } {
  // 1. Comentários não fechados
  if (/<!--(?![\s\S]*?-->)/.test(xml)) {
    return { valid: false, error: 'Arquivo SVG rejeitado: comentário XML malformado ou não finalizado.' };
  }
  // 2. CDATA não fechado
  if (/<!\[CDATA\[(?![\s\S]*?\]\]>)/.test(xml)) {
    return { valid: false, error: 'Arquivo SVG rejeitado: bloco CDATA malformado ou não finalizado.' };
  }

  // Remove comentários e CDATA para análise de tags
  const cleanXml = xml
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');

  const stack: string[] = [];
  const tagRegex = /<\/?([a-zA-Z0-9:-]+)([^>]*?)(\/?)>/g;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(cleanXml)) !== null) {
    const fullTag = match[0];
    const isClosing = fullTag.startsWith('</');
    const rawTag = match[1] ?? '';
    const attrs = match[2] ?? '';
    const isSelfClosing = match[3] === '/' || fullTag.endsWith('/>');

    if (rawTag.startsWith('?') || rawTag.startsWith('!')) continue;
    const tagName = rawTag.toLowerCase().split(':').pop() || '';

    // Verifica integridade de aspas nos atributos
    const singleQuotes = (attrs.match(/'/g) || []).length;
    const doubleQuotes = (attrs.match(/"/g) || []).length;
    if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
      return { valid: false, error: `Arquivo SVG rejeitado: aspas desbalanceadas nos atributos da tag <${rawTag}>.` };
    }

    if (isClosing) {
      if (stack.length === 0) {
        return { valid: false, error: `Arquivo SVG rejeitado: tag de fechamento </${rawTag}> sem abertura correspondente.` };
      }
      const top = stack.pop();
      if (top !== tagName) {
        return { valid: false, error: `Arquivo SVG rejeitado: estrutura XML malformada (esperava </${top}>, encontrou </${rawTag}>).` };
      }
    } else if (!isSelfClosing) {
      stack.push(tagName);
    }
  }

  if (stack.length > 0) {
    return { valid: false, error: `Arquivo SVG rejeitado: tag <${stack[stack.length - 1]}> não foi fechada (XML malformado).` };
  }

  return { valid: true };
}

export function sanitizeAndValidateSvg(svgText: string): SvgValidationResult {
  if (!svgText || typeof svgText !== 'string') {
    return { valid: false, error: 'Arquivo SVG vazio ou inválido.' };
  }

  const trimmed = svgText.trim();

  // 1. Rejeição imediata de declarações DTD / ENTITY externas (prevenção contra XXE)
  if (/<!entity/i.test(trimmed) || /<!doctype/i.test(trimmed)) {
    return {
      valid: false,
      error: 'Arquivo SVG rejeitado: declarações DTD/ENTITY externas não são permitidas (prevenção XXE).',
    };
  }

  // 2. Deve conter elemento raiz <svg
  if (!/<svg[\s>]/i.test(trimmed)) {
    return { valid: false, error: 'Arquivo inválido: elemento raiz <svg> não localizado.' };
  }

  // 3. Validação de boa formação de XML
  const wellFormedCheck = validateXmlWellFormedness(trimmed);
  if (!wellFormedCheck.valid) {
    return wellFormedCheck;
  }

  // 4. Verificação de manipuladores inline de eventos (on*)
  if (/\bon[a-zA-Z]+\s*=/i.test(trimmed)) {
    return {
      valid: false,
      error: 'Arquivo SVG rejeitado: manipuladores inline de eventos (ex: onload, onerror, onclick) não são permitidos.',
    };
  }

  // 5. Verificação de esquemas de script em URLs
  if (/(javascript|vbscript|data:text\/html)/i.test(trimmed)) {
    return {
      valid: false,
      error: 'Arquivo SVG rejeitado: esquemas de script executáveis não são permitidos.',
    };
  }

  // 6. Verificação de referências externas em url(...) em CSS ou atributos
  const urlMatches = trimmed.matchAll(/url\s*\(\s*['"]?([^'")]+)['"]?\s*\)/gi);
  for (const urlMatch of urlMatches) {
    const targetUrl = (urlMatch[1] || '').trim();
    if (targetUrl && !targetUrl.startsWith('#')) {
      return {
        valid: false,
        error: 'Arquivo SVG rejeitado: referências externas em url(...) não são permitidas (apenas identificadores internos #id).',
      };
    }
  }

  // 7. Validação de cada tag por allowlist
  const tagMatches = trimmed.matchAll(/<\/?([a-zA-Z0-9:-]+)/g);
  for (const match of tagMatches) {
    const rawTag = match[1] ?? '';
    if (rawTag.startsWith('?') || rawTag.startsWith('!')) continue;
    const tagName = rawTag.toLowerCase().split(':').pop() || '';
    if (!ALLOWED_TAGS.has(tagName)) {
      return {
        valid: false,
        error: `Arquivo SVG rejeitado: elemento <${rawTag}> não é permitido por motivos de segurança.`,
      };
    }
  }

  // 8. Validação de atributos de tags por allowlist
  const elementMatches = trimmed.matchAll(/<([a-zA-Z0-9:-]+)([^>]*?)>/g);
  for (const elMatch of elementMatches) {
    const rawTag = elMatch[1] ?? '';
    if (rawTag.startsWith('?') || rawTag.startsWith('!')) continue;
    const attrString = elMatch[2] ?? '';

    const attrMatches = attrString.matchAll(/([a-zA-Z0-9:-]+)\s*=\s*(?:["']([^"']*)["']|([^\s>]+))/g);
    for (const attrMatch of attrMatches) {
      const rawAttrName = attrMatch[1] ?? '';
      const attrName = rawAttrName.toLowerCase().split(':').pop() || '';
      const attrValue = attrMatch[2] ?? attrMatch[3] ?? '';

      if (!ALLOWED_ATTRS.has(attrName) && !ALLOWED_ATTRS.has(rawAttrName.toLowerCase())) {
        return {
          valid: false,
          error: `Arquivo SVG rejeitado: atributo "${rawAttrName}" não é permitido por motivos de segurança.`,
        };
      }

      if ((attrName === 'href' || rawAttrName.toLowerCase() === 'xlink:href') && !attrValue.startsWith('#')) {
        return {
          valid: false,
          error: 'Arquivo SVG rejeitado: links "href" só podem referenciar elementos internos (ex: #gradiente).',
        };
      }
    }
  }

  return { valid: true };
}
