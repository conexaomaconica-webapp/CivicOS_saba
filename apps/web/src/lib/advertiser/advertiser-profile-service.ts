'use server';

import { revalidatePath } from 'next/cache';
import { findAdvertiserBusiness } from '@/lib/advertiser/advertiser-access';
import { geocodeBrazilianAddress } from '@/lib/geo/geocode';
import { createServerSideClient } from '@/lib/supabase/server';
import { resolveBusinessMedia, resolveLogoUrl, resolveCoverUrl } from '@/lib/business/business-media-helpers';
import { getCanonicalDefaultLimit } from '@/lib/billing/plans-service';
import { submitBusinessChangeRequest } from '@/lib/advertiser/change-requests';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import {
  CONTACT_TYPES,
  PROFILE_FIELD_LABEL,
  normalizeContactValue,
  splitProfileChanges,
  type ContactType,
} from '@/lib/advertiser/review-policy';
import { getAdvertiserFeaturesAction } from '@/lib/advertiser/advertiser-entitlements';

function safeRevalidatePath(path: string, type?: 'page' | 'layout') {
  try {
    if (type) {
      revalidatePath(path, type);
    } else {
      revalidatePath(path);
    }
  } catch {
    // Ignorado de forma segura em ambiente de teste Vitest
  }
}

export interface AdvertiserProfileFields {
  business_id?: string;
  name?: string;
  legal_name?: string;
  document_number?: string;
  category?: string;
  description?: string;
  phone?: string;
  whatsapp?: string;
  public_email?: string;
  website?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  youtube?: string;
  /** Horário por dia da semana (0 = domingo). Dia sem horário e não fechado não é gravado. */
  hours?: AdvertiserHourRow[];
}

export interface AdvertiserHourRow {
  day_of_week: number;
  is_closed: boolean;
  open_time: string;
  close_time: string;
}

export interface AdvertiserMediaItem {
  id: string;
  url: string;
  title?: string;
  display_order: number;
}

export interface AdvertiserProfileDTO {
  business: {
    id: string;
    name: string;
    slug: string;
    legal_name?: string;
    document_number?: string;
    category: string;
    description?: string;
    phone?: string;
    whatsapp?: string;
    public_email?: string;
    website?: string;
    street?: string;
    number?: string;
    neighborhood?: string;
    city: string;
    state: string;
    zip_code?: string;
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    youtube?: string;
    hours: AdvertiserHourRow[];
    logo_url?: string;
    cover_url?: string;
    completeness_percent: number;
    missing_fields: Array<{ fieldKey: string; label: string; action_url: string }>;
  };
  quotas: {
    photos_used: number;
    photos_limit: number;
    videos_limit: number;
  };
  gallery_photos: AdvertiserMediaItem[];
  business_video?: AdvertiserMediaItem;
}

export async function getAdvertiserProfileDataAction(): Promise<AdvertiserProfileDTO> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();

    let b: any = null;

    if (userRes?.user) {
      const userBiz = await findAdvertiserBusiness(supabase, userRes.user.id);
      b = userBiz;
    }

    if (!userRes?.user || !b) throw new Error('Empresa do anunciante não localizada.');

    const businessId = b.id;
    // A empresa já foi confirmada como sendo do usuário logado (dono ou equipe). A leitura do que o Guia mostra dela
    // (mídias, contatos, horário, endereço) usa a chave de serviço, para não depender de políticas por tabela que
    // escondiam conteúdo de donos sem vínculo em business_members (a tela mostrava capa/contatos diferentes do publicado).
    const reader: any = createServiceRoleClient() ?? supabase;

    // Resolver mídia via helper centralizado (fonte canônica: business_media)
    const media = await resolveBusinessMedia(reader, businessId, { logoUrl: b?.logo_url });
    const resolvedLogoUrl = resolveLogoUrl(media.logo_url);
    const resolvedCoverUrl = resolveCoverUrl(media.cover_url);

    // Galeria real do banco (NÃO gerar placeholders)
    const realGallery = media.gallery.map((m, idx) => ({
      id: m.id,
      url: m.url,
      title: m.title || `Foto ${idx + 1}`,
      display_order: m.display_order,
    }));
    let videoRow: AdvertiserMediaItem | null = null;
    let videosLimit = getCanonicalDefaultLimit(b?.plan_code || b?.plan_tier || 'bronze', 'business_video_limit');
    try {
      const videoResult = await reader.from('business_media').select('id, url, title, display_order').eq('business_id', businessId).eq('media_type', 'video').maybeSingle();
      videoRow = videoResult.data || null;
      const entitlementResult = await (supabase as any).from('plan_entitlements').select('max_limit').eq('tenant_id', b?.tenant_id).eq('plan_code', b?.plan_code || b?.plan_tier || 'bronze').eq('feature_code', 'business_video_limit').maybeSingle();
      videosLimit = entitlementResult.data?.max_limit ?? videosLimit;
    } catch {
      // Compatibilidade com ambientes legados/mocks sem a nova consulta; usa o limite canônico.
    }

    // Contatos e horário reais: é daqui que o Guia lê (business_contacts e business_hours), não das colunas antigas.
    const [{ data: contactRows }, { data: hourRows }, features] = await Promise.all([
      reader.from('business_contacts').select('type, value').eq('business_id', businessId),
      reader.from('business_hours').select('day_of_week, open_time, close_time, is_closed').eq('business_id', businessId),
      getAdvertiserFeaturesAction(),
    ]);
    const contacts: Record<string, string> = {};
    (contactRows || []).forEach((row: any) => {
      if (!contacts[row.type]) contacts[row.type] = String(row.value ?? '');
    });
    const hours: AdvertiserHourRow[] = Array.from({ length: 7 }, (_, day) => {
      const row = (hourRows || []).find((h: any) => h.day_of_week === day);
      return {
        day_of_week: day,
        is_closed: row?.is_closed === true,
        open_time: row?.open_time ? String(row.open_time).slice(0, 5) : '',
        close_time: row?.close_time ? String(row.close_time).slice(0, 5) : '',
      };
    });
    const hasHours = (hourRows || []).length > 0;
    const photosLimit = features?.limits.photos ?? 0;

    const missing_fields = [];
    if (resolvedCoverUrl === '/capa-padrao.jpg') missing_fields.push({ fieldKey: 'cover', label: 'Imagem de capa corporativa', action_url: '/anunciante/empresa/midias' });
    if (!hasHours) missing_fields.push({ fieldKey: 'hours', label: 'Horário de funcionamento comercial', action_url: '/anunciante/empresa#funcionamento' });
    if (photosLimit > 0 && realGallery.length < photosLimit) missing_fields.push({ fieldKey: 'gallery', label: 'Adicionar mais fotos na galeria', action_url: '/anunciante/empresa/midias' });

    // Endereço público: vem de business_locations (o que o Guia exibe), não de colunas legadas de businesses.
    const { data: locationRows } = await reader
      .from('business_locations')
      .select('street, number, neighborhood, city, state, postal_code, is_headquarters')
      .eq('business_id', businessId);
    const loc = (locationRows || []).find((l: any) => l.is_headquarters === true) || (locationRows || [])[0];

    return {
      business: {
        id: businessId,
        name: b?.name || '',
        slug: b?.slug || '',
        legal_name: b?.legal_name ?? '',
        document_number: b?.cnpj_cpf ?? b?.cnpj ?? '',
        category: b?.category ?? '',
        description: b?.description ?? '',
        phone: contacts.phone ?? b?.phone ?? '',
        whatsapp: contacts.whatsapp ?? '',
        public_email: contacts.email ?? b?.email ?? '',
        website: contacts.website ?? b?.website ?? '',
        instagram: contacts.instagram ?? '',
        facebook: contacts.facebook ?? '',
        linkedin: contacts.linkedin ?? '',
        youtube: contacts.youtube ?? '',
        street: loc?.street ?? b?.street ?? '',
        number: loc?.number ?? b?.number ?? '',
        neighborhood: loc?.neighborhood ?? b?.neighborhood ?? '',
        city: loc?.city ?? b?.city ?? '',
        state: loc?.state ?? b?.state ?? '',
        zip_code: (loc?.postal_code && loc.postal_code !== '00000-000' ? loc.postal_code : b?.zip_code) ?? '',
        hours,
        logo_url: resolvedLogoUrl,
        cover_url: resolvedCoverUrl,
        completeness_percent: Math.max(0, 100 - missing_fields.length * 14),
        missing_fields,
      },
      quotas: {
        photos_used: realGallery.length,
        photos_limit: photosLimit,
        videos_limit: features?.limits.videos ?? videosLimit,
      },
      gallery_photos: realGallery,
      business_video: videoRow || undefined,
    };
  } catch (err: any) {
    console.error('Erro ao carregar perfil do anunciante:', err);
    return {
      business: {
        id: '',
        name: '',
        slug: '',
        legal_name: '',
        document_number: '',
        category: '',
        description: '',
        phone: '',
        whatsapp: '',
        public_email: '',
        website: '',
        street: '',
        number: '',
        neighborhood: '',
        city: '',
        state: '',
        zip_code: '',
        instagram: '',
        facebook: '',
        linkedin: '',
        youtube: '',
        hours: [],
        logo_url: '/logoconexao_red_vert.png',
        cover_url: '/capa-padrao.jpg',
        completeness_percent: 0,
        missing_fields: [],
      },
      quotas: {
        photos_used: 0,
        photos_limit: 10,
        videos_limit: 0,
      },
      gallery_photos: [],
    };
  }
}

/**
 * Grava o endereço principal da empresa em business_locations (o que o Guia lê) com cidade/UF canônicas.
 * Localiza no mapa quando a empresa ainda não tem coordenadas ou o endereço mudou (endereço -> rua -> CEP -> cidade).
 */
async function saveBusinessLocation(
  supabase: any,
  business: { id: string; tenant_id: string },
  fields: AdvertiserProfileFields
): Promise<{ ok: true; changed: boolean } | { ok: false; message: string }> {
  const uf = String(fields.state ?? '').trim().toUpperCase();
  const cityName = String(fields.city ?? '').trim();
  if (!/^[A-Z]{2}$/.test(uf) || !cityName) {
    return { ok: false, message: 'Selecione o estado e a cidade na lista para salvar o endereço.' };
  }

  const { data: stateRow } = await supabase.from('brazilian_states').select('ibge_code').eq('uf', uf).maybeSingle();
  const { data: cityRow } = stateRow
    ? await supabase.from('brazilian_cities').select('ibge_code, name').eq('state_ibge_code', stateRow.ibge_code).eq('name', cityName).maybeSingle()
    : { data: null };
  if (!stateRow || !cityRow) {
    return { ok: false, message: 'Selecione uma cidade da lista para o estado escolhido.' };
  }

  const { data: locs } = await supabase
    .from('business_locations')
    .select('id, is_headquarters, latitude, longitude, street, number, neighborhood, city, state, postal_code')
    .eq('business_id', business.id);
  const primary = (locs || []).find((l: any) => l.is_headquarters === true) || (locs || [])[0];

  const zipInput = String(fields.zip_code ?? '').trim();
  const postal = /^\d{5}-?\d{3}$/.test(zipInput) ? zipInput : primary?.postal_code || '00000-000';
  const next = {
    street: String(fields.street ?? '').trim() || primary?.street || 'Endereço não informado',
    number: String(fields.number ?? '').trim() || null,
    neighborhood: String(fields.neighborhood ?? '').trim() || null,
    city: cityRow.name as string,
    city_ibge_code: cityRow.ibge_code as number,
    state: uf,
    postal_code: postal,
  };

  const hadCoordinates = primary?.latitude != null && primary?.longitude != null;
  const changed =
    !primary ||
    primary.street !== next.street || (primary.number ?? null) !== next.number || (primary.neighborhood ?? null) !== next.neighborhood ||
    primary.city !== next.city || primary.state !== next.state || primary.postal_code !== next.postal_code;

  let coordinates: { latitude: number; longitude: number } | null = null;
  if (!hadCoordinates || changed) {
    const located = await geocodeBrazilianAddress({
      street: next.street,
      number: next.number,
      neighborhood: next.neighborhood,
      city: next.city,
      state: next.state,
      postalCode: next.postal_code,
    });
    if (located) coordinates = { latitude: located.latitude, longitude: located.longitude };
  }

  if (primary) {
    const { error } = await supabase
      .from('business_locations')
      .update({ ...next, ...(coordinates || {}), updated_at: new Date().toISOString() })
      .eq('id', primary.id);
    if (error) return { ok: false, message: `Os dados da empresa foram salvos, mas não foi possível salvar o endereço: ${error.message}` };
  } else {
    const { error } = await supabase.from('business_locations').insert({
      tenant_id: business.tenant_id,
      business_id: business.id,
      ...next,
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
      is_headquarters: true,
    });
    if (error) return { ok: false, message: `Os dados da empresa foram salvos, mas não foi possível cadastrar o endereço: ${error.message}` };
  }
  return { ok: true, changed: changed || !hadCoordinates };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Grava contatos em business_contacts (o que o Guia lê). Devolve se algo mudou. */
async function saveBusinessContacts(
  supabase: any,
  business: { id: string; tenant_id: string },
  fields: AdvertiserProfileFields
): Promise<{ ok: true; changed: boolean } | { ok: false; message: string }> {
  const incoming: Partial<Record<ContactType, string | undefined>> = {
    whatsapp: fields.whatsapp,
    phone: fields.phone,
    email: fields.public_email,
    website: fields.website,
    instagram: fields.instagram,
    facebook: fields.facebook,
    linkedin: fields.linkedin,
    youtube: fields.youtube,
  };

  const { data: currentRows } = await supabase.from('business_contacts').select('type, value').eq('business_id', business.id);
  const current: Record<string, string> = {};
  (currentRows || []).forEach((row: any) => {
    if (!(row.type in current)) current[row.type] = String(row.value ?? '');
  });

  let changed = false;
  for (const type of CONTACT_TYPES) {
    const raw = incoming[type];
    if (raw === undefined) continue;
    const next = normalizeContactValue(type, raw);
    if (type === 'email' && next && !EMAIL_RE.test(next)) return { ok: false, message: 'Informe um e-mail de contato válido.' };
    if ((current[type] ?? '') === next) continue;

    const { error: deleteError } = await supabase.from('business_contacts').delete().eq('business_id', business.id).eq('type', type);
    if (deleteError) return { ok: false, message: `Não foi possível salvar os contatos: ${deleteError.message}` };
    if (next) {
      const { error: insertError } = await supabase.from('business_contacts').insert({
        tenant_id: business.tenant_id,
        business_id: business.id,
        type,
        value: next,
        is_public: true,
      });
      if (insertError) return { ok: false, message: `Não foi possível salvar os contatos: ${insertError.message}` };
    }
    changed = true;
  }
  return { ok: true, changed };
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Grava o horário por dia em business_hours. Devolve se algo mudou. */
async function saveBusinessHours(
  supabase: any,
  business: { id: string; tenant_id: string },
  hours: AdvertiserHourRow[]
): Promise<{ ok: true; changed: boolean } | { ok: false; message: string }> {
  const { data: currentRows } = await supabase
    .from('business_hours')
    .select('day_of_week, open_time, close_time, is_closed')
    .eq('business_id', business.id);
  const current = new Map<number, any>((currentRows || []).map((r: any) => [r.day_of_week, r]));
  const slice = (t: unknown) => (t ? String(t).slice(0, 5) : '');

  let changed = false;
  for (const row of hours) {
    if (!Number.isInteger(row.day_of_week) || row.day_of_week < 0 || row.day_of_week > 6) continue;
    const existing = current.get(row.day_of_week);

    if (row.is_closed) {
      if (existing?.is_closed === true) continue;
      const { error } = await supabase.from('business_hours').upsert(
        { tenant_id: business.tenant_id, business_id: business.id, day_of_week: row.day_of_week, is_closed: true, open_time: null, close_time: null },
        { onConflict: 'business_id,day_of_week' }
      );
      if (error) return { ok: false, message: `Não foi possível salvar o horário: ${error.message}` };
      changed = true;
      continue;
    }

    const hasTimes = Boolean(row.open_time) && Boolean(row.close_time);
    if (!hasTimes) {
      // Sem horário e não fechado: o dia fica sem informação (remove o que existia).
      if (existing) {
        const { error } = await supabase.from('business_hours').delete().eq('business_id', business.id).eq('day_of_week', row.day_of_week);
        if (error) return { ok: false, message: `Não foi possível salvar o horário: ${error.message}` };
        changed = true;
      }
      continue;
    }
    if (!TIME_RE.test(row.open_time) || !TIME_RE.test(row.close_time)) return { ok: false, message: 'Informe horários válidos (ex.: 08:00 às 18:00).' };
    if (row.open_time >= row.close_time) return { ok: false, message: 'O horário de abertura deve ser anterior ao de fechamento.' };
    if (existing && !existing.is_closed && slice(existing.open_time) === row.open_time && slice(existing.close_time) === row.close_time) continue;

    const { error } = await supabase.from('business_hours').upsert(
      { tenant_id: business.tenant_id, business_id: business.id, day_of_week: row.day_of_week, is_closed: false, open_time: row.open_time, close_time: row.close_time },
      { onConflict: 'business_id,day_of_week' }
    );
    if (error) return { ok: false, message: `Não foi possível salvar o horário: ${error.message}` };
    changed = true;
  }
  return { ok: true, changed };
}

/**
 * Salva o perfil da empresa. Identidade (nome, razão social, CNPJ/CPF, categoria, descrição) vai para validação da
 * plataforma e a versão atual continua no ar; contatos, horário e endereço publicam na hora.
 */
export async function updateAdvertiserProfileFieldsAction(
  fields: AdvertiserProfileFields
): Promise<{ success: boolean; message: string; requiresReview?: boolean; published?: string[]; inReview?: string[] }> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();

    if (!userRes?.user) return { success: false, message: 'Sessão inválida.', requiresReview: false };
    const business = await findAdvertiserBusiness(supabase, userRes.user.id);
    if (!business?.id || (fields.business_id && fields.business_id !== business.id)) {
      return { success: false, message: 'Empresa do anunciante não localizada.', requiresReview: false };
    }
    const target = { id: business.id as string, tenant_id: business.tenant_id as string };
    // Empresa já confirmada como do usuário: contatos, horário e endereço são gravados com a chave de serviço,
    // sem depender de políticas por tabela que bloqueavam donos sem vínculo em business_members.
    const writer: any = createServiceRoleClient() ?? supabase;

    const published: string[] = [];
    const inReview: string[] = [];

    // 1) Identidade: só o que realmente mudou vai para análise.
    const { review, previous } = splitProfileChanges(
      {
        name: business.name,
        legal_name: business.legal_name,
        document_number: business.cnpj_cpf || business.cnpj,
        category: business.category,
        description: business.description,
      },
      {
        name: fields.name,
        legal_name: fields.legal_name,
        document_number: fields.document_number,
        category: fields.category,
        description: fields.description,
      }
    );
    if (review.name !== undefined && review.name.length < 2) {
      return { success: false, message: 'Informe o nome da empresa.', requiresReview: false };
    }
    if (Object.keys(review).length > 0) {
      const submitted = await submitBusinessChangeRequest(supabase, {
        businessId: target.id,
        entityType: 'profile',
        action: 'update',
        payload: review,
        previous,
      });
      if (!submitted.ok) return { success: false, message: submitted.message, requiresReview: false };
      (Object.keys(review) as Array<keyof typeof review>).forEach((key) => inReview.push(PROFILE_FIELD_LABEL[key]));
    }

    // 2) Contatos (publica na hora).
    const contactsResult = await saveBusinessContacts(writer, target, fields);
    if (!contactsResult.ok) return { success: false, message: contactsResult.message, requiresReview: false };
    if (contactsResult.changed) {
      published.push('Contatos');
      // Espelho nas colunas antigas de businesses (telas e relatórios internos ainda leem delas).
      const legacy: Record<string, string | null> = {};
      if (fields.phone !== undefined) legacy.phone = fields.phone.trim() || null;
      if (fields.public_email !== undefined) legacy.email = fields.public_email.trim().toLowerCase() || null;
      if (fields.website !== undefined) legacy.website = normalizeContactValue('website', fields.website) || null;
      if (Object.keys(legacy).length > 0) {
        await writer.from('businesses').update({ ...legacy, updated_at: new Date().toISOString() }).eq('id', target.id);
      }
    }

    // 3) Horário (publica na hora).
    if (fields.hours) {
      const hoursResult = await saveBusinessHours(writer, target, fields.hours);
      if (!hoursResult.ok) return { success: false, message: hoursResult.message, requiresReview: false };
      if (hoursResult.changed) published.push('Horário de funcionamento');
    }

    // 4) Endereço (publica na hora; localiza no mapa).
    if (fields.city || fields.state) {
      const locationResult = await saveBusinessLocation(writer, target, fields);
      if (!locationResult.ok) return { success: false, requiresReview: false, message: locationResult.message };
      if (locationResult.changed) published.push('Endereço');
    }

    safeRevalidatePath('/anunciante/empresa');
    safeRevalidatePath('/anunciante');
    safeRevalidatePath('/guia', 'layout');

    if (published.length === 0 && inReview.length === 0) {
      return { success: true, requiresReview: false, published, inReview, message: 'Nenhuma alteração para salvar.' };
    }
    const parts: string[] = [];
    if (published.length > 0) parts.push(`Publicado no Guia: ${published.join(', ')}.`);
    if (inReview.length > 0) parts.push(`Enviado para validação da plataforma: ${inReview.join(', ')}. A versão atual continua no ar até a aprovação.`);
    return { success: true, requiresReview: inReview.length > 0, published, inReview, message: parts.join(' ') };
  } catch (err: any) {
    console.error('Exceção ao salvar dados do anunciante:', err);
    return {
      success: false,
      requiresReview: false,
      message: `Erro ao processar alteração: ${err.message || 'Erro desconhecido'}`,
    };
  }
}

function validateImageMagicBytes(buffer: Uint8Array): boolean {
  if (!buffer || buffer.length < 4) return false;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true;
  // WebP/RIFF: 52 49 46 46
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) return true;
  // GIF: 47 49 46 38
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return true;
  return false;
}

function isValidPublicVideoUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

const IN_REVIEW_NOTE = 'A versão atual continua no ar até a aprovação.';

const RLS_ERROR = /row-level security|violates|not authorized|permission denied/i;

/**
 * Envia um arquivo ao bucket business-assets. Tenta com a sessão do usuário; se a política de armazenamento recusar,
 * repete com a chave de serviço (a ação já confirmou, antes, que o usuário é dono/equipe desta empresa e o caminho é
 * montado aqui, nunca vindo do navegador).
 */
async function uploadBusinessAsset(supabase: any, path: string, body: Buffer, contentType: string): Promise<{ message: string } | null> {
  const first = await supabase.storage.from('business-assets').upload(path, body, { contentType, upsert: true });
  if (!first.error) return null;
  if (!RLS_ERROR.test(String(first.error.message))) return first.error;
  const admin = createServiceRoleClient();
  if (!admin) return first.error;
  const second = await admin.storage.from('business-assets').upload(path, body, { contentType, upsert: true });
  return second.error ?? null;
}

async function removeBusinessAsset(supabase: any, path: string): Promise<void> {
  try {
    const first = await supabase.storage.from('business-assets').remove([path]);
    if (!first.error) return;
    await createServiceRoleClient()?.storage.from('business-assets').remove([path]);
  } catch {
    // limpeza de arquivo órfão: falha não bloqueia a resposta
  }
}

/** Empresa do usuário logado (dono ou equipe), conferindo que é a empresa informada. */
async function resolveOwnBusiness(supabase: any, businessId: string): Promise<any | null> {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user || !businessId) return null;
  const business = await findAdvertiserBusiness(supabase, userRes.user.id);
  return business && business.id === businessId ? business : null;
}

/** Fotos da galeria já publicadas + as que aguardam validação (para a cota do plano). */
async function countGalleryIncludingPending(supabase: any, businessId: string): Promise<number> {
  const [{ count: published }, { count: pending }] = await Promise.all([
    supabase.from('business_media').select('id', { count: 'exact', head: true }).eq('business_id', businessId).eq('media_type', 'image').gt('display_order', 0),
    supabase.from('business_change_requests').select('id', { count: 'exact', head: true }).eq('business_id', businessId).eq('entity_type', 'gallery').eq('status', 'pending'),
  ]);
  return (published ?? 0) + (pending ?? 0);
}

export async function uploadAdvertiserAssetAction(formData: FormData): Promise<{
  success: boolean;
  message: string;
  url?: string;
  newMediaList?: AdvertiserMediaItem[];
  inReview?: boolean;
}> {
  try {
    const file = formData.get('file') as File | null;
    const businessId = (formData.get('businessId') as string) || '';
    const assetType = (formData.get('assetType') as 'logo' | 'cover' | 'gallery' | 'avatar') || 'gallery';
    const title = (formData.get('title') as string) || null;

    if (!file) {
      return { success: false, message: 'Nenhum arquivo enviado.' };
    }

    if (file.size > 5 * 1024 * 1024) {
      return { success: false, message: 'O arquivo excede o limite máximo permitido de 5MB.' };
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    if (!validateImageMagicBytes(uint8Array)) {
      return {
        success: false,
        message: 'Arquivo inválido ou corrompido. Envie uma imagem real (JPG, PNG ou WebP).',
      };
    }

    const supabase = await createServerSideClient();
    const bizRecord = await resolveOwnBusiness(supabase, businessId);
    if (!bizRecord) return { success: false, message: 'Empresa do anunciante não localizada.' };

    const tenantId = bizRecord.tenant_id;

    // Cota da galeria antes de gastar armazenamento (inclui as fotos que já aguardam validação).
    if (assetType === 'gallery') {
      const features = await getAdvertiserFeaturesAction();
      const limit = features?.limits.photos ?? 0;
      const used = await countGalleryIncludingPending(supabase, businessId);
      if (used >= limit) {
        return { success: false, message: `Você atingiu o limite de ${limit} fotos da galeria do seu plano.` };
      }
    }

    const timestamp = Date.now();
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${tenantId}/${businessId}/${assetType}/${timestamp}-${safeFilename}`;

    // Upload real para o bucket business-assets no Supabase Storage
    const storageError = await uploadBusinessAsset(supabase, storagePath, Buffer.from(arrayBuffer), file.type || 'image/webp');

    if (storageError) {
      console.error('Erro no upload para Storage:', storageError.message);
      return { success: false, message: `Erro ao enviar arquivo para o Storage: ${storageError.message}` };
    }

    // Obter URL pública real do Supabase
    const { data: publicUrlData } = (supabase.storage as any)
      .from('business-assets')
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData?.publicUrl;
    if (!publicUrl) {
      return { success: false, message: 'Erro: não foi possível obter URL pública do arquivo enviado.' };
    }

    // Foto do empresário / responsável (isolada da logomarca): publica na hora.
    if (assetType === 'avatar') {
      try {
        await (supabase as any)
          .from('business_responsibles')
          .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
          .eq('business_id', businessId);
      } catch (_e) {}

      safeRevalidatePath(`/admin/empresas/${businessId}`);
      safeRevalidatePath('/admin/empresas');

      return { success: true, message: 'Foto do empresário atualizada e salva com sucesso no Storage.', url: publicUrl };
    }

    // Logo, capa e galeria: o arquivo já está no armazenamento, mas só entra no Guia depois da validação da plataforma.
    let previousUrl: string | null = null;
    if (assetType === 'logo') previousUrl = bizRecord.logo_url ?? null;
    if (assetType === 'cover') {
      const { data: coverRow } = await (supabase as any)
        .from('business_media')
        .select('url')
        .eq('business_id', businessId)
        .eq('media_type', 'image')
        .eq('display_order', 0)
        .maybeSingle();
      previousUrl = coverRow?.url ?? null;
    }

    const submitted = await submitBusinessChangeRequest(supabase, {
      businessId,
      entityType: assetType,
      action: assetType === 'gallery' ? 'create' : 'update',
      payload: { url: publicUrl, ...(assetType === 'gallery' ? { title: title || 'Foto da galeria' } : {}) },
      previous: previousUrl ? { url: previousUrl } : null,
    });
    if (!submitted.ok) {
      // ROLLBACK: remove o arquivo do Storage se o envio para validação falhar (zero órfãos)
      await removeBusinessAsset(supabase, storagePath);
      return { success: false, message: submitted.message };
    }

    safeRevalidatePath('/anunciante/empresa/midias');
    safeRevalidatePath('/anunciante');

    const what = assetType === 'logo' ? 'A nova logomarca' : assetType === 'cover' ? 'A nova imagem de capa' : 'A foto';
    return { success: true, inReview: true, url: publicUrl, message: `${what} foi enviada para validação da plataforma. ${IN_REVIEW_NOTE}` };
  } catch (err: any) {
    console.error('Exceção no upload de mídia do anunciante:', err);
    return { success: false, message: `Falha no upload: ${err.message || 'Erro de conexão'}` };
  }
}

export async function updateAdvertiserMediaAction(
  businessId: string,
  mediaType: 'logo' | 'cover' | 'gallery_add' | 'gallery_delete' | 'gallery_reorder' | 'video_set' | 'video_delete',
  payload: any
): Promise<{ success: boolean; message: string; newMediaList?: AdvertiserMediaItem[]; inReview?: boolean }> {
  try {
    const supabase = await createServerSideClient();
    const business = await resolveOwnBusiness(supabase, businessId);
    if (!business) return { success: false, message: 'Empresa não autorizada.' };

    // Vídeo institucional por link: validação da plataforma antes de publicar.
    if (mediaType === 'video_set' && payload?.url) {
      const url = String(payload.url).trim();
      if (!isValidPublicVideoUrl(url)) return { success: false, message: 'Informe um link público válido iniciado por https://.' };
      const features = await getAdvertiserFeaturesAction();
      if (!features || features.limits.videos < 1) {
        return { success: false, message: 'O vídeo institucional está disponível somente em planos com essa permissão.' };
      }
      const { data: existing } = await (supabase as any).from('business_media').select('url').eq('business_id', businessId).eq('media_type', 'video').maybeSingle();
      const submitted = await submitBusinessChangeRequest(supabase, {
        businessId,
        entityType: 'video',
        action: 'update',
        payload: { url, title: payload.title || 'Vídeo institucional' },
        previous: existing?.url ? { url: existing.url } : null,
      });
      if (!submitted.ok) return { success: false, message: submitted.message };
      safeRevalidatePath('/anunciante/empresa/midias');
      return { success: true, inReview: true, message: `Vídeo institucional enviado para validação da plataforma. ${IN_REVIEW_NOTE}` };
    }

    if (mediaType === 'video_delete') {
      const { error } = await (supabase as any).from('business_media').delete().eq('business_id', businessId).eq('media_type', 'video');
      if (!error) safeRevalidatePath('/guia', 'layout');
      return error ? { success: false, message: error.message } : { success: true, message: 'Vídeo removido.' };
    }

    // Logomarca e capa por URL: validação da plataforma antes de publicar.
    if ((mediaType === 'logo' || mediaType === 'cover') && payload?.url) {
      const submitted = await submitBusinessChangeRequest(supabase, {
        businessId,
        entityType: mediaType,
        action: 'update',
        payload: { url: String(payload.url) },
        previous: mediaType === 'logo' && business.logo_url ? { url: business.logo_url } : null,
      });
      if (!submitted.ok) return { success: false, message: submitted.message };
      safeRevalidatePath('/anunciante/empresa/midias');
      return {
        success: true,
        inReview: true,
        message: `${mediaType === 'logo' ? 'A nova logomarca' : 'A nova imagem de capa'} foi enviada para validação da plataforma. ${IN_REVIEW_NOTE}`,
      };
    }

    if (mediaType === 'gallery_add' && payload?.url) {
      const features = await getAdvertiserFeaturesAction();
      const limit = features?.limits.photos ?? 0;
      const used = await countGalleryIncludingPending(supabase, businessId);
      if (used >= limit) {
        return {
          success: false,
          message: `Você atingiu o limite de ${limit} fotos do seu plano${features ? ` (${features.planName})` : ''}. Conheça outros planos para aumentar sua galeria.`,
        };
      }
      const submitted = await submitBusinessChangeRequest(supabase, {
        businessId,
        entityType: 'gallery',
        action: 'create',
        payload: { url: String(payload.url), title: payload.title || 'Foto da galeria' },
      });
      if (!submitted.ok) return { success: false, message: submitted.message };
      safeRevalidatePath('/anunciante/empresa/midias');
      return { success: true, inReview: true, message: `Foto enviada para validação da plataforma. ${IN_REVIEW_NOTE}` };
    }

    // Reordenar a galeria: publica na hora (só muda a ordem de fotos já aprovadas da própria empresa).
    if (mediaType === 'gallery_reorder' && Array.isArray(payload?.order)) {
      const ids: string[] = payload.order.filter((id: unknown) => typeof id === 'string');
      for (let position = 0; position < ids.length; position += 1) {
        const { error } = await (supabase as any)
          .from('business_media')
          .update({ display_order: position + 1 })
          .eq('id', ids[position])
          .eq('business_id', businessId)
          .eq('media_type', 'image')
          .gt('display_order', 0);
        if (error) throw new Error(error.message);
      }
      safeRevalidatePath('/guia', 'layout');
      return { success: true, message: 'Ordem das fotos atualizada.' };
    }

    // Remover foto: publica na hora (sempre restrito à empresa do usuário).
    if (mediaType === 'gallery_delete' && payload?.photoId) {
      const res = await (supabase as any)
        .from('business_media')
        .delete()
        .eq('id', payload.photoId)
        .eq('business_id', businessId);

      if (res && res.error) throw new Error(res.error.message);

      safeRevalidatePath('/anunciante/empresa/midias');
      safeRevalidatePath('/anunciante/empresa');
      safeRevalidatePath('/guia', 'layout');

      return { success: true, message: 'Foto removida da galeria.' };
    }

    return { success: true, message: 'Alteração salva com sucesso.' };
  } catch (err: any) {
    return { success: false, message: `Erro ao salvar mídia: ${err.message}` };
  }
}
