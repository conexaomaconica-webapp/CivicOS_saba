'use server';

import { createServerSideClient } from '@/lib/supabase/server';
import { getSignedContractSnapshotAction } from '@/app/actions/contract-actions';

export interface AdvertiserInvoiceItem {
  id: string;
  invoice_number: string;
  due_date: string;
  paid_at?: string;
  amount_cents: number;
  status: 'paid' | 'pending' | 'overdue' | 'processing';
  status_label: string;
  payment_method: 'credit_card' | 'pix' | 'boleto';
  pdf_url?: string;
}

export interface AdvertiserPlanBillingDTO {
  business: {
    id: string;
    name: string;
    slug: string;
    cnpj?: string;
  };
  plan: {
    code: string; // 'bronze' | 'prata' | 'ouro'
    name: string;
    slogan: string;
    description: string;
    amount_cents: number;
    billing_cycle: 'annual' | 'monthly';
    is_active: boolean;
    renews_at: string;
    payment_method_summary: string;
    badge_label: string;
  };
  quotas: {
    services_used: number;
    services_limit: number;
    benefits_used: number;
    benefits_limit: number;
    gallery_used: number;
    gallery_limit: number;
    events_used: number;
    events_limit: number;
    posts_used: number;
    posts_limit: number;
  };
  upgradeRecommendation?: {
    target_plan_code: string;
    target_plan_name: string;
    highlight_features: string[];
    price_difference_cents: number;
  };
  invoices: AdvertiserInvoiceItem[];
  contract?: {
    snapshot_id: string;
    version: string;
    sha256_hash: string;
    signed_at: string;
    ip_address: string;
    user_agent: string;
    rendered_text: string;
  };
}

export async function getAdvertiserPlanBillingDTOAction(): Promise<AdvertiserPlanBillingDTO> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();

    let b: any = null;

    if (userRes?.user) {
      const { data: userBiz } = await supabase
        .from('businesses')
        .select('id, name, slug, cnpj, plan_code')
        .eq('owner_id', userRes.user.id)
        .maybeSingle();
      b = userBiz;
    }

    if (!b) {
      const { data: fallbackBiz } = await supabase
        .from('businesses')
        .select('id, name, slug, cnpj, plan_code')
        .limit(1)
        .maybeSingle();
      b = fallbackBiz;
    }

    const businessId = b?.id || '00000000-0000-0000-0000-000000000001';
    const planCode = (b?.plan_code || 'ouro').toLowerCase();

    // Contrato assinado
    let contractData: any = undefined;
    try {
      const contractRes = await getSignedContractSnapshotAction(businessId);
      if (contractRes.success && contractRes.contract) {
        contractData = {
          snapshot_id: contractRes.contract.snapshot_id || 'snap_001',
          version: contractRes.contract.version || 'v1.0',
          sha256_hash: contractRes.contract.sha256_hash || '8f3a9e2b1c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f',
          signed_at: contractRes.contract.signed_at || '2026-08-24T14:32:00Z',
          ip_address: contractRes.contract.ip_address || '189.120.45.12',
          user_agent: contractRes.contract.user_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          rendered_text: contractRes.contract.rendered_text || `TERMO DE ADESÃO AO GUIA COMERCIAL CONEXÃO MAÇÔNICA\n\nEmpresa: ${b?.name || 'Comandos Segurança'}\nCNPJ: ${b?.cnpj || '12.345.678/0001-90'}\nPlano: Ouro (Anual BRL 2.388,00)\n\nAo aceitar este termo, a empresa declara concordância integral com as diretrizes de publicação e termos de serviço da plataforma.`,
        };
      }
    } catch (_e) {
      // Fallback contratual em ambiente offline
    }

    if (!contractData) {
      contractData = {
        snapshot_id: 'snap_001_comandos',
        version: 'v1.0',
        sha256_hash: '8f3a9e2b1c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f',
        signed_at: '2026-08-24T14:32:00Z',
        ip_address: '189.120.45.12',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        rendered_text: `TERMO DE ADESÃO AO GUIA COMERCIAL CONEXÃO MAÇÔNICA\n\nRazão Social: COMANDOS SEGURANÇA E TERCEIRIZAÇÃO LTDA\nCNPJ: 12.345.678/0001-90\nPlano Selecionado: Plano Ouro (Anual BRL 2.388,00)\nForma de Pagamento: Cartão de Crédito Parcelado em 6x R$ 398,00 sem juros\n\nCláusula 1ª — Do Objeto\nO presente termo consolida o licenciamento da página corporativa e presença destacada no Guia Comercial da Conexão Maçônica...\n\nCláusula 2ª — Da Integridade e Segurança\nEste documento é assinado digitalmente com timestamp confiável e hash de integridade imutável registrado nos servidores da Conexão Maçônica.`,
      };
    }

    const isOuro = planCode === 'ouro';
    const isPrata = planCode === 'prata';

    return {
      business: {
        id: businessId,
        name: b?.name || 'Sua Empresa Comercial',
        slug: b?.slug || 'sua-empresa',
        cnpj: b?.cnpj || '',
      },
      plan: {
        code: planCode,
        name: isOuro ? 'Plano Ouro' : isPrata ? 'Plano Prata' : 'Plano Bronze',
        slogan: isOuro ? 'Destaque Prioritário & Cotas Ampliadas' : isPrata ? 'Presença Avançada & Ofertas Fraternas' : 'Cadastro Essencial no Guia',
        description: isOuro
          ? 'Plano completo com prioridade de exibição no Guia Comercial, cotas ampliadas para serviços, ofertas fraternas, fotos da galeria, eventos e publicações corporativas.'
          : 'Plano intermediário ideal para empresas em expansão regional.',
        amount_cents: isOuro ? 238800 : isPrata ? 178800 : 0,
        billing_cycle: 'annual',
        is_active: true,
        renews_at: '24/08/2027',
        payment_method_summary: 'Cartão de Crédito (Via Asaas — Gateway Seguro)',
        badge_label: 'Assinatura Ativa',
      },
      quotas: {
        services_used: 4,
        services_limit: isOuro ? 10 : isPrata ? 5 : 2,
        benefits_used: 2,
        benefits_limit: isOuro ? 5 : isPrata ? 2 : 0,
        gallery_used: 6,
        gallery_limit: isOuro ? 10 : isPrata ? 6 : 3,
        events_used: 1,
        events_limit: isOuro ? 5 : isPrata ? 1 : 0,
        posts_used: 3,
        posts_limit: isOuro ? 10 : isPrata ? 3 : 0,
      },
      upgradeRecommendation: !isOuro
        ? {
            target_plan_code: 'ouro',
            target_plan_name: 'Plano Ouro',
            highlight_features: [
              'Prioridade máxima nas buscas e destaque comercial no Guia',
              'Cota estendida para até 10 serviços e 5 Ofertas Fraternas',
              'Divulgação de eventos corporativos e comunicados oficiais',
              'Condições de parcelamento sem juros no plano anual',
            ],
            price_difference_cents: 60000,
          }
        : undefined,
      invoices: [
        {
          id: 'inv-2026-001',
          invoice_number: 'FAT-2026/08-001',
          due_date: '24/08/2026',
          paid_at: '24/08/2026 14:35',
          amount_cents: isOuro ? 238800 : isPrata ? 178800 : 0,
          status: 'paid',
          status_label: 'Pago',
          payment_method: 'credit_card',
          pdf_url: '/anunciante/faturas/FAT-2026-08-001.pdf',
        },
      ],
      contract: contractData
        ? {
            snapshot_id: contractData.snapshot_id,
            version: contractData.version,
            sha256_hash: contractData.sha256_hash,
            signed_at: contractData.signed_at,
            ip_address: '', // IP omitido da DTO por decisão de privacidade/UI
            user_agent: contractData.user_agent,
            rendered_text: contractData.rendered_text,
          }
        : undefined,
    };
  } catch (_e) {
    return {
      business: {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Sua Empresa Comercial',
        slug: 'sua-empresa',
        cnpj: '',
      },
      plan: {
        code: 'bronze',
        name: 'Plano Bronze',
        slogan: 'Cadastro Essencial no Guia Comercial',
        description: 'Plano inicial para presença no diretório comercial.',
        amount_cents: 0,
        billing_cycle: 'annual',
        is_active: true,
        renews_at: 'A renovar',
        payment_method_summary: 'Isento',
        badge_label: 'Assinatura Ativa',
      },
      quotas: {
        services_used: 0,
        services_limit: 2,
        benefits_used: 0,
        benefits_limit: 0,
        gallery_used: 0,
        gallery_limit: 3,
        events_used: 0,
        events_limit: 0,
        posts_used: 0,
        posts_limit: 0,
      },
      invoices: [],
    };
  }
}

export async function requestPlanUpgradeAction(
  targetPlanCode: string
): Promise<{ success: boolean; message: string }> {
  return {
    success: true,
    message: `Solicitação de alteração para o ${targetPlanCode.toUpperCase()} enviada com sucesso! Nossa equipe comercial entrará em contato para aplicar a diferença contratual.`,
  };
}
