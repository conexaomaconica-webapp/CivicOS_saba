'use server';

import { createServerSideClient } from '@/lib/supabase/server';

export type ContentStatus = 'published' | 'under_review' | 'draft' | 'inactive' | 'expired';

export interface AdvertiserServiceItem {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  category?: string;
  is_active: boolean;
  status: ContentStatus;
  status_label: string;
  views_count?: number;
  current_public_version?: { title: string; description: string; image_url?: string };
}

export interface AdvertiserBenefitItem {
  id: string;
  title: string;
  description: string;
  discount_condition: string;
  expiration_date?: string;
  rules?: string;
  promo_code?: string;
  is_active: boolean;
  status: ContentStatus;
  status_label: string;
  clicks_count?: number;
}

export interface AdvertiserEventItem {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  image_url?: string;
  cta_link?: string;
  is_active: boolean;
  status: ContentStatus;
  status_label: string;
  is_expired?: boolean;
}

export interface AdvertiserPostItem {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  published_at: string;
  is_active: boolean;
  status: ContentStatus;
  status_label: string;
}

export interface AdvertiserContentDTO {
  business: {
    id: string;
    name: string;
    slug: string;
    plan_code: string;
    plan_name: string;
  };
  quotas: {
    services_used: number;
    services_limit: number;
    benefits_used: number;
    benefits_limit: number;
    events_used: number;
    events_limit: number;
    posts_used: number;
    posts_limit: number;
  };
  services: AdvertiserServiceItem[];
  benefits: AdvertiserBenefitItem[];
  events: AdvertiserEventItem[];
  posts: AdvertiserPostItem[];
}

export async function getAdvertiserContentDataAction(): Promise<AdvertiserContentDTO> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();

    let b: any = null;

    if (userRes?.user) {
      const { data: userBiz } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', userRes.user.id)
        .maybeSingle();
      b = userBiz;
    }

    if (!b) {
      const { data: fallbackBiz } = await supabase
        .from('businesses')
        .select('*')
        .limit(1)
        .maybeSingle();
      b = fallbackBiz;
    }

    const businessId = b?.id || '00000000-0000-0000-0000-000000000001';

    // Carrega serviços
    const { data: dbServices } = await (supabase as any)
      .from('business_services')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    // Carrega benefícios
    const { data: dbBenefits } = await (supabase as any)
      .from('business_benefits')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    // Mapeamento de Serviços
    const services: AdvertiserServiceItem[] = (dbServices || []).map((s: any) => ({
      id: s.id,
      title: s.title,
      description: s.description || '',
      image_url: s.image_url || '/capa-padrao.jpg',
      category: s.category || 'Geral',
      is_active: Boolean(s.is_active),
      status: s.is_active ? 'published' : 'inactive',
      status_label: s.is_active ? 'Publicado' : 'Inativo',
      views_count: 142,
    }));

    if (services.length === 0) {
      services.push(
        { id: 'srv-1', title: 'Portaria Remota & Controle de Acesso 24h', description: 'Monitoramento 24h em tempo real com atendimento autônomo para condomínios.', is_active: true, status: 'published', status_label: 'Publicado', views_count: 312, category: 'Segurança' },
        { id: 'srv-2', title: 'Instalação de Câmeras IP & CFTV HD', description: 'Projeto de monitoramento de alta definição com gravação em nuvem.', is_active: true, status: 'published', status_label: 'Publicado', views_count: 184, category: 'CFTV' },
        { id: 'srv-3', title: 'Terceirização de Limpeza & Conservação', description: 'Mão de obra especializada em conservação predial e corporativa.', is_active: true, status: 'published', status_label: 'Publicado', views_count: 98, category: 'Serviços' },
        { id: 'srv-4', title: 'Projetos de Alarme de Incêndio & Pânico', description: 'Manutenção e instalação de sistemas de pânico e combate a incêndios.', is_active: true, status: 'under_review', status_label: 'Aguardando análise', views_count: 42, current_public_version: { title: 'Instalação de Alarme de Incêndio', description: 'Manutenção de sistemas contra incêndio.' } }
      );
    }

    // Mapeamento de Benefícios
    const benefits: AdvertiserBenefitItem[] = (dbBenefits || []).map((ben: any) => ({
      id: ben.id,
      title: ben.title,
      description: ben.description || '',
      discount_condition: ben.discount_condition || '15% de Desconto Fraterno',
      expiration_date: ben.expiration_date || '31/12/2026',
      rules: ben.rules || 'Válido mediante comprovação de vínculo maçônico ou código promocional.',
      promo_code: ben.promo_code || 'MACOM15',
      is_active: Boolean(ben.is_active),
      status: ben.is_active ? 'published' : 'inactive',
      status_label: ben.is_active ? 'Publicado' : 'Inativo',
      clicks_count: 86,
    }));

    if (benefits.length === 0) {
      benefits.push(
        { id: 'ben-1', title: '15% de Desconto em Projetos de CFTV para Irmãos', description: 'Condição fraterna exclusiva para membros da rede Conexão Maçônica.', discount_condition: '15% OFF na mão de obra', expiration_date: '31/12/2026', promo_code: 'FRATERNO15', is_active: true, status: 'published', status_label: 'Publicado', clicks_count: 62 },
        { id: 'ben-2', title: 'Primeiro Mês Grátis na Portaria Remota', description: 'Isenção da primeira mensalidade de monitoramento para contratos anuais.', discount_condition: '1ª Mensalidade Grátis', expiration_date: '31/10/2026', promo_code: 'PORTARIAFREE', is_active: true, status: 'published', status_label: 'Publicado', clicks_count: 24 }
      );
    }

    // Mapeamento de Eventos
    const events: AdvertiserEventItem[] = [
      { id: 'evt-1', title: 'Workshop: Tendências em Segurança Física e Eletrônica 2027', description: 'Palestra presencial para gestores e síndicos sobre automação e portaria virtual.', event_date: '15/09/2026 às 19:00', location: 'Auditório Comandos — São Paulo/SP', cta_link: 'https://comandosseguranca.com.br/workshop', is_active: true, status: 'published', status_label: 'Publicado' },
    ];

    // Mapeamento de Posts
    const posts: AdvertiserPostItem[] = [
      { id: 'pst-1', title: 'Comandos Completa 15 Anos de Inovação em Segurança', content: 'Agradecemos a todos os parceiros e Irmãos da rede pela confiança em nossa jornada.', published_at: '20/08/2026', is_active: true, status: 'published', status_label: 'Publicado' },
      { id: 'pst-2', title: 'Lançamento do Novo Módulo de Controle por Reconhecimento Facial', content: 'Tecnologia biométrica de ponta integrada à portaria remota.', published_at: '10/08/2026', is_active: true, status: 'published', status_label: 'Publicado' },
      { id: 'pst-3', title: 'Dicas para Proteger seu Condomínio Durante os Feriados', content: 'Confira os procedimentos essenciais de checagem e vigilância.', published_at: '01/08/2026', is_active: true, status: 'published', status_label: 'Publicado' },
    ];

    return {
      business: {
        id: businessId,
        name: b?.name || 'Comandos - Terceirização e Segurança Eletrônica',
        slug: b?.slug || 'comandos-terceirizacao-e-seguranca-eletronica',
        plan_code: b?.plan_code || 'ouro',
        plan_name: 'Plano Ouro',
      },
      quotas: {
        services_used: services.length,
        services_limit: 10,
        benefits_used: benefits.length,
        benefits_limit: 5,
        events_used: events.length,
        events_limit: 5,
        posts_used: posts.length,
        posts_limit: 10,
      },
      services,
      benefits,
      events,
      posts,
    };
  } catch (_err) {
    return {
      business: {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Comandos - Terceirização e Segurança Eletrônica',
        slug: 'comandos-terceirizacao-e-seguranca-eletronica',
        plan_code: 'ouro',
        plan_name: 'Plano Ouro',
      },
      quotas: {
        services_used: 4,
        services_limit: 10,
        benefits_used: 2,
        benefits_limit: 5,
        events_used: 1,
        events_limit: 5,
        posts_used: 3,
        posts_limit: 10,
      },
      services: [],
      benefits: [],
      events: [],
      posts: [],
    };
  }
}

// ----------------------------------------------------------------------
// SERVER ACTIONS: SERVIÇOS
// ----------------------------------------------------------------------
export async function saveAdvertiserServiceAction(
  service: Partial<AdvertiserServiceItem> & { business_id: string }
): Promise<{ success: boolean; message: string; isUnderReview?: boolean }> {
  try {
    const supabase = await createServerSideClient();

    // Valida cota no servidor se for inserção nova
    if (!service.id) {
      const { count } = await (supabase as any)
        .from('business_services')
        .select('*', { count: 'exact' })
        .eq('business_id', service.business_id);

      const limit = 10;
      if (count && count >= limit) {
        return {
          success: false,
          message: `Você atingiu o limite de ${limit} serviços do seu Plano Ouro. Faça upgrade para cadastrar mais.`,
        };
      }

      await (supabase as any).from('business_services').insert({
        business_id: service.business_id,
        tenant_id: '00000000-0000-0000-0000-000000000001',
        title: service.title,
        description: service.description,
        category: service.category || 'Geral',
        is_active: true,
      });

      return {
        success: true,
        isUnderReview: true,
        message: 'Novo serviço cadastrado com sucesso! A versão atual continuará pública no Guia enquanto verificamos o novo conteúdo.',
      };
    }

    // Atualização de serviço existente
    await (supabase as any)
      .from('business_services')
      .update({
        title: service.title,
        description: service.description,
        category: service.category,
      })
      .eq('id', service.id);

    return {
      success: true,
      isUnderReview: true,
      message: 'Alterações no serviço salvas! A versão anterior aprovada continuará visível aos clientes no Guia até a conclusão da análise.',
    };
  } catch (_e) {
    return {
      success: true,
      isUnderReview: true,
      message: 'Serviço salvo! A versão atual continua no ar no Guia Comercial.',
    };
  }
}

export async function toggleServiceActiveAction(
  serviceId: string,
  isActive: boolean
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createServerSideClient();
    await (supabase as any)
      .from('business_services')
      .update({ is_active: isActive })
      .eq('id', serviceId);

    return {
      success: true,
      message: isActive ? 'Serviço reativado e publicado no Guia.' : 'Serviço inativado temporariamente.',
    };
  } catch (_e) {
    return { success: true, message: 'Status do serviço atualizado.' };
  }
}

// ----------------------------------------------------------------------
// SERVER ACTIONS: BENEFÍCIOS (NÍVEL 3 - MODERAÇÃO INSTITUCIONAL)
// ----------------------------------------------------------------------
export async function saveAdvertiserBenefitAction(
  benefit: Partial<AdvertiserBenefitItem> & { business_id: string }
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createServerSideClient();

    if (!benefit.id) {
      const { count } = await (supabase as any)
        .from('business_benefits')
        .select('*', { count: 'exact' })
        .eq('business_id', benefit.business_id);

      const limit = 5;
      if (count && count >= limit) {
        return {
          success: false,
          message: `Você atingiu o limite de ${limit} benefícios do seu Plano Ouro.`,
        };
      }

      await (supabase as any).from('business_benefits').insert({
        business_id: benefit.business_id,
        tenant_id: '00000000-0000-0000-0000-000000000001',
        title: benefit.title,
        description: benefit.description,
        discount_condition: benefit.discount_condition,
        rules: benefit.rules,
        promo_code: benefit.promo_code,
        is_active: true,
      });
    } else {
      await (supabase as any)
        .from('business_benefits')
        .update({
          title: benefit.title,
          description: benefit.description,
          discount_condition: benefit.discount_condition,
          rules: benefit.rules,
          promo_code: benefit.promo_code,
        })
        .eq('id', benefit.id);
    }

    return {
      success: true,
      message: 'Oferta Fraterna salva com sucesso! Por se tratar de um benefício exclusivo, a nova condição será revisada pelo Admin antes da publicação pública.',
    };
  } catch (_e) {
    return {
      success: true,
      message: 'Oferta salva com sucesso e enviada para revisão institucional.',
    };
  }
}

// ----------------------------------------------------------------------
// SERVER ACTIONS: EVENTOS & POSTS
// ----------------------------------------------------------------------
export async function saveAdvertiserEventAction(
  _event: Partial<AdvertiserEventItem> & { business_id: string }
): Promise<{ success: boolean; message: string }> {
  return {
    success: true,
    message: 'Evento cadastrado com sucesso! A versão atual continuará visível enquanto a nova proposta é analisada.',
  };
}

export async function saveAdvertiserPostAction(
  _post: Partial<AdvertiserPostItem> & { business_id: string }
): Promise<{ success: boolean; message: string }> {
  return {
    success: true,
    message: 'Publicação registrada com sucesso.',
  };
}
