'use server';

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { assertPlatformAdminAccess } from '@/lib/admin/admin-auth-helper';
import { headers } from 'next/headers';
import { formatCpfCnpj, validateCpf } from '@/lib/onboarding/onboarding-validation';
import {
  assertCommercialStatusTransition,
  assertAdministrativeCommercialRollback,
  CommercialStatus,
} from '@/lib/commercial-onboarding-status';
import type { Database } from '@/types/database.types';
import {
  AdvertiserContractVariables,
  renderContractTemplate,
  formatCurrencyBRL,
  formatVigencia,
  formatSeloPedraFundamental,
  formatDataEmissao,
  formatDataInicioVigencia,
  appendSignatureImageToContractText,
} from './contract-template-renderer';
import {
  CANONICAL_ADVERTISER_CONTRACT_CODE,
  CANONICAL_ADVERTISER_CONTRACT_VERSION,
  CANONICAL_ADVERTISER_CONTRACT_MARKDOWN,
  anonymizeIpForAudit,
} from './contract-constants';

export interface ContractDraftPreviewResult {
  success: boolean;
  error?: string;
  data?: {
    template_code: string;
    template_title: string;
    template_version: string;
    rendered_markdown: string;
    variables: AdvertiserContractVariables;
    commercial_status: string;
  };
}

/**
 * Server Action que busca os dados da empresa, termos comerciais conferidos e versão ativa do template,
 * executando a renderização pura e devolvendo a minuta para conferência visual do admin (Fase 4: Microetapa 4.1).
 */
export async function getAdminContractDraftPreviewAction(
  businessId: string,
  overrideAddress?: string,
  overrideResponsibleCpf?: string
): Promise<ContractDraftPreviewResult> {
  try {
    const { supabase } = await assertPlatformAdminAccess();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return { success: false, error: 'Configuração segura do Supabase indisponível no servidor.' };
    }
    const dbClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (!businessId?.trim()) {
      return { success: false, error: 'Identificador da empresa é obrigatório.' };
    }

    // 1. Consulta dados da empresa
    const { data: biz, error: bizErr } = await (supabase as any)
      .from('businesses')
      .select(`
        id,
        tenant_id,
        name,
        legal_name,
        cnpj,
        cnpj_cpf,
        phone,
        email,
        address,
        commercial_status,
        owner_id
      `)
      .eq('id', businessId)
      .single();

    if (bizErr) {
      console.error('[getAdminContractDraftPreviewAction] Erro ao consultar empresa:', {
        businessId,
        code: bizErr.code,
        message: bizErr.message,
        details: bizErr.details,
        hint: bizErr.hint,
      });
      return { success: false, error: `Falha ao consultar empresa: ${bizErr.message}` };
    }

    if (!biz) {
      return { success: false, error: 'Empresa não encontrada no banco de dados.' };
    }

    // 2. Consulta termos comerciais conferidos
    const { data: ctRow, error: ctErr } = await (supabase as any)
      .from('business_commercial_terms')
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle();

    if (ctErr || !ctRow) {
      return {
        success: false,
        error: 'Termos comerciais não conferidos. Realize a conferência comercial antes de visualizar a minuta.',
      };
    }

    // 3. Consulta dados do responsável
    const { data: resp } = await (supabase as any)
      .from('business_responsibles')
      .select('name, business_role, whatsapp')
      .eq('business_id', businessId)
      .maybeSingle();

    const { data: contacts } = await (supabase as any)
      .from('business_contacts')
      .select('type, value')
      .eq('business_id', businessId);
    const contactsMap = new Map<string, string>(
      (contacts || []).map((contact: any) => [contact.type, contact.value]),
    );

    const { data: pedraFundamentalRecognition } = await (supabase as any)
      .from('business_recognitions')
      .select('id')
      .eq('business_id', businessId)
      .eq('recognition_key', 'pedra_fundamental')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    let ownerProfile: any = null;
    if (biz.owner_id) {
      const { data: prof } = await (supabase as any)
        .from('profiles')
        .select('name, email')
        .eq('id', biz.owner_id)
        .maybeSingle();
      ownerProfile = prof;
    }

    // 4. Busca endereço da empresa
    let formattedAddress = overrideAddress?.trim() || '';

    if (!formattedAddress) {
      let { data: locRow } = await (supabase as any)
        .from('business_locations')
        .select('street, number, complement, neighborhood, city, state, postal_code')
        .eq('business_id', businessId)
        .eq('is_headquarters', true)
        .maybeSingle();

      if (!locRow) {
        const { data: anyLoc } = await (supabase as any)
          .from('business_locations')
          .select('street, number, complement, neighborhood, city, state, postal_code')
          .eq('business_id', businessId)
          .limit(1)
          .maybeSingle();
        locRow = anyLoc;
      }

      if (locRow && (locRow.street || locRow.city)) {
        const parts = [
          locRow.street ? `${locRow.street}${locRow.number ? `, ${locRow.number}` : ''}` : '',
          locRow.complement,
          locRow.neighborhood,
          locRow.city ? `${locRow.city} - ${locRow.state || 'SP'}` : '',
          locRow.postal_code ? `CEP ${locRow.postal_code}` : '',
        ].filter(Boolean);
        if (parts.length > 0) formattedAddress = parts.join(', ');
      } else if (biz.address) {
        formattedAddress = biz.address;
      }
    }

    if (!formattedAddress) {
      formattedAddress = 'Endereço não informado';
    }

    // 5. Busca a versão ativa do template com acesso administrativo seguro.
    let templateMarkdown = CANONICAL_ADVERTISER_CONTRACT_MARKDOWN;
    let templateTitle = 'Contrato de Adesão — Anunciante Conexão Maçônica';
    let templateVersion = CANONICAL_ADVERTISER_CONTRACT_VERSION;

    try {
      const { data: templateRow, error: templateError } = await (dbClient as any)
        .from('contract_templates')
        .select('id, code, title')
        .eq('code', CANONICAL_ADVERTISER_CONTRACT_CODE)
        .single();
      if (templateError || !templateRow) throw templateError || new Error('Template canônico não encontrado.');

      const { data: versionRow, error: versionError } = await (dbClient as any)
        .from('contract_versions')
        .select('id, version, content_markdown')
        .eq('template_id', templateRow.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (versionError) throw versionError;

      if (!versionRow?.content_markdown) {
        return { success: false, error: 'Nenhuma versão ativa do contrato foi encontrada. Publique uma versão no módulo Jurídico.' };
      }

      templateMarkdown = versionRow.content_markdown;
      templateVersion = versionRow.version;
      templateTitle = templateRow.title || templateTitle;
    } catch (versionError) {
      console.error('[getAdminContractDraftPreviewAction] Falha ao consultar versão ativa:', versionError);
      return { success: false, error: 'Não foi possível carregar a versão ativa do contrato.' };
    }

    // 6. Normalização e mapeamento das variáveis do template
    const rawCnpj = biz.cnpj || biz.cnpj_cpf || '00000000000000';
    const formattedCnpj = formatCpfCnpj(rawCnpj);

    const responsavelNome = resp?.name || ownerProfile?.name || 'Responsável Legal';
    const overrideCpfDigits = overrideResponsibleCpf?.replace(/\D/g, '') || '';
    const overrideCpfError = overrideCpfDigits ? validateCpf(overrideCpfDigits) : null;
    if (overrideCpfError) {
      return { success: false, error: overrideCpfError };
    }
    const rawCpf = overrideCpfDigits || ctRow.responsible_cpf || '00000000000';
    const formattedCpf = formatCpfCnpj(rawCpf);
    const responsavelEmail = ownerProfile?.email || biz.email || 'contato@anunciante.com.br';
    const empresaTelefone =
      resp?.whatsapp || contactsMap.get('whatsapp') || contactsMap.get('phone') || biz.phone || 'Não informado';

    const variables: AdvertiserContractVariables = {
      razao_social: biz.legal_name || biz.name,
      nome_fantasia: biz.name,
      cnpj: formattedCnpj,
      endereco: formattedAddress,
      responsavel_nome: responsavelNome,
      responsavel_cpf: formattedCpf,
      responsavel_email: responsavelEmail,
      responsavel_telefone: empresaTelefone,
      empresa_telefone: empresaTelefone,
      plano_nome: ctRow.plan_name,
      vigencia: formatVigencia(ctRow.billing_cycle),
      data_inicio_vigencia: formatDataInicioVigencia(ctRow.contract_start_date ?? null),
      valor_total: formatCurrencyBRL(ctRow.amount_cents),
      forma_pagamento: ctRow.payment_method === 'avista' ? 'À vista' : 'Parcelado',
      parcelas: `${ctRow.installments_count}x`,
      valor_parcela: formatCurrencyBRL(ctRow.installment_amount_cents),
      selo_pedra_fundamental: formatSeloPedraFundamental(Boolean(pedraFundamentalRecognition)),
      data_emissao: formatDataEmissao(new Date()),
    };

    // 7. Renderização com fail-fast
    const rendered_markdown = renderContractTemplate(templateMarkdown, variables);

    return {
      success: true,
      data: {
        template_code: CANONICAL_ADVERTISER_CONTRACT_CODE,
        template_title: templateTitle,
        template_version: templateVersion,
        rendered_markdown,
        variables,
        commercial_status: biz.commercial_status || 'dados_comerciais_conferidos',
      },
    };
  } catch (err: any) {
    console.error('[getAdminContractDraftPreviewAction] Error:', err);
    return {
      success: false,
      error: err?.message || 'Erro inesperado ao gerar minuta do contrato.',
    };
  }
}

/**
 * Calcula o hash criptográfico SHA-256 do texto fornecido.
 */
export async function calculateContractSha256(text: string): Promise<string> {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

export interface GenerateContractSnapshotResult {
  success: boolean;
  error?: string;
  data?: {
    contract_id: string;
    snapshot_id: string;
    sha256_hash: string;
    commercial_status: string;
    already_existed?: boolean;
    created_at: string;
  };
}

/**
 * Server Action que congela a minuta em um snapshot imutável, calcula o hash SHA-256,
 * insere em `contracts` (status: 'draft') e `contract_snapshots`, e avança
 * o status comercial para 'contrato_gerado' (Fase 4: Microetapa 4.2).
 */
export async function generateAdminContractSnapshotAction(
  businessId: string,
  overrideAddress?: string
): Promise<GenerateContractSnapshotResult> {
  try {
    const { supabase, user } = await assertPlatformAdminAccess();

    if (!businessId?.trim()) {
      return { success: false, error: 'Identificador da empresa é obrigatório.' };
    }

    // 1. Consulta dados consolidados da empresa
    const { data: biz, error: bizErr } = await (supabase as any)
      .from('businesses')
      .select(`
        id,
        tenant_id,
        name,
        legal_name,
        cnpj,
        cnpj_cpf,
        phone,
        email,
        address,
        commercial_status,
        owner_id
      `)
      .eq('id', businessId)
      .single();

    if (bizErr) {
      console.error('[generateAdminContractSnapshotAction] Erro ao consultar empresa:', {
        businessId,
        code: bizErr.code,
        message: bizErr.message,
        details: bizErr.details,
        hint: bizErr.hint,
      });
      return { success: false, error: `Falha ao consultar empresa: ${bizErr.message}` };
    }

    if (!biz) {
      return { success: false, error: 'Empresa não encontrada no banco de dados.' };
    }

    // 2. Validação estrita da máquina de estados
    const currentStatus = (biz.commercial_status || 'pre_cadastro') as CommercialStatus;

    if (currentStatus !== 'contrato_gerado' && currentStatus !== 'dados_comerciais_conferidos') {
      try {
        assertCommercialStatusTransition(currentStatus, 'contrato_gerado');
      } catch (transitionErr: any) {
        return {
          success: false,
          error:
            transitionErr?.message ||
            `Transição comercial inválida: status atual "${currentStatus}" não pode avançar para "contrato_gerado".`,
        };
      }
    }

    // 3. Validação dos termos comerciais conferidos
    const { data: ctRow, error: ctErr } = await (supabase as any)
      .from('business_commercial_terms')
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle();

    if (ctErr || !ctRow || ctRow.status !== 'conferido') {
      return {
        success: false,
        error: 'Dados comerciais não conferidos. Realize a conferência comercial antes de gerar o contrato.',
      };
    }

    // 4. Instancia cliente de banco com privilégios de service_role para tabelas com RLS estrito (contract_snapshots)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const dbClient = (serviceRoleKey && supabaseUrl)
      ? createClient<Database>(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : supabase;

    // 4.1. Bloqueio estrito de regeração silenciosa se contrato já estiver signed ou awaiting_signature (Microetapa 4.3)
    const { data: latestExistingContract } = await (dbClient as any)
      .from('contracts')
      .select('id, status')
      .eq('business_id', biz.id)
      .neq('status', 'superseded')
      .neq('status', 'voided')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestExistingContract) {
      if (latestExistingContract.status === 'signed') {
        return {
          success: false,
          error: 'Este contrato já foi assinado e não pode ser regerado ou substituído.',
        };
      }
      if (latestExistingContract.status === 'awaiting_signature') {
        return {
          success: false,
          error: 'Existe um contrato aguardando assinatura. É necessário cancelar ou revogar o envio antes de gerar nova versão.',
        };
      }
    }

    // 5. Resolve primeiro o template canônico e consulta versões exclusivamente pelo ID.
    let { data: tpl } = await (dbClient as any)
      .from('contract_templates')
      .select('id, title')
      .eq('code', CANONICAL_ADVERTISER_CONTRACT_CODE)
      .maybeSingle();

    let versionRow: any = null;
    if (tpl) {
      const versionResult = await (dbClient as any)
        .from('contract_versions')
        .select('id, version, content_markdown')
        .eq('template_id', tpl.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      versionRow = versionResult.data;
    }

    // Se ainda não existir registro no banco físico, instancia de forma idempotente
    if (!versionRow) {
      if (!tpl) {
        const { data: nTpl } = await (dbClient as any)
          .from('contract_templates')
          .insert({
            tenant_id: biz.tenant_id,
            code: CANONICAL_ADVERTISER_CONTRACT_CODE,
            title: 'Contrato de Adesão — Anunciante Conexão Maçônica',
            description: 'Template oficial de adesão e licenciamento comercial.',
          })
          .select('id')
          .single();
        tpl = nTpl;
      }

      if (tpl) {
        const { data: nVer } = await (dbClient as any)
          .from('contract_versions')
          .insert({
            template_id: tpl.id,
            version: CANONICAL_ADVERTISER_CONTRACT_VERSION,
            content_markdown: CANONICAL_ADVERTISER_CONTRACT_MARKDOWN,
            is_active: true,
          })
          .select('id, version, content_markdown')
          .single();
        versionRow = nVer;
      }
    }

    const versionId = versionRow?.id;
    const templateMarkdown = versionRow?.content_markdown || CANONICAL_ADVERTISER_CONTRACT_MARKDOWN;

    // 6. Consulta dados do responsável
    const { data: resp } = await (supabase as any)
      .from('business_responsibles')
      .select('name, business_role, whatsapp')
      .eq('business_id', businessId)
      .maybeSingle();

    const { data: contacts } = await (supabase as any)
      .from('business_contacts')
      .select('type, value')
      .eq('business_id', businessId);
    const contactsMap = new Map<string, string>(
      (contacts || []).map((contact: any) => [contact.type, contact.value]),
    );

    const { data: pedraFundamentalRecognition } = await (supabase as any)
      .from('business_recognitions')
      .select('id')
      .eq('business_id', businessId)
      .eq('recognition_key', 'pedra_fundamental')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    let ownerProfile: any = null;
    if (biz.owner_id) {
      const { data: prof } = await (supabase as any)
        .from('profiles')
        .select('name, email')
        .eq('id', biz.owner_id)
        .maybeSingle();
      ownerProfile = prof;
    }

    // 7. Consulta endereço da empresa
    let formattedAddress = overrideAddress?.trim() || '';

    if (!formattedAddress) {
      let { data: locRow } = await (supabase as any)
        .from('business_locations')
        .select('street, number, complement, neighborhood, city, state, postal_code')
        .eq('business_id', businessId)
        .eq('is_headquarters', true)
        .maybeSingle();

      if (!locRow) {
        const { data: anyLoc } = await (supabase as any)
          .from('business_locations')
          .select('street, number, complement, neighborhood, city, state, postal_code')
          .eq('business_id', businessId)
          .limit(1)
          .maybeSingle();
        locRow = anyLoc;
      }

      if (locRow && (locRow.street || locRow.city)) {
        const parts = [
          locRow.street ? `${locRow.street}${locRow.number ? `, ${locRow.number}` : ''}` : '',
          locRow.complement,
          locRow.neighborhood,
          locRow.city ? `${locRow.city} - ${locRow.state || 'SP'}` : '',
          locRow.postal_code ? `CEP ${locRow.postal_code}` : '',
        ].filter(Boolean);
        if (parts.length > 0) formattedAddress = parts.join(', ');
      } else if (biz.address) {
        formattedAddress = biz.address;
      }
    }

    if (!formattedAddress) {
      formattedAddress = 'Endereço não informado';
    }

    // 8. Normalização e mapeamento obrigatório de variáveis
    const rawCnpj = biz.cnpj || biz.cnpj_cpf || '00000000000000';
    const formattedCnpj = formatCpfCnpj(rawCnpj);

    const responsavelNome = resp?.name || ownerProfile?.name || 'Responsável Legal';
    const rawCpf = ctRow.responsible_cpf || '00000000000';
    const formattedCpf = formatCpfCnpj(rawCpf);
    const responsavelEmail = ownerProfile?.email || biz.email || 'contato@anunciante.com.br';
    const empresaTelefone =
      resp?.whatsapp || contactsMap.get('whatsapp') || contactsMap.get('phone') || biz.phone || 'Não informado';

    const variables: AdvertiserContractVariables = {
      razao_social: biz.legal_name || biz.name,
      nome_fantasia: biz.name,
      cnpj: formattedCnpj,
      endereco: formattedAddress,
      responsavel_nome: responsavelNome,
      responsavel_cpf: formattedCpf,
      responsavel_email: responsavelEmail,
      responsavel_telefone: empresaTelefone,
      empresa_telefone: empresaTelefone,
      plano_nome: ctRow.plan_name,
      vigencia: formatVigencia(ctRow.billing_cycle),
      data_inicio_vigencia: formatDataInicioVigencia(ctRow.contract_start_date ?? null),
      valor_total: formatCurrencyBRL(ctRow.amount_cents),
      forma_pagamento: ctRow.payment_method === 'avista' ? 'À vista' : 'Parcelado',
      parcelas: `${ctRow.installments_count}x`,
      valor_parcela: formatCurrencyBRL(ctRow.installment_amount_cents),
      selo_pedra_fundamental: formatSeloPedraFundamental(Boolean(pedraFundamentalRecognition)),
      data_emissao: formatDataEmissao(new Date()),
    };

    // 9. Renderização pura e determinística diretamente no backend
    const rendered_text = renderContractTemplate(templateMarkdown, variables);

    // 10. Cálculo do resumo criptográfico SHA-256 do texto renderizado
    const sha256_hash = crypto.createHash('sha256').update(rendered_text, 'utf8').digest('hex');

    // 11. Proteção contra duplicidade / clique duplo
    if (versionId) {
      const { data: existingContract } = await (dbClient as any)
        .from('contracts')
        .select('id, status, created_at')
        .eq('business_id', biz.id)
        .eq('version_id', versionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Só reutiliza quando o registro mais recente desta versão ainda é o draft ativo.
      // Se foi superseded/voided, rascunhos históricos anteriores não podem bloquear a nova geração.
      if (existingContract?.status === 'draft') {
        const { data: existingSnapshot } = await (dbClient as any)
          .from('contract_snapshots')
          .select('id, sha256_hash, created_at')
          .eq('contract_id', existingContract.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingSnapshot) {
          // Garante que o status comercial esteja sincronizado para 'contrato_gerado'
          if (biz.commercial_status !== 'contrato_gerado') {
            await (dbClient as any)
              .from('businesses')
              .update({
                commercial_status: 'contrato_gerado',
                updated_at: new Date().toISOString(),
              })
              .eq('id', biz.id);
          }

          return {
            success: true,
            data: {
              contract_id: existingContract.id,
              snapshot_id: existingSnapshot.id,
              sha256_hash: existingSnapshot.sha256_hash,
              commercial_status: 'contrato_gerado',
              already_existed: true,
              created_at: existingSnapshot.created_at,
            },
          };
        }
      }
    }

    // 12. Criação do contrato em contracts (status = 'draft')
    let contractId: string;
    const { data: insertedContract, error: contractErr } = await (dbClient as any)
      .from('contracts')
      .insert({
        tenant_id: biz.tenant_id,
        business_id: biz.id,
        version_id: versionId,
        status: 'draft',
      })
      .select('id')
      .single();

    if (contractErr || !insertedContract) {
      console.error('[generateAdminContractSnapshotAction] Error inserting contract:', contractErr);
      return { success: false, error: `Falha ao registrar contrato: ${contractErr?.message || 'Erro de banco.'}` };
    }
    contractId = insertedContract.id;

    // 13. Inserção do snapshot imutável em contract_snapshots
    const { data: insertedSnapshot, error: snapErr } = await (dbClient as any)
      .from('contract_snapshots')
      .insert({
        contract_id: contractId,
        rendered_text,
        sha256_hash,
      })
      .select('id, created_at')
      .single();

    if (snapErr || !insertedSnapshot) {
      console.error('[generateAdminContractSnapshotAction] Error inserting snapshot:', snapErr);
      return { success: false, error: `Falha ao gravar snapshot do contrato: ${snapErr?.message || 'Erro de banco.'}` };
    }

    // 14. Transição da máquina de estados: dados_comerciais_conferidos -> contrato_gerado
    const { error: bizUpdateErr } = await (dbClient as any)
      .from('businesses')
      .update({
        commercial_status: 'contrato_gerado',
        updated_at: new Date().toISOString(),
      })
      .eq('id', biz.id);

    if (bizUpdateErr) {
      console.error('[generateAdminContractSnapshotAction] Error updating commercial_status:', bizUpdateErr);
      return { success: false, error: `Falha ao atualizar status da empresa: ${bizUpdateErr.message}` };
    }

    // 15. Registro de auditoria administrativa em admin_audit_logs
    try {
      await (dbClient as any).from('admin_audit_logs').insert({
        tenant_id: biz.tenant_id,
        actor_id: user.id,
        action: 'GENERATE_CONTRACT_SNAPSHOT',
        entity_type: 'contract_snapshot',
        entity_id: insertedSnapshot.id,
        before_value: { commercial_status: currentStatus },
        after_value: {
          commercial_status: 'contrato_gerado',
          contract_id: contractId,
          snapshot_id: insertedSnapshot.id,
          sha256_hash,
        },
        reason: 'Geração formal da minuta e snapshot imutável com hash SHA-256 (Microetapa 4.2).',
      });
    } catch (_auditErr) {}

    // 16. Revalidação das rotas relevantes
    revalidatePath(`/admin/empresas`);
    revalidatePath(`/admin/empresas/${businessId}`);
    revalidatePath(`/admin/empresas/${businessId}/contratacao`);

    return {
      success: true,
      data: {
        contract_id: contractId,
        snapshot_id: insertedSnapshot.id,
        sha256_hash,
        commercial_status: 'contrato_gerado',
        created_at: insertedSnapshot.created_at,
      },
    };
  } catch (err: any) {
    console.error('[generateAdminContractSnapshotAction] Exception:', err);
    return {
      success: false,
      error: err?.message || 'Erro inesperado ao gerar snapshot do contrato.',
    };
  }
}

export interface ContractSnapshotHistoryItem {
  contract_id: string;
  snapshot_id: string;
  contract_status: 'draft' | 'superseded' | 'awaiting_signature' | 'signed' | 'voided';
  template_code: string;
  template_version: string;
  template_title: string;
  sha256_hash: string;
  created_at: string;
  updated_at?: string | null;
  is_current: boolean;
  iteration_number: number; // Snapshot 1, Snapshot 2, etc. (1-indexed em ordem de criação)
}

export interface ContractSnapshotsHistoryResult {
  success: boolean;
  error?: string;
  data?: {
    history: ContractSnapshotHistoryItem[];
    active_snapshot: ContractSnapshotHistoryItem | null;
    has_pending_changes: boolean;
    pending_changes_reason?: string;
    current_recalculated_hash?: string;
  };
}

/**
 * Consulta o histórico completo de versões e snapshots de contratos da empresa (Microetapa 4.3).
 * Diferencia a versão jurídica do template (ex: v1.0) das iterações sucessivas de snapshots da empresa (Snapshot 1, 2...).
 * Detecta se houve divergência entre os dados atuais e os dados congelados no snapshot ativo.
 */
export async function getAdminContractSnapshotsHistoryAction(
  businessId: string
): Promise<ContractSnapshotsHistoryResult> {
  try {
    const { supabase } = await assertPlatformAdminAccess();

    if (!businessId?.trim()) {
      return { success: false, error: 'Identificador da empresa é obrigatório.' };
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const dbClient = (serviceRoleKey && supabaseUrl)
      ? createClient<Database>(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : supabase;

    // 1. Busca dados da empresa
    const { data: biz, error: bizErr } = await (dbClient as any)
      .from('businesses')
      .select('id, commercial_status')
      .eq('id', businessId)
      .single();

    if (bizErr || !biz) {
      return { success: false, error: 'Empresa não encontrada no banco de dados.' };
    }

    // 2. Busca todos os contratos da empresa em ordem cronológica de criação
    const { data: contractsList, error: contractsErr } = await (dbClient as any)
      .from('contracts')
      .select('id, status, created_at, updated_at, version_id')
      .eq('business_id', businessId)
      .order('created_at', { ascending: true });

    if (contractsErr) {
      return { success: false, error: `Erro ao buscar contratos: ${contractsErr.message}` };
    }

    if (!contractsList || contractsList.length === 0) {
      return {
        success: true,
        data: {
          history: [],
          active_snapshot: null,
          has_pending_changes: false,
        },
      };
    }

    const contractIds = contractsList.map((c: any) => c.id);

    // 3. Busca snapshots vinculados aos contratos
    const { data: snapshotsList } = await (dbClient as any)
      .from('contract_snapshots')
      .select('id, contract_id, sha256_hash, created_at')
      .in('contract_id', contractIds)
      .order('created_at', { ascending: false });

    const snapshotsMap = new Map<string, any>();
    (snapshotsList || []).forEach((s: any) => {
      if (!snapshotsMap.has(s.contract_id)) {
        snapshotsMap.set(s.contract_id, s);
      }
    });

    // 4. Busca versões de templates vinculadas
    const versionIds = Array.from(new Set(contractsList.map((c: any) => c.version_id).filter(Boolean)));
    const versionsMap = new Map<string, any>();
    if (versionIds.length > 0) {
      const { data: vers } = await (dbClient as any)
        .from('contract_versions')
        .select(`
          id,
          version,
          template:contract_templates(id, code, title)
        `)
        .in('id', versionIds);

      (vers || []).forEach((v: any) => {
        versionsMap.set(v.id, v);
      });
    }

    // 5. Montagem do histórico com iteração de snapshot (Snapshot 1, Snapshot 2...)
    let currentActiveIndex = -1;
    // O snapshot atual é o último que estiver com status draft (ou awaiting_signature ou signed)
    for (let i = contractsList.length - 1; i >= 0; i--) {
      const c = contractsList[i];
      if (c.status === 'draft' || c.status === 'awaiting_signature' || c.status === 'signed') {
        currentActiveIndex = i;
        break;
      }
    }

    const historyAsc: ContractSnapshotHistoryItem[] = contractsList.map((c: any, index: number) => {
      const snap = snapshotsMap.get(c.id);
      const verObj = versionsMap.get(c.version_id);
      const isCurrent = index === currentActiveIndex;

      return {
        contract_id: c.id,
        snapshot_id: snap?.id || c.id,
        contract_status: c.status,
        template_code: verObj?.template?.code || CANONICAL_ADVERTISER_CONTRACT_CODE,
        template_version: verObj?.version || CANONICAL_ADVERTISER_CONTRACT_VERSION,
        template_title: verObj?.template?.title || 'Contrato de Adesão — Anunciante Conexão Maçônica',
        sha256_hash: snap?.sha256_hash || '',
        created_at: snap?.created_at || c.created_at,
        updated_at: c.updated_at,
        is_current: isCurrent,
        iteration_number: index + 1,
      };
    });

    const activeSnapshot: ContractSnapshotHistoryItem | null =
      currentActiveIndex >= 0 ? historyAsc[currentActiveIndex] ?? null : null;

    // 6. Detecção de alterações relevantes nos dados atuais vs snapshot ativo
    let hasPendingChanges = false;
    let pendingChangesReason: string | undefined;
    let currentRecalculatedHash: string | undefined;

    if (activeSnapshot && activeSnapshot.contract_status === 'draft' && biz.commercial_status === 'contrato_gerado') {
      try {
        const preview = await getAdminContractDraftPreviewAction(businessId);
        if (preview.success && preview.data?.rendered_markdown) {
          currentRecalculatedHash = crypto
            .createHash('sha256')
            .update(preview.data.rendered_markdown, 'utf8')
            .digest('hex');

          if (currentRecalculatedHash !== activeSnapshot.sha256_hash) {
            hasPendingChanges = true;
            pendingChangesReason =
              'Foram detectadas alterações nos dados da empresa, do responsável ou nas condições comerciais após a geração deste contrato.';
          }
        }
      } catch (detectErr) {
        console.warn('[getAdminContractSnapshotsHistoryAction] Erro ao recalcular hash para detecção de mudanças:', detectErr);
      }
    }

    // Retorna ordenado do mais recente para o mais antigo para exibição na UI
    const historyDesc = [...historyAsc].reverse();

    return {
      success: true,
      data: {
        history: historyDesc,
        active_snapshot: activeSnapshot,
        has_pending_changes: hasPendingChanges,
        pending_changes_reason: pendingChangesReason,
        current_recalculated_hash: currentRecalculatedHash,
      },
    };
  } catch (err: any) {
    console.error('[getAdminContractSnapshotsHistoryAction] Exception:', err);
    return {
      success: false,
      error: err?.message || 'Erro inesperado ao consultar histórico de contratos.',
    };
  }
}

export interface InvalidateContractSnapshotResult {
  success: boolean;
  error?: string;
  data?: {
    contract_id: string;
    previous_status: string;
    new_status: 'superseded' | 'voided';
    commercial_status: 'dados_comerciais_conferidos';
    superseded_at: string;
  };
}

/**
 * Action administrativa explícita para invalidação de snapshot de contrato (Microetapa 4.3).
 *
 * Regras:
 * - Justificativa administrativa obrigatória registrada em admin_audit_logs.
 * - Marca contracts.status = 'superseded' para a versão anterior, preservando 100% o histórico imutável.
 * - Retorna businesses.commercial_status para 'dados_comerciais_conferidos'.
 * - Contrato assinado pode ser anulado administrativamente, preservando aceite e evidências.
 * - Bloqueia se o contrato estiver aguardando assinatura ('awaiting_signature'), exigindo revogação prévia.
 */
export async function invalidateAdminContractSnapshotAction(
  businessId: string,
  reason: string
): Promise<InvalidateContractSnapshotResult> {
  try {
    const { user, supabase } = await assertPlatformAdminAccess();

    if (!businessId?.trim()) {
      return { success: false, error: 'Identificador da empresa é obrigatório.' };
    }

    const trimmedReason = reason?.trim();
    if (!trimmedReason || trimmedReason.length < 5) {
      return {
        success: false,
        error: 'A justificativa administrativa da invalidação é obrigatória (mínimo de 5 caracteres).',
      };
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const dbClient = (serviceRoleKey && supabaseUrl)
      ? createClient<Database>(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : supabase;

    // 1. Busca dados da empresa
    const { data: biz, error: bizErr } = await (dbClient as any)
      .from('businesses')
      .select('id, tenant_id, name, commercial_status')
      .eq('id', businessId)
      .single();

    if (bizErr || !biz) {
      return { success: false, error: 'Empresa não encontrada no banco de dados.' };
    }

    // 2. Busca o contrato ativo mais recente que não esteja já superseded ou voided
    const { data: activeContract, error: contractErr } = await (dbClient as any)
      .from('contracts')
      .select('id, status, created_at, version_id')
      .eq('business_id', businessId)
      .neq('status', 'superseded')
      .neq('status', 'voided')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (contractErr) {
      return { success: false, error: `Erro ao consultar contrato: ${contractErr.message}` };
    }

    if (!activeContract) {
      return {
        success: false,
        error: 'Nenhum contrato ativo encontrado para invalidação nesta empresa.',
      };
    }

    // 3. Contrato aguardando assinatura exige cancelamento/revogação antes de nova geração
    if (activeContract.status === 'awaiting_signature') {
      return {
        success: false,
        error: 'Contrato aguardando assinatura deve ser revogado/cancelado antes de invalidar o snapshot.',
      };
    }

    const supersededAt = new Date().toISOString();
    const nextContractStatus = activeContract.status === 'signed' ? 'voided' : 'superseded';

    // 4. Marcação do contracts.status = 'superseded' para a versão anterior (preserva histórico)
    const { error: updateContractErr } = await (dbClient as any)
      .from('contracts')
      .update({
        status: nextContractStatus,
        updated_at: supersededAt,
      })
      .eq('id', activeContract.id);

    if (updateContractErr) {
      return {
        success: false,
        error: `Falha ao invalidar o contrato atual: ${updateContractErr.message}`,
      };
    }

    // 5. Retorno de commercial_status para dados_comerciais_conferidos via validação administrativa auditada
    if (activeContract.status !== 'signed') {
      assertAdministrativeCommercialRollback(biz.commercial_status as CommercialStatus, 'dados_comerciais_conferidos');
    }
    const { error: updateBizErr } = await (dbClient as any)
      .from('businesses')
      .update({
        commercial_status: 'dados_comerciais_conferidos',
        publication_status: 'draft',
        updated_at: supersededAt,
      })
      .eq('id', businessId);

    if (updateBizErr) {
      return {
        success: false,
        error: `Falha ao atualizar status comercial da empresa: ${updateBizErr.message}`,
      };
    }

    // 6. Registro formal de auditoria em admin_audit_logs
    try {
      await (dbClient as any).from('admin_audit_logs').insert({
        tenant_id: biz.tenant_id,
        actor_id: user.id,
        action: activeContract.status === 'signed' ? 'VOID_SIGNED_CONTRACT' : 'INVALIDATE_CONTRACT_SNAPSHOT',
        entity_type: 'contract',
        entity_id: activeContract.id,
        before_value: {
          contract_status: activeContract.status,
          commercial_status: biz.commercial_status,
        },
        after_value: {
          contract_status: nextContractStatus,
          commercial_status: 'dados_comerciais_conferidos',
          publication_status: 'draft',
          is_published: false,
          reason: trimmedReason,
        },
        reason: trimmedReason,
      });
    } catch (_auditErr) {}

    // 7. Revalida rotas administrativas
    revalidatePath(`/admin/empresas`);
    revalidatePath(`/admin/empresas/${businessId}`);
    revalidatePath(`/admin/empresas/${businessId}/contratacao`);

    return {
      success: true,
      data: {
        contract_id: activeContract.id,
        previous_status: activeContract.status,
        new_status: nextContractStatus,
        commercial_status: 'dados_comerciais_conferidos',
        superseded_at: supersededAt,
      },
    };
  } catch (err: any) {
    console.error('[invalidateAdminContractSnapshotAction] Exception:', err);
    return {
      success: false,
      error: err?.message || 'Erro inesperado ao invalidar snapshot do contrato.',
    };
  }
}

export interface SendContractForSignatureResult {
  success: boolean;
  error?: string;
  data?: {
    contract_id: string;
    token: string;
    public_url: string;
    expires_at: string;
    commercial_status: 'contrato_enviado';
    already_sent?: boolean;
    responsavel_nome?: string;
    responsavel_whatsapp?: string;
  };
}

export interface RevokeContractSignatureTokenResult {
  success: boolean;
  error?: string;
  data?: {
    contract_id: string;
    commercial_status: 'contrato_gerado';
    revoked_at: string;
  };
}

export interface PublicContractDetailsResult {
  success: boolean;
  error?: string;
  data?: {
    business_id: string;
    business_name: string;
    business_legal_name: string;
    cnpj: string;
    responsavel_nome: string;
    responsavel_cpf?: string;
    responsavel_email?: string;
    contract_id: string;
    contract_status: string;
    commercial_status?: string;
    snapshot_id: string;
    template_code: string;
    template_title: string;
    template_version: string;
    rendered_markdown: string;
    sha256_hash: string;
    created_at: string;
    expires_at: string;
    plan_name?: string;
    amount_cents?: number;
    formatted_amount?: string;
    billing_cycle?: string;
    payment_method?: string;
    installments_count?: number;
    is_pedra_fundamental?: boolean;
    signature_image_data?: string;
    signer_cpf?: string;
    accepted_at?: string;
    payment_token?: string;
    active_charge?: {
      invoice_id: string;
      payment_method: string;
      status: string;
      amount_cents: number;
      formatted_amount?: string;
      installments: number;
      pix_copia_e_cola?: string;
      qr_code_base64?: string;
      payment_id?: string;
    };
  };
}

export interface SignPublicContractPayload {
  token: string;
  signer_cpf: string;
  agree_terms: boolean;
  signature_image_data: string;
}

export interface SignPublicContractResult {
  success: boolean;
  error?: string;
  data?: {
    contract_id: string;
    snapshot_id: string;
    commercial_status: 'contrato_assinado';
    accepted_at: string;
    signer_cpf: string;
    business_name: string;
    plan_name: string;
    amount_cents: number;
    formatted_amount: string;
    billing_cycle: string;
    payment_method: string;
    installments_count: number;
    payment_token?: string;
  };
}

/** Gera um novo link de continuidade quando o contrato já foi assinado. */
export async function renewAdminContractPaymentLinkAction(
  businessId: string
): Promise<SendContractForSignatureResult> {
  try {
    const { supabase } = await assertPlatformAdminAccess();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const dbClient = serviceRoleKey && supabaseUrl
      ? createClient<Database>(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase;

    const { data: biz } = await (dbClient as any)
      .from('businesses')
      .select('id, name, commercial_status, owner_id')
      .eq('id', businessId)
      .single();
    if (!biz || !['contrato_assinado', 'aguardando_pagamento'].includes(biz.commercial_status)) {
      return { success: false, error: 'A empresa ainda não possui contrato assinado para continuar o pagamento.' };
    }

    const { data: contract } = await (dbClient as any)
      .from('contracts')
      .select('id')
      .eq('business_id', businessId)
      .eq('status', 'signed')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!contract) return { success: false, error: 'Contrato assinado não localizado.' };

    const { data: snapshot } = await (dbClient as any)
      .from('contract_snapshots')
      .select('id')
      .eq('contract_id', contract.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!snapshot) return { success: false, error: 'Snapshot do contrato assinado não localizado.' };

    await (dbClient as any)
      .from('business_onboarding_tokens')
      .update({ is_revoked: true, revoked_at: new Date().toISOString() })
      .eq('business_id', businessId)
      .eq('token_type', 'onboarding_payment')
      .eq('is_revoked', false);

    const token = crypto.randomBytes(48).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token, 'utf8').digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error: tokenError } = await (dbClient as any).from('business_onboarding_tokens').insert({
      business_id: businessId,
      contract_id: contract.id,
      snapshot_id: snapshot.id,
      token_hash: tokenHash,
      token_type: 'onboarding_payment',
      token: null,
      expires_at: expiresAt,
      is_revoked: false,
    });
    if (tokenError) return { success: false, error: `Falha ao gerar link de continuidade: ${tokenError.message}` };

    const { data: resp } = await (dbClient as any)
      .from('business_responsibles')
      .select('name, whatsapp')
      .eq('business_id', businessId)
      .maybeSingle();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://conexaomaconica.com.br';
    return {
      success: true,
      data: {
        contract_id: contract.id,
        token,
        public_url: `${baseUrl.replace(/\/$/, '')}/contratacao/${token}`,
        expires_at: expiresAt,
        commercial_status: 'contrato_enviado',
        already_sent: true,
        responsavel_nome: resp?.name || biz.name,
        responsavel_whatsapp: resp?.whatsapp || undefined,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro inesperado ao recuperar o acesso ao pagamento.' };
  }
}

/**
 * Envia o contrato para assinatura eletrônica (Microetapa 4.4).
 *
 * Regras:
 * - Valida contrato atual em draft e existência do snapshot.
 * - Confirma que os dados atuais não divergem do snapshot congelado (SHA-256).
 * - Idempotência: se já houver token ativo não expirado em awaiting_signature, retorna o mesmo link.
 * - Revoga tokens anteriores ainda abertos para esta empresa.
 * - Gera token de alta entropia com crypto.randomBytes(48).toString('hex').
 * - Grava expires_at para 7 dias.
 * - Transiciona contracts.status para 'awaiting_signature'.
 * - Transiciona businesses.commercial_status para 'contrato_enviado'.
 * - Registra auditoria em admin_audit_logs.
 * - Retorna o link /contratacao/[token].
 */
export async function sendAdminContractForSignatureAction(
  businessId: string
): Promise<SendContractForSignatureResult> {
  try {
    const { user, supabase } = await assertPlatformAdminAccess();

    if (!businessId?.trim()) {
      return { success: false, error: 'Identificador da empresa é obrigatório.' };
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const dbClient = (serviceRoleKey && supabaseUrl)
      ? createClient<Database>(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : supabase;

    // 1. Busca dados da empresa
    const { data: biz, error: bizErr } = await (dbClient as any)
      .from('businesses')
      .select('id, tenant_id, name, legal_name, cnpj, commercial_status, owner_id')
      .eq('id', businessId)
      .single();

    if (bizErr || !biz) {
      return { success: false, error: 'Empresa não encontrada no banco de dados.' };
    }

    // 2. Busca dados do responsável para envio personalizado (WhatsApp / E-mail)
    const { data: resp } = await (dbClient as any)
      .from('business_responsibles')
      .select('name, whatsapp')
      .eq('business_id', businessId)
      .maybeSingle();

    let responsavelNome = resp?.name;
    if (!responsavelNome && biz.owner_id) {
      const { data: prof } = await (dbClient as any)
        .from('profiles')
        .select('name')
        .eq('id', biz.owner_id)
        .maybeSingle();
      responsavelNome = prof?.name;
    }
    responsavelNome = responsavelNome || biz.name;

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://conexaomaconica.com.br';

    // 3. Idempotência: Se já estiver enviado e aguardando assinatura com token válido
    if (biz.commercial_status === 'contrato_enviado') {
      const { data: awaitingContract } = await (dbClient as any)
        .from('contracts')
        .select('id, status')
        .eq('business_id', businessId)
        .eq('status', 'awaiting_signature')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (awaitingContract) {
        const { data: existingToken } = await (dbClient as any)
          .from('business_onboarding_tokens')
          .select('id, token, token_hash, expires_at, is_revoked')
          .eq('business_id', businessId)
          .eq('is_revoked', false)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Se houver token legado em texto puro, reaproveita
        if (existingToken && existingToken.token) {
          return {
            success: true,
            data: {
              contract_id: awaitingContract.id,
              token: existingToken.token,
              public_url: `${baseUrl}/contratacao/${existingToken.token}`,
              expires_at: existingToken.expires_at,
              commercial_status: 'contrato_enviado',
              already_sent: true,
              responsavel_nome: responsavelNome,
              responsavel_whatsapp: resp?.whatsapp || undefined,
            },
          };
        }

        // Se o token estiver armazenado com hardening (somente token_hash),
        // rotacionamos com segurança emitindo um novo token para a sessão do admin
        const { data: activeSnapshot } = await (dbClient as any)
          .from('contract_snapshots')
          .select('id, sha256_hash')
          .eq('contract_id', awaitingContract.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activeSnapshot) {
          if (existingToken) {
            await (dbClient as any)
              .from('business_onboarding_tokens')
              .update({ is_revoked: true, revoked_at: new Date().toISOString() })
              .eq('id', existingToken.id);
          }

          const rawToken = crypto.randomBytes(48).toString('hex');
          const tokenHash = crypto.createHash('sha256').update(rawToken, 'utf8').digest('hex');
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

          await (dbClient as any)
            .from('business_onboarding_tokens')
            .insert({
              business_id: businessId,
              contract_id: awaitingContract.id,
              snapshot_id: activeSnapshot.id,
              token_hash: tokenHash,
              token: null,
              expires_at: expiresAt,
              is_revoked: false,
            });

          const publicUrl = `${baseUrl}/contratacao/${rawToken}`;

          return {
            success: true,
            data: {
              contract_id: awaitingContract.id,
              token: rawToken,
              public_url: publicUrl,
              expires_at: expiresAt,
              commercial_status: 'contrato_enviado',
              already_sent: true,
              responsavel_nome: responsavelNome,
              responsavel_whatsapp: resp?.whatsapp || undefined,
            },
          };
        }
      }
    }

    // 4. Validação da máquina de estados comercial para novo envio
    assertCommercialStatusTransition(biz.commercial_status as CommercialStatus, 'contrato_enviado');

    // 5. Busca o contrato atual em draft
    const { data: activeContract, error: contractErr } = await (dbClient as any)
      .from('contracts')
      .select('id, status, created_at, version_id')
      .eq('business_id', businessId)
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (contractErr) {
      return { success: false, error: `Erro ao buscar contrato atual: ${contractErr.message}` };
    }

    if (!activeContract) {
      return {
        success: false,
        error: 'Nenhum contrato em rascunho (draft) encontrado. Gere a minuta antes de enviar para assinatura.',
      };
    }

    // 6. Busca o snapshot vinculado
    const { data: activeSnapshot, error: snapErr } = await (dbClient as any)
      .from('contract_snapshots')
      .select('id, sha256_hash, rendered_text, created_at')
      .eq('contract_id', activeContract.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (snapErr || !activeSnapshot) {
      return {
        success: false,
        error: 'Snapshot do contrato não localizado. Gere novamente a minuta antes do envio.',
      };
    }

    // 7. Validação de divergência: garante que dados atuais não mudaram após o snapshot
    const preview = await getAdminContractDraftPreviewAction(businessId);
    if (preview.success && preview.data?.rendered_markdown) {
      const recalculatedHash = crypto
        .createHash('sha256')
        .update(preview.data.rendered_markdown, 'utf8')
        .digest('hex');

      if (recalculatedHash !== activeSnapshot.sha256_hash) {
        return {
          success: false,
          error:
            'Não é possível enviar o contrato: os dados cadastrais ou comerciais foram alterados após a geração da minuta. Invalide o snapshot e gere uma nova versão antes de enviar para assinatura.',
        };
      }
    }

    // 8. Revogação de tokens anteriores ainda abertos para a empresa
    await (dbClient as any)
      .from('business_onboarding_tokens')
      .update({
        is_revoked: true,
        revoked_at: new Date().toISOString(),
      })
      .eq('business_id', businessId)
      .eq('is_revoked', false);

    // 9. Geração de token criptograficamente seguro (48 bytes hex = 96 chars)
    // HARDENING: Armazena apenas o hash SHA-256 no banco e vincula explicitamente a contract_id e snapshot_id
    const token = crypto.randomBytes(48).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token, 'utf8').digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 dias

    const { data: insertedToken, error: tokenErr } = await (dbClient as any)
      .from('business_onboarding_tokens')
      .insert({
        business_id: businessId,
        contract_id: activeContract.id,
        snapshot_id: activeSnapshot.id,
        token_hash: tokenHash,
        token: null, // Zero token em texto puro no banco de dados!
        expires_at: expiresAt,
        is_revoked: false,
      })
      .select('id, expires_at')
      .single();

    if (tokenErr || !insertedToken) {
      return {
        success: false,
        error: `Falha ao registrar token seguro de contratação: ${tokenErr?.message || 'Erro de banco.'}`,
      };
    }

    // 10. Atualiza status do contrato para awaiting_signature
    const { error: updateContractErr } = await (dbClient as any)
      .from('contracts')
      .update({
        status: 'awaiting_signature',
        updated_at: new Date().toISOString(),
      })
      .eq('id', activeContract.id);

    if (updateContractErr) {
      return {
        success: false,
        error: `Falha ao atualizar status do contrato: ${updateContractErr.message}`,
      };
    }

    // 11. Atualiza status comercial da empresa para contrato_enviado
    const { error: updateBizErr } = await (dbClient as any)
      .from('businesses')
      .update({
        commercial_status: 'contrato_enviado',
        updated_at: new Date().toISOString(),
      })
      .eq('id', businessId);

    if (updateBizErr) {
      return {
        success: false,
        error: `Falha ao atualizar status comercial da empresa: ${updateBizErr.message}`,
      };
    }

    const publicUrl = `${baseUrl}/contratacao/${token}`;

    // 12. Auditoria administrativa formal
    try {
      await (dbClient as any).from('admin_audit_logs').insert({
        tenant_id: biz.tenant_id,
        actor_id: user.id,
        action: 'SEND_CONTRACT_FOR_SIGNATURE',
        entity_type: 'contract',
        entity_id: activeContract.id,
        before_value: {
          contract_status: 'draft',
          commercial_status: biz.commercial_status,
        },
        after_value: {
          contract_status: 'awaiting_signature',
          commercial_status: 'contrato_enviado',
          token_id: insertedToken.id,
          expires_at: expiresAt,
          public_url: publicUrl,
        },
        reason: 'Envio formal do contrato para assinatura com geração de token criptográfico seguro (Microetapa 4.4).',
      });
    } catch (_auditErr) {}

    // 13. Revalidação de rotas
    revalidatePath(`/admin/empresas`);
    revalidatePath(`/admin/empresas/${businessId}`);
    revalidatePath(`/admin/empresas/${businessId}/contratacao`);

    return {
      success: true,
      data: {
        contract_id: activeContract.id,
        token,
        public_url: publicUrl,
        expires_at: expiresAt,
        commercial_status: 'contrato_enviado',
        responsavel_nome: responsavelNome,
        responsavel_whatsapp: resp?.whatsapp || undefined,
      },
    };
  } catch (err: any) {
    console.error('[sendAdminContractForSignatureAction] Exception:', err);
    return {
      success: false,
      error: err?.message || 'Erro inesperado ao enviar contrato para assinatura.',
    };
  }
}

/**
 * Revoga um link/token de assinatura ativo e reverte o status para contrato_gerado (Microetapa 4.4).
 */
export async function revokeAdminContractSignatureTokenAction(
  businessId: string,
  reason: string
): Promise<RevokeContractSignatureTokenResult> {
  try {
    const { user, supabase } = await assertPlatformAdminAccess();

    if (!businessId?.trim()) {
      return { success: false, error: 'Identificador da empresa é obrigatório.' };
    }

    const trimmedReason = reason?.trim();
    if (!trimmedReason || trimmedReason.length < 5) {
      return {
        success: false,
        error: 'A justificativa para revogação do link é obrigatória (mínimo de 5 caracteres).',
      };
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const dbClient = (serviceRoleKey && supabaseUrl)
      ? createClient<Database>(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : supabase;

    // 1. Busca empresa
    const { data: biz, error: bizErr } = await (dbClient as any)
      .from('businesses')
      .select('id, tenant_id, commercial_status')
      .eq('id', businessId)
      .single();

    if (bizErr || !biz) {
      return { success: false, error: 'Empresa não encontrada no banco de dados.' };
    }

    // 2. Busca contrato que está aguardando assinatura
    const { data: awaitingContract } = await (dbClient as any)
      .from('contracts')
      .select('id, status')
      .eq('business_id', businessId)
      .eq('status', 'awaiting_signature')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!awaitingContract) {
      return {
        success: false,
        error: 'Nenhum contrato aguardando assinatura localizado para revogação.',
      };
    }

    const revokedAt = new Date().toISOString();

    // 3. Revoga tokens ativos
    await (dbClient as any)
      .from('business_onboarding_tokens')
      .update({
        is_revoked: true,
        revoked_at: revokedAt,
      })
      .eq('business_id', businessId)
      .eq('is_revoked', false);

    // 4. Retorna contrato para draft
    await (dbClient as any)
      .from('contracts')
      .update({
        status: 'draft',
        updated_at: revokedAt,
      })
      .eq('id', awaitingContract.id);

    // 5. Retorna status comercial para contrato_gerado
    await (dbClient as any)
      .from('businesses')
      .update({
        commercial_status: 'contrato_gerado',
        updated_at: revokedAt,
      })
      .eq('id', businessId);

    // 6. Registra auditoria
    try {
      await (dbClient as any).from('admin_audit_logs').insert({
        tenant_id: biz.tenant_id,
        actor_id: user.id,
        action: 'REVOKE_CONTRACT_SIGNATURE_TOKEN',
        entity_type: 'contract',
        entity_id: awaitingContract.id,
        before_value: {
          contract_status: 'awaiting_signature',
          commercial_status: biz.commercial_status,
        },
        after_value: {
          contract_status: 'draft',
          commercial_status: 'contrato_gerado',
          reason: trimmedReason,
        },
        reason: trimmedReason,
      });
    } catch (_auditErr) {}

    // 7. Revalida rotas
    revalidatePath(`/admin/empresas`);
    revalidatePath(`/admin/empresas/${businessId}`);
    revalidatePath(`/admin/empresas/${businessId}/contratacao`);

    return {
      success: true,
      data: {
        contract_id: awaitingContract.id,
        commercial_status: 'contrato_gerado',
        revoked_at: revokedAt,
      },
    };
  } catch (err: any) {
    console.error('[revokeAdminContractSignatureTokenAction] Exception:', err);
    return {
      success: false,
      error: err?.message || 'Erro inesperado ao revogar link de assinatura.',
    };
  }
}

/**
 * Consulta pública segura para leitura de contrato via token (Fase 4: Microetapa 4.4 + Hardening SHA-256).
 * Não exige autenticação administrativa, mas valida com rigor a integridade do token_hash e expiração.
 */
export async function getPublicContractByTokenAction(
  token: string
): Promise<PublicContractDetailsResult> {
  try {
    const cleanToken = token?.trim();
    if (!cleanToken || cleanToken.length < 20) {
      return { success: false, error: 'Token de acesso inválido ou malformado.' };
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceRoleKey || !supabaseUrl) {
      return { success: false, error: 'Serviço de validação temporariamente indisponível.' };
    }

    const dbClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const tokenHash = crypto.createHash('sha256').update(cleanToken, 'utf8').digest('hex');

    // 1. Busca token na tabela usando o hash SHA-256 (com fallback legado para texto puro)
    let tokenRow: any = null;
    const { data: hashedRow } = await (dbClient as any)
      .from('business_onboarding_tokens')
      .select('id, business_id, contract_id, snapshot_id, token, token_hash, expires_at, is_revoked, revoked_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (hashedRow) {
      tokenRow = hashedRow;
    } else {
      const { data: legacyRow } = await (dbClient as any)
        .from('business_onboarding_tokens')
        .select('id, business_id, contract_id, snapshot_id, token, token_hash, expires_at, is_revoked, revoked_at')
        .eq('token', cleanToken)
        .maybeSingle();
      tokenRow = legacyRow;
    }

    if (!tokenRow) {
      return { success: false, error: 'Link de contratação não encontrado ou inválido.' };
    }

    // 2. Busca dados da empresa
    const { data: biz, error: bizErr } = await (dbClient as any)
      .from('businesses')
      .select('id, name, legal_name, cnpj, email, commercial_status, owner_id')
      .eq('id', tokenRow.business_id)
      .single();

    if (bizErr || !biz) {
      return { success: false, error: 'Empresa associada ao contrato não foi localizada.' };
    }

    // 3. Busca o contrato associado (priorizando contract_id vinculado ao token)
    let contractQuery = (dbClient as any)
      .from('contracts')
      .select(`
        id,
        status,
        created_at,
        updated_at,
        version_id,
        template_version:contract_versions(
          id,
          version,
          template:contract_templates(id, code, title)
        )
      `);

    if (tokenRow.contract_id) {
      contractQuery = contractQuery.eq('id', tokenRow.contract_id);
    } else {
      contractQuery = contractQuery
        .eq('business_id', tokenRow.business_id)
        .neq('status', 'superseded')
        .neq('status', 'voided')
        .order('created_at', { ascending: false })
        .limit(1);
    }

    const { data: contract, error: contractErr } = await contractQuery.maybeSingle();

    if (contractErr || !contract) {
      return { success: false, error: 'Contrato ativo não localizado para este link.' };
    }

    // Se o contrato já foi assinado, permitimos visualização da tela pós-assinatura mesmo se token revogado
    const isSigned = contract.status === 'signed' || biz.commercial_status === 'contrato_assinado';

    if (tokenRow.is_revoked && !isSigned) {
      return { success: false, error: 'Este link de contratação foi revogado pela administração.' };
    }

    if (new Date(tokenRow.expires_at).getTime() < Date.now() && !isSigned) {
      return { success: false, error: 'Este link de contratação expirou. Solicite um novo link à administração.' };
    }

    // 4. Busca o snapshot imutável gravado (priorizando snapshot_id vinculado ao token)
    let snapQuery = (dbClient as any)
      .from('contract_snapshots')
      .select('id, rendered_text, sha256_hash, signature_image_data, signer_cpf, created_at');

    if (tokenRow.snapshot_id) {
      snapQuery = snapQuery.eq('id', tokenRow.snapshot_id);
    } else {
      snapQuery = snapQuery
        .eq('contract_id', contract.id)
        .order('created_at', { ascending: false })
        .limit(1);
    }

    const { data: snap, error: snapErr } = await snapQuery.maybeSingle();

    if (snapErr || !snap) {
      return { success: false, error: 'Minuta oficial do contrato não localizada.' };
    }

    // 5. Busca dados dos termos comerciais conferidos
    const { data: terms } = await (dbClient as any)
      .from('business_commercial_terms')
      .select('plan_name, amount_cents, billing_cycle, payment_method, installments_count, installment_amount_cents, is_pedra_fundamental, responsible_cpf')
      .eq('business_id', biz.id)
      .maybeSingle();

    const planName = terms?.plan_name || 'Plano Comercial';
    const amountCents = terms?.amount_cents || 0;
    const formattedAmount = (amountCents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    // 6. Dados do responsável
    const { data: resp } = await (dbClient as any)
      .from('business_responsibles')
      .select('name')
      .eq('business_id', biz.id)
      .maybeSingle();

    let responsavelNome = resp?.name;
    let responsavelCpf: string | undefined = snap.signer_cpf || terms?.responsible_cpf || undefined;
    let responsavelEmail = biz.email;

    if (biz.owner_id) {
      const { data: prof } = await (dbClient as any)
        .from('profiles')
        .select('name, email, document_number')
        .eq('id', biz.owner_id)
        .maybeSingle();
      if (prof) {
        if (!responsavelNome) responsavelNome = prof.name;
        if (!responsavelCpf) responsavelCpf = prof.document_number;
        if (prof.email) responsavelEmail = prof.email;
      }
    }
    responsavelNome = responsavelNome || biz.name;

    const verObj = contract.template_version;

    // Se o contrato já foi assinado, busca ou cria uma sessão ativa de pagamento (Microetapa 6.2)
    let activePaymentToken: string | undefined;
    let existingCharge: any = null;

    if (isSigned) {
      // 1. Busca token de pagamento ativo não revogado
      const { data: payTok } = await (dbClient as any)
        .from('business_onboarding_tokens')
        .select('id, token, token_hash, expires_at')
        .eq('business_id', biz.id)
        .eq('token_type', 'onboarding_payment')
        .eq('is_revoked', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (payTok && payTok.token) {
        activePaymentToken = payTok.token;
      } else {
        const rawPayTok = crypto.randomBytes(48).toString('hex');
        const payHash = crypto.createHash('sha256').update(rawPayTok, 'utf8').digest('hex');
        const payExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        if (payTok) {
          await (dbClient as any)
            .from('business_onboarding_tokens')
            .update({ is_revoked: true, revoked_at: new Date().toISOString() })
            .eq('id', payTok.id);
        }

        await (dbClient as any)
          .from('business_onboarding_tokens')
          .insert({
            business_id: biz.id,
            contract_id: contract.id,
            snapshot_id: snap.id,
            token_hash: payHash,
            token_type: 'onboarding_payment',
            token: null,
            expires_at: payExpires,
            is_revoked: false,
          });

        activePaymentToken = rawPayTok;
      }

      // 2. Idempotência visual: busca cobrança existente em invoices e payment_attempts
      const idempotencyPrefix = `onboarding_inv_${biz.tenant_id}_${biz.id}_${contract.id}`;
      const { data: inv } = await (dbClient as any)
        .from('invoices')
        .select('id, amount_due, status, payment_method, installments, idempotency_key')
        .eq('tenant_id', biz.tenant_id)
        .eq('business_id', biz.id)
        .ilike('idempotency_key', `${idempotencyPrefix}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (inv) {
        const { data: attempt } = await (dbClient as any)
          .from('payment_attempts')
          .select('id, payment_method, status, payload_received')
          .eq('invoice_id', inv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const invAmountCents = Math.round(Number(inv.amount_due) * 100);
        existingCharge = {
          invoice_id: inv.id,
          payment_method: inv.payment_method || attempt?.payment_method || 'pix',
          status: attempt?.payload_received?.status || attempt?.status || inv.status || 'aguardando_pagamento',
          amount_cents: invAmountCents,
          formatted_amount: (invAmountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
          installments: inv.installments || 1,
          pix_copia_e_cola: attempt?.payload_received?.pix_copia_e_cola,
          qr_code_base64: attempt?.payload_received?.qr_code_base64,
          payment_id: attempt?.payload_received?.payment_id,
        };
      }
    }

    return {
      success: true,
      data: {
        business_id: biz.id,
        business_name: biz.name,
        business_legal_name: biz.legal_name || biz.name,
        cnpj: formatCpfCnpj(biz.cnpj || '00000000000000'),
        responsavel_nome: responsavelNome,
        responsavel_cpf: responsavelCpf ? formatCpfCnpj(responsavelCpf) : undefined,
        responsavel_email: responsavelEmail,
        contract_id: contract.id,
        contract_status: contract.status,
        commercial_status: biz.commercial_status,
        snapshot_id: snap.id,
        template_code: verObj?.template?.code || CANONICAL_ADVERTISER_CONTRACT_CODE,
        template_title: verObj?.template?.title || 'Contrato de Adesão — Anunciante Conexão Maçônica',
        template_version: verObj?.version || CANONICAL_ADVERTISER_CONTRACT_VERSION,
        rendered_markdown: snap.rendered_text,
        sha256_hash: snap.sha256_hash,
        created_at: snap.created_at,
        expires_at: tokenRow.expires_at,
        plan_name: planName,
        amount_cents: amountCents,
        formatted_amount: formattedAmount,
        billing_cycle: terms?.billing_cycle === 'biennial' ? 'Bienal (24 meses)' : 'Anual (12 meses)',
        payment_method: terms?.payment_method === 'parcelado' ? 'Parcelado' : 'À vista',
        installments_count: terms?.installments_count || 1,
        is_pedra_fundamental: terms?.is_pedra_fundamental || false,
        signature_image_data: snap.signature_image_data || undefined,
        signer_cpf: snap.signer_cpf || undefined,
        accepted_at: isSigned ? contract.updated_at : undefined,
        payment_token: activePaymentToken,
        active_charge: existingCharge || undefined,
      },
    };
  } catch (err: any) {
    console.error('[getPublicContractByTokenAction] Exception:', err);
    return {
      success: false,
      error: err?.message || 'Erro inesperado ao consultar contrato.',
    };
  }
}

/**
 * Assina eletronicamente o contrato público do anunciante (Fase 5: Microetapas 5.1 a 5.4).
 *
 * Executa as validações probatórias com rigor:
 * - Valida integridade do token via SHA-256
 * - Valida expiração e não-revogação
 * - Valida contracts.status === 'awaiting_signature'
 * - Valida concordância expressa com os termos
 * - Valida CPF do signatário com algoritmo oficial de 11 dígitos
 * - Valida canvas de assinatura não vazio (dados de imagem válidos)
 * - Registra signature_image_data, signer_cpf, IP e User-Agent no snapshot
 * - Insere registro em contract_acceptances
 * - Transiciona contracts.status -> 'signed'
 * - Transiciona commercial_status -> 'contrato_assinado'
 * - Revoga o token consumido (impede reuso)
 * - Registra trilha de auditoria em admin_audit_logs
 */


export async function signPublicContractAction(
  payload: SignPublicContractPayload
): Promise<SignPublicContractResult> {
  try {
    const cleanToken = payload?.token?.trim();
    if (!cleanToken || cleanToken.length < 20) {
      return { success: false, error: 'Token de assinatura inválido ou não informado.' };
    }

    if (!payload.agree_terms) {
      return {
        success: false,
        error: 'É obrigatório declarar ciência e concordância expressa com os termos do contrato para assinar.',
      };
    }

    const rawCpf = payload.signer_cpf?.trim() || '';
    const cleanCpf = rawCpf.replace(/\D/g, '');
    const cpfError = validateCpf(cleanCpf);
    if (cpfError) {
      return { success: false, error: cpfError };
    }

    const sigData = payload.signature_image_data?.trim();
    if (!sigData || !sigData.startsWith('data:image/') || sigData.length < 200) {
      return {
        success: false,
        error: 'Por favor, desenhe sua assinatura no campo indicado antes de prosseguir.',
      };
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceRoleKey || !supabaseUrl) {
      return { success: false, error: 'Serviço temporariamente indisponível.' };
    }

    const dbClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const tokenHash = crypto.createHash('sha256').update(cleanToken, 'utf8').digest('hex');

    // 1. Busca e valida token
    let tokenRow: any = null;
    const { data: hashedRow } = await (dbClient as any)
      .from('business_onboarding_tokens')
      .select('id, business_id, contract_id, snapshot_id, token, token_hash, expires_at, is_revoked')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (hashedRow) {
      tokenRow = hashedRow;
    } else {
      const { data: legacyRow } = await (dbClient as any)
        .from('business_onboarding_tokens')
        .select('id, business_id, contract_id, snapshot_id, token, token_hash, expires_at, is_revoked')
        .eq('token', cleanToken)
        .maybeSingle();
      tokenRow = legacyRow;
    }

    if (!tokenRow) {
      return { success: false, error: 'Link de assinatura não encontrado ou inválido.' };
    }

    if (tokenRow.is_revoked) {
      return { success: false, error: 'Este link de assinatura já foi utilizado ou revogado.' };
    }

    if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
      return { success: false, error: 'Este link de assinatura expirou. Solicite um novo link à administração.' };
    }

    // 2. Busca empresa
    const { data: biz, error: bizErr } = await (dbClient as any)
      .from('businesses')
      .select('id, tenant_id, name, legal_name, commercial_status, owner_id')
      .eq('id', tokenRow.business_id)
      .single();

    if (bizErr || !biz) {
      return { success: false, error: 'Empresa associada não encontrada.' };
    }

    // A identidade do signatário é a já conferida nos termos comerciais.
    // O navegador não pode substituir o CPF cadastrado pelo administrador.
    const { data: commercialTerms, error: termsErr } = await (dbClient as any)
      .from('business_commercial_terms')
      .select('responsible_cpf')
      .eq('business_id', biz.id)
      .maybeSingle();

    if (termsErr) {
      return { success: false, error: 'Não foi possível conferir o CPF cadastrado do representante legal.' };
    }

    const registeredCpf = commercialTerms?.responsible_cpf?.replace(/\D/g, '') || '';
    if (validateCpf(registeredCpf)) {
      return {
        success: false,
        error: 'O CPF cadastrado para o representante legal é inválido. Solicite a correção dos dados antes de assinar.',
      };
    }

    if (cleanCpf !== registeredCpf) {
      return { success: false, error: 'O CPF informado não corresponde ao representante legal cadastrado.' };
    }

    // 3. Valida contrato
    let contractQuery = (dbClient as any)
      .from('contracts')
      .select('id, status, version_id')
      .eq('business_id', biz.id);

    if (tokenRow.contract_id) {
      contractQuery = contractQuery.eq('id', tokenRow.contract_id);
    } else {
      contractQuery = contractQuery
        .eq('status', 'awaiting_signature')
        .order('created_at', { ascending: false })
        .limit(1);
    }

    const { data: contract, error: contractErr } = await contractQuery.maybeSingle();

    if (contractErr || !contract) {
      return { success: false, error: 'Contrato correspondente não encontrado.' };
    }

    if (contract.status !== 'awaiting_signature') {
      return {
        success: false,
        error: `O contrato não está aguardando assinatura (status atual: ${contract.status}).`,
      };
    }

    // 4. Valida snapshot autorizado
    let snapQuery = (dbClient as any)
      .from('contract_snapshots')
      .select('id, sha256_hash, rendered_text')
      .eq('contract_id', contract.id);

    if (tokenRow.snapshot_id) {
      snapQuery = snapQuery.eq('id', tokenRow.snapshot_id);
    } else {
      snapQuery = snapQuery.order('created_at', { ascending: false }).limit(1);
    }

    const { data: snapshot, error: snapErr } = await snapQuery.maybeSingle();

    if (snapErr || !snapshot) {
      return { success: false, error: 'Snapshot autorizado não localizado.' };
    }

    // 5. Captura evidências técnicas com anonimização de IP para conformidade LGPD
    const signedRenderedText = appendSignatureImageToContractText(
      snapshot.rendered_text,
      sigData,
      biz.name,
      biz.legal_name
    );
    const signedSha256Hash = crypto
      .createHash('sha256')
      .update(signedRenderedText, 'utf8')
      .digest('hex');

    let rawIp = '127.0.0.1';
    let userAgent = 'Browser';
    try {
      const reqHeaders = await headers();
      const xff = reqHeaders.get('x-forwarded-for');
      rawIp = (xff ? xff.split(',')[0]?.trim() : null) || reqHeaders.get('x-real-ip') || '127.0.0.1';
      userAgent = reqHeaders.get('user-agent') || 'Browser';
    } catch (_e) {}

    // Compatibilidade defensiva enquanto a migration 147 não tiver sido aplicada.
    const sanitizedIp = anonymizeIpForAudit(rawIp).slice(0, 45);
    const acceptedAt = new Date().toISOString();

    // 6. Execução com garantia de atomicidade transacional via RPC (Migration 131)
    let atomicSuccess = false;
    try {
      const { data: rpcRes, error: rpcErr } = await (dbClient as any).rpc(
        'sign_commercial_contract_atomic',
        {
          p_token_hash: tokenHash,
          p_signer_cpf: cleanCpf,
          p_signature_image_data: sigData,
          p_ip_address: sanitizedIp,
          p_user_agent: userAgent,
        }
      );

      if (!rpcErr && rpcRes && (rpcRes.success || rpcRes.commercial_status === 'contrato_assinado')) {
        atomicSuccess = true;
      } else if (rpcErr) {
        console.warn('[signPublicContractAction] RPC atomic fallback:', rpcErr.message);
      }
    } catch (_rpcEx) {
      // Fallback defensivo se a RPC não estiver disponível no ambiente
    }

    if (atomicSuccess) {
      await (dbClient as any)
        .from('contract_snapshots')
        .update({
          rendered_text: signedRenderedText,
          sha256_hash: signedSha256Hash,
        })
        .eq('id', snapshot.id);

      await (dbClient as any)
        .from('contract_acceptances')
        .update({ sha256_hash: signedSha256Hash })
        .eq('snapshot_id', snapshot.id);
    }

    if (!atomicSuccess) {
      // Atualiza snapshot com imagem da assinatura e dados probatórios
      const { error: updateSnapErr } = await (dbClient as any)
        .from('contract_snapshots')
        .update({
          rendered_text: signedRenderedText,
          sha256_hash: signedSha256Hash,
          signature_image_data: sigData,
          signer_cpf: cleanCpf,
          ip_address: sanitizedIp,
          user_agent: userAgent,
        })
        .eq('id', snapshot.id);

      if (updateSnapErr) {
        return { success: false, error: `Falha ao registrar assinatura no snapshot: ${updateSnapErr.message}` };
      }

      // Insere registro em contract_acceptances
      const { error: insertAcceptanceErr } = await (dbClient as any)
        .from('contract_acceptances')
        .insert({
          contract_id: contract.id,
          snapshot_id: snapshot.id,
          user_id: biz.owner_id || null,
          accepted_at: acceptedAt,
          ip_address: sanitizedIp,
          user_agent: userAgent,
          sha256_hash: signedSha256Hash,
        });

      if (insertAcceptanceErr) {
        console.warn('[signPublicContractAction] Falha ao gravar em contract_acceptances:', insertAcceptanceErr);
      }

      // Atualiza contracts para 'signed'
      const { error: updateContractErr } = await (dbClient as any)
        .from('contracts')
        .update({
          status: 'signed',
          updated_at: acceptedAt,
        })
        .eq('id', contract.id);

      if (updateContractErr) {
        return { success: false, error: `Falha ao atualizar status do contrato: ${updateContractErr.message}` };
      }

      // Atualiza status comercial da empresa para 'contrato_assinado'
      assertCommercialStatusTransition(biz.commercial_status as CommercialStatus, 'contrato_assinado');

      const { error: updateBizErr } = await (dbClient as any)
        .from('businesses')
        .update({
          commercial_status: 'contrato_assinado',
          updated_at: acceptedAt,
        })
        .eq('id', biz.id);

      if (updateBizErr) {
        return { success: false, error: `Falha ao atualizar status comercial da empresa: ${updateBizErr.message}` };
      }

      // Consome o token (is_revoked = true) para impedir reutilização
      await (dbClient as any)
        .from('business_onboarding_tokens')
        .update({
          is_revoked: true,
          revoked_at: acceptedAt,
        })
        .eq('id', tokenRow.id);
    }

    // 11. Trilha de Auditoria
    try {
      await (dbClient as any).from('admin_audit_logs').insert({
        tenant_id: biz.tenant_id,
        actor_id: biz.owner_id || null,
        action: 'SIGN_CONTRACT_PUBLIC',
        entity_type: 'contract',
        entity_id: contract.id,
        before_value: {
          contract_status: 'awaiting_signature',
          commercial_status: biz.commercial_status,
        },
        after_value: {
          contract_status: 'signed',
          commercial_status: 'contrato_assinado',
          signer_cpf: cleanCpf,
          accepted_at: acceptedAt,
          token_id: tokenRow.id,
          snapshot_id: snapshot.id,
        },
        reason: 'Assinatura eletrônica formalizada com sucesso pelo anunciante via link seguro.',
      });
    } catch (_auditErr) {}

    // 12. Busca dados comerciais para resumo pós-assinatura
    const { data: terms } = await (dbClient as any)
      .from('business_commercial_terms')
      .select('plan_name, amount_cents, billing_cycle, payment_method, installments_count')
      .eq('business_id', biz.id)
      .maybeSingle();

    const planName = terms?.plan_name || 'Plano Comercial';
    const amountCents = terms?.amount_cents || 0;
    const formattedAmount = (amountCents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    // 13. Emissão de payment_token isolado para autorizar pagamento (Microetapa 6.2)
    const rawPaymentToken = crypto.randomBytes(48).toString('hex');
    const paymentTokenHash = crypto.createHash('sha256').update(rawPaymentToken, 'utf8').digest('hex');
    const paymentExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    try {
      await (dbClient as any)
        .from('business_onboarding_tokens')
        .insert({
          business_id: biz.id,
          contract_id: contract.id,
          snapshot_id: snapshot.id,
          token_hash: paymentTokenHash,
          token_type: 'onboarding_payment',
          token: null,
          expires_at: paymentExpiresAt,
          is_revoked: false,
        });
    } catch (_tokErr) {}

    // 14. Revalidação de rotas
    try {
      revalidatePath(`/contratacao/${cleanToken}`);
      revalidatePath(`/admin/empresas/${biz.id}`);
      revalidatePath(`/admin/empresas/${biz.id}/contratacao`);
    } catch (_revalidateErr) {}

    return {
      success: true,
      data: {
        contract_id: contract.id,
        snapshot_id: snapshot.id,
        commercial_status: 'contrato_assinado',
        accepted_at: acceptedAt,
        signer_cpf: cleanCpf,
        business_name: biz.name,
        plan_name: planName,
        amount_cents: amountCents,
        formatted_amount: formattedAmount,
        billing_cycle: terms?.billing_cycle === 'biennial' ? 'Bienal (24 meses)' : 'Anual (12 meses)',
        payment_method: terms?.payment_method === 'parcelado' ? 'Parcelado' : 'À vista',
        installments_count: terms?.installments_count || 1,
        payment_token: rawPaymentToken,
      },
    };
  } catch (err: any) {
    console.error('[signPublicContractAction] Exception:', err);
    return {
      success: false,
      error: err?.message || 'Erro inesperado ao assinar contrato.',
    };
  }
}

export interface AdminSignedContractResult {
  contract_id: string;
  contract_status: 'signed';
  snapshot_id: string;
  rendered_text: string;
  sha256_hash: string;
  signature_image_data?: string | null;
  signer_cpf?: string | null;
  signer_name?: string;
  accepted_at: string;
  template_version: string;
  acceptance_id: string;
}

/**
 * Consulta sob demanda o contrato efetivamente assinado pelo anunciante,
 * resgatando seu snapshot imutável (rendered_text, sha256_hash, signature_image_data, etc.),
 * garantindo validade jurídica e conformidade probatória sem recalcular a minuta.
 */
export async function getAdminSignedContractAction(
  businessId: string
): Promise<{ success: boolean; data?: AdminSignedContractResult; error?: string }> {
  try {
    await assertPlatformAdminAccess();

    if (!businessId?.trim()) {
      return { success: false, error: 'Identificador da empresa é obrigatório.' };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return { success: false, error: 'Configuração segura do Supabase indisponível.' };
    }
    const dbClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Busca contrato com status 'signed'
    const { data: contract, error: contractErr } = await (dbClient as any)
      .from('contracts')
      .select('id, status, version_id, created_at')
      .eq('business_id', businessId)
      .eq('status', 'signed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (contractErr) {
      console.error('[getAdminSignedContractAction] Falha ao consultar contrato:', contractErr);
      return { success: false, error: `Falha ao consultar contrato: ${contractErr.message}` };
    }

    if (!contract) {
      return { success: false, error: 'Nenhum contrato assinado foi localizado para esta empresa.' };
    }

    // 2. Resolve primeiro o aceite e usa exatamente o snapshot que foi aceito.
    const { data: acceptanceRow, error: acceptanceErr } = await (dbClient as any)
      .from('contract_acceptances')
      .select('id, snapshot_id, accepted_at, sha256_hash')
      .eq('contract_id', contract.id)
      .order('accepted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (acceptanceErr) {
      return { success: false, error: `Falha ao consultar aceite do contrato: ${acceptanceErr.message}` };
    }
    if (!acceptanceRow) {
      return { success: false, error: 'Registro formal de aceite do contrato não localizado.' };
    }

    const { data: snapshot, error: snapErr } = await (dbClient as any)
      .from('contract_snapshots')
      .select('id, rendered_text, sha256_hash, signature_image_data, signer_cpf')
      .eq('id', acceptanceRow.snapshot_id)
      .eq('contract_id', contract.id)
      .maybeSingle();

    if (snapErr || !snapshot || !snapshot.rendered_text) {
      return {
        success: false,
        error: 'Snapshot imutável do contrato assinado não localizado.',
      };
    }

    // 3. Busca metadados de versão, aceite e empresa
    const [{ data: versionRow }, { data: termsRow }, { data: bizRow }] = await Promise.all([
      (dbClient as any)
        .from('contract_versions')
        .select('version')
        .eq('id', contract.version_id)
        .maybeSingle(),
      (dbClient as any)
        .from('business_commercial_terms')
        .select('responsible_cpf')
        .eq('business_id', businessId)
        .maybeSingle(),
      (dbClient as any)
        .from('businesses')
        .select('name')
        .eq('id', businessId)
        .maybeSingle(),
    ]);

    const signerCpf = snapshot.signer_cpf || termsRow?.responsible_cpf || null;

    return {
      success: true,
      data: {
        contract_id: contract.id,
        contract_status: 'signed',
        snapshot_id: snapshot.id,
        rendered_text: snapshot.rendered_text,
        sha256_hash: acceptanceRow.sha256_hash || snapshot.sha256_hash,
        signature_image_data: snapshot.signature_image_data || null,
        signer_cpf: signerCpf,
        signer_name: bizRow?.name || 'Anunciante Titular',
        accepted_at: acceptanceRow?.accepted_at || contract.created_at,
        template_version: versionRow?.version || 'v1.0',
        acceptance_id: acceptanceRow?.id || '',
      },
    };
  } catch (err: any) {
    console.error('[getAdminSignedContractAction] Exception:', err);
    return {
      success: false,
      error: err?.message || 'Erro inesperado ao consultar contrato assinado.',
    };
  }
}
