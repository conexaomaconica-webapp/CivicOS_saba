import type { ApprovalDirectoryItem } from '@/lib/admin/admin-approval-service';

/** Minúsculas e sem acentos: "otica" encontra "Óptica", "sao jose" encontra "São José". */
export function normalizeSearchText(value: string | null | undefined): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Busca da lista de aprovações (nome, e-mail, categoria, cidade, responsável e CNPJ/CPF).
 *
 * O CNPJ só entra na comparação quando o texto digitado TEM dígitos. Antes, um nome sem números virava uma string vazia e
 * `cnpj.includes('')` é sempre verdadeiro: toda empresa com CNPJ passava no filtro e a lista nunca diminuía.
 */
export function matchesApprovalSearch(
  item: Pick<ApprovalDirectoryItem, 'name' | 'owner_email' | 'category' | 'cnpj' | 'city' | 'owner_name'>,
  query: string,
): boolean {
  const text = normalizeSearchText(query);
  if (!text) return true;

  const digits = text.replace(/\D/g, '');
  const textFields = [item.name, item.owner_email, item.category, item.city, item.owner_name];
  if (textFields.some((field) => normalizeSearchText(field).includes(text))) return true;

  if (digits.length > 0 && item.cnpj) {
    return item.cnpj.replace(/\D/g, '').includes(digits);
  }
  return false;
}
