'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { assertPlatformAdminAccess } from '@/lib/admin/admin-auth-helper';
import type { Database } from '@/types/database.types';
import { CANONICAL_ADVERTISER_CONTRACT_CODE, CANONICAL_ADVERTISER_CONTRACT_MARKDOWN, CANONICAL_ADVERTISER_CONTRACT_VERSION } from './contract-constants';

export type ManagedDocumentType = 'anunciante' | 'termos' | 'privacidade';
export type ManagedDocument = { version: string; text: string };

const LEGAL_DOCUMENTS = {
  termos: { code: 'terms_of_use', title: 'Termos de Uso da Plataforma' },
  privacidade: { code: 'privacy_policy', title: 'Política de Privacidade — Conexão Maçônica' },
} as const;

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Configuração segura do Supabase indisponível no servidor.');
  return createClient<Database>(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function loadManagedDocumentsAction(): Promise<{ success: boolean; documents?: Partial<Record<ManagedDocumentType, ManagedDocument>>; error?: string }> {
  try {
    await assertPlatformAdminAccess();
    const db = getAdminClient() as any;
    const documents: Partial<Record<ManagedDocumentType, ManagedDocument>> = {};
    const { data: contract, error: contractError } = await db.from('contract_versions')
      .select('version, content_markdown, contract_templates!inner(code)')
      .eq('contract_templates.code', CANONICAL_ADVERTISER_CONTRACT_CODE).eq('is_active', true)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (contractError) throw contractError;
    documents.anunciante = contract
      ? { version: contract.version, text: contract.content_markdown }
      : { version: CANONICAL_ADVERTISER_CONTRACT_VERSION, text: CANONICAL_ADVERTISER_CONTRACT_MARKDOWN };

    for (const type of ['termos', 'privacidade'] as const) {
      const { data, error } = await db.from('legal_document_versions')
        .select('version, content_markdown, legal_documents!inner(code)')
        .eq('legal_documents.code', LEGAL_DOCUMENTS[type].code)
        .lte('effective_date', new Date().toISOString())
        .order('effective_date', { ascending: false }).order('created_at', { ascending: false })
        .limit(1).maybeSingle();
      if (error) throw error;
      if (data) documents[type] = { version: data.version, text: data.content_markdown };
    }
    return { success: true, documents };
  } catch (error) {
    console.error('[loadManagedDocumentsAction] Falha ao carregar documentos:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Falha ao carregar documentos.' };
  }
}

export async function publishManagedDocumentAction(input: { type: ManagedDocumentType; version: string; text: string }): Promise<{ success: boolean; document?: ManagedDocument; error?: string }> {
  try {
    await assertPlatformAdminAccess();
    const version = input.version.trim();
    const text = input.text.trim();
    if (!version || !text) return { success: false, error: 'Informe a versão e o conteúdo do documento.' };
    const db = getAdminClient() as any;

    if (input.type === 'anunciante') {
      let { data: template, error: templateError } = await db.from('contract_templates').select('id')
        .eq('code', CANONICAL_ADVERTISER_CONTRACT_CODE).maybeSingle();
      if (templateError) throw templateError;
      if (!template) {
        const { data: tenant, error: tenantError } = await db.from('tenants').select('id')
          .order('created_at', { ascending: true }).limit(1).maybeSingle();
        if (tenantError) throw tenantError;
        if (!tenant) return { success: false, error: 'Tenant principal não encontrado para cadastrar o contrato.' };

        const createdTemplate = await db.from('contract_templates').insert({
          tenant_id: tenant.id,
          code: CANONICAL_ADVERTISER_CONTRACT_CODE,
          title: 'Contrato de Adesão — Anunciante Conexão Maçônica',
          description: 'Template oficial de adesão e licenciamento comercial de anunciantes da plataforma Conexão Maçônica.',
        }).select('id').single();
        if (createdTemplate.error) throw createdTemplate.error;
        template = createdTemplate.data;
      }
      const { data: created, error: insertError } = await db.from('contract_versions')
        .insert({ template_id: template.id, version, content_markdown: text, is_active: false }).select('id').single();
      if (insertError) throw insertError;
      const { error: deactivateError } = await db.from('contract_versions').update({ is_active: false })
        .eq('template_id', template.id).neq('id', created.id);
      if (deactivateError) throw deactivateError;
      const { error: activateError } = await db.from('contract_versions').update({ is_active: true }).eq('id', created.id);
      if (activateError) throw activateError;
    } else {
      const meta = LEGAL_DOCUMENTS[input.type];
      let { data: legalDocument, error: documentError } = await db.from('legal_documents').select('id')
        .eq('code', meta.code).is('tenant_id', null).maybeSingle();
      if (documentError) throw documentError;
      if (!legalDocument) {
        const created = await db.from('legal_documents').insert({ code: meta.code, title: meta.title, tenant_id: null }).select('id').single();
        if (created.error) throw created.error;
        legalDocument = created.data;
      }
      const { error } = await db.from('legal_document_versions').insert({
        document_id: legalDocument.id, version, content_markdown: text, effective_date: new Date().toISOString(),
      });
      if (error) throw error;
    }
    revalidatePath('/admin/juridico/contratos');
    return { success: true, document: { version, text } };
  } catch (error: any) {
    console.error('[publishManagedDocumentAction] Falha ao publicar documento:', error);
    return { success: false, error: error?.code === '23505' ? 'Essa versão já existe. Informe uma nova versão.' : error?.message || 'Falha ao publicar o documento.' };
  }
}
