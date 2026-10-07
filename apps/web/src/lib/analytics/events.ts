import type { AllowedEventType } from '@/lib/analytics/analytics-service';
import type { BusinessAnalyticsContext, GaEvent, GaEventName, GaParamName, GaParams, GaParamValue } from '@/lib/analytics/types';

/**
 * Catálogo e regras dos eventos do GA4. Funções puras (sem navegador), para serem testadas.
 * Regra de ouro: nenhum dado pessoal (nome de pessoa, e-mail, telefone, CPF/CNPJ) vai para o GA.
 */

const ALLOWED_PARAMS: ReadonlySet<GaParamName> = new Set<GaParamName>([
  'business_id', 'business_slug', 'business_name', 'category_name', 'city', 'state', 'plan', 'is_pedra_fundamental',
  'source_page', 'search_term', 'results_count', 'offer_id', 'event_id', 'connection_type', 'lead_type', 'plan_interest',
  'payment_method',
]);

const MAX_VALUE_LENGTH = 100; // limite do GA4 para valor de parâmetro
const MAX_SEARCH_TERM_LENGTH = 80;

/**
 * Termo de busca seguro para análise. Devolve null quando o texto pode ser dado pessoal: e-mail, telefone/CPF/CNPJ
 * (muitos dígitos) ou vazio. Busca por nome de empresa ou serviço ("ótica", "advogado") passa normalmente.
 */
export function sanitizeSearchTerm(raw: unknown): string | null {
  const source = typeof raw === 'string' ? raw : typeof raw === 'number' ? String(raw) : '';
  const text = source.replace(/\s+/g, ' ').trim().toLowerCase();
  if (!text) return null;
  if (text.includes('@')) return null;
  if ((text.match(/\d/g) ?? []).length >= 6) return null;
  return text.slice(0, MAX_SEARCH_TERM_LENGTH);
}

function cleanValue(value: GaParamValue | null | undefined): GaParamValue | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, MAX_VALUE_LENGTH) : null;
}

/** Mantém só os parâmetros permitidos, sem vazios, com texto limitado e `search_term` higienizado. */
export function cleanGaParams(params: GaParams): Record<string, GaParamValue> {
  const out: Record<string, GaParamValue> = {};
  for (const [key, raw] of Object.entries(params)) {
    if (!ALLOWED_PARAMS.has(key as GaParamName)) continue;
    const value = key === 'search_term' ? sanitizeSearchTerm(raw) : cleanValue(raw);
    if (value !== null && value !== undefined) out[key] = value;
  }
  return out;
}

export function buildGaEvent(name: GaEventName, params: GaParams = {}): GaEvent {
  return { name, params: cleanGaParams(params) };
}

/** Parâmetros-padrão de uma página de empresa (todos dados públicos da própria página). */
export function businessParams(business: BusinessAnalyticsContext): GaParams {
  return {
    business_id: business.id,
    business_slug: business.slug,
    business_name: business.name,
    category_name: business.category,
    city: business.city,
    state: business.state,
    plan: business.plan,
    is_pedra_fundamental: business.isPedraFundamental ? true : undefined,
  };
}

/** Evento da medição própria (analytics_events) -> evento equivalente no GA4. Eventos sem equivalente retornam null. */
const GA_NAME_BY_FIRST_PARTY: Partial<Record<AllowedEventType, GaEventName>> = {
  whatsapp_click: 'click_whatsapp',
  phone_click: 'click_phone',
  instagram_click: 'click_instagram',
  website_click: 'click_website',
  directions_click: 'click_directions',
};

export function gaNameForContactEvent(type: AllowedEventType): GaEventName | null {
  return GA_NAME_BY_FIRST_PARTY[type] ?? null;
}

/** Tipo da conexão registrada -> evento. Visita tem evento próprio; as demais são `register_connection`. */
export function gaNameForConnection(connectionType: string): 'register_visit' | 'register_connection' {
  return connectionType === 'visita' ? 'register_visit' : 'register_connection';
}

/**
 * Catálogo para documentação e testes: gatilho e parâmetros esperados de cada evento.
 * `click_directions` mantém o nome já configurado como evento-chave no GA4 (o README cita `click_route` como alias).
 */
export const GA_EVENT_CATALOG: Record<GaEventName, { trigger: string; params: GaParamName[] }> = {
  search_business: { trigger: 'Busca no guia com texto (/guia/empresas?q=)', params: ['search_term', 'city', 'category_name', 'results_count', 'source_page'] },
  select_category: { trigger: 'Filtro de categoria aplicado no guia', params: ['category_name', 'results_count', 'source_page'] },
  select_city: { trigger: 'Filtro de cidade aplicado no guia', params: ['city', 'results_count', 'source_page'] },
  view_category: { trigger: 'Página de cidade + categoria visualizada', params: ['category_name', 'city', 'state', 'results_count', 'source_page'] },
  view_city: { trigger: 'Página de cidade visualizada', params: ['city', 'state', 'results_count', 'source_page'] },
  view_business: { trigger: 'Página da empresa visualizada', params: ['business_id', 'business_slug', 'business_name', 'category_name', 'city', 'state', 'plan', 'is_pedra_fundamental', 'source_page'] },
  click_whatsapp: { trigger: 'Clique em link de WhatsApp da empresa', params: ['business_id', 'business_slug', 'business_name', 'category_name', 'city', 'state', 'plan', 'source_page'] },
  click_phone: { trigger: 'Clique em telefone da empresa', params: ['business_id', 'business_slug', 'business_name', 'category_name', 'city', 'state', 'plan', 'source_page'] },
  click_instagram: { trigger: 'Clique no Instagram da empresa', params: ['business_id', 'business_slug', 'business_name', 'category_name', 'city', 'state', 'plan', 'source_page'] },
  click_website: { trigger: 'Clique no site da empresa', params: ['business_id', 'business_slug', 'business_name', 'category_name', 'city', 'state', 'plan', 'source_page'] },
  click_directions: { trigger: 'Clique em rota/mapa da empresa', params: ['business_id', 'business_slug', 'business_name', 'category_name', 'city', 'state', 'plan', 'source_page'] },
  share_business: { trigger: 'Compartilhamento da empresa', params: ['business_id', 'business_slug', 'business_name', 'category_name', 'city', 'state', 'plan', 'source_page'] },
  favorite_business: { trigger: 'Empresa adicionada aos favoritos', params: ['business_slug', 'source_page'] },
  view_offer: { trigger: 'Clique para ver/resgatar um benefício', params: ['business_id', 'business_slug', 'business_name', 'offer_id', 'source_page'] },
  register_visit: { trigger: 'Conexão do tipo visita registrada', params: ['business_id', 'business_slug', 'connection_type', 'source_page'] },
  register_connection: { trigger: 'Conexão (compra, serviço, parceria) registrada', params: ['business_id', 'business_slug', 'connection_type', 'source_page'] },
  generate_lead: { trigger: 'Formulário de contato da home ou confirmação de presença no evento', params: ['lead_type', 'plan_interest', 'event_id', 'source_page'] },
  start_advertiser_signup: { trigger: 'Abertura do passo 1 do cadastro de anunciante', params: ['source_page'] },
  complete_advertiser_signup: { trigger: 'Dados do responsável e da empresa salvos (passo 2)', params: ['source_page'] },
  contract_signed: { trigger: 'Contrato de adesão assinado', params: ['plan', 'source_page'] },
  payment_confirmed: { trigger: 'Pagamento no cartão autorizado (o Pix confirmado exige o evento via servidor)', params: ['plan', 'payment_method', 'source_page'] },
};
