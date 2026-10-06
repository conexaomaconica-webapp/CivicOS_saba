'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { resolveCanonicalAdminTenant } from '@/lib/admin/admin-tenant-context';
import { createAdminAdvertiserAction } from '@/lib/admin/admin-advertiser-create-service';
import { upsertAdminMasonicLinkAction } from '@/lib/admin/admin-businesses-service';
import { validateEmail, validateName } from '@/lib/auth/validation';
import { brandedEmailHtml, sendEmail } from '@/lib/email/send-email';
import { decryptSecret, encryptSecret } from '@/lib/payment/asaas-secrets';
import { resolveTenantBrandContext } from '@/lib/tenant/tenant-brand';
import {
  INVITE_TTL_DAYS_DEFAULT,
  INVITE_TTL_DAYS_MAX,
  generateInviteToken,
  buildInviteShareMessage,
  hashInviteToken,
  isInviteUsable,
  normalizeInviteToken,
  normalizeSubmission,
  validateSubmission,
  type InviteStatus,
  type SignupSubmission,
} from '@/lib/onboarding/signup-invite-core';

/**
 * Convite de cadastro. Ações de ADMIN (criar, listar, revogar, converter) conferem admin de plataforma antes de qualquer
 * leitura/gravação com chave de serviço. As ações PÚBLICAS (abrir e enviar) só funcionam com o token do convite.
 * O cliente nunca vê plano, preço, contrato ou pagamento: depois da conferência, a equipe cria o cadastro e a contratação
 * segue o fluxo atual (que só avança depois da conferência dos dados).
 */

export interface InviteListItem {
  id: string;
  invited_name: string | null;
  invited_email: string | null;
  note: string | null;
  status: InviteStatus;
  expired: boolean;
  expires_at: string;
  created_at: string;
  submitted_at: string | null;
  business_id: string | null;
  email_sent_at: string | null;
  /** O link pode ser reaberto (copiar/WhatsApp): convite criado com código cifrado. */
  has_link: boolean;
}

export type InviteEmailStatus = 'sent' | 'not_configured' | 'failed' | 'skipped';

const service = () => createServiceRoleClient() as any;

async function baseUrl(): Promise<string> {
  try {
    const host = (await headers()).get('host');
    if (host) return `${host.startsWith('localhost') ? 'http' : 'https'}://${host}`;
  } catch {}
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

// ---------------------------------------------------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------------------------------------------------

export async function createSignupInviteAction(input: {
  invitedName?: string;
  invitedEmail?: string;
  note?: string;
  expiresInDays?: number;
  /** Envia o link por e-mail ao convidado (exige o e-mail). */
  sendEmail?: boolean;
}): Promise<{ success: boolean; url?: string; inviteId?: string; expiresAt?: string; emailStatus?: InviteEmailStatus; error?: string }> {
  try {
    const { user, tenantId } = await resolveCanonicalAdminTenant();
    const db = service();
    if (!db) return { success: false, error: 'Configuração segura do Supabase indisponível no servidor.' };

    const invitedName = (input.invitedName || '').trim().slice(0, 120);
    const invitedEmail = (input.invitedEmail || '').trim().toLowerCase().slice(0, 160);
    if (invitedName && validateName(invitedName)) return { success: false, error: 'Nome do convidado inválido.' };
    if (invitedEmail && validateEmail(invitedEmail)) return { success: false, error: 'E-mail do convidado inválido.' };

    const days = Math.min(Math.max(Math.round(input.expiresInDays || INVITE_TTL_DAYS_DEFAULT), 1), INVITE_TTL_DAYS_MAX);
    const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();
    const token = generateInviteToken();

    const { data, error } = await db
      .from('business_signup_invites')
      .insert({
        tenant_id: tenantId,
        token_hash: hashInviteToken(token),
        encrypted_code: encryptSecret(token),
        invited_name: invitedName || null,
        invited_email: invitedEmail || null,
        note: (input.note || '').trim().slice(0, 500) || null,
        expires_at: expiresAt,
        created_by: user.id,
      })
      .select('id')
      .single();
    if (error || !data) {
      return { success: false, error: 'Não foi possível criar o convite (a migration 194 foi aplicada?).' };
    }

    await db.from('admin_audit_logs').insert({
      tenant_id: tenantId,
      actor_id: user.id,
      entity_type: 'business_signup_invite',
      entity_id: data.id,
      action: 'CREATE_SIGNUP_INVITE',
      after_value: { invited_email: invitedEmail || null, expires_at: expiresAt },
      reason: 'Convite de cadastro gerado para preenchimento pelo cliente.',
    });

    const url = `${await baseUrl()}/c/${token}`;
    let emailStatus: InviteEmailStatus = 'skipped';
    if (input.sendEmail && invitedEmail) {
      const brand = await resolveTenantBrandContext();
      const brandName = brand?.appName || 'Conexão Maçônica';
      const greeting = invitedName ? `Olá, ${invitedName}!` : 'Olá!';
      const validity = new Date(expiresAt).toLocaleDateString('pt-BR');
      const mail = await sendEmail({
        to: invitedEmail,
        subject: `Cadastre sua empresa no ${brandName}`,
        html: brandedEmailHtml({
          brandName,
          primaryColor: brand?.primaryColor || '#5d1523',
          heading: 'Cadastre sua empresa',
          paragraphs: [
            greeting,
            `A equipe do ${brandName} convidou você a informar os dados da sua empresa. O preenchimento leva poucos minutos.`,
            'Nada é publicado agora: a equipe confere as informações e entra em contato com os próximos passos.',
          ],
          buttonLabel: 'Preencher os dados',
          buttonUrl: url,
          footnote: `Este link é pessoal, de uso único e vale até ${validity}.`,
        }),
        text: `${greeting}\n\nA equipe do ${brandName} convidou você a informar os dados da sua empresa.\nPreencha em: ${url}\n\nO link é pessoal, de uso único e vale até ${validity}. Nada é publicado antes da conferência da equipe.`,
      });
      emailStatus = mail.sent ? 'sent' : mail.reason === 'not_configured' ? 'not_configured' : 'failed';
      if (mail.sent) {
        await db.from('business_signup_invites').update({ email_sent_at: new Date().toISOString() }).eq('id', data.id);
      } else if (mail.reason !== 'not_configured') {
        console.error('[createSignupInviteAction] falha ao enviar e-mail', mail.reason, mail.detail);
      }
    }

    revalidatePath('/admin/empresas/convites');
    return { success: true, url, inviteId: data.id, expiresAt, emailStatus };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao criar o convite.' };
  }
}

export async function listSignupInvitesAction(): Promise<{ success: boolean; items: InviteListItem[]; error?: string }> {
  try {
    const { tenantId } = await resolveCanonicalAdminTenant();
    const db = service();
    if (!db) return { success: false, items: [], error: 'Configuração segura do Supabase indisponível no servidor.' };
    const { data, error } = await db
      .from('business_signup_invites')
      .select('id, invited_name, invited_email, note, status, expires_at, created_at, submitted_at, business_id, email_sent_at, encrypted_code')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return { success: false, items: [], error: 'Não foi possível ler os convites (a migration 194 foi aplicada?).' };
    const items: InviteListItem[] = (data || []).map(({ encrypted_code, ...row }: any) => ({
      ...row,
      has_link: Boolean(encrypted_code),
      expired: row.status === 'sent' && new Date(row.expires_at).getTime() <= Date.now(),
    }));
    return { success: true, items };
  } catch (err: any) {
    return { success: false, items: [], error: err?.message || 'Erro ao listar convites.' };
  }
}

export async function getSignupInviteForReviewAction(inviteId: string): Promise<{
  success: boolean;
  invite?: InviteListItem & { submitted_data: SignupSubmission | null };
  error?: string;
}> {
  try {
    const { tenantId } = await resolveCanonicalAdminTenant();
    const db = service();
    if (!db) return { success: false, error: 'Configuração segura do Supabase indisponível no servidor.' };
    const { data } = await db
      .from('business_signup_invites')
      .select('id, invited_name, invited_email, note, status, expires_at, created_at, submitted_at, business_id, email_sent_at, submitted_data')
      .eq('id', inviteId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (!data) return { success: false, error: 'Convite não encontrado.' };
    return {
      success: true,
      invite: { ...data, has_link: false, expired: data.status === 'sent' && new Date(data.expires_at).getTime() <= Date.now() },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao abrir o convite.' };
  }
}

/**
 * Link de um convite ainda ativo, para copiar ou enviar de novo. Só admin; devolve o MESMO link que o cliente já recebeu
 * (o código é guardado cifrado). Convites anteriores à migration 195 não têm o código: use "Gerar novo link".
 */
export async function getSignupInviteLinkAction(inviteId: string): Promise<{
  success: boolean;
  url?: string;
  message?: string;
  error?: string;
}> {
  try {
    const { tenantId } = await resolveCanonicalAdminTenant();
    const db = service();
    if (!db) return { success: false, error: 'Configuração segura do Supabase indisponível no servidor.' };
    const { data } = await db
      .from('business_signup_invites')
      .select('id, invited_name, status, expires_at, encrypted_code')
      .eq('id', inviteId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (!data) return { success: false, error: 'Convite não encontrado.' };
    if (!isInviteUsable(data)) return { success: false, error: 'Este convite já foi usado, cancelado ou expirou.' };
    const code = data.encrypted_code ? decryptSecret(data.encrypted_code) : '';
    if (!code) {
      return { success: false, error: 'Este convite é anterior ao recurso de reabrir o link. Use "Gerar novo link".' };
    }
    const url = `${await baseUrl()}/c/${code}`;
    const daysLeft = Math.max(1, Math.ceil((new Date(data.expires_at).getTime() - Date.now()) / 86_400_000));
    return { success: true, url, message: buildInviteShareMessage({ name: data.invited_name, link: url, daysLeft }) };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao abrir o link do convite.' };
  }
}

/**
 * Gera um link novo para o MESMO convite (ainda não usado nem cancelado):
 *  - convite expirado: renova o prazo (padrão de 15 dias) com o link novo;
 *  - convite ativo mas sem o código guardado (criado antes da migration 195): troca o link, mantendo o prazo.
 * O link anterior deixa de valer.
 */
export async function regenerateSignupInviteLinkAction(inviteId: string): Promise<{
  success: boolean;
  url?: string;
  message?: string;
  error?: string;
}> {
  try {
    const { user, tenantId } = await resolveCanonicalAdminTenant();
    const db = service();
    if (!db) return { success: false, error: 'Configuração segura do Supabase indisponível no servidor.' };
    const { data } = await db
      .from('business_signup_invites')
      .select('id, invited_name, status, expires_at')
      .eq('id', inviteId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (!data) return { success: false, error: 'Convite não encontrado.' };
    if (data.status !== 'sent') return { success: false, error: 'Este convite já foi usado ou cancelado.' };

    const expired = !isInviteUsable(data);
    const expiresAt = expired
      ? new Date(Date.now() + INVITE_TTL_DAYS_DEFAULT * 86_400_000).toISOString()
      : data.expires_at;

    const token = generateInviteToken();
    const { error } = await db
      .from('business_signup_invites')
      .update({ token_hash: hashInviteToken(token), encrypted_code: encryptSecret(token), expires_at: expiresAt })
      .eq('id', inviteId)
      .eq('status', 'sent');
    if (error) return { success: false, error: 'Não foi possível gerar o novo link (a migration 195 foi aplicada?).' };

    await db.from('admin_audit_logs').insert({
      tenant_id: tenantId,
      actor_id: user.id,
      entity_type: 'business_signup_invite',
      entity_id: inviteId,
      action: 'REGENERATE_SIGNUP_INVITE_LINK',
      reason: 'Novo link gerado para o convite; o link anterior deixou de valer.',
    });
    revalidatePath('/admin/empresas/convites');

    const url = `${await baseUrl()}/c/${token}`;
    const daysLeft = Math.max(1, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000));
    return { success: true, url, message: buildInviteShareMessage({ name: data.invited_name, link: url, daysLeft }) };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao gerar o novo link.' };
  }
}

export async function revokeSignupInviteAction(inviteId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, tenantId } = await resolveCanonicalAdminTenant();
    const db = service();
    if (!db) return { success: false, error: 'Configuração segura do Supabase indisponível no servidor.' };
    const { data, error } = await db
      .from('business_signup_invites')
      .update({ status: 'revoked', revoked_at: new Date().toISOString() })
      .eq('id', inviteId)
      .eq('tenant_id', tenantId)
      .in('status', ['sent', 'submitted'])
      .select('id')
      .maybeSingle();
    if (error || !data) return { success: false, error: 'Convite não encontrado ou já finalizado.' };
    await db.from('admin_audit_logs').insert({
      tenant_id: tenantId,
      actor_id: user.id,
      entity_type: 'business_signup_invite',
      entity_id: inviteId,
      action: 'REVOKE_SIGNUP_INVITE',
      reason: 'Convite de cadastro revogado pela equipe.',
    });
    revalidatePath('/admin/empresas/convites');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao revogar o convite.' };
  }
}

/**
 * Exclui o convite de vez: o link deixa de funcionar e o convite sai da lista. Se o cliente já tinha enviado os dados e
 * ninguém criou o cadastro ainda, esses dados também são apagados. O cadastro de uma empresa já criada a partir do convite
 * não é afetado (só o registro do convite some). Fica registrado na auditoria quem excluiu.
 */
export async function deleteSignupInviteAction(inviteId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, tenantId } = await resolveCanonicalAdminTenant();
    const db = service();
    if (!db) return { success: false, error: 'Configuração segura do Supabase indisponível no servidor.' };

    const { data: invite } = await db
      .from('business_signup_invites')
      .select('id, status, invited_email, business_id')
      .eq('id', inviteId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (!invite) return { success: false, error: 'Convite não encontrado.' };

    const { error } = await db
      .from('business_signup_invites')
      .delete()
      .eq('id', inviteId)
      .eq('tenant_id', tenantId);
    if (error) return { success: false, error: 'Não foi possível excluir o convite.' };

    await db.from('admin_audit_logs').insert({
      tenant_id: tenantId,
      actor_id: user.id,
      entity_type: 'business_signup_invite',
      entity_id: inviteId,
      action: 'DELETE_SIGNUP_INVITE',
      before_value: { status: invite.status, invited_email: invite.invited_email, business_id: invite.business_id },
      reason: 'Convite de cadastro excluído pela equipe.',
    });

    revalidatePath('/admin/empresas/convites');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao excluir o convite.' };
  }
}

/**
 * Conferência concluída: a equipe cria o cadastro a partir do que o cliente enviou (com as correções feitas na revisão).
 * Cria a conta do responsável (senha temporária definida pela equipe), a empresa em rascunho (pre_cadastro) e o vínculo
 * maçônico pendente (vínculo informado). Contrato e pagamento só avançam depois da verificação do vínculo e da conferência
 * dos dados comerciais, como no cadastro manual.
 */
export async function convertSignupInviteAction(input: {
  inviteId: string;
  data: Partial<SignupSubmission>;
  categoryId: string;
  planCode: string;
  temporaryPassword: string;
  organizationId?: string;
}): Promise<{ success: boolean; businessId?: string; warnings?: string[]; error?: string }> {
  try {
    const { user, tenantId } = await resolveCanonicalAdminTenant();
    const db = service();
    if (!db) return { success: false, error: 'Configuração segura do Supabase indisponível no servidor.' };

    const { data: invite } = await db
      .from('business_signup_invites')
      .select('id, status, submitted_data')
      .eq('id', input.inviteId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (!invite) return { success: false, error: 'Convite não encontrado.' };
    if (invite.status !== 'submitted') return { success: false, error: 'Este convite não está aguardando conferência.' };

    // Dados enviados pelo cliente + correções da equipe, revalidados.
    const merged = normalizeSubmission({ ...(invite.submitted_data || {}), ...(input.data || {}), consent: true });
    const invalid = validateSubmission({ ...merged, categoryId: input.categoryId || merged.categoryId });
    if (invalid) return { success: false, error: invalid };
    if (!input.categoryId) return { success: false, error: 'Escolha a categoria no catálogo (ou crie a nova antes de converter).' };

    const created = await createAdminAdvertiserAction({
      tenantId,
      responsibleName: merged.responsibleName,
      responsibleEmail: merged.responsibleEmail,
      temporaryPassword: input.temporaryPassword,
      tradingName: merged.tradingName,
      legalName: merged.legalName,
      cnpj: merged.document,
      phone: merged.businessPhone || merged.responsiblePhone,
      categoryId: input.categoryId,
      planCode: input.planCode,
    });
    if (!created.success || !created.businessId) {
      return { success: false, error: created.error || 'Não foi possível criar o cadastro.' };
    }
    const businessId = created.businessId;
    const warnings: string[] = [];

    // E-mail e site públicos (opcionais).
    const publicBits: Record<string, string> = {};
    if (merged.publicEmail) publicBits.email = merged.publicEmail;
    if (merged.website) publicBits.website = merged.website;
    if (Object.keys(publicBits).length > 0) {
      await db.from('businesses').update({ ...publicBits, updated_at: new Date().toISOString() }).eq('id', businessId);
    }

    // Endereço: só entra se a cidade/UF existirem no cadastro oficial; senão a equipe completa no prontuário.
    try {
      const { data: stateRow } = await db.from('brazilian_states').select('ibge_code').eq('uf', merged.state).maybeSingle();
      const { data: cityRow } = stateRow
        ? await db.from('brazilian_cities').select('ibge_code, name').eq('state_ibge_code', stateRow.ibge_code).eq('name', merged.city).maybeSingle()
        : { data: null };
      if (cityRow) {
        const postal = /^\d{5}-?\d{3}$/.test(merged.postalCode) ? merged.postalCode : '00000-000';
        const { error: locError } = await db.from('business_locations').insert({
          tenant_id: tenantId,
          business_id: businessId,
          street: merged.street || 'Endereço não informado',
          number: merged.number || null,
          neighborhood: merged.neighborhood || null,
          city: cityRow.name,
          city_ibge_code: cityRow.ibge_code,
          state: merged.state,
          postal_code: postal,
          is_headquarters: true,
        });
        if (locError) warnings.push('Endereço não foi gravado: complete no prontuário da empresa.');
      } else {
        warnings.push('Cidade/estado não encontrados no cadastro oficial: complete o endereço no prontuário da empresa.');
      }
    } catch {
      warnings.push('Endereço não foi gravado: complete no prontuário da empresa.');
    }

    // Vínculo maçônico: pendente de verificação (a equipe confere em seguida).
    const relation = merged.masonicRelation;
    const link = await upsertAdminMasonicLinkAction(businessId, {
      lodge_name: merged.lodgeName,
      organization_id: input.organizationId || undefined,
      potency: merged.potency,
      link_type: relation === 'mason' ? 'owner' : 'family_owner',
      eligibility_type: relation,
      reference_mason_name: merged.referenceMasonName,
      reference_mason_cim: merged.referenceMasonCim || undefined,
      family_relationship: relation === 'mason_spouse' ? 'conjuge' : relation === 'mason_family' ? 'sobrinho' : undefined,
      notes: 'Informado pelo cliente pelo convite de cadastro; aguardando conferência da equipe.',
      status: 'pending',
    });
    if (!link.success) warnings.push(`Vínculo maçônico não foi registrado (${link.error}): registre em Vínculo Maçônico.`);

    await db
      .from('business_signup_invites')
      .update({ status: 'converted', business_id: businessId, converted_by: user.id, converted_at: new Date().toISOString() })
      .eq('id', input.inviteId);

    await db.from('admin_audit_logs').insert({
      tenant_id: tenantId,
      actor_id: user.id,
      entity_type: 'business',
      entity_id: businessId,
      action: 'CONVERT_SIGNUP_INVITE',
      after_value: { invite_id: input.inviteId, plan_code: input.planCode, warnings },
      reason: 'Cadastro criado pela equipe após conferir os dados enviados pelo cliente.',
    });

    revalidatePath('/admin/empresas');
    revalidatePath('/admin/empresas/convites');
    return { success: true, businessId, warnings };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao converter o convite.' };
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Público (só com o token do convite)
// ---------------------------------------------------------------------------------------------------------------------

async function findInviteByToken(token: string) {
  const db = service();
  const normalized = normalizeInviteToken(token);
  if (!db || !normalized) return null;
  const { data } = await db
    .from('business_signup_invites')
    .select('id, tenant_id, status, expires_at, invited_name, invited_email')
    .eq('token_hash', hashInviteToken(normalized))
    .maybeSingle();
  return data as { id: string; tenant_id: string; status: string; expires_at: string; invited_name: string | null; invited_email: string | null } | null;
}

export async function getSignupInviteByTokenAction(token: string): Promise<{
  state: 'valid' | 'invalid' | 'expired' | 'submitted';
  invitedName?: string;
  invitedEmail?: string;
  categories?: Array<{ id: string; name: string }>;
}> {
  const invite = await findInviteByToken(token);
  if (!invite || invite.status === 'revoked') return { state: 'invalid' };
  if (invite.status !== 'sent') return { state: 'submitted' };
  if (!isInviteUsable(invite)) return { state: 'expired' };

  const db = service();
  const { data: categories } = await db
    .from('categories')
    .select('id, name')
    .eq('is_active', true)
    .or(`tenant_id.is.null,tenant_id.eq.${invite.tenant_id}`)
    .order('name')
    .limit(500);

  return {
    state: 'valid',
    invitedName: invite.invited_name || undefined,
    invitedEmail: invite.invited_email || undefined,
    categories: categories || [],
  };
}

export async function submitSignupInviteAction(
  token: string,
  raw: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Campo-isca invisível: robôs preenchem, pessoas não.
    if (typeof raw?.website2 === 'string' && raw.website2.trim() !== '') return { success: true };

    const invite = await findInviteByToken(token);
    if (!invite || !isInviteUsable(invite)) {
      return { success: false, error: 'Este link de cadastro não é mais válido. Peça um novo link à equipe.' };
    }

    const data = normalizeSubmission(raw);
    const invalid = validateSubmission(data);
    if (invalid) return { success: false, error: invalid };

    const db = service();
    // A condição status = 'sent' garante uso único mesmo com envios simultâneos.
    const { data: updated, error } = await db
      .from('business_signup_invites')
      .update({ status: 'submitted', submitted_at: new Date().toISOString(), submitted_data: data })
      .eq('id', invite.id)
      .eq('status', 'sent')
      .select('id')
      .maybeSingle();
    if (error || !updated) return { success: false, error: 'Este cadastro já foi enviado ou o link não é mais válido.' };

    // Sem revalidatePath aqui: recarregar a página pública no meio do envio troca o formulário por "já enviado" e esconde a
    // confirmação. A lista do admin é dinâmica e já mostra o convite como enviado ao ser aberta.
    return { success: true };
  } catch {
    return { success: false, error: 'Não foi possível enviar agora. Tente novamente em instantes.' };
  }
}
