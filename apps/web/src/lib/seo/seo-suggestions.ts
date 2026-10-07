import { truncateAtWord } from '@/lib/seo/business-seo';

/**
 * Sugestões automáticas de título e descrição, sem IA externa e sem custo. Usam SOMENTE dados que já estão no cadastro
 * (nunca inventam serviço, certificação, tempo de experiência ou endereço). A escolha entre as opções varia de
 * empresa para empresa (semente = slug) para as páginas não ficarem com textos idênticos.
 */
export type SuggestionFacts = {
  slug: string;
  name: string;
  category: string | null;
  city: string | null;
  state: string | null;
  description: string | null;
  services: string[];
  hasHours: boolean;
  hasPhone: boolean;
  hasWhatsapp: boolean;
};

export type SeoSuggestions = {
  titles: string[];
  descriptions: string[];
  /** Texto para o campo "Descrição" do cadastro (a pontuação pede 150+ caracteres). null = já está bom ou faltam dados. */
  longDescription: { text: string; reaches150: boolean } | null;
  /** O que falta no cadastro para as sugestões ficarem melhores. */
  hints: string[];
};

export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 155;
export const DESCRIPTION_MIN_TARGET = 110;
export const LONG_DESCRIPTION_MIN = 150;

const clean = (v: string | null | undefined) => (v ?? '').replace(/\s+/g, ' ').trim();

function seedOf(slug: string): number {
  let hash = 0;
  for (const ch of slug) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash;
}

function rotate<T>(list: T[], seed: number): T[] {
  if (list.length === 0) return list;
  const shift = seed % list.length;
  return [...list.slice(shift), ...list.slice(0, shift)];
}

function unique(list: string[]): string[] {
  const seen = new Set<string>();
  return list.filter((item) => {
    const key = item.toLowerCase();
    if (!item || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

function shortService(name: string): string {
  const value = clean(name).replace(/[.;:]+$/, '');
  return value.length > 32 ? truncateAtWord(value, 32).replace(/…$/, '') : value;
}

function firstSentence(text: string, max: number): string {
  const value = clean(text);
  const match = /^(.+?[.!?])(\s|$)/.exec(value);
  const sentence = match ? match[1]! : value;
  return truncateAtWord(sentence, max).replace(/…$/, '');
}

function withPeriod(text: string): string {
  const value = clean(text);
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function place(facts: SuggestionFacts): string {
  const city = clean(facts.city);
  const uf = clean(facts.state).toUpperCase();
  return city && uf ? `${city} - ${uf}` : city || uf;
}

export function suggestTitles(facts: SuggestionFacts): string[] {
  const name = clean(facts.name);
  const cat = clean(facts.category);
  const where = place(facts);
  const city = clean(facts.city);
  const candidates: string[] = [];

  if (cat && where) {
    candidates.push(`${name} | ${cat} em ${where}`, `${cat} em ${where}: ${name}`, `${name}: ${cat} em ${where} | Conexão Maçônica`);
  }
  if (cat && city) candidates.push(`${name} – ${cat} em ${city}`);
  if (cat) candidates.push(`${name} | ${cat} | Conexão Maçônica`);
  if (where) candidates.push(`${name} | ${where}`);
  candidates.push(name);

  return unique(rotate(candidates, seedOf(facts.slug)).filter((t) => t.length <= TITLE_MAX)).slice(0, 3);
}

export function suggestDescriptions(facts: SuggestionFacts): string[] {
  const name = clean(facts.name);
  const cat = clean(facts.category).toLowerCase();
  const where = place(facts);
  const services = facts.services.map(shortService).filter(Boolean).slice(0, 3);
  const seed = seedOf(facts.slug);

  const ctas = rotate(
    [
      'Veja fotos, localização e contatos no Conexão Maçônica.',
      'Conheça a empresa e fale com ela pelo Conexão Maçônica.',
      ...(facts.hasWhatsapp ? ['Fale pelo WhatsApp e veja a localização no Conexão Maçônica.'] : []),
    ],
    seed
  );

  const base = cat && where ? `${name}: ${cat} em ${where}.` : where ? `${name} em ${where}.` : withPeriod(name);
  const servicesPart = (count: number) => (services.length ? `Serviços: ${joinList(services.slice(0, count))}.` : '');

  const fits = (parts: string[]) => {
    const text = parts.filter(Boolean).join(' ');
    return text.length <= DESCRIPTION_MAX ? text : null;
  };

  const built: string[] = [];
  for (const cta of ctas) {
    // Tenta incluir os serviços (3, depois 2, depois 1) junto do CTA; sem espaço, cai para base + CTA.
    const withServices = [3, 2, 1].map((n) => fits([base, servicesPart(n), cta])).find(Boolean);
    const text = (services.length ? withServices : null) ?? fits([base, cta]);
    if (text) built.push(text);
  }
  // Variante sem CTA, com mais serviços.
  if (services.length) {
    const text = [3, 2, 1].map((n) => fits([base, servicesPart(n)])).find(Boolean);
    if (text) built.push(text);
  }

  const own = clean(facts.description);
  if (own.length >= 50) {
    const cta = ctas[0]!;
    const lead = firstSentence(own, DESCRIPTION_MAX - cta.length - 1);
    if (lead.length >= 30) built.push(`${withPeriod(lead)} ${cta}`);
  }

  const ranked = unique(built).sort((a, b) => Number(b.length >= DESCRIPTION_MIN_TARGET) - Number(a.length >= DESCRIPTION_MIN_TARGET));
  const result = ranked.slice(0, 3);
  return result.length ? result : [truncateAtWord(base, DESCRIPTION_MAX)];
}

export function suggestLongDescription(facts: SuggestionFacts): { text: string; reaches150: boolean } | null {
  const own = clean(facts.description);
  if (own.length >= LONG_DESCRIPTION_MIN) return null;

  const name = clean(facts.name);
  const cat = clean(facts.category).toLowerCase();
  const where = place(facts);
  const services = facts.services.map(shortService).filter(Boolean).slice(0, 5);

  const parts: string[] = [];
  if (own.length >= 50) parts.push(withPeriod(own));
  else parts.push(cat && where ? `${name} atua com ${cat} em ${where}.` : where ? `${name} está em ${where}.` : withPeriod(name));
  if (services.length) parts.push(`Entre os serviços oferecidos estão ${joinList(services)}.`);
  if (facts.hasHours) parts.push('O horário de atendimento está disponível no perfil da empresa.');
  parts.push(
    facts.hasPhone || facts.hasWhatsapp
      ? 'No Conexão Maçônica, guia comercial da comunidade maçônica, você encontra a localização e os contatos para falar com a empresa.'
      : 'No Conexão Maçônica, guia comercial da comunidade maçônica, você conhece a empresa e seus serviços.'
  );

  const text = parts.join(' ');
  return { text, reaches150: text.length >= LONG_DESCRIPTION_MIN };
}

export function suggestionHints(facts: SuggestionFacts): string[] {
  const hints: string[] = [];
  if (!clean(facts.category)) hints.push('Informe a categoria: ela entra no título e na descrição.');
  if (!clean(facts.city)) hints.push('Informe a cidade e o estado: eles entram no título e na descrição.');
  if (facts.services.length === 0) hints.push('Cadastre os serviços: eles enriquecem a descrição com informação real.');
  if (!facts.hasHours) hints.push('Informe o horário de atendimento.');
  if (!facts.hasPhone && !facts.hasWhatsapp) hints.push('Informe telefone ou WhatsApp.');
  return hints;
}

export function generateSeoSuggestions(facts: SuggestionFacts): SeoSuggestions {
  return {
    titles: suggestTitles(facts),
    descriptions: suggestDescriptions(facts),
    longDescription: suggestLongDescription(facts),
    hints: suggestionHints(facts),
  };
}
