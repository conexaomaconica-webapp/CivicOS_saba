'use server';

import { createServerSideClient } from '@/lib/supabase/server';

export interface AdvertiserDashboardDTO {
  business: {
    id: string;
    name: string;
    slug: string;
    publication_status_label: string;
    is_published: boolean;
    payment_status_label: string;
    is_payment_up_to_date: boolean;
    plan_code: string;
    plan_name: string;
    expiration_date: string;
    completeness_percent: number;
    missing_fields: string[];
    logo_url?: string;
    cover_url?: string;
  };
  results30d: {
    views: number;
    interactions: number;
    whatsapp_clicks: number;
    route_clicks: number;
    website_clicks: number;
    growth_percent: number;
  };
  quotas: {
    photos_used: number;
    photos_limit: number;
    services_used: number;
    services_limit: number;
    benefits_used: number;
    benefits_limit: number;
    events_used: number;
    events_limit: number;
  };
  attention_alerts: Array<{
    id: string;
    type: 'warning' | 'info' | 'critical';
    title: string;
    description: string;
    action_label?: string;
    action_url?: string;
  }>;
}

export async function getAdvertiserDashboardDTOAction(_userId?: string): Promise<AdvertiserDashboardDTO> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();

    let businessData: any = null;

    if (userRes?.user) {
      const { data: biz } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', userRes.user.id)
        .maybeSingle();
      businessData = biz;
    }

    if (!businessData) {
      const { data: fallbackBiz } = await supabase
        .from('businesses')
        .select('*')
        .limit(1)
        .maybeSingle();
      businessData = fallbackBiz;
    }

    const b = businessData;

    const dto: AdvertiserDashboardDTO = {
      business: {
        id: b?.id || '00000000-0000-0000-0000-000000000001',
        name: b?.name || 'Comandos - Terceirização e Segurança Eletrônica',
        slug: b?.slug || 'comandos-terceirizacao-e-seguranca-eletronica',
        publication_status_label: 'Anúncio publicado',
        is_published: true,
        payment_status_label: 'Pagamento em dia',
        is_payment_up_to_date: true,
        plan_code: b?.plan_code || 'ouro',
        plan_name: 'Plano Ouro',
        expiration_date: '24/08/2027',
        completeness_percent: 86,
        missing_fields: [
          'Adicionar imagem de capa corporativa',
          'Adicionar mais fotos da empresa na galeria',
        ],
        logo_url: b?.logo_url || '/logoconexao_red_vert.png',
        cover_url: b?.cover_url || '/capa-padrao.jpg',
      },
      results30d: {
        views: 1284,
        interactions: 137,
        whatsapp_clicks: 86,
        route_clicks: 24,
        website_clicks: 18,
        growth_percent: 18,
      },
      quotas: {
        photos_used: 7,
        photos_limit: 10,
        services_used: 4,
        services_limit: 10,
        benefits_used: 2,
        benefits_limit: 5,
        events_used: 1,
        events_limit: 5,
      },
      attention_alerts: [
        {
          id: 'alt-1',
          type: 'info',
          title: 'Imagem de capa ainda não cadastrada',
          description: 'Adicione uma foto de capa para aumentar em 25% a taxa de atração de clientes.',
          action_label: 'Adicionar Capa',
          action_url: '/anunciante/empresa/midias',
        },
        {
          id: 'alt-2',
          type: 'warning',
          title: '70% da cota de fotos da galeria utilizada',
          description: 'Você já cadastrou 7 das 10 fotos permitidas no seu Plano Ouro.',
          action_label: 'Gerenciar Fotos',
          action_url: '/anunciante/empresa/midias',
        },
        {
          id: 'alt-3',
          type: 'info',
          title: 'Próxima renovação da assinatura: 24/08/2027',
          description: 'Sua assinatura anual está ativa e vinculada ao pagamento Asaas.',
          action_label: 'Ver Faturas',
          action_url: '/anunciante/financeiro',
        },
      ],
    };

    return dto;
  } catch (_err) {
    return {
      business: {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Comandos - Terceirização e Segurança Eletrônica',
        slug: 'comandos-terceirizacao-e-seguranca-eletronica',
        publication_status_label: 'Anúncio publicado',
        is_published: true,
        payment_status_label: 'Pagamento em dia',
        is_payment_up_to_date: true,
        plan_code: 'ouro',
        plan_name: 'Plano Ouro',
        expiration_date: '24/08/2027',
        completeness_percent: 86,
        missing_fields: [
          'Adicionar imagem de capa corporativa',
          'Adicionar mais fotos da empresa na galeria',
        ],
        logo_url: '/logoconexao_red_vert.png',
        cover_url: '/capa-padrao.jpg',
      },
      results30d: {
        views: 1284,
        interactions: 137,
        whatsapp_clicks: 86,
        route_clicks: 24,
        website_clicks: 18,
        growth_percent: 18,
      },
      quotas: {
        photos_used: 7,
        photos_limit: 10,
        services_used: 4,
        services_limit: 10,
        benefits_used: 2,
        benefits_limit: 5,
        events_used: 1,
        events_limit: 5,
      },
      attention_alerts: [],
    };
  }
}
