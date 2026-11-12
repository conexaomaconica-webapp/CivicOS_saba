'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { assertPlatformAdminAccess } from '@/lib/admin/admin-auth-helper';
import { getFirebaseConfigStatus, getFirebaseServiceAccount, sendPushToToken } from './fcm';

type ContentMode = 'text' | 'image' | 'image_text';
type AudienceType = 'all' | 'emails';

const MAX_TOKENS_PER_SEND = 5000;
const MAX_TTL_SECONDS = 28 * 24 * 3600; // limite do FCM: 4 semanas
const MAX_IMAGE_BYTES = 1024 * 1024; // limite recomendado do FCM para imagens
const SEND_CONCURRENCY = 15;

export interface PushCampaignListItem {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  content_mode: ContentMode;
  route: string | null;
  audience_type: AudienceType;
  expires_at: string;
  status: 'sent' | 'partial' | 'failed';
  target_count: number;
  sent_count: number;
  failed_count: number;
  error_details: string | null;
  created_at: string;
}

function getServiceClient(): any | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function isSupportedImage(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true; // JPEG
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true; // PNG
  return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46; // WebP
}

function parseEmails(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\s,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)),
    ),
  );
}

async function loadTokens(db: any, audience: AudienceType, emails: string[]): Promise<string[]> {
  let query = db
    .from('mobile_device_tokens')
    .select('token')
    .eq('is_active', true)
    .eq('platform', 'android')
    .limit(MAX_TOKENS_PER_SEND);
  if (audience === 'emails') query = query.in('member_email', emails);
  const { data } = await query;
  return Array.from(new Set(((data || []) as Array<{ token: string }>).map((row) => row.token).filter(Boolean)));
}

/** Diagnóstico seguro da configuração do Firebase (não expõe segredo; só projeto e e-mail da conta de serviço). */
export async function getPushConfigStatusAction(): Promise<{
  configured: boolean;
  reason?: string;
  projectId?: string;
  clientEmail?: string;
}> {
  try {
    await assertPlatformAdminAccess();
    return getFirebaseConfigStatus();
  } catch {
    return { configured: false, reason: 'Sem permissão para consultar a configuração.' };
  }
}

export async function countPushAudienceAction(
  audience: AudienceType,
  emailsRaw: string,
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    await assertPlatformAdminAccess();
    const db = getServiceClient();
    if (!db) return { success: false, error: 'Configuração segura do servidor indisponível.' };
    const emails = audience === 'emails' ? parseEmails(emailsRaw) : [];
    if (audience === 'emails' && emails.length === 0) return { success: true, count: 0 };
    return { success: true, count: (await loadTokens(db, audience, emails)).length };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erro ao contar público.' };
  }
}

export async function sendPushCampaignAction(formData: FormData): Promise<{
  success: boolean;
  sent?: number;
  failed?: number;
  target?: number;
  error?: string;
}> {
  try {
    const { user } = await assertPlatformAdminAccess();
    const db = getServiceClient();
    if (!db) return { success: false, error: 'Configuração segura do servidor indisponível.' };
    if (!getFirebaseServiceAccount()) {
      const status = getFirebaseConfigStatus();
      return { success: false, error: `Envio indisponível. ${status.reason ?? 'Configure FIREBASE_SERVICE_ACCOUNT_JSON no servidor.'}` };
    }

    const contentMode = String(formData.get('contentMode') ?? 'text') as ContentMode;
    const title = String(formData.get('title') ?? '').trim();
    const body = String(formData.get('body') ?? '').trim();
    const route = String(formData.get('route') ?? '').trim();
    const audience = String(formData.get('audience') ?? 'all') as AudienceType;
    const emails = parseEmails(String(formData.get('emails') ?? ''));
    const expiresRaw = String(formData.get('expiresAt') ?? '');
    const file = formData.get('image');

    if (!['text', 'image', 'image_text'].includes(contentMode)) return { success: false, error: 'Formato de conteúdo inválido.' };
    if (!['all', 'emails'].includes(audience)) return { success: false, error: 'Público inválido.' };
    if (!title || title.length > 65) return { success: false, error: 'Informe um título de até 65 caracteres.' };
    if (contentMode !== 'image' && (!body || body.length > 240)) {
      return { success: false, error: 'Informe o texto da mensagem (até 240 caracteres).' };
    }
    if (route && !/^[a-zA-Z0-9\-_/#.?=&]{1,200}$/.test(route)) return { success: false, error: 'Destino (rota) inválido.' };
    if (audience === 'emails' && emails.length === 0) return { success: false, error: 'Informe ao menos um e-mail válido.' };

    const expiresAt = new Date(expiresRaw);
    if (Number.isNaN(expiresAt.getTime())) return { success: false, error: 'Informe o prazo de validade.' };
    const ttlSeconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    if (ttlSeconds < 60) return { success: false, error: 'O prazo de validade precisa estar no futuro.' };

    // Imagem (obrigatória nos modos "image" e "image_text")
    let imageUrl: string | null = null;
    let storagePath: string | null = null;
    if (contentMode !== 'text') {
      if (!(file instanceof File) || file.size <= 0) return { success: false, error: 'Envie a imagem da notificação.' };
      if (file.size > MAX_IMAGE_BYTES) return { success: false, error: 'A imagem deve ter no máximo 1 MB.' };
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!isSupportedImage(bytes)) return { success: false, error: 'Envie uma imagem JPG, PNG ou WebP válida.' };
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      storagePath = `push/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await db.storage
        .from('business-assets')
        .upload(storagePath, bytes, { contentType: file.type || `image/${ext}`, upsert: false });
      if (uploadError) return { success: false, error: `Falha no upload da imagem: ${uploadError.message}` };
      imageUrl = db.storage.from('business-assets').getPublicUrl(storagePath).data.publicUrl;
    }

    const tokens = await loadTokens(db, audience, emails);
    if (tokens.length === 0) {
      if (storagePath) await db.storage.from('business-assets').remove([storagePath]);
      return { success: false, error: 'Nenhum aparelho Android ativo encontrado para este público.' };
    }

    const ttl = Math.min(ttlSeconds, MAX_TTL_SECONDS);
    const payload = {
      title,
      body: contentMode === 'image' ? null : body,
      imageUrl,
      route: route || null,
      ttlSeconds: ttl,
    };

    let sent = 0;
    let failed = 0;
    let lastError: string | null = null;
    const invalidTokens: string[] = [];
    for (let i = 0; i < tokens.length; i += SEND_CONCURRENCY) {
      const batch = tokens.slice(i, i + SEND_CONCURRENCY);
      const results = await Promise.all(batch.map((token) => sendPushToToken(token, payload)));
      results.forEach((result, index) => {
        if (result.ok) {
          sent += 1;
        } else {
          failed += 1;
          lastError = result.error;
          if (result.invalidToken) invalidTokens.push(batch[index]!);
        }
      });
    }

    if (invalidTokens.length > 0) {
      await db.from('mobile_device_tokens').update({ is_active: false, updated_at: new Date().toISOString() }).in('token', invalidTokens);
    }

    const status = sent === 0 ? 'failed' : failed > 0 ? 'partial' : 'sent';
    await db.from('push_campaigns').insert({
      title,
      body: payload.body,
      image_url: imageUrl,
      storage_path: storagePath,
      content_mode: contentMode,
      route: payload.route,
      audience_type: audience,
      audience_emails: audience === 'emails' ? emails : null,
      expires_at: expiresAt.toISOString(),
      status,
      target_count: tokens.length,
      sent_count: sent,
      failed_count: failed,
      error_details: lastError,
      created_by: user.id,
      sent_at: new Date().toISOString(),
    });

    revalidatePath('/admin/notificacoes/push');
    if (sent === 0) return { success: false, target: tokens.length, sent, failed, error: lastError || 'Nenhuma notificação foi entregue.' };
    return { success: true, target: tokens.length, sent, failed };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erro ao enviar notificação.' };
  }
}

export async function listPushCampaignsAction(): Promise<{ success: boolean; items: PushCampaignListItem[]; error?: string }> {
  try {
    await assertPlatformAdminAccess();
    const db = getServiceClient();
    if (!db) return { success: false, items: [], error: 'Configuração segura do servidor indisponível.' };
    const { data, error } = await db
      .from('push_campaigns')
      .select('id, title, body, image_url, content_mode, route, audience_type, expires_at, status, target_count, sent_count, failed_count, error_details, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return { success: false, items: [], error: error.message };
    return { success: true, items: (data || []) as PushCampaignListItem[] };
  } catch (error) {
    return { success: false, items: [], error: error instanceof Error ? error.message : 'Erro ao listar campanhas.' };
  }
}
