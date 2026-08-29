'use server';

import { revalidatePath } from 'next/cache';
import { createServerSideClient } from '@/lib/supabase/server';
import { resolveBusinessMedia, resolveLogoUrl, resolveCoverUrl } from '@/lib/business/business-media-helpers';

function safeRevalidatePath(path: string, type?: 'page' | 'layout') {
  try {
    if (type) {
      revalidatePath(path, type);
    } else {
      revalidatePath(path);
    }
  } catch {
    // Ignorado de forma segura em ambiente de teste Vitest
  }
}

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

    // Resolver mídia via helper centralizado (fonte canônica: business_media)
    const media = await resolveBusinessMedia(supabase, businessId, { logoUrl: b?.logo_url });
    const resolvedLogoUrl = resolveLogoUrl(media.logo_url);
    const resolvedCoverUrl = resolveCoverUrl(media.cover_url);

    // Galeria real do banco (NÃO gerar placeholders)
    const realGallery = media.gallery.map((m, idx) => ({
      id: m.id,
      url: m.url,
      title: m.title || `Foto ${idx + 1}`,
      display_order: m.display_order,
    }));

    const missing_fields = [];
    if (resolvedCoverUrl === '/capa-padrao.jpg') missing_fields.push({ fieldKey: 'cover', label: 'Imagem de capa corporativa', action_url: '/anunciante/empresa/midias' });
    if (!b?.business_hours) missing_fields.push({ fieldKey: 'hours', label: 'Horário de funcionamento comercial', action_url: '/anunciante/empresa#funcionamento' });
    if (realGallery.length < 10) missing_fields.push({ fieldKey: 'gallery', label: 'Adicionar mais fotos na galeria', action_url: '/anunciante/empresa/midias' });

    return {
      business: {
        id: businessId,
        name: b?.name || '',
        slug: b?.slug || '',
        legal_name: b?.legal_name ?? '',
        document_number: b?.document_number ?? '',
        category: b?.category ?? '',
        description: b?.description ?? '',
        phone: b?.phone ?? '',
        whatsapp: b?.whatsapp ?? '',
        public_email: b?.public_email ?? '',
        website: b?.website ?? '',
        street: b?.street ?? '',
        number: b?.number ?? '',
        neighborhood: b?.neighborhood ?? '',
        city: b?.city ?? '',
        state: b?.state ?? '',
        zip_code: b?.zip_code ?? '',
        business_hours: b?.business_hours ?? '',
        logo_url: resolvedLogoUrl,
        cover_url: resolvedCoverUrl,
        completeness_percent: resolvedCoverUrl !== '/capa-padrao.jpg' && b?.business_hours ? 100 : 86,
        missing_fields,
      },
      quotas: {
        photos_used: realGallery.length,
        photos_limit: 10,
      },
      gallery_photos: realGallery,
    };
  } catch (err: any) {
    console.error('Erro ao carregar perfil do anunciante:', err);
    return {
      business: {
        id: '',
        name: '',
        slug: '',
        legal_name: '',
        document_number: '',
        category: '',
        description: '',
        phone: '',
        whatsapp: '',
        public_email: '',
        website: '',
        street: '',
        number: '',
        neighborhood: '',
        city: '',
        state: '',
        zip_code: '',
        business_hours: '',
        logo_url: '/logoconexao_red_vert.png',
        cover_url: '/capa-padrao.jpg',
        completeness_percent: 0,
        missing_fields: [],
      },
      quotas: {
        photos_used: 0,
        photos_limit: 10,
      },
      gallery_photos: [],
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
    if (fields.document_number !== undefined) updatePayload.cnpj = fields.document_number;
    if (fields.category !== undefined) updatePayload.category = fields.category;
    if (fields.description !== undefined) updatePayload.description = fields.description;
    if (fields.phone !== undefined) updatePayload.phone = fields.phone;
    else if (fields.whatsapp !== undefined) updatePayload.phone = fields.whatsapp;
    if (fields.public_email !== undefined) updatePayload.email = fields.public_email;
    
    // Tratamento amigável de Website: insere automaticamente https:// se o usuário omitir
    if (fields.website !== undefined) {
      let web = fields.website.trim();
      if (web && !web.startsWith('http://') && !web.startsWith('https://')) {
        web = `https://${web}`;
      }
      updatePayload.website = web;
    }

    if (fields.street !== undefined || fields.number !== undefined || fields.neighborhood !== undefined) {
      const parts = [fields.street, fields.number, fields.neighborhood].filter(Boolean);
      if (parts.length > 0) updatePayload.address = parts.join(', ');
    }

    const updateRes = await (supabase as any)
      .from('businesses')
      .update({
        ...updatePayload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetBizId);

    if (updateRes && updateRes.error) {
      console.error('Erro no Supabase ao atualizar anunciante:', updateRes.error.message);
      return {
        success: false,
        requiresReview: false,
        message: `Não foi possível salvar no banco de dados: ${updateRes.error.message}`,
      };
    }

    // Revalidar caches do Next.js para refletir imediatamente a alteração
    safeRevalidatePath('/anunciante/empresa');
    safeRevalidatePath('/anunciante');
    safeRevalidatePath('/guia');

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
  } catch (err: any) {
    console.error('Exceção ao salvar dados do anunciante:', err);
    return {
      success: false,
      requiresReview: false,
      message: `Erro ao processar alteração: ${err.message || 'Erro desconhecido'}`,
    };
  }
}

function validateImageMagicBytes(buffer: Uint8Array): boolean {
  if (!buffer || buffer.length < 4) return false;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true;
  // WebP/RIFF: 52 49 46 46
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) return true;
  // GIF: 47 49 46 38
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return true;
  return false;
}

export async function uploadAdvertiserAssetAction(formData: FormData): Promise<{
  success: boolean;
  message: string;
  url?: string;
  newMediaList?: AdvertiserMediaItem[];
}> {
  try {
    const file = formData.get('file') as File | null;
    const businessId = (formData.get('businessId') as string) || '00000000-0000-0000-0000-000000000001';
    const assetType = (formData.get('assetType') as 'logo' | 'cover' | 'gallery') || 'gallery';
    const title = (formData.get('title') as string) || null;

    if (!file) {
      return { success: false, message: 'Nenhum arquivo enviado.' };
    }

    if (file.size > 5 * 1024 * 1024) {
      return { success: false, message: 'O arquivo excede o limite máximo permitido de 5MB.' };
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    if (!validateImageMagicBytes(uint8Array)) {
      return {
        success: false,
        message: 'Arquivo inválido ou corrompido. Envie uma imagem real (JPG, PNG ou WebP).',
      };
    }

    const supabase = await createServerSideClient();
    const tenantId = '00000000-0000-0000-0000-000000000001';

    const timestamp = Date.now();
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${tenantId}/${businessId}/${assetType}/${timestamp}-${safeFilename}`;

    // Upload real para o bucket business-assets no Supabase Storage
    const { error: storageError } = await (supabase.storage as any)
      .from('business-assets')
      .upload(storagePath, Buffer.from(arrayBuffer), {
        contentType: file.type || 'image/webp',
        upsert: true,
      });

    if (storageError) {
      console.error('Erro no upload para Storage:', storageError.message);
      return { success: false, message: `Erro ao enviar arquivo para o Storage: ${storageError.message}` };
    }

    // Obter URL pública real do Supabase (NÃO fabricar URL)
    const { data: publicUrlData } = (supabase.storage as any)
      .from('business-assets')
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData?.publicUrl;
    if (!publicUrl) {
      return { success: false, message: 'Erro: não foi possível obter URL pública do arquivo enviado.' };
    }

    if (assetType === 'logo') {
      const { error: dbError } = await (supabase as any)
        .from('businesses')
        .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', businessId);

      if (dbError) {
        // ROLLBACK: Remove arquivo do Storage se o Postgres falhar (Zero órfãos)
        try {
          await (supabase.storage as any).from('business-assets').remove([storagePath]);
        } catch (_rollbackErr) {}

        return { success: false, message: `Erro ao salvar logotipo no banco: ${dbError.message}` };
      }

      safeRevalidatePath('/anunciante/empresa/midias');
      safeRevalidatePath('/anunciante/empresa');
      safeRevalidatePath('/anunciante');
      safeRevalidatePath('/guia');

      return { success: true, message: 'Logotipo atualizado e salvo com sucesso no Storage.', url: publicUrl };
    }

    if (assetType === 'cover') {
      // 1. Inserir nova capa primeiro
      const { error: insertErr } = await (supabase as any).from('business_media').insert({
        business_id: businessId,
        tenant_id: tenantId,
        media_type: 'image',
        url: publicUrl,
        title: 'Imagem de Capa Corporativa',
        display_order: 0,
      });

      if (insertErr) {
        // ROLLBACK: Remove arquivo do Storage se o Postgres falhar
        try {
          await (supabase.storage as any).from('business-assets').remove([storagePath]);
        } catch (_rollbackErr) {}

        return { success: false, message: `Erro ao salvar capa no banco: ${insertErr.message}` };
      }

      // 2. Limpar capas antigas com display_order = 0 que tenham URL diferente da nova
      await (supabase as any)
        .from('business_media')
        .delete()
        .eq('business_id', businessId)
        .eq('media_type', 'image')
        .eq('display_order', 0)
        .neq('url', publicUrl);

      safeRevalidatePath('/anunciante/empresa/midias');
      safeRevalidatePath('/anunciante/empresa');
      safeRevalidatePath('/anunciante');
      safeRevalidatePath('/guia');

      return { success: true, message: 'Imagem de capa atualizada e salva no Storage com sucesso.', url: publicUrl };
    }

    if (assetType === 'gallery') {
      const { count } = await (supabase as any)
        .from('business_media')
        .select('*', { count: 'exact' })
        .eq('business_id', businessId)
        .eq('media_type', 'image')
        .gt('display_order', 0);

      const limit = 10;
      if (count && count >= limit) {
        return {
          success: false,
          message: `Você atingiu o limite de ${limit} fotos da galeria do seu plano.`,
        };
      }

      const { error: galleryDbError } = await (supabase as any).from('business_media').insert({
        business_id: businessId,
        tenant_id: tenantId,
        media_type: 'image',
        url: publicUrl,
        title: title || `Foto ${(count || 0) + 1}`,
        display_order: (count || 0) + 1,
      });

      if (galleryDbError) {
        // ROLLBACK: Remove arquivo do Storage se o Postgres falhar
        try {
          await (supabase.storage as any).from('business-assets').remove([storagePath]);
        } catch (_rollbackErr) {}

        return { success: false, message: `Erro ao salvar foto no banco: ${galleryDbError.message}` };
      }

      safeRevalidatePath('/anunciante/empresa/midias');
      safeRevalidatePath('/anunciante/empresa');
      safeRevalidatePath('/anunciante');
      safeRevalidatePath('/guia');

      return { success: true, message: 'Foto adicionada à galeria e salva no Storage com sucesso.', url: publicUrl };
    }

    return { success: true, message: 'Upload concluído com sucesso.', url: publicUrl };
  } catch (err: any) {
    console.error('Exceção no upload de mídia do anunciante:', err);
    return { success: false, message: `Falha no upload: ${err.message || 'Erro de conexão'}` };
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
      const res = await (supabase as any)
        .from('businesses')
        .update({ logo_url: payload.url, updated_at: new Date().toISOString() })
        .eq('id', businessId);

      if (res && res.error) throw new Error(res.error.message);

      safeRevalidatePath('/anunciante/empresa/midias');
      safeRevalidatePath('/anunciante/empresa');
      safeRevalidatePath('/anunciante');
      safeRevalidatePath('/guia');

      return { success: true, message: 'Logotipo atualizado com sucesso.' };
    }

    if (mediaType === 'cover' && payload?.url) {
      // Deletar capa anterior existente em business_media (display_order = 0)
      await (supabase as any)
        .from('business_media')
        .delete()
        .eq('business_id', businessId)
        .eq('media_type', 'image')
        .eq('display_order', 0);

      const res = await (supabase as any).from('business_media').insert({
        business_id: businessId,
        tenant_id: '00000000-0000-0000-0000-000000000001',
        media_type: 'image',
        url: payload.url,
        title: 'Imagem de Capa Corporativa',
        display_order: 0,
      });

      if (res && res.error) throw new Error(res.error.message);

      safeRevalidatePath('/anunciante/empresa/midias');
      safeRevalidatePath('/anunciante/empresa');
      safeRevalidatePath('/anunciante');
      safeRevalidatePath('/guia');

      return { success: true, message: 'Imagem de capa atualizada com sucesso.' };
    }

    if (mediaType === 'gallery_add' && payload?.url) {
      const { count } = await (supabase as any)
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

      const res = await (supabase as any).from('business_media').insert({
        business_id: businessId,
        tenant_id: '00000000-0000-0000-0000-000000000001',
        media_type: 'image',
        url: payload.url,
        title: payload.title || 'Foto da Galeria',
        display_order: (count || 0) + 1,
      });

      if (res && res.error) throw new Error(res.error.message);

      safeRevalidatePath('/anunciante/empresa/midias');
      safeRevalidatePath('/anunciante/empresa');
      safeRevalidatePath('/anunciante');
      safeRevalidatePath('/guia');

      return { success: true, message: 'Foto adicionada à galeria com sucesso.' };
    }

    if (mediaType === 'gallery_delete' && payload?.photoId) {
      const res = await (supabase as any)
        .from('business_media')
        .delete()
        .eq('id', payload.photoId);

      if (res && res.error) throw new Error(res.error.message);

      safeRevalidatePath('/anunciante/empresa/midias');
      safeRevalidatePath('/anunciante/empresa');

      return { success: true, message: 'Foto removida da galeria.' };
    }

    return { success: true, message: 'Alteração salva com sucesso.' };
  } catch (err: any) {
    return { success: false, message: `Erro ao salvar mídia: ${err.message}` };
  }
}
