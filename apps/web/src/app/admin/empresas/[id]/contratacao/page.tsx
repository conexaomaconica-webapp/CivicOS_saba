import React from 'react';
import { notFound } from 'next/navigation';
import { getAdminBusiness360Action } from '@/lib/admin/admin-businesses-service';
import CommercialOnboardingClient from './commercial-onboarding-client';
import InvoiceControl from './invoice-control';
import { validateCpfCnpj } from '@/lib/onboarding/onboarding-validation';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { pickResponsibleName } from '@/lib/contracts/responsible-name';

type ContratacaoPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({ params }: ContratacaoPageProps) {
  const { id } = await params;
  try {
    const dto = await getAdminBusiness360Action(id);
    if (!dto) return { title: 'Empresa não encontrada · Admin CM' };
    return { title: `Contratação Comercial: ${dto.business.name} · Conexão Maçônica Admin` };
  } catch (_err) {
    return { title: 'Contratação Comercial · Conexão Maçônica Admin' };
  }
}

export default async function ContratacaoPage({ params }: ContratacaoPageProps) {
  const { id } = await params;
  const dto = await getAdminBusiness360Action(id);

  if (!dto) {
    notFound();
  }

  // Pendências que fazem o gateway recusar a cobrança: avisa a equipe ANTES de enviar o link de contratação.
  const business = dto.business as { cnpj_cpf?: string; cnpj?: string; email?: string; phone?: string; whatsapp?: string };
  const document = (business.cnpj_cpf || business.cnpj || '').trim();
  const warnings: string[] = [];
  if (!document) warnings.push('Falta o CNPJ/CPF da empresa: o gateway de pagamento exige o documento para gerar PIX e cartão.');
  else if (validateCpfCnpj(document)) warnings.push(`O CNPJ/CPF cadastrado parece inválido (${validateCpfCnpj(document)}). Corrija no cadastro antes de enviar o link de pagamento.`);
  if (!(business.email || '').trim()) warnings.push('A empresa não tem e-mail cadastrado: o pagamento usaria o e-mail genérico do financeiro. Cadastre o e-mail do responsável.');
  // Assinatura com nome/CPF diferentes do cadastro: a equipe precisa conferir o contrato assinado.
  try {
    const auditReader: any = createServiceRoleClient();
    if (auditReader) {
      const { data: divergent } = await auditReader
        .from('admin_audit_logs')
        .select('after_value, created_at')
        .eq('entity_id', id)
        .eq('action', 'CONTRACT_SIGNED_DIVERGENT_SIGNER')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (divergent) {
        const what = [divergent.after_value?.name_differs ? 'o nome' : null, divergent.after_value?.cpf_differs ? 'o CPF' : null]
          .filter(Boolean)
          .join(' e ');
        warnings.push(`Ao assinar, o signatário informou ${what || 'dados'} diferente(s) do cadastro (${divergent.after_value?.declared_name || 'nome'}, CPF ${divergent.after_value?.declared_cpf || ''}). Confira o contrato assinado.`);
      }
    }
  } catch {
    // aviso auxiliar
  }

  // Nome do representante legal: vai no contrato e abaixo da assinatura, então precisa ser o nome completo real.
  try {
    const reader: any = createServiceRoleClient();
    if (reader) {
      const { data: resp } = await reader.from('business_responsibles').select('name').eq('business_id', id).maybeSingle();
      const { data: ownerRow } = await reader.from('businesses').select('owner_id').eq('id', id).maybeSingle();
      const { data: ownerProfile } = ownerRow?.owner_id
        ? await reader.from('profiles').select('name').eq('id', ownerRow.owner_id).maybeSingle()
        : { data: null };
      const representative = pickResponsibleName(resp?.name, ownerProfile?.name);
      if (!representative) {
        warnings.push('Falta o nome do representante legal. Informe o nome completo no prontuário da empresa antes de gerar o contrato.');
      } else if (representative.split(' ').filter(Boolean).length < 2) {
        warnings.push(`O representante legal está só como "${representative}". Informe o nome completo no prontuário da empresa antes de gerar o contrato; ele aparece no contrato e abaixo da assinatura.`);
      }
    }
  } catch {
    // aviso é auxiliar: a falha de leitura não impede abrir a página
  }
  if (![business.phone, business.whatsapp].some((value) => (value || '').replace(/\D/g, '').length >= 10)) {
    warnings.push('Falta um telefone ou WhatsApp para contato da cobrança.');
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {warnings.length > 0 && (
        <div role="alert" className="mb-6 space-y-1.5 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">Confira antes de enviar o contrato e o pagamento</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900">
            {warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </div>
      )}
      <CommercialOnboardingClient dto={dto} />
      <InvoiceControl businessId={id} />
    </div>
  );
}
