import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SUPPORT_WHATSAPP,
  buildSupportContactEntry,
  normalizeSupportEmail,
  normalizeSupportWhatsapp,
  parseSupportContact,
} from '../src/lib/directory/support-contact';
import { extraHomeSectionEntries, normalizeHomeSections } from '../src/lib/directory/home-sections';

describe('contato de suporte do botão flutuante', () => {
  it('normaliza o WhatsApp para dígitos com código do país', () => {
    expect(normalizeSupportWhatsapp('(75) 98127-2323')).toBe('5575981272323');
    expect(normalizeSupportWhatsapp('+55 75 98127-2323')).toBe('5575981272323');
    expect(normalizeSupportWhatsapp('7536254327')).toBe('557536254327');
    expect(normalizeSupportWhatsapp('123')).toBe('');
    expect(normalizeSupportWhatsapp('')).toBe('');
  });

  it('valida o e-mail', () => {
    expect(normalizeSupportEmail(' Suporte@Exemplo.com.br ')).toBe('suporte@exemplo.com.br');
    expect(normalizeSupportEmail('sem-arroba')).toBe('');
    expect(normalizeSupportEmail('')).toBe('');
  });

  it('lê da configuração gravada e cai no número padrão quando não há', () => {
    const saved = [{ id: 'hero', order: 1 }, buildSupportContactEntry({ whatsapp: '(71) 99999-1234', email: 'ajuda@x.com' })];
    expect(parseSupportContact(saved)).toEqual({ whatsapp: '5571999991234', email: 'ajuda@x.com' });
    expect(parseSupportContact([])).toEqual({ whatsapp: DEFAULT_SUPPORT_WHATSAPP, email: '' });
    expect(parseSupportContact(null)).toEqual({ whatsapp: DEFAULT_SUPPORT_WHATSAPP, email: '' });
    // WhatsApp inválido gravado: usa o padrão em vez de gerar link quebrado
    expect(parseSupportContact([{ id: 'support_contact', whatsapp: '12', email: '' }]).whatsapp).toBe(DEFAULT_SUPPORT_WHATSAPP);
  });

  it('a entrada de contato não vira seção da home e é preservada como extra', () => {
    const saved = [{ id: 'hero', order: 1, enabled: true }, buildSupportContactEntry({ whatsapp: '75981272323', email: '' })];
    expect(normalizeHomeSections(saved).map((s) => s.id)).not.toContain('support_contact');
    expect(extraHomeSectionEntries(saved).map((s) => s.id)).toEqual(['support_contact']);
  });
});
