'use server';

import { createServerSideClient, resolveTenantIdServer } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rate-limiter';
import type { AttendeeType, AttendanceStatus } from '@/types/database-extensions';
import { buildCSVContent, sanitizeUTMParams } from '@/lib/events/events-service';

// ---------------------------------------------------------------------------
// Shared response type (consistent with platform pattern)
// ---------------------------------------------------------------------------
export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
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
  registration_enabled: boolean;
  capacity: number | null;
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

    const supabase = await createServerSideClient();

    const { data, error } = await supabase.rpc('get_platform_event_by_slug', {
      p_slug: slug.trim().toLowerCase(),
    });

    if (error) {
      console.error('[Events] Erro ao buscar evento:', error);
      return { success: false, error: 'Erro ao carregar o evento.' };
    }

    if (!data || data.length === 0) {
      return { success: false, error: 'Evento não encontrado.' };
    }

    return { success: true, data: data[0] as PlatformEvent };
  } catch (err) {
    console.error('[Events] Exceção ao buscar evento:', err);
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

    if (!['confirmed', 'declined'].includes(input.attendanceStatus)) {
      return { success: false, error: 'Status de presença inválido.' };
    }

    const tenantId = await resolveTenantIdServer();

    // Rate limit: 5 tentativas por WhatsApp por minuto
    const rateCheck = await checkRateLimit('rsvp', whatsappClean, tenantId);
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: 'Muitas solicitações recentes. Aguarde um momento e tente novamente.',
      };
    }

    const supabase = await createServerSideClient();

    const { data, error } = await supabase.rpc('upsert_event_registration', {
      p_event_id:             input.eventId,
      p_full_name:            input.fullName.trim(),
      p_whatsapp:             whatsappClean,
      p_email:                input.email?.trim().toLowerCase() ?? null,
      p_attendee_type:        input.attendeeType,
      p_masonic_organization: input.masonicOrganization?.trim() ?? null,
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
      p_search:            params.search ?? null,
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

// Re-export for convenience
export { sanitizeUTMParams };
