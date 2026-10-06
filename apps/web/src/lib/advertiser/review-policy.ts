/**
 * Regra de produto: o que o anunciante pode publicar na hora e o que passa por validação da plataforma.
 *
 *  Validação:  nome, razão social, CNPJ/CPF, categoria, descrição (identidade), logo, capa, fotos, vídeo e benefícios.
 *  Publica na hora: contatos (telefone, WhatsApp, e-mail, site, redes), horário, endereço, serviços, eventos e publicações.
 */

export const PROFILE_REVIEW_FIELDS = ['name', 'legal_name', 'document_number', 'category', 'description'] as const;
export type ProfileReviewField = (typeof PROFILE_REVIEW_FIELDS)[number];

export const PROFILE_FIELD_LABEL: Record<ProfileReviewField, string> = {
  name: 'Nome da empresa',
  legal_name: 'Razão social',
  document_number: 'CNPJ/CPF',
  category: 'Categoria',
  description: 'Descrição',
};

export type ChangeEntity = 'profile' | 'logo' | 'cover' | 'gallery' | 'video' | 'benefit' | 'plan';

export const CHANGE_ENTITY_LABEL: Record<ChangeEntity, string> = {
  profile: 'Dados da empresa',
  logo: 'Logomarca',
  cover: 'Imagem de capa',
  gallery: 'Foto da galeria',
  video: 'Vídeo institucional',
  benefit: 'Benefício / oferta',
  plan: 'Mudança de plano',
};

const norm = (value: unknown) => String(value ?? '').trim();
const digits = (value: string) => value.replace(/\D/g, '');

/** Separa o que mudou nos campos que exigem validação. Campos iguais ao atual (ou não enviados) são ignorados. */
export function splitProfileChanges(
  current: Partial<Record<ProfileReviewField, string | null | undefined>>,
  incoming: Partial<Record<ProfileReviewField, string | null | undefined>>
): { review: Partial<Record<ProfileReviewField, string>>; previous: Partial<Record<ProfileReviewField, string>> } {
  const review: Partial<Record<ProfileReviewField, string>> = {};
  const previous: Partial<Record<ProfileReviewField, string>> = {};
  for (const field of PROFILE_REVIEW_FIELDS) {
    if (incoming[field] === undefined) continue;
    const next = norm(incoming[field]);
    const now = norm(current[field]);
    const same = field === 'document_number' ? digits(next) === digits(now) : next === now;
    if (same) continue;
    review[field] = next;
    previous[field] = now;
  }
  return { review, previous };
}

export const CONTACT_TYPES = ['whatsapp', 'phone', 'email', 'website', 'instagram', 'facebook', 'linkedin', 'youtube'] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

/** Normaliza o valor de um contato antes de gravar (site com https://, redes sociais sem espaços). */
export function normalizeContactValue(type: ContactType, raw: string): string {
  const value = norm(raw);
  if (!value) return '';
  if (type === 'website' || type === 'facebook' || type === 'linkedin' || type === 'youtube') {
    return /^https?:\/\//i.test(value) ? value : `https://${value}`;
  }
  if (type === 'instagram') {
    if (/^https?:\/\//i.test(value)) return value;
    return `https://www.instagram.com/${value.replace(/^@/, '')}`;
  }
  if (type === 'email') return value.toLowerCase();
  return value;
}
