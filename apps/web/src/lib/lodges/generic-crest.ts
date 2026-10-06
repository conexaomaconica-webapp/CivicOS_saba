import { canonicalPotencyCode } from '@/lib/lodges/potency';

/**
 * Brasão genérico por potência, usado só na EXIBIÇÃO quando a loja não tem brasão próprio.
 * Não grava nada em organizations.logo_url: os filtros "sem brasão" do admin continuam mostrando o que falta.
 * Arquivos em apps/web/public/lojas/genericos/ (nomes abaixo). Potência sem genérico mantém o ícone padrão.
 */
const GENERIC_CRESTS: Record<string, string> = {
  GOB: '/lojas/genericos/logo-generico-gob-baiano.jpg',
  COMAB: '/lojas/genericos/logo-generico-comab.png',
  GOSP: '/lojas/genericos/logo-generico-gosp.jpg',
  CMSB: '/lojas/genericos/logo-generico-cmsb.webp',
};

/** Nomes por extenso (sem acento) que identificam a potência quando a sigla não vem no texto. */
const NAME_HINTS: Array<[RegExp, string]> = [
  [/grande oriente do brasil/, 'GOB'],
  [/grande loja ma[cç]onica|grande loja/, 'CMSB'],
  [/confedera[cç][aã]o ma[cç]onica|cmsb/, 'CMSB'],
  [/grande oriente de s[aã]o paulo/, 'GOSP'],
  [/grande oriente ma[cç]onico do brasil|grande oriente independente/, 'COMAB'],
];

/**
 * Caminho público do brasão genérico da potência da loja, ou null se não houver.
 * Aceita a sigla ("GOB", "CMSB/BA") e também o texto como aparece nos cards ("Grande Oriente do Brasil – GOB").
 */
export function genericCrestForPotency(potency?: string | null): string | null {
  const raw = String(potency ?? '').trim();
  if (!raw) return null;

  const code = canonicalPotencyCode(raw).toUpperCase();
  if (GENERIC_CRESTS[code]) return GENERIC_CRESTS[code];

  // Sigla como palavra isolada em qualquer parte do texto ("... – GOB", "GRANDE LOJA - CMSB").
  const words = raw.toUpperCase().split(/[^A-ZÀ-Ý0-9]+/).filter(Boolean);
  const bySigla = words.find((w) => GENERIC_CRESTS[w]);
  if (bySigla) return GENERIC_CRESTS[bySigla]!;

  const normalized = raw.toLowerCase();
  const hint = NAME_HINTS.find(([re]) => re.test(normalized));
  return hint ? GENERIC_CRESTS[hint[1]] ?? null : null;
}
