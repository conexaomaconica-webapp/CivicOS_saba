'use server';

import { headers } from 'next/headers';
import { createServerSideClient } from '@/lib/supabase/server';
import { linkVisitorToCurrentUser } from '@/lib/referrals/attribution';

export type ConnectionType = 'compra' | 'servico' | 'parceria' | 'visita';
export type ConnectionStatus = 'pendente' | 'confirmada' | 'recusada' | 'removida';
export type PhotoModerationStatus = 'nao_requerida' | 'pendente' | 'aprovada' | 'rejeitada';

export type PublicConnectionItem = {
  id: string;
  connection_type: ConnectionType;
  item_description: string | null;
  message: string | null;
  photo_url: string | null;
  member_first_name: string;
  confirmed_at: string;
  like_count: number;
  liked_by_me: boolean;
};

export type ConnectionFeedItem = PublicConnectionItem & {
  business_name: string;
  business_slug: string;
};

export type BusinessConnectionRow = {
  id: string;
  connection_type: ConnectionType;
  item_description: string | null;
  message: string | null;
  photo_url: string | null;
  photo_moderation_status: PhotoModerationStatus;
  status: ConnectionStatus;
  member_name: string;
  created_at: string;
  confirmed_at: string | null;
};

export type ConnectionMetrics = {
  total: number;
  confirmed: number;
  pending: number;
  declined: number;
  confirmed_last_30_days: number;
  with_photo: number;
  visits: number;
  by_type: { compra: number; servico: number; parceria: number; visita: number };
  confirmation_rate: number | null;
  last_confirmed_at: string | null;
};

export type MyConnectionRow = {
  id: string;
  photo_url: string | null;
  photo_moderation_status: PhotoModerationStatus;
  connection_type: ConnectionType;
  item_description: string | null;
  status: ConnectionStatus;
  created_at: string;
  confirmed_at: string | null;
  business_name: string;
  business_slug: string | null;
};

const TYPES: ConnectionType[] = ['compra', 'servico', 'parceria', 'visita'];

/** Remove o prefixo técnico ("FORBIDDEN: ...") das mensagens das funções do banco. */
function friendlyError(error: unknown, fallback: string): string {
  const raw = typeof (error as any)?.message === 'string' ? ((error as any).message as string) : '';
  const cleaned = raw.replace(/^[A-Z_]{3,}:\s*/, '').trim();
  return cleaned && cleaned.length < 220 ? cleaned : fallback;
}

/** Membro registra uma conexão comercial ("Comprei na Conexão"). Fica pendente até a empresa confirmar. */
export async function registerConnectionAction(input: {
  businessSlug: string;
  type: ConnectionType;
  item?: string;
  message?: string;
  photoUrl?: string | null;
}): Promise<{ success: boolean; error?: string; businessName?: string }> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return { success: false, error: 'Entre na sua conta para registrar uma conexão.' };

    if (!TYPES.includes(input.type)) return { success: false, error: 'Escolha o tipo da conexão.' };
    const slug = String(input.businessSlug || '').trim();
    if (!slug) return { success: false, error: 'Empresa não informada.' };

    // Indicações feitas por este navegador antes do login passam a valer para esta conta (fecha o funil na confirmação).
    await linkVisitorToCurrentUser(supabase);

    // A empresa é localizada dentro do banco (tenant do domínio + slug): membros não leem a tabela businesses direto.
    const host = ((await headers()).get('host') || 'localhost').split(':')[0] || 'localhost';
    const { data, error } = await (supabase as any).rpc('register_business_connection_by_slug', {
      p_host: host,
      p_business_slug: slug,
      p_type: input.type,
      p_item: input.item?.trim() || null,
      p_message: input.message?.trim() || null,
      p_photo_url: input.photoUrl || null,
    });
    if (error) return { success: false, error: friendlyError(error, 'Não foi possível registrar a conexão agora.') };

    return { success: true, businessName: data?.business_name };
  } catch (err) {
    console.error('[registerConnectionAction]', err);
    return { success: false, error: 'Não foi possível registrar a conexão agora.' };
  }
}

/** Mural público da empresa: total confirmado e as conexões mais recentes (só primeiro nome do membro). */
export async function getPublicBusinessConnectionsAction(
  businessSlug: string
): Promise<{ confirmedCount: number; visitCount: number; items: PublicConnectionItem[] }> {
  try {
    const supabase = await createServerSideClient();
    const host = ((await headers()).get('host') || 'localhost').split(':')[0] || 'localhost';
    const { data } = await (supabase as any).rpc('public_business_connections', {
      p_host: host,
      p_business_slug: businessSlug,
      p_limit: 6,
    });
    return {
      confirmedCount: Number(data?.confirmed_count ?? 0),
      visitCount: Number(data?.visit_count ?? 0),
      items: Array.isArray(data?.items) ? data.items : [],
    };
  } catch {
    return { confirmedCount: 0, visitCount: 0, items: [] };
  }
}

/** Empresa do anunciante logado: conexões (pendentes primeiro) e métricas. */
export async function listMyBusinessConnectionsAction(): Promise<{
  success: boolean;
  error?: string;
  businessId?: string;
  businessName?: string;
  items: BusinessConnectionRow[];
  metrics: ConnectionMetrics | null;
}> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return { success: false, error: 'Sessão expirada.', items: [], metrics: null };

    const { data: biz } = await (supabase as any)
      .from('businesses')
      .select('id, name')
      .eq('owner_id', userRes.user.id)
      .maybeSingle();
    if (!biz?.id) return { success: false, error: 'Nenhuma empresa encontrada para esta conta.', items: [], metrics: null };

    const [list, metrics] = await Promise.all([
      (supabase as any).rpc('list_business_connections', { p_business_id: biz.id, p_status: null }),
      (supabase as any).rpc('business_connection_metrics', { p_business_id: biz.id }),
    ]);
    if (list.error) return { success: false, error: friendlyError(list.error, 'Não foi possível carregar as conexões.'), items: [], metrics: null };

    return {
      success: true,
      businessId: biz.id,
      businessName: biz.name,
      items: Array.isArray(list.data) ? list.data : [],
      metrics: metrics.data ?? null,
    };
  } catch (err) {
    console.error('[listMyBusinessConnectionsAction]', err);
    return { success: false, error: 'Não foi possível carregar as conexões.', items: [], metrics: null };
  }
}

/** Empresa confirma o atendimento (ou diz que não reconhece a conexão). Sem valores: preço nunca é pedido. */
export async function decideConnectionAction(
  connectionId: string,
  action: 'confirmar' | 'recusar'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return { success: false, error: 'Sessão expirada.' };

    const { error } = await (supabase as any).rpc('decide_business_connection', {
      p_connection_id: connectionId,
      p_action: action,
    });
    if (error) return { success: false, error: friendlyError(error, 'Não foi possível registrar a resposta.') };
    return { success: true };
  } catch (err) {
    console.error('[decideConnectionAction]', err);
    return { success: false, error: 'Não foi possível registrar a resposta.' };
  }
}

/** Métricas de conexões de uma empresa (Prontuário 360). A autorização é feita no banco. */
export async function getBusinessConnectionMetricsAction(
  businessId: string
): Promise<{ success: boolean; error?: string; metrics: ConnectionMetrics | null }> {
  try {
    const supabase = await createServerSideClient();
    const { data, error } = await (supabase as any).rpc('business_connection_metrics', { p_business_id: businessId });
    if (error) return { success: false, error: friendlyError(error, 'Não foi possível carregar as métricas.'), metrics: null };
    return { success: true, metrics: data ?? null };
  } catch {
    return { success: false, error: 'Não foi possível carregar as métricas.', metrics: null };
  }
}

/** Conexões registradas pelo membro logado (todas, inclusive pendentes). */
export async function listMyConnectionsAction(): Promise<{ success: boolean; error?: string; items: MyConnectionRow[] }> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return { success: false, error: 'Sessão expirada.', items: [] };

    const { data, error } = await (supabase as any).rpc('list_my_connections');
    if (error) return { success: false, error: 'Não foi possível carregar suas conexões.', items: [] };

    return {
      success: true,
      items: ((Array.isArray(data) ? data : []) as any[]).map((row) => ({
        id: row.id,
        connection_type: row.connection_type,
        item_description: row.item_description ?? null,
        photo_url: row.photo_url ?? null,
        photo_moderation_status: row.photo_moderation_status ?? 'nao_requerida',
        status: row.status,
        created_at: row.created_at,
        confirmed_at: row.confirmed_at ?? null,
        business_name: row.business_name || 'Empresa',
        business_slug: row.business_slug || null,
      })),
    };
  } catch {
    return { success: false, error: 'Não foi possível carregar suas conexões.', items: [] };
  }
}

/** Total de negócios confirmados na rede (contador da página principal). */
export async function getConfirmedConnectionsCountAction(): Promise<number> {
  try {
    const supabase = await createServerSideClient();
    const host = ((await headers()).get('host') || 'localhost').split(':')[0] || 'localhost';
    const { data } = await (supabase as any).rpc('public_confirmed_connections_count', { p_host: host });
    return Number(data ?? 0);
  } catch {
    return 0;
  }
}

/** Curtir / descurtir uma conexão confirmada (só membro logado, uma curtida por pessoa). */
export async function toggleConnectionLikeAction(
  connectionId: string
): Promise<{ success: boolean; unauthorized?: boolean; liked?: boolean; likeCount?: number; error?: string }> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return { success: false, unauthorized: true, error: 'Entre na sua conta para curtir.' };

    const { data, error } = await (supabase as any).rpc('toggle_connection_like', { p_connection_id: connectionId });
    if (error) return { success: false, error: friendlyError(error, 'Não foi possível curtir agora.') };
    return { success: true, liked: Boolean(data?.liked), likeCount: Number(data?.like_count ?? 0) };
  } catch {
    return { success: false, error: 'Não foi possível curtir agora.' };
  }
}

/** Remove só a foto de uma conexão (o membro autor, a gestão da empresa ou o admin). A conexão permanece. */
export async function removeConnectionPhotoAction(connectionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return { success: false, error: 'Sessão expirada.' };

    const { error } = await (supabase as any).rpc('remove_connection_photo', { p_connection_id: connectionId });
    if (error) return { success: false, error: friendlyError(error, 'Não foi possível remover a foto.') };
    return { success: true };
  } catch {
    return { success: false, error: 'Não foi possível remover a foto.' };
  }
}

/** Conexões confirmadas mais recentes da rede (seção do Mural na página principal). Fotos primeiro. */
export async function getConnectionsFeedAction(limit = 6): Promise<ConnectionFeedItem[]> {
  try {
    const supabase = await createServerSideClient();
    const host = ((await headers()).get('host') || 'localhost').split(':')[0] || 'localhost';
    const { data } = await (supabase as any).rpc('public_connections_feed', {
      p_host: host,
      p_limit: limit,
      p_only_with_photo: false,
    });
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export type ReportReason = 'foto_inadequada' | 'informacao_falsa' | 'ofensivo' | 'outro';

export type ModerationItem = {
  id: string;
  business_id: string;
  business_name: string;
  business_slug: string | null;
  member_name: string;
  connection_type: ConnectionType;
  item_description: string | null;
  message: string | null;
  photo_url: string | null;
  status: ConnectionStatus;
  photo_moderation_status: PhotoModerationStatus;
  created_at: string;
  confirmed_at: string | null;
  open_reports: number;
  report_reasons: ReportReason[];
};

/** Qualquer membro logado pode denunciar uma conexão pública; a decisão é da administração da plataforma. */
export async function reportConnectionAction(
  connectionId: string,
  reason: ReportReason,
  details?: string
): Promise<{ success: boolean; unauthorized?: boolean; error?: string }> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return { success: false, unauthorized: true, error: 'Entre na sua conta para denunciar.' };

    const { error } = await (supabase as any).rpc('report_connection', {
      p_connection_id: connectionId,
      p_reason: reason,
      p_details: details?.trim() || null,
    });
    if (error) return { success: false, error: friendlyError(error, 'Não foi possível enviar a denúncia.') };
    return { success: true };
  } catch {
    return { success: false, error: 'Não foi possível enviar a denúncia.' };
  }
}

/** Fila de moderação da plataforma: fotos pendentes ou conexões com denúncia aberta. */
export async function listModerationQueueAction(
  filter: 'fotos_pendentes' | 'denuncias'
): Promise<{ success: boolean; error?: string; items: ModerationItem[] }> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return { success: false, error: 'Sessão expirada.', items: [] };

    const { data, error } = await (supabase as any).rpc('admin_list_connection_moderation', { p_filter: filter });
    if (error) return { success: false, error: friendlyError(error, 'Não foi possível carregar a fila.'), items: [] };
    return { success: true, items: Array.isArray(data) ? data : [] };
  } catch {
    return { success: false, error: 'Não foi possível carregar a fila.', items: [] };
  }
}

/** Admin aprova ou rejeita a foto. Rejeitar apaga a imagem; a conexão confirmada permanece sem foto. */
export async function moderateConnectionPhotoAction(
  connectionId: string,
  decision: 'aprovar' | 'rejeitar',
  note?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return { success: false, error: 'Sessão expirada.' };

    const { error } = await (supabase as any).rpc('admin_moderate_connection_photo', {
      p_connection_id: connectionId,
      p_decision: decision,
      p_note: note?.trim() || null,
    });
    if (error) return { success: false, error: friendlyError(error, 'Não foi possível registrar a decisão.') };
    return { success: true };
  } catch {
    return { success: false, error: 'Não foi possível registrar a decisão.' };
  }
}

/** Admin tira a conexão inteira de circulação (denúncia procedente) ou descarta as denúncias. */
export async function resolveConnectionReportsAction(
  connectionId: string,
  action: 'remover' | 'descartar',
  note?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return { success: false, error: 'Sessão expirada.' };

    const { error } =
      action === 'remover'
        ? await (supabase as any).rpc('admin_remove_connection', { p_connection_id: connectionId, p_note: note?.trim() || null })
        : await (supabase as any).rpc('admin_dismiss_connection_reports', { p_connection_id: connectionId });
    if (error) return { success: false, error: friendlyError(error, 'Não foi possível concluir.') };
    return { success: true };
  } catch {
    return { success: false, error: 'Não foi possível concluir.' };
  }
}
