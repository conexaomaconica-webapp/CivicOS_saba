'use server';

import { revalidatePath } from 'next/cache';
import { getRepresentativeContext, tryCommercialPermission } from './commercial-auth';
import { isCommercialModuleEnvEnabled } from './feature-flag';
import { auditCommercial, fail, requireWriter, type ActionResult } from './commercial-service-base';

export type ContractVersionItem = {
  id: string;
  version: string;
  title: string;
  is_active: boolean;
  content_sha256: string;
  published_at: string;
};

/** Aceite do contrato vigente pelo representante logado. A versão e o hash são conferidos e gravados NO BANCO. */
export async function acceptRepresentativeContractAction(input: { version: string }): Promise<ActionResult> {
  if (!isCommercialModuleEnvEnabled()) return fail('Módulo comercial desativado.');
  const version = typeof input?.version === 'string' ? input.version.trim() : '';
  if (!version) return fail('Versão do contrato inválida.');

  const ctx = await getRepresentativeContext();
  if (!ctx) return fail('Acesso não encontrado. Entre novamente.');

  try {
    const writer = requireWriter();
    const { data, error } = await writer.rpc('commercial_accept_representative_contract', {
      p_tenant_id: ctx.tenantId,
      p_user_id: ctx.userId,
      p_version: version,
    });
    if (error) return fail('Não foi possível registrar o aceite agora. Tente novamente.');

    const result = (data as { result?: string; sha256?: string; version?: string } | null)?.result;
    if (result === 'version_changed') return fail('O contrato foi atualizado enquanto você lia. A página será recarregada para exibir a versão vigente.');
    if (result === 'no_active_contract') return fail('Não há contrato vigente para aceitar.');
    if (result === 'inactive') return fail('Seu cadastro não está ativo para aceitar o contrato.');
    if (result === 'not_found') return fail('Representante não encontrado.');
    if (result !== 'accepted' && result !== 'already_accepted') return fail('Não foi possível registrar o aceite.');

    if (result === 'accepted') {
      await auditCommercial(writer, {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        entityType: 'commercial_representative',
        entityId: ctx.representative.id,
        action: 'COMMERCIAL_REP_CONTRACT_ACCEPTED',
        after: { contract_version: version, contract_sha256: (data as { sha256?: string }).sha256 ?? null },
      });
    }
    revalidatePath('/representante');
    return { success: true };
  } catch {
    return fail('Erro ao registrar o aceite do contrato.');
  }
}

export async function listContractVersionsAction(): Promise<ActionResult<{ versions: ContractVersionItem[]; activeText: string | null }>> {
  const auth = await tryCommercialPermission('settings.manage');
  if (!auth.ok) return fail(auth.error);
  try {
    const writer = requireWriter();
    const { data, error } = await writer
      .from('commercial_contract_versions')
      .select('id, version, title, is_active, content_sha256, published_at, content_text')
      .eq('tenant_id', auth.tenantId)
      .order('published_at', { ascending: false })
      .limit(50);
    if (error) return fail('Não foi possível listar as versões do contrato.');
    const rows = (data ?? []) as Array<ContractVersionItem & { content_text: string }>;
    return {
      success: true,
      data: {
        versions: rows.map(({ content_text: _omit, ...v }) => v),
        activeText: rows.find((r) => r.is_active)?.content_text ?? null,
      },
    };
  } catch {
    return fail('Erro ao listar as versões do contrato.');
  }
}

/**
 * Publica uma nova versão do contrato do representante. O texto é de responsabilidade de quem publica (o sistema não
 * fornece modelo). A versão anterior é desativada; quem já aceitou precisará aceitar a nova no próximo acesso.
 */
export async function publishContractVersionAction(input: {
  version: string;
  title: string;
  content: string;
  reason: string;
}): Promise<ActionResult<{ id: string }>> {
  const auth = await tryCommercialPermission('settings.manage');
  if (!auth.ok) return fail(auth.error);

  const version = (input.version ?? '').trim();
  const title = (input.title ?? '').trim();
  const content = (input.content ?? '').replace(/\r\n/g, '\n').trim();
  const reason = (input.reason ?? '').trim();
  if (version.length < 1 || version.length > 40) return fail('Informe a versão (até 40 caracteres, ex.: 2026-v1).');
  if (title.length < 3 || title.length > 160) return fail('Informe o título do contrato.');
  if (content.length < 200) return fail('O texto do contrato parece curto demais (mínimo de 200 caracteres).');
  if (content.length > 200000) return fail('O texto do contrato excede o limite de 200.000 caracteres.');
  if (reason.length < 10) return fail('Informe a justificativa da publicação (mínimo de 10 caracteres).');

  try {
    const writer = requireWriter();
    const { data, error } = await writer.rpc('commercial_publish_contract_version', {
      p_tenant_id: auth.tenantId,
      p_version: version,
      p_title: title,
      p_content: content,
      p_actor: auth.user.id,
    });
    if (error) {
      return fail(/unique|duplicate/i.test(error.message) ? 'Já existe uma versão com este identificador. Use outro (ex.: 2026-v2).' : 'Não foi possível publicar o contrato.');
    }
    const id = data as string;
    await auditCommercial(writer, {
      tenantId: auth.tenantId,
      actorId: auth.user.id,
      entityType: 'commercial_contract_version',
      entityId: id,
      action: 'COMMERCIAL_CONTRACT_PUBLISHED',
      after: { version, title, characters: content.length },
      reason,
    });
    revalidatePath('/comercial/configuracoes');
    revalidatePath('/representante');
    return { success: true, data: { id } };
  } catch {
    return fail('Erro ao publicar o contrato.');
  }
}
