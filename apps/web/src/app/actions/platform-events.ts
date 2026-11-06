'use server';

import { createServerSideClient, resolveTenantIdServer } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { checkRateLimit } from '@/lib/security/rate-limiter';
import type { AttendeeType, AttendanceStatus } from '@/types/database-extensions';
import {
  buildCSVContent,
  sanitizeUTMParams,
  classifyEventCategory,
  extractPriceInfo,
} from '@/lib/events/events-service';

// ---------------------------------------------------------------------------
// Shared response type (consistent with platform pattern)
// ---------------------------------------------------------------------------
export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

async function getSupabaseServerOrAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && serviceKey) {
    const { createClient } = await import('@supabase/supabase-js');
    return createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  try {
    return await createServerSideClient();
  } catch (_e) {
    const { createClient } = await import('@supabase/supabase-js');
    const fallbackUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rwvztwsjcjljphqttiws.supabase.co';
    const fallbackKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    return createClient(fallbackUrl, fallbackKey);
  }
}

// ---------------------------------------------------------------------------
// Public-facing types
// ---------------------------------------------------------------------------
export interface PlatformEvent {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  event_date: string;
  start_time: string;
  end_time: string | null;
  timezone: string;
  venue_name: string | null;
  venue_address: string | null;
  city: string | null;
  cover_image_url: string | null;
  header_media_type?: 'logo' | 'banner';
  header_media_size?: 'small' | 'medium' | 'large' | 'full';
  header_media_position?: 'left' | 'center' | 'right';
  badge_text?: string;
  footer_information?: string | null;
  registration_enabled: boolean;
  capacity: number | null;
  status?: string;
}

export interface RSVPInput {
  eventId: string;
  fullName: string;
  whatsapp: string;
  email?: string;
  attendeeType: AttendeeType;
  masonicOrganization?: string;
  companyName?: string;
  city?: string;
  attendanceStatus: AttendanceStatus;
  source?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface RSVPResult {
  registrationId: string;
  confirmationCode: string;
  isNew: boolean;
  fullName: string;
  attendanceStatus: AttendanceStatus;
  checkinToken?: string;
}

export interface AdminEventListItem {
  id: string;
  slug: string;
  title: string;
  event_date: string;
  start_time: string;
  venue_name: string | null;
  city: string | null;
  status: string;
  registration_enabled: boolean;
  capacity: number | null;
  total_registrations: number;
  total_confirmed: number;
  total_declined: number;
  total_checkins: number;
  created_at: string;
}

export interface AdminEventDashboard {
  total_registrations: number;
  total_confirmed: number;
  total_declined: number;
  total_checkins: number;
  by_attendee_type: Record<string, number>;
  by_source: Record<string, number>;
}

export interface AdminRegistrationItem {
  id: string;
  full_name: string;
  whatsapp: string;
  email: string | null;
  attendee_type: string;
  masonic_organization: string | null;
  company_name: string | null;
  city: string | null;
  attendance_status: string;
  confirmation_code: string;
  source: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  checked_in_at: string | null;
  created_at: string;
  total_count: number;
  checkin_token: string;
}

export interface AdminCheckinResult {
  registrationId: string;
  fullName: string;
  confirmationCode: string;
  checkedInAt: string;
  alreadyChecked: boolean;
}

export interface AdminUndoCheckinResult {
  registrationId: string;
  fullName: string;
  confirmationCode: string;
  success: boolean;
}

// ---------------------------------------------------------------------------
// PUBLIC: Buscar evento por slug
// ---------------------------------------------------------------------------
export async function getPlatformEventBySlugAction(
  slug: string
): Promise<ActionResponse<PlatformEvent>> {
  try {
    if (!slug || slug.trim().length === 0) {
      return { success: false, error: 'Slug do evento é obrigatório.' };
    }

    const supabase = await getSupabaseServerOrAdminClient();

    const { data, error } = await supabase.rpc('get_platform_event_by_slug', {
      p_slug: slug.trim().toLowerCase(),
    });

    if (error) {
      console.error('[Events] Erro ao buscar evento:', error);
      return { success: false, error: 'Erro ao carregar o evento.' };
    }

    if (!data || data.length === 0) {
      if (slug.trim().toLowerCase() === 'conexao-empresarial-2026') {
        return {
          success: true,
          data: {
            id: '00000000-0000-0000-0000-000000000112',
            slug: 'conexao-empresarial-2026',
            title: 'Conexão Empresarial da Família Maçônica',
            subtitle: 'Relacionamentos que aproximam! Negócios que fortalecem!',
            description: 'Encontro exclusivo de integração e fortalecimento da rede fraterna de negócios com as palestras "Ninguém prospera sozinho" com Dr. Lucas Almeida (Empresário, Médico e Advogado) e "Síndrome dos Pais Culpados" com Dr. Alfredo Morais (Psicólogo).',
            event_date: '2026-11-24',
            start_time: '19:00:00',
            end_time: '22:00:00',
            timezone: 'America/Bahia',
            venue_name: 'Centro de Convenções de Feira de Santana',
            venue_address: 'Feira de Santana – BA',
            city: 'Feira de Santana',
            cover_image_url: 'https://rwvztwsjcjljphqttiws.supabase.co/storage/v1/object/public/event-assets/banners/conexao-empresarial-2026.png',
            header_media_type: 'banner',
            header_media_size: 'medium',
            header_media_position: 'center',
            badge_text: 'Evento Especial',
            footer_information: 'Traje: Passeio Completo / Confraternização Maçônica.',
            registration_enabled: true,
            capacity: 500,
            status: 'published',
          },
        };
      }
      return { success: false, error: 'Evento não encontrado.' };
    }

    return { success: true, data: data[0] as PlatformEvent };
  } catch (err) {
    console.error('[Events] Exceção ao buscar evento:', err);
    return { success: false, error: 'Erro inesperado ao carregar o evento.' };
  }
}

// ---------------------------------------------------------------------------
// PUBLIC/ADMIN: Buscar evento completo por ID
// ---------------------------------------------------------------------------
export async function getPlatformEventByIdAction(
  eventId: string
): Promise<ActionResponse<PlatformEvent>> {
  try {
    if (!eventId || eventId.trim().length === 0) {
      return { success: false, error: 'ID do evento é obrigatório.' };
    }

    const supabase = await getSupabaseServerOrAdminClient();

    const { data, error } = await supabase
      .from('platform_events')
      .select('*')
      .eq('id', eventId.trim())
      .maybeSingle();

    if (error) {
      console.error('[Events] Erro ao buscar evento por ID:', error);
      return { success: false, error: 'Erro ao carregar o evento.' };
    }

    if (!data) {
      return { success: false, error: 'Evento não encontrado.' };
    }

    return {
      success: true,
      data: {
        id: data.id,
        slug: data.slug,
        title: data.title,
        subtitle: data.subtitle ?? null,
        description: data.description ?? null,
        event_date: data.event_date,
        start_time: data.start_time,
        end_time: data.end_time ?? null,
        timezone: data.timezone || 'America/Bahia',
        venue_name: data.venue_name ?? null,
        venue_address: data.venue_address ?? null,
        city: data.city ?? null,
        cover_image_url: data.cover_image_url ?? null,
        header_media_type: data.header_media_type ?? 'logo',
        header_media_size: data.header_media_size ?? 'medium',
        header_media_position: data.header_media_position ?? 'center',
        badge_text: data.badge_text ?? 'Convite',
        footer_information: data.footer_information ?? null,
        registration_enabled: data.registration_enabled ?? true,
        capacity: data.capacity ?? null,
        status: data.status,
      },
    };
  } catch (err) {
    console.error('[Events] Exceção ao buscar evento por ID:', err);
    return { success: false, error: 'Erro inesperado ao carregar o evento.' };
  }
}

// ---------------------------------------------------------------------------
// PUBLIC: Evento Unificado (Plataforma ou Empresa) com Formato Plano Esquadro
// ---------------------------------------------------------------------------
export interface UnifiedEventDetail {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  timezone: string;
  venue_name: string | null;
  venue_address: string | null;
  city: string | null;
  state: string | null;
  cover_image_url: string | null;
  badge_text: string;
  category_id: string;
  category_label: string;
  category_icon: string;
  organizer_type: 'lodge' | 'social_action' | 'business' | 'platform';
  organizer_name: string | null;
  organizer_slug: string | null;
  organizer_whatsapp: string | null;
  organizer_logo: string | null;
  price_info: string;
  registration_enabled: boolean;
  external_ticket_url: string | null;
  footer_information: string | null;
  capacity: number | null;
  status: string;
  is_past: boolean;
  header_media_type?: 'logo' | 'banner';
  header_media_size?: 'small' | 'medium' | 'large' | 'full';
  header_media_position?: 'left' | 'center' | 'right';
}

export async function getUnifiedEventBySlugOrIdAction(
  slugOrId: string
): Promise<ActionResponse<UnifiedEventDetail>> {
  try {
    const term = (slugOrId || '').trim();
    if (!term) {
      return { success: false, error: 'Identificador do evento não informado.' };
    }

    const supabase = await getSupabaseServerOrAdminClient();
    const todayStr = new Date().toISOString().split('T')[0] ?? '';
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term);

    // 1. Tenta buscar em platform_events por slug ou id
    let pData: any = null;
    let pError: any = null;

    try {
      let platformQuery = (supabase as any)
        .from('platform_events')
        .select('*');

      if (isUuid) {
        platformQuery = platformQuery.or(`slug.eq.${term.toLowerCase()},id.eq.${term}`);
      } else {
        platformQuery = platformQuery.eq('slug', term.toLowerCase());
      }

      const res = await platformQuery.maybeSingle();
      pData = res.data;
      pError = res.error;
    } catch (err) {
      pError = err;
    }

    // Fallback de alta resiliência: se a busca direta falhou (ex.: restrição RLS de perfis)
    // ou não retornou dados, invoca a RPC SECURITY DEFINER pública get_platform_event_by_slug
    if (!pData) {
      try {
        const { data: rpcRows, error: rpcErr } = await (supabase as any)
          .rpc('get_platform_event_by_slug', { p_slug: term.toLowerCase() });
        if (!rpcErr && Array.isArray(rpcRows) && rpcRows.length > 0) {
          pData = rpcRows[0];
          pError = null;
        }
      } catch (_rpcErr) {
        // Silencioso; prossegue para busca em business_events
      }
    }

    if (pData && !pError) {
      const cat = classifyEventCategory(pData.title, pData.badge_text, pData.venue_name);
      const isPast = pData.event_date ? pData.event_date < todayStr : false;
      const badgeLower = (pData.badge_text || '').toLowerCase();
      const orgType: 'lodge' | 'social_action' | 'business' | 'platform' =
        cat.id === 'sociais' || badgeLower.includes('social')
          ? 'social_action'
          : cat.id === 'empresas' || badgeLower.includes('empresa')
          ? 'business'
          : cat.id === 'festividades' || cat.id === 'palestras' || badgeLower.includes('institucional')
          ? 'platform'
          : 'lodge';

      const price = extractPriceInfo(pData.badge_text, pData.subtitle, pData.description, orgType);

      const isLodgeVenue = Boolean(
        pData.venue_name &&
        (pData.venue_name.toLowerCase().includes('loja') ||
         pData.venue_name.toLowerCase().includes('templo') ||
         pData.venue_name.toLowerCase().includes('augusta'))
      );

      const resolvedOrganizerName =
        pData.organizer_name ||
        (orgType === 'platform' || cat.id === 'institucional'
          ? 'Conexão Maçônica'
          : cat.id === 'festividades'
          ? (pData.title?.toLowerCase().includes('16') ? 'Loja Maçônica 16 de Junho' : 'Comissão Organizadora')
          : orgType === 'social_action'
          ? 'Ação Social Fraterna'
          : isLodgeVenue
          ? pData.venue_name
          : (pData.title?.toLowerCase().includes('loja') ? 'Loja Maçônica Responsável' : 'Conexão Maçônica'));

      return {
        success: true,
        data: {
          id: pData.id,
          slug: pData.slug || pData.id,
          title: pData.title,
          subtitle: pData.subtitle ?? null,
          description: pData.description ?? null,
          event_date: pData.event_date,
          start_time: pData.start_time ? pData.start_time.slice(0, 5) : null,
          end_time: pData.end_time ? pData.end_time.slice(0, 5) : null,
          timezone: pData.timezone || 'America/Bahia',
          venue_name: pData.venue_name ?? null,
          venue_address: pData.venue_address ?? null,
          city: pData.city ?? 'Feira de Santana',
          state: 'BA',
          cover_image_url: pData.cover_image_url ?? null,
          header_media_type: pData.header_media_type ?? 'banner',
          header_media_size: pData.header_media_size ?? 'medium',
          header_media_position: pData.header_media_position ?? 'center',
          badge_text: pData.badge_text || (orgType === 'lodge' ? 'Sessão Maçônica' : 'Evento Especial'),
          category_id: cat.id,
          category_label: cat.label,
          category_icon: cat.icon,
          organizer_type: orgType,
          organizer_name: resolvedOrganizerName,
          organizer_slug: null,
          organizer_whatsapp: null,
          organizer_logo: null,
          price_info: price,
          registration_enabled: Boolean(pData.registration_enabled),
          external_ticket_url: null,
          footer_information: pData.footer_information ?? null,
          capacity: pData.capacity ?? null,
          status: pData.status || 'published',
          is_past: isPast,
        },
      };
    }

    // 2. Se não encontrou em platform_events, busca em business_events
    let businessQuery = (supabase as any)
      .from('business_events')
      .select('*, businesses:business_id(id, name, slug, city, state, logo_url, whatsapp, phone)')
      .eq('is_active', true)
      .eq('publication_status', 'published');

    if (isUuid) {
      businessQuery = businessQuery.eq('id', term);
    } else {
      // busca por match em id se for id, ou se tiver coluna slug
      businessQuery = businessQuery.eq('id', term);
    }

    const { data: bData, error: bError } = await businessQuery.maybeSingle();

    if (bData && !bError) {
      const biz = bData.businesses;
      const startsAtDate = bData.starts_at ? bData.starts_at.split('T')[0] : '';
      const startsAtTime = bData.starts_at && bData.starts_at.includes('T') ? bData.starts_at.split('T')[1].slice(0, 5) : null;
      const endsAtTime = bData.ends_at && bData.ends_at.includes('T') ? bData.ends_at.split('T')[1].slice(0, 5) : null;
      const isPast = startsAtDate ? startsAtDate < todayStr : false;

      const cat = classifyEventCategory(bData.title, 'Empresa Parceira', bData.location_name, 'business');
      const price = extractPriceInfo(null, null, bData.description, 'business');

      return {
        success: true,
        data: {
          id: bData.id,
          slug: bData.id,
          title: bData.title,
          subtitle: null,
          description: bData.description ?? null,
          event_date: startsAtDate,
          start_time: startsAtTime,
          end_time: endsAtTime,
          timezone: bData.timezone || 'America/Bahia',
          venue_name: bData.location_name ?? biz?.name ?? null,
          venue_address: bData.address ?? null,
          city: biz?.city ?? 'Feira de Santana',
          state: biz?.state ?? 'BA',
          cover_image_url: bData.cover_image_url ?? null,
          header_media_type: 'banner',
          header_media_size: 'medium',
          header_media_position: 'center',
          badge_text: 'Empresa Parceira',
          category_id: cat.id,
          category_label: cat.label,
          category_icon: cat.icon,
          organizer_type: 'business',
          organizer_name: biz?.name ?? 'Empresa Parceira',
          organizer_slug: biz?.slug ?? null,
          organizer_whatsapp: biz?.whatsapp || biz?.phone || null,
          organizer_logo: biz?.logo_url ?? null,
          price_info: price,
          registration_enabled: false,
          external_ticket_url: bData.external_ticket_url ?? null,
          footer_information: null,
          capacity: null,
          status: bData.publication_status || 'published',
          is_past: isPast,
        },
      };
    }

    if (term.toLowerCase() === 'conexao-empresarial-2026') {
      return {
        success: true,
        data: {
          id: '00000000-0000-0000-0000-000000000112',
          slug: 'conexao-empresarial-2026',
          title: 'Conexão Empresarial da Família Maçônica',
          subtitle: 'Relacionamentos que aproximam! Negócios que fortalecem!',
          description: 'Encontro exclusivo de integração e fortalecimento da rede fraterna de negócios com as palestras "Ninguém prospera sozinho" com Dr. Lucas Almeida (Empresário, Médico e Advogado) e "Síndrome dos Pais Culpados" com Dr. Alfredo Morais (Psicólogo).',
          event_date: '2026-11-24',
          start_time: '19:00',
          end_time: '22:00',
          timezone: 'America/Bahia',
          venue_name: 'Centro de Convenções de Feira de Santana',
          venue_address: 'Feira de Santana – BA',
          city: 'Feira de Santana',
          state: 'BA',
          cover_image_url: 'https://rwvztwsjcjljphqttiws.supabase.co/storage/v1/object/public/event-assets/banners/conexao-empresarial-2026.png',
          header_media_type: 'banner',
          header_media_size: 'medium',
          header_media_position: 'center',
          badge_text: 'Evento Especial',
          category_id: 'palestras',
          category_label: 'Palestras & Negócios',
          category_icon: '💼',
          organizer_type: 'platform',
          organizer_name: 'Conexão Maçônica',
          organizer_slug: null,
          organizer_whatsapp: '75988000000',
          organizer_logo: null,
          price_info: 'Entrada Franca',
          registration_enabled: true,
          external_ticket_url: null,
          footer_information: 'Traje: Passeio Completo / Confraternização Maçônica.',
          capacity: 500,
          status: 'published',
          is_past: false,
        },
      };
    }

    return { success: false, error: 'Evento não encontrado ou não está publicado.' };
  } catch (err) {
    console.error('[Events] Exceção em getUnifiedEventBySlugOrIdAction:', err);
    return { success: false, error: 'Erro inesperado ao carregar o evento.' };
  }
}



// ---------------------------------------------------------------------------
// PUBLIC: Confirmar/atualizar presença (RSVP)
// ---------------------------------------------------------------------------
export async function upsertEventRegistrationAction(
  input: RSVPInput
): Promise<ActionResponse<RSVPResult>> {
  try {
    // Validações básicas no servidor (defesa em profundidade — UI também valida)
    if (!input.fullName || input.fullName.trim().length < 3) {
      return { success: false, error: 'Nome completo deve ter pelo menos 3 caracteres.' };
    }

    const whatsappClean = input.whatsapp.replace(/\D/g, '');
    if (whatsappClean.length < 10) {
      return { success: false, error: 'WhatsApp inválido. Informe DDD + número (mínimo 10 dígitos).' };
    }

    const validAttendeeTypes: AttendeeType[] = ['macom', 'cunhada', 'familiar', 'convidado'];
    if (!validAttendeeTypes.includes(input.attendeeType)) {
      return { success: false, error: 'Tipo de participante inválido.' };
    }

    // Exigir Loja/Potência quando participante for "macom" e ignorar para as demais categorias
    let masonicOrgClean: string | null = null;
    if (input.attendeeType === 'macom') {
      if (!input.masonicOrganization || input.masonicOrganization.trim().length < 2) {
        return { success: false, error: 'Loja / Potência Maçônica é obrigatória para a categoria Maçom.' };
      }
      masonicOrgClean = input.masonicOrganization.trim();
    }

    if (!['confirmed', 'declined'].includes(input.attendanceStatus)) {
      return { success: false, error: 'Status de presença inválido.' };
    }

    const tenantId = await resolveTenantIdServer().catch(() => '00000000-0000-0000-0000-000000000000');

    // Rate limit: 5 tentativas por WhatsApp por minuto
    const rateCheck = await checkRateLimit('rsvp', whatsappClean, tenantId);
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: 'Muitas solicitações recentes. Aguarde um momento e tente novamente.',
      };
    }

    const supabase = await getSupabaseServerOrAdminClient();

    const { data, error } = await supabase.rpc('upsert_event_registration', {
      p_event_id:             input.eventId,
      p_full_name:            input.fullName.trim(),
      p_whatsapp:             whatsappClean,
      p_email:                input.email?.trim().toLowerCase() ?? null,
      p_attendee_type:        input.attendeeType,
      p_masonic_organization: masonicOrgClean,
      p_company_name:         input.companyName?.trim() ?? null,
      p_city:                 input.city?.trim() ?? null,
      p_attendance_status:    input.attendanceStatus,
      p_source:               input.source ?? null,
      p_utm_source:           input.utmSource ?? null,
      p_utm_medium:           input.utmMedium ?? null,
      p_utm_campaign:         input.utmCampaign ?? null,
    });

    if (error) {
      console.error('[RSVP] Erro ao registrar presença:', error);

      // Tratar mensagens específicas do banco de forma amigável
      if (error.message?.includes('encerradas')) {
        return { success: false, error: 'As inscrições para este evento estão encerradas.' };
      }
      if (error.message?.includes('Capacidade máxima')) {
        return { success: false, error: 'As vagas para este evento já foram preenchidas.' };
      }
      if (error.message?.includes('WhatsApp inválido')) {
        return { success: false, error: 'Número de WhatsApp inválido.' };
      }

      return { success: false, error: 'Não foi possível registrar sua presença. Tente novamente.' };
    }

    if (!data || data.length === 0) {
      return { success: false, error: 'Resposta inesperada do servidor.' };
    }

    return {
      success: true,
      data: {
        registrationId:   data[0]!.registration_id,
        confirmationCode: data[0]!.confirmation_code,
        isNew:            data[0]!.is_new,
        fullName:         data[0]!.full_name,
        attendanceStatus: data[0]!.attendance_status as AttendanceStatus,
        checkinToken:     (data[0] as any)?.checkin_token,
      },
    };
  } catch (err) {
    console.error('[RSVP] Exceção ao registrar presença:', err);
    return { success: false, error: 'Erro inesperado. Tente novamente.' };
  }
}

// ---------------------------------------------------------------------------
// ADMIN: Listar eventos
// ---------------------------------------------------------------------------
export async function getAdminEventListAction(): Promise<ActionResponse<AdminEventListItem[]>> {
  try {
    const supabase = await createServerSideClient();

    const { data, error } = await supabase.rpc('admin_list_platform_events');

    if (error) {
      console.error('[Admin/Events] Erro ao listar eventos:', error);
      // Guard RBAC: se o banco retornar 42501 é acesso não autorizado
      if (error.code === '42501') {
        return { success: false, error: 'Acesso não autorizado.' };
      }
      return { success: false, error: 'Erro ao carregar a lista de eventos.' };
    }

    return { success: true, data: (data ?? []) as AdminEventListItem[] };
  } catch (err) {
    console.error('[Admin/Events] Exceção ao listar eventos:', err);
    return { success: false, error: 'Erro inesperado.' };
  }
}

// ---------------------------------------------------------------------------
// ADMIN: Dashboard do evento (métricas + inscrições)
// ---------------------------------------------------------------------------
export async function getAdminEventDashboardAction(
  eventId: string
): Promise<ActionResponse<AdminEventDashboard>> {
  try {
    const supabase = await createServerSideClient();

    const { data, error } = await supabase.rpc('admin_get_event_dashboard', {
      p_event_id: eventId,
    });

    if (error) {
      if (error.code === '42501') {
        return { success: false, error: 'Acesso não autorizado.' };
      }
      return { success: false, error: 'Erro ao carregar o dashboard.' };
    }

    const row = data?.[0];
    if (!row) {
      return {
        success: true,
        data: {
          total_registrations: 0,
          total_confirmed: 0,
          total_declined: 0,
          total_checkins: 0,
          by_attendee_type: {},
          by_source: {},
        },
      };
    }

    return {
      success: true,
      data: {
        total_registrations: row.total_registrations ?? 0,
        total_confirmed:     row.total_confirmed ?? 0,
        total_declined:      row.total_declined ?? 0,
        total_checkins:      row.total_checkins ?? 0,
        by_attendee_type:    (row.by_attendee_type as Record<string, number>) ?? {},
        by_source:           (row.by_source as Record<string, number>) ?? {},
      },
    };
  } catch (err) {
    console.error('[Admin/Events] Exceção ao buscar dashboard:', err);
    return { success: false, error: 'Erro inesperado.' };
  }
}

// ---------------------------------------------------------------------------
// ADMIN: Listar inscrições com filtros
// ---------------------------------------------------------------------------
export async function getAdminEventRegistrationsAction(params: {
  eventId: string;
  search?: string;
  attendanceStatus?: string;
  attendeeType?: string;
  city?: string;
  source?: string;
  limit?: number;
  offset?: number;
  hasCheckin?: boolean;
}): Promise<ActionResponse<{ items: AdminRegistrationItem[]; total: number }>> {
  try {
    const supabase = await createServerSideClient();

    const { data, error } = await supabase.rpc('admin_list_event_registrations', {
      p_event_id:          params.eventId,
      p_search:            params.search?.trim() || null,
      p_attendance_status: params.attendanceStatus ?? null,
      p_attendee_type:     params.attendeeType ?? null,
      p_city:              params.city ?? null,
      p_source:            params.source ?? null,
      p_limit:             params.limit ?? 50,
      p_offset:            params.offset ?? 0,
      p_has_checkin:       params.hasCheckin ?? null,
    });

    if (error) {
      if (error.code === '42501') {
        return { success: false, error: 'Acesso não autorizado.' };
      }
      return { success: false, error: 'Erro ao carregar a lista de participantes.' };
    }

    const items = (data ?? []) as AdminRegistrationItem[];
    const total = items[0]?.total_count ?? 0;

    return { success: true, data: { items, total } };
  } catch (err) {
    console.error('[Admin/Events] Exceção ao listar inscrições:', err);
    return { success: false, error: 'Erro inesperado.' };
  }
}

// ---------------------------------------------------------------------------
// ADMIN: Realizar check-in
// ---------------------------------------------------------------------------
export async function adminCheckinRegistrationAction(
  registrationId: string
): Promise<ActionResponse<AdminCheckinResult>> {
  try {
    const supabase = await createServerSideClient();

    const { data, error } = await supabase.rpc('admin_checkin_registration', {
      p_registration_id: registrationId,
    });

    if (error) {
      if (error.code === '42501') {
        return { success: false, error: 'Acesso não autorizado.' };
      }
      if (error.message?.includes('não encontrada')) {
        return { success: false, error: 'Inscrição não encontrada.' };
      }
      return { success: false, error: 'Erro ao realizar check-in.' };
    }

    const row = data?.[0];
    if (!row) {
      return { success: false, error: 'Resposta inesperada do servidor.' };
    }

    return {
      success: true,
      data: {
        registrationId:   row.registration_id,
        fullName:         row.full_name,
        confirmationCode: row.confirmation_code,
        checkedInAt:      row.checked_in_at,
        alreadyChecked:   row.already_checked,
      },
    };
  } catch (err) {
    console.error('[Admin/Events] Exceção ao realizar check-in:', err);
    return { success: false, error: 'Erro inesperado.' };
  }
}

// ---------------------------------------------------------------------------
// ADMIN: Desfazer check-in (Apenas master / socio_admin)
// ---------------------------------------------------------------------------
export async function adminUndoCheckinAction(
  registrationId: string
): Promise<ActionResponse<AdminUndoCheckinResult>> {
  try {
    const supabase = await createServerSideClient();

    const { data, error } = await supabase.rpc('admin_undo_checkin_registration', {
      p_registration_id: registrationId,
    });

    if (error) {
      if (error.code === '42501') {
        return { success: false, error: 'Acesso não autorizado: apenas administradores master ou sócio admin podem desfazer check-in.' };
      }
      return { success: false, error: 'Erro ao desfazer check-in.' };
    }

    const row = data?.[0];
    if (!row) {
      return { success: false, error: 'Resposta inesperada do servidor.' };
    }

    return {
      success: true,
      data: {
        registrationId:   row.registration_id,
        fullName:         row.full_name,
        confirmationCode: row.confirmation_code,
        success:          row.success,
      },
    };
  } catch (err) {
    console.error('[Admin/Events] Exceção ao desfazer check-in:', err);
    return { success: false, error: 'Erro inesperado ao desfazer check-in.' };
  }
}

// ---------------------------------------------------------------------------
// ADMIN: Buscar participante por token de check-in / código no escaneamento
// ---------------------------------------------------------------------------
export async function getRegistrationByCheckinTokenAction(
  eventId: string,
  token: string
): Promise<ActionResponse<AdminRegistrationItem | null>> {
  try {
    if (!token || !token.trim()) {
      return { success: false, error: 'Token inválido.' };
    }

    const supabase = await createServerSideClient();

    const { data, error } = await supabase.rpc('admin_get_registration_by_token', {
      p_event_id: eventId,
      p_token:    token.trim(),
    });

    if (error) {
      if (error.code === '42501') {
        return { success: false, error: 'Acesso não autorizado.' };
      }
      return { success: false, error: 'Erro ao buscar inscrição por QR code.' };
    }

    const row = data?.[0];
    if (!row) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: {
        id:                   row.id,
        full_name:            row.full_name,
        whatsapp:             row.whatsapp,
        email:                row.email,
        attendee_type:        row.attendee_type,
        masonic_organization: row.masonic_organization,
        company_name:         row.company_name,
        city:                 row.city,
        attendance_status:    row.attendance_status,
        confirmation_code:    row.confirmation_code,
        source:               null,
        utm_source:           null,
        utm_campaign:         null,
        checked_in_at:        row.checked_in_at,
        created_at:           '',
        total_count:          1,
        checkin_token:        row.checkin_token,
      },
    };
  } catch (err) {
    console.error('[Admin/Events] Exceção ao buscar por token:', err);
    return { success: false, error: 'Erro inesperado.' };
  }
}

// ---------------------------------------------------------------------------
// ADMIN: Exportar CSV de participantes
// ---------------------------------------------------------------------------
export async function exportEventRegistrationsCSVAction(
  eventId: string,
  eventTitle: string
): Promise<ActionResponse<string>> {
  try {
    const supabase = await createServerSideClient();

    // Buscar todas as inscrições (sem paginação para export)
    const { data, error } = await supabase.rpc('admin_list_event_registrations', {
      p_event_id: eventId,
      p_limit:    1000,
      p_offset:   0,
    });

    if (error) {
      if (error.code === '42501') {
        return { success: false, error: 'Acesso não autorizado.' };
      }
      return { success: false, error: 'Erro ao exportar participantes.' };
    }

    const items = (data ?? []) as AdminRegistrationItem[];
    const csv = buildCSVContent(items, eventTitle);

    return { success: true, data: csv };
  } catch (err) {
    console.error('[Admin/Events] Exceção ao exportar CSV:', err);
    return { success: false, error: 'Erro inesperado ao exportar.' };
  }
}

// ---------------------------------------------------------------------------
// ADMIN: Editar informações do evento e da página pública
// ---------------------------------------------------------------------------
export interface UpdatePlatformEventInput {
  eventId: string;
  title?: string;
  subtitle?: string | null;
  description?: string | null;
  eventDate?: string;
  startTime?: string;
  endTime?: string | null;
  venueName?: string | null;
  venueAddress?: string | null;
  city?: string | null;
  coverImageUrl?: string | null;
  headerMediaType?: 'logo' | 'banner';
  headerMediaSize?: 'small' | 'medium' | 'large' | 'full';
  headerMediaPosition?: 'left' | 'center' | 'right';
  badgeText?: string;
  footerInformation?: string | null;
  registrationEnabled?: boolean;
  capacity?: number | null;
  status?: 'draft' | 'published' | 'canceled' | 'archived';
}

export async function updatePlatformEventAction(
  input: UpdatePlatformEventInput
): Promise<ActionResponse<{ eventId: string }>> {
  try {
    if (!input.eventId) {
      return { success: false, error: 'ID do evento é obrigatório.' };
    }

    const supabase = await getSupabaseServerOrAdminClient();

    const updateData: Record<string, any> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.subtitle !== undefined) updateData.subtitle = input.subtitle;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.eventDate !== undefined) updateData.event_date = input.eventDate;
    if (input.startTime !== undefined) updateData.start_time = input.startTime;
    if (input.endTime !== undefined) updateData.end_time = input.endTime;
    if (input.venueName !== undefined) updateData.venue_name = input.venueName;
    if (input.venueAddress !== undefined) updateData.venue_address = input.venueAddress;
    if (input.city !== undefined) updateData.city = input.city;
    if (input.coverImageUrl !== undefined) updateData.cover_image_url = input.coverImageUrl;
    if (input.headerMediaType !== undefined) updateData.header_media_type = input.headerMediaType;
    if (input.headerMediaSize !== undefined) updateData.header_media_size = input.headerMediaSize;
    if (input.headerMediaPosition !== undefined) updateData.header_media_position = input.headerMediaPosition;
    if (input.badgeText !== undefined) updateData.badge_text = input.badgeText.trim() || 'Convite';
    if (input.footerInformation !== undefined) updateData.footer_information = input.footerInformation?.trim() || null;
    if (input.registrationEnabled !== undefined) updateData.registration_enabled = input.registrationEnabled;
    if (input.capacity !== undefined) updateData.capacity = input.capacity;
    if (input.status !== undefined) updateData.status = input.status;

    updateData.updated_at = new Date().toISOString();

    const { data: updatedEvent, error: updateError } = await supabase
      .from('platform_events')
      .update(updateData)
      .eq('id', input.eventId)
      .select('slug')
      .maybeSingle();

    if (updateError) {
      console.error('[Admin/Events] Erro ao atualizar evento:', updateError);
      return { success: false, error: updateError.message || 'Não foi possível atualizar o evento.' };
    }

    try {
      revalidatePath('/eventos');
      if (updatedEvent?.slug) {
        revalidatePath(`/eventos/${updatedEvent.slug}`);
      }
      revalidatePath(`/admin/eventos/${input.eventId}`);
    } catch (_e) {
      // revalidatePath é operacional dentro de requisições HTTP do Next.js App Router
    }

    return { success: true, data: { eventId: input.eventId } };
  } catch (err) {
    console.error('[Admin/Events] Exceção ao atualizar evento:', err);
    return { success: false, error: 'Erro inesperado ao atualizar evento.' };
  }
}

export interface CreatePlatformEventInput {
  title: string;
  subtitle?: string;
  description?: string;
  eventDate: string;
  startTime: string;
  endTime?: string;
  venueName?: string;
  venueAddress?: string;
  city?: string;
  coverImageUrl?: string;
  headerMediaType?: 'logo' | 'banner';
  headerMediaSize?: 'small' | 'medium' | 'large' | 'full';
  headerMediaPosition?: 'left' | 'center' | 'right';
  badgeText?: string;
  footerInformation?: string;
  registrationEnabled?: boolean;
  capacity?: number | null;
  status?: 'draft' | 'published' | 'canceled' | 'archived';
}

function slugifyTitle(text: string): string {
  const base = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base || 'evento'}-${suffix}`;
}

export async function createPlatformEventAction(
  input: CreatePlatformEventInput
): Promise<ActionResponse<{ eventId: string; slug: string }>> {
  try {
    if (!input.title?.trim()) {
      return { success: false, error: 'Título do evento é obrigatório.' };
    }
    if (!input.eventDate) {
      return { success: false, error: 'Data do evento é obrigatória.' };
    }
    if (!input.startTime) {
      return { success: false, error: 'Horário de início é obrigatório.' };
    }

    const supabase = await getSupabaseServerOrAdminClient();
    const tenantId = await resolveTenantIdServer().catch(() => '00000000-0000-0000-0000-000000000000');
    const slug = slugifyTitle(input.title);

    const { data: newEvent, error } = await (supabase as any)
      .from('platform_events')
      .insert({
        tenant_id: tenantId,
        slug,
        title: input.title.trim(),
        subtitle: input.subtitle?.trim() || null,
        description: input.description?.trim() || null,
        event_date: input.eventDate,
        start_time: input.startTime,
        end_time: input.endTime || null,
        venue_name: input.venueName?.trim() || null,
        venue_address: input.venueAddress?.trim() || null,
        city: input.city?.trim() || null,
        cover_image_url: input.coverImageUrl?.trim() || null,
        header_media_type: input.headerMediaType || 'logo',
        header_media_size: input.headerMediaSize || 'medium',
        header_media_position: input.headerMediaPosition || 'center',
        badge_text: input.badgeText?.trim() || 'Convite',
        footer_information: input.footerInformation?.trim() || null,
        registration_enabled: input.registrationEnabled ?? true,
        capacity: input.capacity !== undefined && input.capacity !== null ? input.capacity : null,
        status: input.status || 'published',
      })
      .select('id, slug')
      .single();

    if (error || !newEvent) {
      console.error('[Admin/Events] Erro ao criar evento:', error);
      return { success: false, error: error?.message || 'Não foi possível criar o evento.' };
    }

    try {
      revalidatePath('/admin/eventos');
      revalidatePath('/eventos');
    } catch (_e) {}

    return { success: true, data: { eventId: newEvent.id, slug: newEvent.slug } };
  } catch (err) {
    console.error('[Admin/Events] Exceção ao criar evento:', err);
    return { success: false, error: 'Erro inesperado ao criar evento.' };
  }
}

export async function uploadPlatformEventMediaAction(
  fileDataUrl: string
): Promise<ActionResponse<{ url: string }>> {
  try {
    const match = fileDataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return { success: false, error: 'Formato inválido. Use PNG, JPEG ou WebP.' };

    const mimeType = match[1]!;
    const buffer = Buffer.from(match[2]!, 'base64');
    if (!buffer.length || buffer.length > 5 * 1024 * 1024) {
      return { success: false, error: 'A imagem deve ter no máximo 5 MB.' };
    }

    const supabase = await createServerSideClient();
    const tenantId = await resolveTenantIdServer().catch(() => '00000000-0000-0000-0000-000000000000');
    const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1];
    const path = `${tenantId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from('event-assets').upload(path, buffer, {
      contentType: mimeType,
      upsert: false,
    });
    if (error) return { success: false, error: error.message };

    const { data } = supabase.storage.from('event-assets').getPublicUrl(path);
    return { success: true, data: { url: data.publicUrl } };
  } catch (err) {
    console.error('[Admin/Events] Falha no upload da imagem:', err);
    return { success: false, error: 'Não foi possível enviar a imagem.' };
  }
}

export async function deletePlatformEventAction(
  eventId: string
): Promise<ActionResponse<{ eventId: string }>> {
  try {
    if (!eventId) {
      return { success: false, error: 'ID do evento é obrigatório.' };
    }

    const supabase = await getSupabaseServerOrAdminClient();

    // 1. Apaga inscrições relacionadas
    try {
      await (supabase as any).from('event_registrations').delete().eq('event_id', eventId);
    } catch (_e) {}

    // 2. Apaga o evento
    const { error } = await (supabase as any)
      .from('platform_events')
      .delete()
      .eq('id', eventId);

    if (error) {
      console.error('[Admin/Events] Erro ao excluir evento:', error);
      return { success: false, error: error.message || 'Não foi possível excluir o evento.' };
    }

    try {
      revalidatePath('/admin/eventos');
      revalidatePath('/eventos');
    } catch (_e) {}

    return { success: true, data: { eventId } };
  } catch (err) {
    console.error('[Admin/Events] Exceção ao excluir evento:', err);
    return { success: false, error: 'Erro inesperado ao excluir evento.' };
  }
}

// ---------------------------------------------------------------------------
// ADMIN / LOJAS: Buscar eventos associados a uma Loja Maçônica
// ---------------------------------------------------------------------------
export async function getEventsForLodgeAction(
  lodgeName: string
): Promise<ActionResponse<PlatformEvent[]>> {
  try {
    if (!lodgeName || !lodgeName.trim()) {
      return { success: true, data: [] };
    }

    const supabase = await getSupabaseServerOrAdminClient();
    const cleanName = lodgeName.trim();

    const { data, error } = await supabase
      .from('platform_events')
      .select('*')
      .or(`venue_name.ilike.%${cleanName}%,title.ilike.%${cleanName}%,subtitle.ilike.%${cleanName}%,description.ilike.%${cleanName}%`)
      .order('event_date', { ascending: false });

    if (error) {
      console.error('[Admin/Events] Erro ao buscar eventos da loja:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: ((data ?? []) as any[]).map((e) => ({
        id: e.id,
        slug: e.slug,
        title: e.title,
        subtitle: e.subtitle ?? null,
        description: e.description ?? null,
        event_date: e.event_date,
        start_time: e.start_time,
        end_time: e.end_time ?? null,
        timezone: e.timezone || 'America/Bahia',
        venue_name: e.venue_name ?? null,
        venue_address: e.venue_address ?? null,
        city: e.city ?? null,
        cover_image_url: e.cover_image_url ?? null,
        header_media_type: e.header_media_type ?? 'logo',
        header_media_size: e.header_media_size ?? 'medium',
        header_media_position: e.header_media_position ?? 'center',
        badge_text: e.badge_text ?? 'Convite',
        footer_information: e.footer_information ?? null,
        registration_enabled: e.registration_enabled ?? true,
        capacity: e.capacity ?? null,
        status: e.status,
      })),
    };
  } catch (err) {
    console.error('[Admin/Events] Exceção ao buscar eventos da loja:', err);
    return { success: false, error: 'Erro inesperado ao buscar eventos.' };
  }
}

// Re-export for convenience
export { sanitizeUTMParams };
