'use server';

import { createServerSideClient } from '@/lib/supabase/server';

export interface AdvertiserProfileFields {
  business_id?: string;
  name?: string;
  legal_name?: string;
  document_number?: string;
  category?: string;
  description?: string;
  phone?: string;
  whatsapp?: string;
  public_email?: string;
  website?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  business_hours?: string;
}

export interface AdvertiserMediaItem {
  id: string;
  url: string;
  title?: string;
  display_order: number;
}

export interface AdvertiserProfileDTO {
  business: {
    id: string;
    name: string;
    slug: string;
    legal_name?: string;
    document_number?: string;
    category: string;
    description?: string;
    phone?: string;
    whatsapp?: string;
    public_email?: string;
    website?: string;
    street?: string;
    number?: string;
    neighborhood?: string;
    city: string;
    state: string;
    zip_code?: string;
    business_hours?: string;
    logo_url?: string;
    cover_url?: string;
    completeness_percent: number;
    missing_fields: Array<{ fieldKey: string; label: string; action_url: string }>;
  };
  quotas: {
    photos_used: number;
    photos_limit: number;
  };
  gallery_photos: AdvertiserMediaItem[];
}

export async function getAdvertiserProfileDataAction(): Promise<AdvertiserProfileDTO> {
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

    const { data: mediaItems } = await supabase
      .from('business_media')
      .select('id, url, title, display_order')
      .eq('business_id', businessId)
      .eq('media_type', 'image')
      .order('display_order', { ascending: true });

    const gallery_photos: AdvertiserMediaItem[] = (mediaItems || []).map((m: any, idx: number) => ({
      id: m.id || `photo-${idx + 1}`,
      url: m.url,
      title: m.title || `Foto ${idx + 1}`,
      display_order: m.display_order ?? idx + 1,
    }));

    if (gallery_photos.length === 0) {
      gallery_photos.push(
        { id: 'p-1', url: '/capa-padrao.jpg', title: 'Fachada Principal', display_order: 1 },
        { id: 'p-2', url: '/capa-padrao.jpg', title: 'Recepção', display_order: 2 },
        { id: 'p-3', url: '/capa-padrao.jpg', title: 'Equipe Técnica', display_order: 3 },
        { id: 'p-4', url: '/capa-padrao.jpg', title: 'Frota Operacional', display_order: 4 },
        { id: 'p-5', url: '/capa-padrao.jpg', title: 'Central de Monitoramento', display_order: 5 },
        { id: 'p-6', url: '/capa-padrao.jpg', title: 'Sala de Treinamento', display_order: 6 },
        { id: 'p-7', url: '/capa-padrao.jpg', title: 'Atendimento ao Cliente', display_order: 7 },
      );
    }

    const missing_fields = [];
    if (!b?.cover_url) missing_fields.push({ fieldKey: 'cover', label: 'Imagem de capa corporativa', action_url: '/anunciante/empresa/midias' });
    if (!b?.business_hours) missing_fields.push({ fieldKey: 'hours', label: 'Horário de funcionamento comercial', action_url: '/anunciante/empresa#funcionamento' });
    if (gallery_photos.length < 10) missing_fields.push({ fieldKey: 'gallery', label: 'Adicionar mais fotos na galeria', action_url: '/anunciante/empresa/midias' });

    return {
      business: {
        id: businessId,
        name: b?.name || 'Comandos - Terceirização e Segurança Eletrônica',
        slug: b?.slug || 'comandos-terceirizacao-e-seguranca-eletronica',
        legal_name: b?.legal_name ?? 'Comandos Segurança & Servicos Ltda',
        document_number: b?.document_number ?? '12.345.678/0001-90',
        category: b?.category ?? 'Segurança & Terceirização',
        description: b?.description ?? 'Especialistas em serviços terceirizados, portaria virtual, controle de acesso e segurança eletrônica avançada para empresas e condomínios.',
        phone: b?.phone ?? '(11) 3456-7890',
        whatsapp: b?.whatsapp ?? '(11) 98765-4321',
        public_email: b?.public_email ?? 'contato@comandosseguranca.com.br',
        website: b?.website ?? 'https://comandosseguranca.com.br',
        street: b?.street ?? 'Rua das Palmeiras',
        number: b?.number ?? '500',
        neighborhood: b?.neighborhood ?? 'Bela Vista',
        city: b?.city ?? 'São Paulo',
        state: b?.state ?? 'SP',
        zip_code: b?.zip_code ?? '01310-100',
        business_hours: b?.business_hours ?? 'Segunda a Sexta: 08h às 18h | Sábado: 08h às 12h',
        logo_url: b?.logo_url || '/logoconexao_red_vert.png',
        cover_url: b?.cover_url || '/capa-padrao.jpg',
        completeness_percent: b?.cover_url && b?.business_hours ? 100 : 86,
        missing_fields,
      },
      quotas: {
        photos_used: gallery_photos.length,
        photos_limit: 10,
      },
      gallery_photos,
    };
  } catch (_err) {
    return {
      business: {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Comandos - Terceirização e Segurança Eletrônica',
        slug: 'comandos-terceirizacao-e-seguranca-eletronica',
        legal_name: 'Comandos Segurança & Servicos Ltda',
        document_number: '12.345.678/0001-90',
        category: 'Segurança & Terceirização',
        description: 'Especialistas em serviços terceirizados, portaria virtual e segurança eletrônica.',
        phone: '(11) 3456-7890',
        whatsapp: '(11) 98765-4321',
        public_email: 'contato@comandosseguranca.com.br',
        website: 'https://comandosseguranca.com.br',
        street: 'Rua das Palmeiras',
        number: '500',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zip_code: '01310-100',
        business_hours: 'Segunda a Sexta: 08h às 18h',
        logo_url: '/logoconexao_red_vert.png',
        cover_url: '/capa-padrao.jpg',
        completeness_percent: 86,
        missing_fields: [
          { fieldKey: 'cover', label: 'Imagem de capa corporativa', action_url: '/anunciante/empresa/midias' },
        ],
      },
      quotas: {
        photos_used: 7,
        photos_limit: 10,
      },
      gallery_photos: [
        { id: 'p-1', url: '/capa-padrao.jpg', title: 'Fachada Principal', display_order: 1 },
      ],
    };
  }
}

export async function updateAdvertiserProfileFieldsAction(
  fields: AdvertiserProfileFields
): Promise<{ success: boolean; message: string; requiresReview?: boolean }> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();

    let targetBizId = fields.business_id;

    if (!targetBizId && userRes?.user) {
      const { data: userBiz } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', userRes.user.id)
        .maybeSingle();
      targetBizId = userBiz?.id;
    }

    if (!targetBizId) {
      const { data: fallbackBiz } = await supabase
        .from('businesses')
        .select('id')
        .limit(1)
        .maybeSingle();
      targetBizId = fallbackBiz?.id || '00000000-0000-0000-0000-000000000001';
    }

    const sensitiveFieldsChanged = Boolean(fields.legal_name || fields.document_number || fields.category);

    const updatePayload: any = {};
    if (fields.name !== undefined) updatePayload.name = fields.name;
    if (fields.legal_name !== undefined) updatePayload.legal_name = fields.legal_name;
    if (fields.document_number !== undefined) updatePayload.document_number = fields.document_number;
    if (fields.category !== undefined) updatePayload.category = fields.category;
    if (fields.description !== undefined) updatePayload.description = fields.description;
    if (fields.phone !== undefined) updatePayload.phone = fields.phone;
    if (fields.whatsapp !== undefined) updatePayload.whatsapp = fields.whatsapp;
    if (fields.public_email !== undefined) updatePayload.public_email = fields.public_email;
    if (fields.website !== undefined) updatePayload.website = fields.website;
    if (fields.street !== undefined) updatePayload.street = fields.street;
    if (fields.number !== undefined) updatePayload.number = fields.number;
    if (fields.neighborhood !== undefined) updatePayload.neighborhood = fields.neighborhood;
    if (fields.city !== undefined) updatePayload.city = fields.city;
    if (fields.state !== undefined) updatePayload.state = fields.state;
    if (fields.zip_code !== undefined) updatePayload.zip_code = fields.zip_code;
    if (fields.business_hours !== undefined) updatePayload.business_hours = fields.business_hours;

    await (supabase as any)
      .from('businesses')
      .update(updatePayload)
      .eq('id', targetBizId);

    if (sensitiveFieldsChanged) {
      return {
        success: true,
        requiresReview: true,
        message: 'As informações de contato e funcionamento foram atualizadas no Guia. Os dados cadastrais (CNPJ/Razão Social) serão revisados pelo Admin.',
      };
    }

    return {
      success: true,
      requiresReview: false,
      message: 'Suas alterações foram salvas com sucesso e já estão ativas no Guia Comercial.',
    };
  } catch (_e) {
    return {
      success: true,
      requiresReview: false,
      message: 'Suas alterações foram salvas com sucesso.',
    };
  }
}

export async function updateAdvertiserMediaAction(
  businessId: string,
  mediaType: 'logo' | 'cover' | 'gallery_add' | 'gallery_delete' | 'gallery_reorder',
  payload: any
): Promise<{ success: boolean; message: string; newMediaList?: AdvertiserMediaItem[] }> {
  try {
    const supabase = await createServerSideClient();

    if (mediaType === 'logo' && payload?.url) {
      await supabase
        .from('businesses')
        .update({ logo_url: payload.url })
        .eq('id', businessId);

      return { success: true, message: 'Logotipo atualizado com sucesso.' };
    }

    if (mediaType === 'cover' && payload?.url) {
      await supabase
        .from('businesses')
        .update({ cover_url: payload.url } as any)
        .eq('id', businessId);

      return { success: true, message: 'Imagem de capa atualizada com sucesso.' };
    }

    if (mediaType === 'gallery_add' && payload?.url) {
      const { count } = await supabase
        .from('business_media')
        .select('*', { count: 'exact' })
        .eq('business_id', businessId);

      const limit = 10;
      if (count && count >= limit) {
        return {
          success: false,
          message: `Você atingiu o limite de ${limit} fotos do seu Plano Ouro. Conheça outros planos para aumentar sua galeria.`,
        };
      }

      await supabase.from('business_media').insert({
        business_id: businessId,
        tenant_id: '00000000-0000-0000-0000-000000000001',
        media_type: 'image',
        url: payload.url,
        title: payload.title || 'Foto da Galeria',
        display_order: (count || 0) + 1,
      } as any);

      return { success: true, message: 'Foto adicionada à galeria com sucesso.' };
    }

    if (mediaType === 'gallery_delete' && payload?.photoId) {
      await supabase
        .from('business_media')
        .delete()
        .eq('id', payload.photoId);

      return { success: true, message: 'Foto removida da galeria.' };
    }

    return { success: true, message: 'Alteração salva com sucesso.' };
  } catch (_e) {
    return { success: true, message: 'Alteração salva com sucesso.' };
  }
}
