'use server';

import crypto from 'crypto';
import { resolveCanonicalAdminTenant } from '@/lib/admin/admin-tenant-context';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
// Banner é otimizado no navegador (WebP, centenas de KB); o servidor recusa arquivos pesados que burlem essa etapa.
const MAX_BYTES = 1.5 * 1024 * 1024;
const BUCKET = 'business-assets';

/**
 * Envia a imagem de um banner do Guia (desktop ou mobile) para o armazenamento público e devolve a URL.
 * Só admin de plataforma; a gravação usa a chave de serviço depois dessa checagem (as políticas do bucket são por empresa).
 * Caminho: business-assets/{tenant}/directory-banners/{uuid}.{ext}
 */
export async function uploadDirectoryBannerImageAction(
  formData: FormData,
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  try {
    const { tenantId } = await resolveCanonicalAdminTenant();

    const file = formData.get('file');
    if (!(file instanceof File)) return { success: false, error: 'Selecione um arquivo de imagem.' };

    const extension = ALLOWED_TYPES[file.type];
    if (!extension) return { success: false, error: 'Formato não aceito. Use JPG, PNG ou WebP.' };
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return { success: false, error: 'A imagem do banner deve ter no máximo 1,5 MB (use a opção de enviar pelo painel, que otimiza sozinha).' };
    }

    const admin = createServiceRoleClient();
    if (!admin) return { success: false, error: 'Armazenamento indisponível no servidor.' };

    const path = `${tenantId}/directory-banners/${crypto.randomUUID()}.${extension}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: file.type, upsert: false });
    if (error) return { success: false, error: `Falha no envio: ${error.message}` };

    return { success: true, url: admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Não foi possível enviar a imagem.' };
  }
}
