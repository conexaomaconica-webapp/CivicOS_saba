'use server';

import { revalidatePath } from 'next/cache';
import { createServerSideClient } from '@/lib/supabase/server';
import { validatePhone } from '@/lib/onboarding/onboarding-validation';

const STATES = new Set(['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']);

function isSupportedImage(bytes: Uint8Array) {
  return (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    || (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
    || (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46);
}

function memberAvatarPath(publicUrl: string | null | undefined, userId: string): string | null {
  if (!publicUrl) return null;
  const marker = '/storage/v1/object/public/member-avatars/';
  const markerIndex = publicUrl.indexOf(marker);
  if (markerIndex < 0) return null;
  const path = decodeURIComponent(publicUrl.slice(markerIndex + marker.length));
  return path.startsWith(`${userId}/`) ? path : null;
}

export async function updateMemberProfileAction(formData: FormData): Promise<{ success: boolean; error?: string; avatarUrl?: string }> {
  try {
    const supabase = await createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Sessão expirada. Entre novamente.' };

    const name = String(formData.get('name') || '').trim();
    const phone = String(formData.get('phone') || '').trim();
    const city = String(formData.get('city') || '').trim();
    const state = String(formData.get('state') || '').trim().toUpperCase();
    if (name.length < 3 || name.length > 180) return { success: false, error: 'Informe um nome válido.' };
    if (city.length < 2 || city.length > 120) return { success: false, error: 'Informe uma cidade válida.' };
    if (!STATES.has(state)) return { success: false, error: 'Informe uma UF válida.' };
    if (phone && validatePhone(phone)) return { success: false, error: 'Informe um telefone válido.' };

    const { data: currentProfile } = await (supabase as any)
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .maybeSingle();
    const previousAvatarPath = memberAvatarPath(currentProfile?.avatar_url, user.id);

    let avatarUrl: string | undefined;
    const avatar = formData.get('avatar');
    if (avatar instanceof File && avatar.size > 0) {
      if (avatar.size > 3 * 1024 * 1024) return { success: false, error: 'A foto deve ter no máximo 3 MB.' };
      const bytes = new Uint8Array(await avatar.arrayBuffer());
      if (!isSupportedImage(bytes)) return { success: false, error: 'Envie uma foto JPEG, PNG ou WebP válida.' };
      const extension = avatar.type === 'image/png' ? 'png' : avatar.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `${user.id}/avatar/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('member-avatars').upload(path, bytes, { contentType: avatar.type, upsert: false });
      if (uploadError) return { success: false, error: `Falha ao enviar foto: ${uploadError.message}` };
      avatarUrl = supabase.storage.from('member-avatars').getPublicUrl(path).data.publicUrl;
    }

    // Whitelist intencional: id, role e tenant_id nunca entram nesta mutação.
    const patch: { name: string; phone: string | null; city: string; state: string; avatar_url?: string } = {
      name,
      phone: phone || null,
      city,
      state,
    };
    if (avatarUrl) patch.avatar_url = avatarUrl;
    const { error } = await (supabase as any).from('profiles').update(patch).eq('id', user.id);
    if (error) {
      const uploadedPath = memberAvatarPath(avatarUrl, user.id);
      if (uploadedPath) await supabase.storage.from('member-avatars').remove([uploadedPath]);
      return { success: false, error: error.message };
    }
    const { error: authError } = await supabase.auth.updateUser({ data: { name, city, state, ...(avatarUrl ? { avatar_url: avatarUrl } : {}) } });
    if (authError) return { success: false, error: authError.message };

    if (avatarUrl && previousAvatarPath) {
      await supabase.storage.from('member-avatars').remove([previousAvatarPath]);
    }

    revalidatePath('/minha-conta', 'layout');
    return { success: true, avatarUrl };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Não foi possível atualizar o perfil.' };
  }
}
