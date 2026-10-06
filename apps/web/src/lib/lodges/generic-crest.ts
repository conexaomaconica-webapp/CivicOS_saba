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
  CMSB: '/lojas/genericos/logo-generico-cmsb.png',
};

/** Caminho público do brasão genérico da potência da loja, ou null se não houver. */
export function genericCrestForPotency(potency?: string | null): string | null {
  const code = canonicalPotencyCode(potency);
  return (code && GENERIC_CRESTS[code.toUpperCase()]) || null;
}
