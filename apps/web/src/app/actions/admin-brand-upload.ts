'use server';

import crypto from 'crypto';
import { resolveCanonicalAdminTenant } from '@/lib/admin/admin-tenant-context';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
};

const MAX_BYTES = 2.5 * 1024 * 1024; // 2.5 MB
const BUCKET = 'business-assets';

/**
 * Envia o logotipo ou favicon do portal (tenant) para armazenamento público.
 * Caminho: business-assets/{tenantId}/brand/{assetType}-{uuid}.{ext}
 */
export async function uploadBrandAssetAction(
  formData: FormData,
  assetType: 'logo' | 'favicon'
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  try {
    const { tenantId } = await resolveCanonicalAdminTenant();

    const file = formData.get('file');
    if (!(file instanceof File)) {
      return { success: false, error: 'Selecione um arquivo de imagem válido.' };
    }

    let extension = ALLOWED_MIME_TYPES[file.type];
    // Suporte caso o browser envie extensão .ico com mime genérico octet-stream
    if (!extension && file.name.endsWith('.ico')) {
      extension = 'ico';
    } else if (!extension && file.name.endsWith('.svg')) {
      extension = 'svg';
    }

    if (!extension) {
      return {
        success: false,
        error: 'Formato não suportado. Utilize PNG, JPG, WebP, SVG ou ICO.',
      };
    }

    if (file.size <= 0 || file.size > MAX_BYTES) {
      return {
        success: false,
        error: 'O arquivo deve ter no máximo 2,5 MB.',
      };
    }

    const admin = createServiceRoleClient();
    if (!admin) {
      return { success: false, error: 'Serviço de armazenamento indisponível.' };
    }

    const filename = `${assetType}-${crypto.randomUUID()}.${extension}`;
    const path = `${tenantId}/brand/${filename}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error } = await admin.storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType: file.type || (extension === 'ico' ? 'image/x-icon' : 'image/png'),
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

