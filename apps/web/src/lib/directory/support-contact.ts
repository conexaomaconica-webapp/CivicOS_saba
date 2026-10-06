/**
 * Contato de suporte exibido no botão flutuante das páginas públicas (WhatsApp e e-mail), configurável por tenant em
 * /admin/guia/geral. Fica na configuração da home (sections_config), numa entrada própria com id "support_contact".
 * Sem dependências de servidor: serve ao painel, ao layout e ao botão.
 */
export const SUPPORT_CONTACT_ENTRY_ID = 'support_contact';
/** Número padrão enquanto nenhum for configurado. */
export const DEFAULT_SUPPORT_WHATSAPP = '5575981272323';

export interface SupportContact {
  /** Só dígitos, com código do país (ex.: 5575981272323). */
  whatsapp: string;
  /** E-mail de suporte; vazio = o botão abre direto o WhatsApp. */
  email: string;
}

/** "(75) 98127-2323", "+55 75 98127-2323" ou "75981272323" -> "5575981272323". Número inválido -> ''. */
export function normalizeSupportWhatsapp(input: unknown): string {
  const digits = String(input ?? '').replace(/\D/g, '');
  if (!digits) return '';
  const withCountry = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  return /^\d{12,13}$/.test(withCountry) ? withCountry : '';
}

export function normalizeSupportEmail(input: unknown): string {
  const email = String(input ?? '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 160 ? email : '';
}

/** Lê o contato da configuração gravada; sem WhatsApp válido, cai no número padrão. */
export function parseSupportContact(sectionsConfig: unknown): SupportContact {
  let list: any[] = [];
  if (Array.isArray(sectionsConfig)) list = sectionsConfig;
  else if (typeof sectionsConfig === 'string') {
    try {
      const parsed = JSON.parse(sectionsConfig);
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      list = [];
    }
  }
  const entry = list.find((item) => item && item.id === SUPPORT_CONTACT_ENTRY_ID);
  return {
    whatsapp: normalizeSupportWhatsapp(entry?.whatsapp) || DEFAULT_SUPPORT_WHATSAPP,
    email: normalizeSupportEmail(entry?.email),
  };
}

/** Entrada a gravar em sections_config (já normalizada). */
export function buildSupportContactEntry(contact: { whatsapp: string; email: string }) {
  return {
    id: SUPPORT_CONTACT_ENTRY_ID,
    enabled: true,
    order: 999,
    whatsapp: normalizeSupportWhatsapp(contact.whatsapp),
    email: normalizeSupportEmail(contact.email),
  };
}
