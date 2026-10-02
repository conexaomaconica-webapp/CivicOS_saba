import { COMMERCIAL_STATUS } from '@/lib/commercial-onboarding-status';

export interface BusinessProfileReadinessResult {
  ready: boolean;
  missing: string[];
  missing_labels: string[];
  details: {
    logo: boolean;
    nome: boolean;
    descricao: boolean;
    categoria: boolean;
    localizacao: boolean;
    contato: boolean;
  };
  optional_details?: {
    gallery: boolean;
    benefits: boolean;
    social_media: boolean;
    website: boolean;
  };
  completion_percentage: number;
}

export interface BusinessProfileAttributes {
  name?: string | null;
  legal_name?: string | null;
  description?: string | null;
  category?: string | null;
  category_id?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  logo_url?: string | null;
  website?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  gallery_count?: number;
  benefits_count?: number;
}

/**
 * 6.4C: Avalia a completude do perfil operacional do anúncio.
 * Retorna os itens obrigatórios pendentes e se o perfil está apto a avançar
 * para 'pronto_para_publicar'.
 */
export function evaluateBusinessProfileReadiness(
  business: BusinessProfileAttributes
): BusinessProfileReadinessResult {
  const hasLogo = Boolean(business.logo_url && business.logo_url.trim().length > 0);
  const hasName = Boolean((business.name?.trim() || business.legal_name?.trim()) && (business.name || business.legal_name)!.trim().length >= 2);
  const hasDescription = Boolean(business.description && business.description.trim().length >= 10);
  const hasCategory = Boolean(business.category_id || (business.category && business.category.trim().length > 0 && business.category !== 'Geral'));
  const hasLocation = Boolean(business.city && business.city.trim().length >= 2 && business.state && business.state.trim().length >= 2);
  const hasContact = Boolean(
    (business.phone && business.phone.replace(/\D/g, '').length >= 10) ||
    (business.whatsapp && business.whatsapp.replace(/\D/g, '').length >= 10)
  );

  const missing: string[] = [];
  const missing_labels: string[] = [];

  if (!hasLogo) {
    missing.push('logo');
    missing_labels.push('Logo / Imagem Principal');
  }
  if (!hasName) {
    missing.push('nome');
    missing_labels.push('Nome Fantasia');
  }
  if (!hasDescription) {
    missing.push('descricao');
    missing_labels.push('Descrição Institucional');
  }
  if (!hasCategory) {
    missing.push('categoria');
    missing_labels.push('Categoria de Atuação');
  }
  if (!hasLocation) {
    missing.push('localizacao');
    missing_labels.push('Cidade / UF');
  }
  if (!hasContact) {
    missing.push('contato');
    missing_labels.push('Telefone ou WhatsApp');
  }

  const mandatoryChecks = [hasLogo, hasName, hasDescription, hasCategory, hasLocation, hasContact];
  const passedCount = mandatoryChecks.filter(Boolean).length;
  const completion_percentage = Math.round((passedCount / mandatoryChecks.length) * 100);

  const hasGallery = (business.gallery_count || 0) > 0;
  const hasBenefits = (business.benefits_count || 0) > 0;
  const hasSocial = Boolean(business.instagram || business.facebook);
  const hasWebsite = Boolean(business.website);

  return {
    ready: missing.length === 0,
    missing,
    missing_labels,
    details: {
      logo: hasLogo,
      nome: hasName,
      descricao: hasDescription,
      categoria: hasCategory,
      localizacao: hasLocation,
      contato: hasContact,
    },
    optional_details: {
      gallery: hasGallery,
      benefits: hasBenefits,
      social_media: hasSocial,
      website: hasWebsite,
    },
    completion_percentage,
  };
}

export interface PublicationGateValidationResult {
  canPublish: boolean;
  missing: string[];
  reasons: {
    masonicLinkVerified: boolean;
    contractSigned: boolean;
    paymentConfirmed: boolean;
    commercialStatusReady: boolean;
    profileReady: boolean;
  };
  readiness?: BusinessProfileReadinessResult;
}

/**
 * Fase 7: Validador puro do Gate Final de Publicação.
 * Recalcula todas as condições mandatórias de governança:
 * - Vínculo maçônico verificado
 * - Contrato assinado formalmente
 * - Pagamento comercial confirmado
 * - Status comercial em 'pronto_para_publicar' (ou 'publicado' para republicação)
 * - Perfil operacional obrigatório 100% completo
 */
export function validateBusinessPublicationGate(params: {
  commercial_status: string;
  masonic_validation_status?: string | null;
  has_verified_masonic_link?: boolean;
  has_signed_contract: boolean;
  has_confirmed_payment: boolean;
  profile: BusinessProfileAttributes;
}): PublicationGateValidationResult {
  const missing: string[] = [];

  const masonicLinkVerified = Boolean(
    params.masonic_validation_status === 'verified' || params.has_verified_masonic_link
  );
  if (!masonicLinkVerified) {
    missing.push('Vínculo maçônico não verificado');
  }

  const contractSigned = Boolean(params.has_signed_contract);
  if (!contractSigned) {
    missing.push('Contrato de adesão não assinado');
  }

  const paymentConfirmed = Boolean(params.has_confirmed_payment);
  if (!paymentConfirmed) {
    missing.push('Pagamento comercial não confirmado');
  }

  const commercialStatusReady = Boolean(
    params.commercial_status === COMMERCIAL_STATUS.PRONTO_PARA_PUBLICAR ||
    params.commercial_status === COMMERCIAL_STATUS.PUBLICADO
  );
  if (!commercialStatusReady) {
    missing.push(`Status comercial incompatível (${params.commercial_status}). Requer 'pronto_para_publicar'.`);
  }

  const readiness = evaluateBusinessProfileReadiness(params.profile);
  const profileReady = readiness.ready;
  if (!profileReady) {
    missing.push(`Perfil obrigatório incompleto (faltam: ${readiness.missing_labels.join(', ')})`);
  }

  return {
    canPublish: missing.length === 0,
    missing,
    reasons: {
      masonicLinkVerified,
      contractSigned,
      paymentConfirmed,
      commercialStatusReady,
      profileReady,
    },
    readiness,
  };
}
