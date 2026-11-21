/**
 * Moderação de Conteúdo Gerado por Usuário (UGC) — Mural de Conexões & Avaliações
 * Conformidade com Apple App Store Review Guideline 1.2 (User-Generated Content):
 * 1. Termos de Uso / Política Anti-Abuso com aceite explícito antes de publicar;
 * 2. Denúncia de conteúdo inadequado integrada à RPC real `public.report_connection` (Migration 171);
 * 3. Bloqueio persistente de usuário/autor com remoção imediata do conteúdo do feed;
 * 4. Canal de contato de suporte e abuso visível ao usuário.
 */

import type { MobileConnectionFeedItem } from './guide-data';
import { readStoredMobileSession } from './mobile-member-client';

export type ConnectionReportReason = 'foto_inadequada' | 'informacao_falsa' | 'ofensivo' | 'outro';

export interface ReportReasonOption {
  value: ConnectionReportReason;
  label: string;
  description: string;
}

export const REPORT_REASON_OPTIONS: ReportReasonOption[] = [
  {
    value: 'ofensivo',
    label: 'Conteúdo ofensivo ou desrespeitoso',
    description: 'Linguagem imprópria, desrespeito fraterno ou violação das normas da comunidade.',
  },
  {
    value: 'informacao_falsa',
    label: 'Informação falsa ou spam',
    description: 'Relato inverídico, autopromoção indevida ou tentativa de fraude.',
  },
  {
    value: 'foto_inadequada',
    label: 'Foto ou mídia inadequada',
    description: 'Imagem imprópria, sem relação com a experiência ou que viola direitos.',
  },
  {
    value: 'outro',
    label: 'Outro motivo',
    description: 'Qualquer outra violação dos Termos de Uso da Conexão Maçônica.',
  },
];

export const UGC_ABUSE_CONTACT_EMAIL = 'contato@conexaomaconica.com.br';
export const UGC_TERMS_URL = 'https://conexaomaconica.com.br/termos';

const STORAGE_KEY_BLOCKED_CONNECTIONS = 'cm_mobile_blocked_connections';
const STORAGE_KEY_BLOCKED_AUTHORS = 'cm_mobile_blocked_authors';
const STORAGE_KEY_REPORTED_CONNECTIONS = 'cm_mobile_reported_connections';
const STORAGE_KEY_UGC_TERMS_ACCEPTED = 'cm_mobile_ugc_terms_accepted';

const SUPABASE_URL = 'https://rwvztwsjcjljphqttiws.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3dnp0d3NqY2psanBocXR0aXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3ODk4MTIsImV4cCI6MjEwMTM2NTgxMn0.1p7e82BNjYQBKkOdbSlXZ0WLiV-Hl8T-IGicUTn9GHc';

const memoryStorageFallback = new Map<string, string>();
let activeUserScopeOverride: string | null = null;

/**
 * Define explicitamente o escopo da conta ativa (id ou e-mail do membro logado) para isolar
 * bloqueios e denúncias entre contas distintas no mesmo dispositivo.
 */
export function setActiveModerationUserScope(userIdOrEmail: string | null | undefined): void {
  const clean = (userIdOrEmail || '').trim().toLowerCase();
  activeUserScopeOverride = clean || null;
}

export function getActiveModerationUserScope(): string {
  if (activeUserScopeOverride) return activeUserScopeOverride;
  try {
    const rawUser = readRawStorageItem('cm_mobile_member_user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser) as { id?: string; email?: string } | null;
      const scope = (parsed?.id || parsed?.email || '').trim().toLowerCase();
      if (scope) return scope;
    }
  } catch {
    // Ignora erro de parse
  }
  return 'guest';
}

function scopedKey(baseKey: string, scope = getActiveModerationUserScope()): string {
  return `${baseKey}::${scope}`;
}

function readRawStorageItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.getItem === 'function') {
      return window.localStorage.getItem(key);
    }
    if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
      return localStorage.getItem(key);
    }
  } catch {
    // Fallback em memória (Node 22+ ou WebView sem localStorage)
  }
  return memoryStorageFallback.get(key) ?? null;
}

function writeRawStorageItem(key: string, value: string): void {
  memoryStorageFallback.set(key, value);
  try {
    if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.setItem === 'function') {
      window.localStorage.setItem(key, value);
      return;
    }
    if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
      localStorage.setItem(key, value);
    }
  } catch {
    // Mantido em memoryStorageFallback
  }
}

function removeRawStorageItem(key: string): void {
  memoryStorageFallback.delete(key);
  try {
    if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.removeItem === 'function') {
      window.localStorage.removeItem(key);
      return;
    }
    if (typeof localStorage !== 'undefined' && typeof localStorage.removeItem === 'function') {
      localStorage.removeItem(key);
    }
  } catch {
    // Removido de memoryStorageFallback
  }
}

function readStringList(key: string): string[] {
  try {
    const raw = readRawStorageItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return Array.from(new Set(parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)));
  } catch {
    return [];
  }
}

function writeStringList(key: string, values: string[]): void {
  const clean = Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
  writeRawStorageItem(key, JSON.stringify(clean));
}

/**
 * Gera uma chave estável do autor da publicação para filtragem imediata no cliente,
 * mantendo a privacidade LGPD (não requer expor o UUID interno do membro na API pública).
 */
export function buildConnectionAuthorKey(item: Pick<MobileConnectionFeedItem, 'member_first_name' | 'business_slug'>): string {
  const firstName = (item.member_first_name || 'Ir.').trim().toLowerCase();
  const biz = (item.business_slug || '').trim().toLowerCase();
  return `${firstName}::${biz}`;
}

export function getBlockedConnectionIds(scope?: string): string[] {
  return readStringList(scopedKey(STORAGE_KEY_BLOCKED_CONNECTIONS, scope));
}

export function getReportedConnectionIds(scope?: string): string[] {
  return readStringList(scopedKey(STORAGE_KEY_REPORTED_CONNECTIONS, scope));
}

export function getBlockedAuthorKeys(scope?: string): string[] {
  return readStringList(scopedKey(STORAGE_KEY_BLOCKED_AUTHORS, scope));
}

export function hasAcceptedUgcTerms(scope?: string): boolean {
  return readRawStorageItem(scopedKey(STORAGE_KEY_UGC_TERMS_ACCEPTED, scope)) === 'true';
}

export function setAcceptedUgcTerms(accepted: boolean, scope?: string): void {
  const key = scopedKey(STORAGE_KEY_UGC_TERMS_ACCEPTED, scope);
  if (accepted) {
    writeRawStorageItem(key, 'true');
  } else {
    removeRawStorageItem(key);
  }
}

export function recordLocalConnectionReport(connectionId: string, scope?: string): void {
  const id = connectionId.trim();
  if (!id) return;
  const current = getReportedConnectionIds(scope);
  if (!current.includes(id)) {
    writeStringList(scopedKey(STORAGE_KEY_REPORTED_CONNECTIONS, scope), [...current, id]);
  }
}

export function recordLocalAuthorBlock(params: {
  connectionId: string;
  authorKey: string;
  scope?: string;
}): void {
  const connId = params.connectionId.trim();
  const authorKey = params.authorKey.trim().toLowerCase();

  if (connId) {
    const blockedConns = getBlockedConnectionIds(params.scope);
    if (!blockedConns.includes(connId)) {
      writeStringList(scopedKey(STORAGE_KEY_BLOCKED_CONNECTIONS, params.scope), [...blockedConns, connId]);
    }
  }

  if (authorKey) {
    const blockedAuthors = getBlockedAuthorKeys(params.scope);
    if (!blockedAuthors.includes(authorKey)) {
      writeStringList(scopedKey(STORAGE_KEY_BLOCKED_AUTHORS, params.scope), [...blockedAuthors, authorKey]);
    }
  }
}

export function clearLocalModerationBlocks(scope?: string): void {
  removeRawStorageItem(scopedKey(STORAGE_KEY_BLOCKED_CONNECTIONS, scope));
  removeRawStorageItem(scopedKey(STORAGE_KEY_BLOCKED_AUTHORS, scope));
  removeRawStorageItem(scopedKey(STORAGE_KEY_REPORTED_CONNECTIONS, scope));
}

/**
 * Filtra imediatamente itens denunciados, ocultados ou cujos autores foram bloqueados pelo usuário.
 */
export function filterModeratedConnections<T extends MobileConnectionFeedItem>(items: T[]): T[] {
  const blockedIds = new Set(getBlockedConnectionIds());
  const reportedIds = new Set(getReportedConnectionIds());
  const blockedAuthors = new Set(getBlockedAuthorKeys());

  return items.filter((item) => {
    if (!item || !item.id) return false;
    if (blockedIds.has(item.id) || reportedIds.has(item.id)) return false;
    const authorKey = buildConnectionAuthorKey(item);
    if (blockedAuthors.has(authorKey)) return false;
    return true;
  });
}

export interface SubmitModerationReportInput {
  connectionId: string;
  reason: ConnectionReportReason;
  details?: string;
  blockAuthor?: boolean;
  authorKey?: string;
  accessToken?: string | null;
  fetchImpl?: typeof fetch;
}

export interface SubmitModerationReportResult {
  success: boolean;
  reportedRemotely: boolean;
  requiresAuthForRemoteReport: boolean;
  blockedAuthor: boolean;
  message: string;
}

/**
 * Envia denúncia real para a RPC `public.report_connection` (Migration 171) no Supabase
 * quando há sessão autenticada, e oculta localmente a publicação/autor.
 * Para visitantes não autenticados, nunca confirma envio administrativo remoto — informa que
 * a ocultação ocorreu apenas neste dispositivo e orienta login ou contato direto.
 */
export async function submitConnectionModerationReport(
  input: SubmitModerationReportInput,
): Promise<SubmitModerationReportResult> {
  const connectionId = (input.connectionId || '').trim();
  const reason: ConnectionReportReason = REPORT_REASON_OPTIONS.some((r) => r.value === input.reason)
    ? input.reason
    : 'outro';
  const details = (input.details || '').trim() || null;
  const blockAuthor = Boolean(input.blockAuthor);
  const fetchFn = input.fetchImpl ?? fetch;

  if (!connectionId) {
    return {
      success: false,
      reportedRemotely: false,
      requiresAuthForRemoteReport: false,
      blockedAuthor: false,
      message: 'Identificador da publicação inválido.',
    };
  }

  // 1. Garante ocultação local imediata e persistente
  recordLocalConnectionReport(connectionId);
  if (blockAuthor && input.authorKey) {
    recordLocalAuthorBlock({
      connectionId,
      authorKey: input.authorKey,
    });
  }

  const storedSession = readStoredMobileSession();
  const authToken = input.accessToken || storedSession?.accessToken || null;

  if (!authToken) {
    return {
      success: true,
      reportedRemotely: false,
      requiresAuthForRemoteReport: true,
      blockedAuthor: blockAuthor,
      message: blockAuthor
        ? 'Publicações deste autor ocultadas apenas neste aparelho. Para enviar uma denúncia oficial à administração, entre na sua conta ou use o e-mail de moderação.'
        : 'Publicação ocultada apenas neste aparelho. Para enviar uma denúncia oficial à administração, entre na sua conta ou use o e-mail de moderação.',
    };
  }

  let reportedRemotely = false;

  // 2. Chama a RPC real já instalada em produção: public.report_connection (exige usuário autenticado)
  try {
    const res = await fetchFn(`${SUPABASE_URL}/rest/v1/rpc/report_connection`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_connection_id: connectionId,
        p_reason: reason,
        p_details: details,
      }),
    });

    if (res.ok) {
      const payload = (await res.json().catch(() => null)) as { reported?: boolean; success?: boolean } | null;
      reportedRemotely = payload?.reported === true || payload?.success === true;
    }
  } catch {
    reportedRemotely = false;
  }

  // 3. Se o usuário também optou por bloquear o autor, sincroniza via RPC block_connection_author (quando disponível)
  if (blockAuthor) {
    try {
      await fetchFn(`${SUPABASE_URL}/rest/v1/rpc/block_connection_author`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_connection_id: connectionId,
          p_reason: reason,
        }),
      });
    } catch {
      // Fallback local já gravado em STORAGE_KEY_BLOCKED_AUTHORS
    }
  }

  if (!reportedRemotely) {
    return {
      success: true,
      reportedRemotely: false,
      requiresAuthForRemoteReport: false,
      blockedAuthor: blockAuthor,
      message: blockAuthor
        ? 'Autor ocultado neste aparelho. Não foi possível confirmar o envio à fila administrativa agora (verifique sua conexão).'
        : 'Publicação ocultada neste aparelho. Não foi possível confirmar o envio à fila administrativa agora (verifique sua conexão).',
    };
  }

  return {
    success: true,
    reportedRemotely: true,
    requiresAuthForRemoteReport: false,
    blockedAuthor: blockAuthor,
    message: blockAuthor
      ? 'Denúncia enviada à moderação e publicações deste autor ocultadas do seu Mural.'
      : 'Denúncia registrada para análise da administração. A publicação foi ocultada do seu Mural.',
  };
}

/**
 * Bloqueia diretamente o autor de uma publicação do Mural sem exigir preenchimento de formulário longo.
 */
export async function blockMuralAuthor(params: {
  connectionId: string;
  authorKey: string;
  accessToken?: string | null;
  fetchImpl?: typeof fetch;
}): Promise<SubmitModerationReportResult> {
  return submitConnectionModerationReport({
    connectionId: params.connectionId,
    reason: 'outro',
    details: 'Bloqueio direto de autor solicitado pelo usuário no aplicativo móvel.',
    blockAuthor: true,
    authorKey: params.authorKey,
    accessToken: params.accessToken,
    fetchImpl: params.fetchImpl,
  });
}

