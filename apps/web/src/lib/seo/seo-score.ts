/**
 * Pontuação interna de SEO da empresa (0 a 100). Mede o quanto o cadastro dá de matéria-prima para a página pública
 * ranquear e converter. NÃO é uma nota do Google e não garante posição.
 */

export type SeoScoreInput = {
  name: string | null;
  category: string | null;
  description: string | null;
  slug: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  hasCoordinates: boolean;
  hoursCount: number;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  instagram: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  galleryCount: number;
  servicesCount: number;
  seoIndexable: boolean;
};

/** key identifica o item (para a tela levar ao lugar certo de edição); label é o texto mostrado. */
export type SeoIssue = { key: string; label: string; points: number };

export type SeoScoreResult = {
  score: number;
  status: 'incompleto' | 'basico' | 'bom' | 'muito_bom' | 'completo';
  statusLabel: string;
  groups: Array<{ key: string; label: string; earned: number; max: number }>;
  issues: SeoIssue[];
};

const has = (value: string | null | undefined, min = 1) => (value ?? '').trim().length >= min;

export function seoStatusFor(score: number): Pick<SeoScoreResult, 'status' | 'statusLabel'> {
  if (score >= 95) return { status: 'completo', statusLabel: 'SEO completo' };
  if (score >= 85) return { status: 'muito_bom', statusLabel: 'SEO muito bom' };
  if (score >= 70) return { status: 'bom', statusLabel: 'SEO bom' };
  if (score >= 50) return { status: 'basico', statusLabel: 'SEO básico' };
  return { status: 'incompleto', statusLabel: 'SEO incompleto' };
}

export function scoreBusinessSeo(input: SeoScoreInput): SeoScoreResult {
  const issues: SeoIssue[] = [];
  const groups: SeoScoreResult['groups'] = [];

  const group = (key: string, label: string, checks: Array<[boolean, number, string, string]>) => {
    let earned = 0;
    let max = 0;
    for (const [ok, points, missing, issueKey] of checks) {
      max += points;
      if (ok) earned += points;
      else issues.push({ key: issueKey, label: missing, points });
    }
    groups.push({ key, label, earned, max });
  };

  group('cadastro', 'Cadastro', [
    [has(input.name), 5, 'Informar o nome da empresa', 'name'],
    [has(input.category), 5, 'Escolher a categoria', 'category'],
    [has(input.city) && has(input.state), 5, 'Informar cidade e estado', 'city_state'],
    [has(input.description, 50), 5, 'Escrever uma descrição (mínimo 50 caracteres)', 'description'],
  ]);
  group('contato', 'Contato', [
    [has(input.phone), 5, 'Informar o telefone', 'phone'],
    [has(input.whatsapp), 5, 'Informar o WhatsApp', 'whatsapp'],
    [has(input.website) || has(input.instagram), 5, 'Informar o site ou o Instagram', 'website_or_instagram'],
  ]);
  group('conteudo', 'Conteúdo', [
    [has(input.description, 150), 10, 'Aprofundar a descrição (150 caracteres ou mais)', 'description_long'],
    [input.servicesCount >= 1, 8, 'Cadastrar ao menos um serviço', 'services_1'],
    [input.servicesCount >= 3, 7, 'Cadastrar três ou mais serviços', 'services_3'],
  ]);
  group('imagens', 'Imagens', [
    [has(input.logoUrl), 5, 'Enviar o logo', 'logo'],
    [has(input.coverUrl), 5, 'Enviar a imagem de capa', 'cover'],
    [input.galleryCount >= 3, 5, 'Adicionar três ou mais fotos na galeria', 'gallery'],
  ]);
  group('local', 'Local', [
    [has(input.address), 6, 'Informar o endereço completo', 'address'],
    [input.hoursCount >= 1, 5, 'Informar o horário de atendimento', 'hours'],
    [input.hasCoordinates, 4, 'Confirmar a localização no mapa', 'coordinates'],
  ]);
  group('tecnico', 'Técnico', [
    [has(input.slug), 4, 'Gerar o endereço (slug) da página', 'slug'],
    [input.seoIndexable, 3, 'Liberar a página para o Google (hoje está como noindex)', 'indexable'],
    [has(input.name) && has(input.category) && has(input.city), 3, 'Preencher nome, categoria e cidade para gerar título e descrição automáticos', 'auto_fields'],
  ]);

  const score = groups.reduce((sum, g) => sum + g.earned, 0);
  return { score, ...seoStatusFor(score), groups, issues: issues.sort((a, b) => b.points - a.points) };
}

/** Descrições repetidas entre empresas (cópia/colagem) enfraquecem o SEO: devolve os slugs afetados. */
export function findDuplicateDescriptions(items: Array<{ slug: string; description: string | null }>): Set<string> {
  const bySignature = new Map<string, string[]>();
  for (const item of items) {
    const text = (item.description ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (text.length < 50) continue;
    const list = bySignature.get(text) ?? [];
    list.push(item.slug);
    bySignature.set(text, list);
  }
  const duplicated = new Set<string>();
  for (const slugs of bySignature.values()) if (slugs.length > 1) slugs.forEach((slug) => duplicated.add(slug));
  return duplicated;
}
