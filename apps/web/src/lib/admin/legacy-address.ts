/**
 * Endereço antigo de businesses.address (um texto só, ex.: "Avenida Papa João XXIII, 1660, Olhos D'Água") -> campos do
 * formulário. Só preenche o que dá para reconhecer com segurança; cidade e UF não são deduzidas do texto.
 */
export interface LegacyAddressParts {
  street?: string;
  number?: string;
  neighborhood?: string;
}

export function parseLegacyAddress(raw: string | null | undefined): LegacyAddressParts {
  const parts = String(raw || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    // Pedaços que já são cidade/UF ou CEP não pertencem a rua, número ou bairro.
    .filter((part) => !/^cep\b/i.test(part) && !/\s-\s*[A-Z]{2}$/.test(part));
  if (parts.length === 0) return {};

  const [street, second, third] = parts;
  const looksLikeNumber = (value?: string) => Boolean(value && /^(\d+[A-Za-z]?|s\/?n|sem n[úu]mero)$/i.test(value));
  if (looksLikeNumber(second)) {
    return { street, number: second, neighborhood: third || undefined };
  }
  return { street, neighborhood: second || undefined };
}
