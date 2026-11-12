'use server';

import { revalidatePath } from 'next/cache';
import { validateCnpj, validateCpf, validatePhone } from '@/lib/onboarding/onboarding-validation';
import { tryCommercialPermission } from './commercial-auth';
import { auditCommercial, fail, requireWriter, type ActionResult } from './commercial-service-base';
import { encryptSensitive, hashSensitive } from './commercial-secrets';
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
  'id, user_id, person_type, legal_name, trade_name, email, phone, document_last4, referral_code, status, status_changed_at, contract_version, contract_accepted_at, termination_reason, created_at';

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

export async function createRepresentativeAction(input: CreateRepresentativeInput): Promise<ActionResult<{ id: string; referralCode: string; linkedUser: boolean }>> {
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

  try {
    const writer = requireWriter();

    // Vincula ao usuário JÁ EXISTENTE (mesmo login do anunciante, se houver) pelo e-mail do perfil.
    const { data: profile } = await writer
      .from('profiles')
      .select('id')
      .eq('tenant_id', auth.tenantId)
      .ilike('email', email)
      .maybeSingle();

    const base = {
      tenant_id: auth.tenantId,
      user_id: profile?.id ?? null,
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
      status: profile?.id ? 'pending_review' : 'invited',
      created_by: auth.user.id,
    };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data, error } = await writer
        .from('commercial_representatives')
        .insert({ ...base, referral_code: generateReferralCode() })
        .select('id, referral_code')
        .single();

      if (!error && data) {
        await auditCommercial(writer, {
          tenantId: auth.tenantId,
          actorId: auth.user.id,
          entityType: 'commercial_representative',
          entityId: data.id,
          action: 'COMMERCIAL_REPRESENTATIVE_CREATED',
          after: { person_type: personType, status: base.status, linked_user: Boolean(profile?.id) },
        });
        revalidatePath('/comercial/representantes');
        return { success: true, data: { id: data.id, referralCode: data.referral_code, linkedUser: Boolean(profile?.id) } };
      }
      if (error && /uq_commercial_representatives_code/.test(error.message)) continue; // colisão de código: sorteia outro
      if (error && /uq_commercial_representatives_user/.test(error.message)) return fail('Este usuário já é representante.');
      return fail(friendlyCommercialError(error?.message));
    }
    return fail('Não foi possível gerar um código de indicação único. Tente novamente.');
  } catch (error) {
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
