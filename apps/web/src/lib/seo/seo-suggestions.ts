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
  const rawServices = (facts.services || []).map(shortService).filter(Boolean);
  const primaryService = rawServices[0] || '';
  const mainSubject = primaryService || clean(facts.category);
  const cat = clean(facts.category);
  const where = place(facts);
  const city = clean(facts.city);
  const candidates: string[] = [];

  if (mainSubject && where) {
    candidates.push(`${name} | ${mainSubject} em ${where}`, `${mainSubject} em ${where}: ${name}`);
  }
  if (cat && cat !== mainSubject && where) {
    candidates.push(`${name} | ${cat} em ${where}`);
  }
  if (mainSubject && city) candidates.push(`${name} – ${mainSubject} em ${city}`);
  if (cat && where) candidates.push(`${name}: ${cat} em ${where} | Conexão Maçônica`);
  if (mainSubject) candidates.push(`${name} | ${mainSubject}`);
  if (where) candidates.push(`${name} | ${where}`);
  candidates.push(name);

  return unique(rotate(candidates, seedOf(facts.slug)).filter((t) => t.length <= TITLE_MAX)).slice(0, 3);
}

function getUsefulInfo(facts: SuggestionFacts, angle: 1 | 2 | 3): string {
  if (angle === 1) {
    if (facts.hasWhatsapp) return 'Atendimento e agendamentos pelo WhatsApp.';
    if (facts.hasPhone && facts.hasHours) return 'Consulte horários e telefone para contato.';
    if (facts.hasPhone) return 'Consulte canais de contato e atendimento.';
    if (facts.hasHours) return 'Confira horários de funcionamento e localização.';
    return 'Confira localização completa e canais de contato.';
  }

  if (angle === 2) {
    if (facts.hasWhatsapp) return 'Tire dúvidas e solicite informações direto pelo WhatsApp.';
    if (facts.hasHours) return 'Horários de funcionamento e opções de atendimento disponíveis.';
    if (facts.hasPhone) return 'Entre em contato por telefone para mais informações.';
    return 'Consulte o perfil com endereço, mapa e formas de contato.';
  }

  // angle === 3
  if (facts.hasWhatsapp) return 'Fale direto pelo WhatsApp e confira a localização.';
  if (facts.hasPhone) return 'Ligue para contato e consulte a localização.';
  if (facts.hasHours) return 'Consulte horários de funcionamento e endereço completo.';
  return 'Acesse o endereço completo, rotas e formas de contato.';
}

function buildOperationalOption(facts: SuggestionFacts, max = DESCRIPTION_MAX): string {
  const name = clean(facts.name);
  const services = (facts.services || []).map(shortService).filter(Boolean);
  const primaryService = services[0] || '';
  const specialties = services.slice(1, 4);
  const where = place(facts);
  const loc = where ? ` em ${where}` : '';
  const useful = getUsefulInfo(facts, 1);

  if (primaryService) {
    if (specialties.length >= 2) {
      const text = `${name}: ${primaryService}, com especialidades em ${joinList(specialties.slice(0, 2))}${loc}. ${useful}`;
      if (text.length <= max) return text;
    }
    if (specialties.length >= 1) {
      const text = `${name}: ${primaryService} e especialidade em ${specialties[0]}${loc}. ${useful}`;
      if (text.length <= max) return text;
      const textShortSpec = `${name}: ${primaryService} e ${specialties[0]}${loc}. ${useful}`;
      if (textShortSpec.length <= max) return textShortSpec;
    }
    const textDedicated = `${name}: atendimento especializado em ${primaryService}${loc}. ${useful}`;
    if (textDedicated.length <= max) return textDedicated;

    const textOnlyPrimary = `${name}: ${primaryService}${loc}. ${useful}`;
    if (textOnlyPrimary.length <= max) return textOnlyPrimary;

    return truncateAtWord(textOnlyPrimary, max);
  }

  const cat = clean(facts.category);
  const lead = cat ? `${name}: atendimento em ${cat}${loc}.` : `${name}${loc}.`;
  const text = `${lead} ${useful}`;
  return text.length <= max ? text : truncateAtWord(text, max);
}

function buildInstitutionalOption(facts: SuggestionFacts, max = DESCRIPTION_MAX): string {
  const name = clean(facts.name);
  const services = (facts.services || []).map(shortService).filter(Boolean);
  const primaryService = services[0] || '';
  const specialties = services.slice(1, 4);
  const where = place(facts);
  const loc = where ? ` em ${where}` : '';
  const useful = getUsefulInfo(facts, 2);

  const ownDesc = clean(facts.description);
  if (ownDesc.length >= 40) {
    const lead = firstSentence(ownDesc, 75);
    if (lead.length >= 25) {
      const candidateFull = `${withPeriod(lead)} Atendimento${loc}${primaryService ? ` em ${primaryService}` : ''}. ${useful}`;
      if (candidateFull.length <= max) return candidateFull;
      const candidateLocOnly = `${withPeriod(lead)} Atendimento${loc}. ${useful}`;
      if (candidateLocOnly.length <= max) return candidateLocOnly;
      const candidateShort = `${withPeriod(lead)} ${useful}`;
      if (candidateShort.length <= max) return candidateShort;
    }
  }

  if (primaryService) {
    if (specialties.length >= 2) {
      const candidate = `Conheça ${name}${loc}. Atuação em ${primaryService}, com soluções em ${joinList(specialties.slice(0, 2))}. ${useful}`;
      if (candidate.length <= max) return candidate;
    }
    if (specialties.length >= 1) {
      const candidate = `Conheça ${name}${loc}. Soluções em ${primaryService} e ${specialties[0]}. ${useful}`;
      if (candidate.length <= max) return candidate;
    }
    const candidateSingle = `Conheça ${name}${loc}. Serviços e soluções em ${primaryService}. ${useful}`;
    if (candidateSingle.length <= max) return candidateSingle;

    const candidateBrief = `Conheça ${name}${loc}. Atendimento em ${primaryService}. ${useful}`;
    if (candidateBrief.length <= max) return candidateBrief;

    return truncateAtWord(candidateBrief, max);
  }

  const cat = clean(facts.category);
  const candidateCat = `Conheça ${name}${loc}. Serviços de ${cat || 'atendimento'} com dedicação e qualidade. ${useful}`;
  if (candidateCat.length <= max) return candidateCat;
  const candidateCatShort = `Conheça ${name}${loc}. Serviços de ${cat || 'atendimento'}. ${useful}`;
  return candidateCatShort.length <= max ? candidateCatShort : truncateAtWord(candidateCatShort, max);
}

function buildLocalSearchOption(facts: SuggestionFacts, max = DESCRIPTION_MAX): string {
  const name = clean(facts.name);
  const services = (facts.services || []).map(shortService).filter(Boolean);
  const primaryService = services[0] || '';
  const specialties = services.slice(1, 4);
  const where = place(facts);
  const inLoc = where ? ` em ${where}` : '';
  const useful = getUsefulInfo(facts, 3);

  if (primaryService) {
    if (specialties.length >= 1) {
      const candidate = `Procura por ${primaryService}${inLoc}? ${name} atua com ${specialties[0]}. ${useful}`;
      if (candidate.length <= max) return candidate;
    }
    const candidatePrimary = `Procura por ${primaryService}${inLoc}? Conheça os serviços de ${name}. ${useful}`;
    if (candidatePrimary.length <= max) return candidatePrimary;

    const candidateShort = `Procura por ${primaryService}${inLoc}? ${useful}`;
    if (candidateShort.length <= max) return candidateShort;

    return truncateAtWord(candidatePrimary, max);
  }

  const cat = clean(facts.category);
  const candidateCat = `Procurando serviços de ${cat || 'qualidade'}${inLoc}? Conheça ${name}. ${useful}`;
  if (candidateCat.length <= max) return candidateCat;
  const candidateShort = `Procura ${cat || 'serviços'}${inLoc}? Conheça ${name}. ${useful}`;
  return candidateShort.length <= max ? candidateShort : truncateAtWord(candidateShort, max);
}

export function suggestDescriptions(facts: SuggestionFacts): string[] {
  const opt1 = buildOperationalOption(facts);
  const opt2 = buildInstitutionalOption(facts);
  const opt3 = buildLocalSearchOption(facts);

  const candidates = unique([opt1, opt2, opt3].filter(Boolean));
  if (candidates.length === 0) {
    const fallback = truncateAtWord(`${facts.name} em ${place(facts)}.`, DESCRIPTION_MAX);
    return [fallback];
  }
  return candidates.slice(0, 3);
}

export function suggestLongDescription(facts: SuggestionFacts): { text: string; reaches150: boolean } | null {
  const own = clean(facts.description);
  if (own.length >= LONG_DESCRIPTION_MIN) return null;

  const name = clean(facts.name);
  const services = (facts.services || []).map(shortService).filter(Boolean);
  const primaryService = services[0] || '';
  const specialties = services.slice(1, 5);
  const cat = clean(facts.category).toLowerCase();
  const where = place(facts);

  const parts: string[] = [];
  if (own.length >= 50) {
    parts.push(withPeriod(own));
  } else if (primaryService && where) {
    parts.push(`${name} atua com ${primaryService} em ${where}.`);
  } else if (cat && where) {
    parts.push(`${name} atua no segmento de ${cat} em ${where}.`);
  } else if (where) {
    parts.push(`${name} está localizada em ${where}.`);
  } else {
    parts.push(withPeriod(name));
  }

  if (specialties.length > 0) {
    parts.push(`Entre os serviços e especialidades oferecidos estão ${joinList(specialties)}.`);
  } else if (services.length > 0) {
    parts.push(`Entre os serviços oferecidos estão ${joinList(services)}.`);
  }

  if (facts.hasHours) {
    parts.push('O horário de funcionamento e atendimento está disponível no perfil.');
  }

  parts.push(
    facts.hasPhone || facts.hasWhatsapp
      ? 'Consulte a localização completa, horários e os canais de contato direto para agendamentos e informações.'
      : 'Confira a localização completa, mapa de acesso e detalhes dos serviços prestados.'
  );

  const text = parts.join(' ');
  return { text, reaches150: text.length >= LONG_DESCRIPTION_MIN };
}

export function suggestionHints(facts: SuggestionFacts): string[] {
  const hints: string[] = [];
  if (!clean(facts.category)) hints.push('Informe a categoria: ela entra no título e na descrição.');
  if (!clean(facts.city)) hints.push('Informe a cidade e o estado: eles entram no título e na descrição.');
  if (facts.services.length === 0) hints.push('Cadastre os serviços: eles substituem termos genéricos e enriquecem a descrição com informação real.');
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
