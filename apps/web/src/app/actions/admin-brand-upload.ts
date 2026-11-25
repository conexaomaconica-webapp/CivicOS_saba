'use server';

import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { resolveCanonicalAdminTenant } from '@/lib/admin/admin-tenant-context';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import type { Json } from '@/types/database.types';

export type BrandAssetType = 'logo' | 'favicon' | 'launch_video_mobile' | 'launch_video_desktop';

const ALLOWED_IMAGE_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
};

const ALLOWED_VIDEO_MIME: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mp4',
};

const MAX_IMAGE_BYTES = 2.5 * 1024 * 1024; // 2.5 MB
const MAX_VIDEO_BYTES = 20 * 1024 * 1024; // 20 MB
const BUCKET = 'business-assets';

function isVideoAsset(assetType: BrandAssetType): boolean {
  return assetType === 'launch_video_mobile' || assetType === 'launch_video_desktop';
}

/**
 * Envia o logotipo, favicon ou vídeo de abertura (mobile/desktop) do tenant para o storage público.
 * Caminho: business-assets/{tenantId}/brand/{assetType}-{uuid}.{ext}
 */
export async function uploadBrandAssetAction(
  formData: FormData,
  assetType: BrandAssetType,
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  try {
    const { tenantId } = await resolveCanonicalAdminTenant();

    const file = formData.get('file');
    if (!(file instanceof File)) {
      return { success: false, error: 'Selecione um arquivo válido.' };
    }

    const video = isVideoAsset(assetType);
    const lowerName = file.name.toLowerCase();
    let extension: string | undefined;

    if (video) {
      extension = ALLOWED_VIDEO_MIME[file.type];
      if (!extension && lowerName.endsWith('.mp4')) extension = 'mp4';
      else if (!extension && lowerName.endsWith('.webm')) extension = 'webm';
      else if (!extension && lowerName.endsWith('.mov')) extension = 'mp4';
      if (!extension) {
        return { success: false, error: 'Formato de vídeo não suportado. Utilize MP4 ou WebM.' };
      }
      if (file.size <= 0 || file.size > MAX_VIDEO_BYTES) {
        return { success: false, error: 'O vídeo deve ter no máximo 20 MB.' };
      }
    } else {
      extension = ALLOWED_IMAGE_MIME[file.type];
      if (!extension && lowerName.endsWith('.ico')) extension = 'ico';
      else if (!extension && lowerName.endsWith('.svg')) extension = 'svg';
      if (!extension) {
        return {
          success: false,
          error: 'Formato não suportado. Utilize PNG, JPG, WebP, SVG ou ICO.',
        };
      }
      if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
        return { success: false, error: 'A imagem deve ter no máximo 2,5 MB.' };
      }
    }

    const admin = createServiceRoleClient();
    if (!admin) {
      return { success: false, error: 'Serviço de armazenamento indisponível.' };
    }

    const filename = `${assetType}-${crypto.randomUUID()}.${extension}`;
    const path = `${tenantId}/brand/${filename}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const fallbackMime = video
      ? extension === 'webm'
        ? 'video/webm'
        : 'video/mp4'
      : extension === 'ico'
        ? 'image/x-icon'
        : 'image/png';

    const { error } = await admin.storage.from(BUCKET).upload(path, bytes, {
      contentType: file.type || fallbackMime,
      upsert: false,
    });

    if (error) {
      return { success: false, error: `Falha ao salvar no armazenamento: ${error.message}` };
    }

    const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
    return { success: true, url: data.publicUrl };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao processar envio do arquivo.',
    };
  }
}

export async function loadTenantBrandingAction(): Promise<
  | {
      success: true;
      tenant: { id: string; name: string; slug: string; settings: Record<string, unknown> };
    }
  | { success: false; error: string }
> {
  try {
    const { tenantId } = await resolveCanonicalAdminTenant();
    const admin = createServiceRoleClient();
    if (!admin) {
      return { success: false, error: 'Configuração segura do servidor indisponível.' };
    }
    const { data, error } = await admin
      .from('tenants')
      .select('id, name, slug, settings')
      .eq('id', tenantId)
      .single();
    if (error || !data) {
      return { success: false, error: 'Não foi possível carregar os dados do inquilino.' };
    }
    const settings =
      typeof data.settings === 'object' && data.settings !== null && !Array.isArray(data.settings)
        ? (data.settings as Record<string, unknown>)
        : {};
    return {
      success: true,
      tenant: { id: data.id, name: data.name, slug: data.slug, settings },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao carregar configurações da marca.',
    };
  }
}

export async function saveTenantBrandingAction(
  branding: Record<string, unknown> | null,
): Promise<{ success: true; settings: Record<string, unknown> } | { success: false; error: string }> {
  try {
    const { tenantId } = await resolveCanonicalAdminTenant();
    const admin = createServiceRoleClient();
    if (!admin) {
      return { success: false, error: 'Configuração segura do servidor indisponível.' };
    }

    const { data: current, error: fetchError } = await admin
      .from('tenants')
      .select('settings')
      .eq('id', tenantId)
      .single();

    if (fetchError || !current) {
      return { success: false, error: 'Não foi possível localizar o inquilino para salvar.' };
    }

    const currentSettings =
      typeof current.settings === 'object' && current.settings !== null && !Array.isArray(current.settings)
        ? (current.settings as Record<string, unknown>)
        : {};

    const nextSettings: Record<string, unknown> = { ...currentSettings };
    if (branding && Object.keys(branding).length > 0) {
      nextSettings.branding = branding;
    } else {
      delete nextSettings.branding;
    }

    const { error: updateError } = await admin
      .from('tenants')
      .update({ settings: nextSettings as unknown as Json })
      .eq('id', tenantId);

    if (updateError) {
      return { success: false, error: `Falha ao salvar alterações: ${updateError.message}` };
    }

    revalidatePath('/', 'layout');
    revalidatePath('/admin/marca');
    revalidatePath('/guia');
    return { success: true, settings: nextSettings };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao salvar identidade da marca.',
    };
  }
}
