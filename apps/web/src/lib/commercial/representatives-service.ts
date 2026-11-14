'use server';

import { revalidatePath } from 'next/cache';
import { validateCnpj, validateCpf, validatePhone } from '@/lib/onboarding/onboarding-validation';
import { tryCommercialPermission } from './commercial-auth';
import { auditCommercial, fail, requireWriter, type ActionResult } from './commercial-service-base';
import { encryptSensitive, hashSensitive } from './commercial-secrets';
import { clampTempPasswordHours, generateTempPassword, TEMP_PASSWORD_DEFAULT_HOURS } from './temp-password';
import {
  canTransitionRepresentative,
  documentLast4,
  friendlyCommercialError,
  generateReferralCode,
  isValidEmail,
  normalizeEmail,
  onlyDigits,
} from './commercial-utils';

const REPRESENTATIVE_LIST_COLUMNS =
  'id, user_id, person_type, legal_name, trade_name, email, phone, document_last4, referral_code, status, status_changed_at, contract_version, contract_accepted_at, termination_reason, created_at, access_mode, temp_password_expires_at, password_changed_at';

export type RepresentativeListItem = {
  id: string;
  user_id: string | null;
  person_type: 'pf' | 'pj';
  legal_name: string;
  trade_name: string | null;
  email: string;
  phone: string | null;
  document_last4: string | null;
  referral_code: string;
  status: 'invited' | 'pending_review' | 'active' | 'suspended' | 'terminated';
  status_changed_at: string;
  contract_version: string | null;
  contract_accepted_at: string | null;
  termination_reason: string | null;
  created_at: string;
  access_mode: 'invite' | 'temp_password';
  temp_password_expires_at: string | null;
  password_changed_at: string | null;
};

export type CreateRepresentativeInput = {
  personType: 'pf' | 'pj';
  legalName: string;
  tradeName?: string;
  email: string;
  phone?: string;
  document: string;
  pixKeyType?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random' | '';
  pixKey?: string;
  /** 'invite' (padrão): vínculo pelo e-mail verificado. 'temp_password': a equipe cria o acesso com senha temporária. */
  accessMode?: 'invite' | 'temp_password';
  tempPasswordHours?: number;
};

export type CreateRepresentativeResult = {
  id: string;
  referralCode: string;
  linkedUser: boolean;
  /** Exibida UMA ÚNICA vez à equipe; nunca é gravada em banco, auditoria ou log. */
  temporaryPassword?: string;
  tempPasswordExpiresAt?: string;
};

export async function listRepresentativesAction(): Promise<ActionResult<RepresentativeListItem[]>> {
  const auth = await tryCommercialPermission('representatives.read');
  if (!auth.ok) return fail(auth.error);

  // Cliente DO USUÁRIO: a RLS (migration 235) limita o resultado e as colunas.
  const { data, error } = await (auth.supabase as any)
    .from('commercial_representatives')
    .select(REPRESENTATIVE_LIST_COLUMNS)
    .eq('tenant_id', auth.tenantId)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return fail('Não foi possível listar os representantes.');
  return { success: true, data: (data ?? []) as RepresentativeListItem[] };
}

export async function createRepresentativeAction(input: CreateRepresentativeInput): Promise<ActionResult<CreateRepresentativeResult>> {
  const auth = await tryCommercialPermission('representatives.manage');
  if (!auth.ok) return fail(auth.error);

  const personType = input.personType === 'pj' ? 'pj' : 'pf';
  const legalName = (input.legalName ?? '').trim();
  const email = normalizeEmail(input.email);
  const documentDigits = onlyDigits(input.document);

  if (legalName.length < 3 || legalName.length > 160) return fail('Informe o nome completo (ou razão social).');
  if (!isValidEmail(email)) return fail('Informe um e-mail válido.');
  const documentError = personType === 'pf' ? validateCpf(documentDigits) : validateCnpj(documentDigits);
  if (documentError) return fail(documentError);
  if (input.phone?.trim() && validatePhone(input.phone)) return fail('Telefone inválido.');

  let pixKeyType: string | null = null;
  let pixKeyEncrypted: string | null = null;
  let pixKeyHint: string | null = null;
  if (input.pixKeyType && input.pixKey?.trim()) {
    pixKeyType = input.pixKeyType;
    pixKeyEncrypted = encryptSensitive(input.pixKey.trim());
    pixKeyHint = `…${input.pixKey.trim().slice(-4)}`;
  }

  const directAccess = input.accessMode === 'temp_password';

  let writer: ReturnType<typeof requireWriter> | null = null;
  let createdUserId: string | null = null;
  try {
    writer = requireWriter();
    const db = writer;

    // Vincula ao usuário JÁ EXISTENTE (mesmo login do anunciante, se houver) pelo e-mail do perfil.
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('tenant_id', auth.tenantId)
      .ilike('email', email)
      .maybeSingle();

    // Acesso direto: cria o usuário com senha temporária gerada pelo servidor. NUNCA mexe em conta existente.
    let temporaryPassword: string | undefined;
    let tempExpiresAt: string | undefined;
    if (directAccess) {
      const { data: anyProfile } = await db.from('profiles').select('id').ilike('email', email).limit(1).maybeSingle();
      if (profile?.id || anyProfile?.id) {
        return fail('Este e-mail já possui conta. Use o cadastro por convite: a conta existente é vinculada e a senha dela não é alterada.');
      }
      temporaryPassword = generateTempPassword();
      tempExpiresAt = new Date(Date.now() + clampTempPasswordHours(input.tempPasswordHours ?? TEMP_PASSWORD_DEFAULT_HOURS) * 3600_000).toISOString();
      const { data: created, error: createError } = await db.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: { name: legalName },
        app_metadata: { must_change_password: true, temp_password_expires_at: tempExpiresAt },
      });
      if (createError || !created?.user) {
        return fail(/already|registered|exists/i.test(createError?.message ?? '')
          ? 'Este e-mail já possui conta. Use o cadastro por convite.'
          : 'Não foi possível criar o acesso do representante.');
      }
      createdUserId = created.user.id;
    }

    const base = {
      tenant_id: auth.tenantId,
      user_id: createdUserId ?? profile?.id ?? null,
      person_type: personType,
      legal_name: legalName,
      trade_name: input.tradeName?.trim() || null,
      email,
      phone: input.phone?.trim() || null,
      document_hash: hashSensitive(`doc:${documentDigits}`),
      document_last4: documentLast4(documentDigits),
      document_encrypted: encryptSensitive(documentDigits),
      pix_key_type: pixKeyType,
      pix_key_encrypted: pixKeyEncrypted,
      pix_key_hint: pixKeyHint,
      status: createdUserId || profile?.id ? 'pending_review' : 'invited',
      created_by: auth.user.id,
      access_mode: directAccess ? 'temp_password' : 'invite',
      temp_password_expires_at: directAccess ? (tempExpiresAt ?? null) : null,
    };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data, error } = await db
        .from('commercial_representatives')
        .insert({ ...base, referral_code: generateReferralCode() })
        .select('id, referral_code')
        .single();

      if (!error && data) {
        await auditCommercial(db, {
          tenantId: auth.tenantId,
          actorId: auth.user.id,
          entityType: 'commercial_representative',
          entityId: data.id,
          action: 'COMMERCIAL_REPRESENTATIVE_CREATED',
          after: {
            person_type: personType,
            status: base.status,
            linked_user: Boolean(profile?.id),
            access_mode: base.access_mode,
            temp_password_expires_at: base.temp_password_expires_at,
          },
        });
        revalidatePath('/comercial/representantes');
        return {
          success: true,
          data: {
            id: data.id,
            referralCode: data.referral_code,
            linkedUser: Boolean(profile?.id),
            ...(directAccess ? { temporaryPassword, tempPasswordExpiresAt: tempExpiresAt } : {}),
          },
        };
      }
      if (error && /uq_commercial_representatives_code/.test(error.message)) continue; // colisão de código: sorteia outro
      await discardCreatedUser(db, createdUserId);
      if (error && /uq_commercial_representatives_user/.test(error.message)) return fail('Este usuário já é representante.');
      return fail(friendlyCommercialError(error?.message));
    }
    await discardCreatedUser(writer, createdUserId);
    return fail('Não foi possível gerar um código de indicação único. Tente novamente.');
  } catch (error) {
    await discardCreatedUser(writer, createdUserId);
    return fail(error instanceof Error && /Chave de hash/.test(error.message) ? error.message : 'Erro ao cadastrar o representante.');
  }
}

export type RepresentativeStatusInput = {
  representativeId: string;
  status: 'pending_review' | 'active' | 'suspended' | 'terminated';
  reason?: string;
  /** Versão do contrato aceito (obrigatória para ativar quem ainda não tem aceite registrado). */
  contractVersion?: string;
};

export async function setRepresentativeStatusAction(input: RepresentativeStatusInput): Promise<ActionResult> {
  const auth = await tryCommercialPermission('representatives.manage');
  if (!auth.ok) return fail(auth.error);

  try {
    const writer = requireWriter();
    const { data: rep } = await writer
      .from('commercial_representatives')
      .select('id, status, contract_accepted_at, document_hash')
      .eq('id', input.representativeId)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle();
    if (!rep) return fail('Representante não encontrado.');
    if (!canTransitionRepresentative(rep.status, input.status)) {
      return fail(`Não é possível mudar de "${rep.status}" para "${input.status}".`);
    }

    const reason = input.reason?.trim() || null;
    if ((input.status === 'suspended' || input.status === 'terminated') && !reason) {
      return fail('Informe o motivo.');
    }

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status: input.status, status_changed_at: now };

    if (input.status === 'active') {
      if (!rep.document_hash) return fail('O representante precisa ter o documento cadastrado para ser ativado.');
      if (!rep.contract_accepted_at) {
        const version = input.contractVersion?.trim();
        if (!version) return fail('Informe a versão do contrato aceito para ativar o representante.');
        patch.contract_version = version;
        patch.contract_accepted_at = now;
      }
      patch.suspended_at = null;
    }
    if (input.status === 'suspended') patch.suspended_at = now;
    if (input.status === 'terminated') {
      patch.terminated_at = now;
      patch.termination_reason = reason;
    }

    const { error } = await writer.from('commercial_representatives').update(patch).eq('id', rep.id).eq('tenant_id', auth.tenantId);
    if (error) return fail(friendlyCommercialError(error.message));

    // Créditos já adquiridos NUNCA são alterados por mudança de status (livro-razão imutável).
    await auditCommercial(writer, {
      tenantId: auth.tenantId,
      actorId: auth.user.id,
      entityType: 'commercial_representative',
      entityId: rep.id,
      action: `COMMERCIAL_REP_${input.status.toUpperCase()}`,
      before: { status: rep.status },
      after: { status: input.status },
      reason,
    });
    revalidatePath('/comercial/representantes');
    return { success: true };
  } catch {
    return fail('Erro ao atualizar o status do representante.');
  }
}

/** Desfaz o usuário criado pelo acesso direto quando o cadastro do representante não se completa. */
async function discardCreatedUser(db: ReturnType<typeof requireWriter> | null, userId: string | null): Promise<void> {
  if (!db || !userId) return;
  try {
    await db.auth.admin.deleteUser(userId);
  } catch (error) {
    console.error('[commercial] falha ao desfazer usuário do acesso direto:', error instanceof Error ? error.message : error);
  }
}

/**
 * Nova senha temporária (ex.: a anterior expirou ou se perdeu). Só enquanto o representante ainda não trocou a senha:
 * depois disso a senha é dele e a equipe não a redefine por aqui. A senha é devolvida UMA vez e nunca registrada.
 */
export async function regenerateTempPasswordAction(input: {
  representativeId: string;
  hours?: number;
}): Promise<ActionResult<{ temporaryPassword: string; tempPasswordExpiresAt: string }>> {
  const auth = await tryCommercialPermission('representatives.manage');
  if (!auth.ok) return fail(auth.error);

  try {
    const writer = requireWriter();
    const { data: rep } = await writer
      .from('commercial_representatives')
      .select('id, user_id, status, access_mode, password_changed_at')
      .eq('id', input.representativeId)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle();
    if (!rep) return fail('Representante não encontrado.');
    if (rep.access_mode !== 'temp_password' || !rep.user_id) return fail('Este representante não foi cadastrado com senha temporária.');
    if (rep.password_changed_at) return fail('O representante já definiu a própria senha. Peça que use "Esqueci minha senha".');
    if (rep.status === 'terminated') return fail('Representante desligado.');

    const temporaryPassword = generateTempPassword();
    const tempPasswordExpiresAt = new Date(Date.now() + clampTempPasswordHours(input.hours ?? TEMP_PASSWORD_DEFAULT_HOURS) * 3600_000).toISOString();

    const { error } = await writer.auth.admin.updateUserById(rep.user_id as string, {
      password: temporaryPassword,
      app_metadata: { must_change_password: true, temp_password_expires_at: tempPasswordExpiresAt },
    });
    if (error) return fail('Não foi possível gerar a nova senha temporária.');

    await writer
      .from('commercial_representatives')
      .update({ temp_password_expires_at: tempPasswordExpiresAt })
      .eq('id', rep.id)
      .eq('tenant_id', auth.tenantId);

    await auditCommercial(writer, {
      tenantId: auth.tenantId,
      actorId: auth.user.id,
      entityType: 'commercial_representative',
      entityId: rep.id,
      action: 'COMMERCIAL_REP_TEMP_PASSWORD_REGEN',
      after: { temp_password_expires_at: tempPasswordExpiresAt },
    });
    revalidatePath('/comercial/representantes');
    return { success: true, data: { temporaryPassword, tempPasswordExpiresAt } };
  } catch {
    return fail('Erro ao gerar a nova senha temporária.');
  }
}
