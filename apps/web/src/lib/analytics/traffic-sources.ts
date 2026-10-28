/**
 * Conexão Maçônica — Módulo Canônico de Rastreabilidade (Etapa B)
 *
 * Separação rigorosa entre dois conceitos independentes:
 * 1. Origem de Aquisição (acquisition_source): Como o visitante chegou à Conexão Maçônica.
 * 2. Origem de Descoberta (discovery_source): Onde o visitante encontrou a empresa dentro da plataforma.
 *
 * DIRETRIZES DE PRIVACIDADE E LGPD:
 * - NUNCA armazena termos individuais de pesquisa digitados pelo usuário.
 * - NUNCA expõe dados pessoais ou identificadores de visitantes.
 * - Valores desconhecidos ou legados são mapeados para 'unidentified'.
 */

// ============================================================================
// 1. Origem de Aquisição (Como chegou à Conexão Maçônica)
// ============================================================================

export const ACQUISITION_SOURCES = [
  'direct',           // Acesso direto (digitou URL, favoritos, sem referrer)
  'organic_search',   // Motores de busca (Google, Bing, Yahoo, DuckDuckGo, Ecosia, etc.)
  'social',           // Redes sociais e mensageiros (Instagram, Facebook, LinkedIn, WhatsApp, Telegram, etc.)
  'campaign',         // Tráfego pago / campanhas UTM (cpc, ppc, paid, display, banner)
  'qr_code',          // QR Code físico impresso (utm_source=qr ou src=qr)
  'external_referral',// Outros sites externos (blogs, portais parceiros)
  'unidentified',     // Origem desconhecida / não identificada
] as const;

export type AcquisitionSource = (typeof ACQUISITION_SOURCES)[number];

export const ACQUISITION_LABELS: Record<AcquisitionSource, string> = {
  direct: 'Acesso Direto',
  organic_search: 'Busca Orgânica (Google, Bing)',
  social: 'Redes Sociais e Mensageiros',
  campaign: 'Campanhas e Tráfego Pago',
  qr_code: 'QR Code Físico',
  external_referral: 'Sites Externos e Parceiros',
  unidentified: 'Não Identificada',
};

// ============================================================================
// 2. Origem de Descoberta (Onde encontrou a empresa na plataforma)
// ============================================================================

export const DISCOVERY_SOURCES = [
  'text_search',        // Busca textual inteligente no Guia
  'category',           // Listagem e filtros por categoria
  'map',                // Explorador no mapa (pins interativos, rotas)
  'featured_sponsored', // Carrossel e vitrine de empresas em destaque
  'feed_wall',          // Mural de conexões e feed de negócios confirmados
  'benefits_club',      // Clube de benefícios e vantagens exclusivas
  'lodges_guide',       // Guia de lojas maçônicas
  'direct_link',        // Link direto do anúncio (compartilhamento do perfil)
  'unidentified',       // Canal interno não identificado
] as const;

export type DiscoverySource = (typeof DISCOVERY_SOURCES)[number];

export const DISCOVERY_LABELS: Record<DiscoverySource, string> = {
  text_search: 'Busca Inteligente',
  category: 'Navegação por Categoria',
  map: 'Explorador no Mapa',
  featured_sponsored: 'Empresas em Destaque',
  feed_wall: 'Mural de Conexões',
  benefits_club: 'Clube de Benefícios',
  lodges_guide: 'Guia de Lojas Maçônicas',
  direct_link: 'Link Direto do Anúncio',
  unidentified: 'Não Identificada',
};

// ============================================================================
// 3. Validação e Normalização Segura no Servidor
// ============================================================================

export function normalizeAcquisitionSource(raw: unknown): AcquisitionSource {
  if (typeof raw !== 'string') return 'unidentified';
  const val = raw.trim().toLowerCase();

  // Mapeamentos canônicos e compatibilidade com aliases legados
  if (val === 'direct') return 'direct';
  if (val === 'organic_search' || val === 'organic_google' || val === 'google' || val === 'search_engine' || val === 'buscadores') {
    return 'organic_search';
  }
  if (val === 'social' || val === 'instagram' || val === 'facebook' || val === 'whatsapp' || val === 'redes') {
    return 'social';
  }
  if (val === 'campaign' || val === 'cpc' || val === 'ads') {
    return 'campaign';
  }
  if (val === 'qr_code' || val === 'qr' || val === 'qrcode') {
    return 'qr_code';
  }
  if (val === 'external_referral' || val === 'referral') {
    return 'external_referral';
  }

  return (ACQUISITION_SOURCES as readonly string[]).includes(val)
    ? (val as AcquisitionSource)
    : 'unidentified';
}

export function normalizeDiscoverySource(raw: unknown): DiscoverySource {
  if (typeof raw !== 'string') return 'unidentified';
  const val = raw.trim().toLowerCase();

  if (val === 'text_search' || val === 'search' || val === 'busca' || val === 'search_result' || val === 'autocomplete') {
    return 'text_search';
  }
  if (val === 'category' || val === 'categoria' || val === 'categories') {
    return 'category';
  }
  if (val === 'map' || val === 'mapa' || val === 'map_pin' || val === 'map_card') {
    return 'map';
  }
  if (val === 'featured_sponsored' || val === 'featured' || val === 'sponsored' || val === 'destaque' || val === 'destaques') {
    return 'featured_sponsored';
  }
  if (val === 'feed_wall' || val === 'mural' || val === 'feed' || val === 'connection_mural') {
    return 'feed_wall';
  }
  if (val === 'benefits_club' || val === 'beneficios' || val === 'benefits' || val === 'clube_beneficios') {
    return 'benefits_club';
  }
  if (val === 'lodges_guide' || val === 'lojas' || val === 'lodges') {
    return 'lodges_guide';
  }
  if (val === 'direct_link' || val === 'profile_direct' || val === 'share' || val === 'business_profile') {
    return 'direct_link';
  }

  return (DISCOVERY_SOURCES as readonly string[]).includes(val)
    ? (val as DiscoverySource)
    : 'unidentified';
}

// ============================================================================
// 4. Detecção de Aquisição no Cliente (Web e Mobile)
// ============================================================================

const SEARCH_ENGINES_REGEX = /(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|yahoo\.com|ecosia\.org|brave\.com|yandex\.[a-z.]+|baidu\.com)$/i;
const SOCIAL_REGEX = /(^|\.)(facebook\.com|instagram\.com|l\.instagram\.com|lm\.facebook\.com|linkedin\.com|lnkd\.in|t\.co|twitter\.com|x\.com|youtube\.com|tiktok\.com|whatsapp\.com|wa\.me|t\.me|telegram\.org|threads\.net)$/i;
const PAID_MEDIUMS = new Set(['cpc', 'ppc', 'paid', 'paidsocial', 'display', 'banner', 'retargeting']);

export interface ClassifyAcquisitionInput {
  referrer?: string | null;
  search?: string | null;
  ownHost: string;
}

export function classifyAcquisition(input: ClassifyAcquisitionInput): AcquisitionSource {
  const params = new URLSearchParams(input.search ?? '');
  const utmSource = (params.get('utm_source') ?? '').toLowerCase().trim();
  const utmMedium = (params.get('utm_medium') ?? '').toLowerCase().trim();
  const src = (params.get('src') ?? '').toLowerCase().trim();

  // QR Code físico
  if (utmSource === 'qr' || utmSource === 'qrcode' || utmMedium === 'qr' || src === 'qr' || src === 'qrcode') {
    return 'qr_code';
  }

  // Campanhas de tráfego pago
  if (PAID_MEDIUMS.has(utmMedium) || (utmSource.length > 0 && utmMedium === 'cpc')) {
    return 'campaign';
  }

  let referrerHost = '';
  try {
    if (input.referrer) {
      referrerHost = new URL(input.referrer).hostname.replace(/^www\./i, '').toLowerCase();
    }
  } catch {
    referrerHost = '';
  }

  const own = input.ownHost.split(':')[0]!.replace(/^www\./i, '').toLowerCase();

  // Acesso sem referrer externo
  if (!referrerHost || referrerHost === own) {
    if (utmSource.length > 0) return 'campaign';
    return 'direct';
  }

  // Redes sociais e mensageiros
  if (SOCIAL_REGEX.test(referrerHost)) {
    return 'social';
  }

  // Motores de busca orgânicos
  if (SEARCH_ENGINES_REGEX.test(referrerHost)) {
    return 'organic_search';
  }

  // Demais referências externas
  return 'external_referral';
}

// ============================================================================
// 5. Sessão do Cliente (Session Storage)
// ============================================================================

const ACQ_STORAGE_KEY = 'cm_acquisition_source';

export function readStoredAcquisitionSource(): AcquisitionSource | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = window.sessionStorage.getItem(ACQ_STORAGE_KEY);
    return val ? normalizeAcquisitionSource(val) : null;
  } catch {
    return null;
  }
}

export function captureAcquisitionSource(force?: AcquisitionSource): AcquisitionSource {
  if (typeof window === 'undefined') return 'unidentified';
  try {
    const existing = readStoredAcquisitionSource();
    if (existing && !force) return existing;

    const source =
      force ??
      classifyAcquisition({
        referrer: document.referrer,
        search: window.location.search,
        ownHost: window.location.host,
      });

    window.sessionStorage.setItem(ACQ_STORAGE_KEY, source);
    return source;
  } catch {
    return 'unidentified';
  }
}
