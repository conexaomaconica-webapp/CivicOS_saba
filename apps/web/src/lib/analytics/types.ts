/**
 * Tipos do Google Analytics 4 da Conexão Maçônica. Todos os nomes em snake_case.
 * Documentação dos eventos: docs/seo/eventos-ga4.md
 */

export type GaEventName =
  // descoberta e navegação
  | 'search_business'
  | 'select_category'
  | 'select_city'
  | 'view_category'
  | 'view_city'
  | 'view_business'
  // interesse e contato com a empresa
  | 'click_whatsapp'
  | 'click_phone'
  | 'click_instagram'
  | 'click_website'
  | 'click_directions'
  | 'share_business'
  | 'favorite_business'
  | 'view_offer'
  // conexão
  | 'register_visit'
  | 'register_connection'
  // captação e funil do anunciante
  | 'generate_lead'
  | 'start_advertiser_signup'
  | 'complete_advertiser_signup'
  | 'contract_signed'
  | 'payment_confirmed';

/** Único conjunto de parâmetros aceitos. Qualquer outra chave é descartada (proteção contra dado pessoal). */
export type GaParamName =
  | 'business_id'
  | 'business_slug'
  | 'business_name'
  | 'category_name'
  | 'city'
  | 'state'
  | 'plan'
  | 'is_pedra_fundamental'
  | 'source_page'
  | 'search_term'
  | 'results_count'
  | 'offer_id'
  | 'event_id'
  | 'connection_type'
  | 'lead_type'
  | 'plan_interest'
  | 'payment_method';

export type GaParamValue = string | number | boolean;
export type GaParams = Partial<Record<GaParamName, GaParamValue | null | undefined>>;
export type GaEvent = { name: GaEventName; params: GaParams };

/** Dados públicos da empresa que acompanham os eventos de uma página de empresa. */
export type BusinessAnalyticsContext = {
  id: string;
  slug: string;
  name: string;
  category?: string | null;
  city?: string | null;
  state?: string | null;
  plan?: string | null;
  isPedraFundamental?: boolean;
};
