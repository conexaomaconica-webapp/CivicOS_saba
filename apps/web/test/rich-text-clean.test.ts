import { describe, expect, it } from 'vitest';
import { cleanRichTextHtml, visibleTextLength } from '@/lib/text/rich-text-clean';

describe('cleanRichTextHtml', () => {
  it('remove estilos, classes, spans e comentários colados de editores', () => {
    const dirty =
      '<!--StartFragment--><p class="MsoNormal" style="margin:0cm;font-family:Calibri"><span style="font-size:11pt;color:#333">Atendimento clínico</span></p><!--EndFragment-->';
    expect(cleanRichTextHtml(dirty)).toBe('<p>Atendimento clínico</p>');
  });

  it('mantém listas, negrito e alinhamento de texto', () => {
    const html = '<ul><li><strong>Vacina</strong></li></ul><p style="text-align:center; color:red">Oi</p>';
    expect(cleanRichTextHtml(html)).toBe('<ul><li><strong>Vacina</strong></li></ul><p style="text-align: center;">Oi</p>');
  });

  it('remove tags vazias e scripts', () => {
    expect(cleanRichTextHtml('<p>&nbsp;</p><p><br></p><script>alert(1)</script><p>Texto</p>')).toBe('<p>Texto</p>');
  });

  it('mantém apenas links seguros', () => {
    expect(cleanRichTextHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>');
    expect(cleanRichTextHtml('<a href="https://exemplo.com" onclick="x()">x</a>')).toBe(
      '<a href="https://exemplo.com" rel="noopener noreferrer">x</a>',
    );
  });

  it('preserva texto puro e reduz drasticamente o tamanho', () => {
    expect(cleanRichTextHtml('Linha 1\n- item')).toBe('Linha 1\n- item');
    const bloated = `<p style="${'margin:0;'.repeat(200)}">Oi</p>`;
    expect(cleanRichTextHtml(bloated).length).toBeLessThan(20);
  });
});

describe('visibleTextLength', () => {
  it('conta só o texto visível', () => {
    expect(visibleTextLength('<p style="x">Olá&nbsp;mundo</p>')).toBe(9);
    expect(visibleTextLength('')).toBe(0);
  });
});
