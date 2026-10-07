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

export async function extractMemberAvatarStoragePath(urlOrPath: string | null | undefined): Promise<string | null> {
  if (!urlOrPath) return null;
  const publicMarker = '/storage/v1/object/public/member-avatars/';
  const signMarker = '/storage/v1/object/sign/member-avatars/';

  if (urlOrPath.includes(publicMarker)) {
    const idx = urlOrPath.indexOf(publicMarker);
    const pathWithQuery = urlOrPath.slice(idx + publicMarker.length);
    return decodeURIComponent(pathWithQuery.split('?')[0] || '');
  }
  if (urlOrPath.includes(signMarker)) {
    const idx = urlOrPath.indexOf(signMarker);
    const pathWithQuery = urlOrPath.slice(idx + signMarker.length);
    return decodeURIComponent(pathWithQuery.split('?')[0] || '');
  }
  if (!urlOrPath.startsWith('http://') && !urlOrPath.startsWith('https://')) {
    return urlOrPath.startsWith('member-avatars/') ? urlOrPath.slice('member-avatars/'.length) : urlOrPath;
  }
  return null;
}

export async function getSignedMemberAvatarUrl(
  urlOrPath: string | null | undefined,
  supabaseClient?: any,
  expiresInSeconds = 3600
): Promise<string | null> {
  if (!urlOrPath) return null;
  const path = await extractMemberAvatarStoragePath(urlOrPath);
  if (!path) return urlOrPath;

  try {
    const supabase = supabaseClient || (await createServerSideClient());
    const { data, error } = await supabase.storage.from('member-avatars').createSignedUrl(path, expiresInSeconds);
    if (error || !data?.signedUrl) {
      return urlOrPath;
    }
    return data.signedUrl;
  } catch {
    return urlOrPath;
  }
}

async function memberAvatarPath(publicUrl: string | null | undefined, userId: string): Promise<string | null> {
  if (!publicUrl) return null;
  const path = await extractMemberAvatarStoragePath(publicUrl);
  if (!path) return null;
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

    const { data: stateRow, error: stateError } = await (supabase as any).from('brazilian_states').select('ibge_code').eq('uf', state).maybeSingle();
    if (!stateError && stateRow) {
      const { data: cityRow, error: cityError } = await (supabase as any)
        .from('brazilian_cities')
        .select('ibge_code')
        .eq('state_ibge_code', stateRow.ibge_code)
        .eq('name', city)
        .maybeSingle();
      if (!cityError && !cityRow) return { success: false, error: 'Selecione uma cidade da lista para o estado escolhido.' };
    }

    const { data: currentProfile } = await (supabase as any)
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .maybeSingle();
    const previousAvatarPath = await memberAvatarPath(currentProfile?.avatar_url, user.id);

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
      
      const { data: signedData } = await supabase.storage.from('member-avatars').createSignedUrl(path, 3600);
      avatarUrl = signedData?.signedUrl || supabase.storage.from('member-avatars').getPublicUrl(path).data.publicUrl;
    }

    const patch: { name: string; phone: string | null; city: string; state: string; avatar_url?: string } = {
      name,
      phone: phone || null,
      city,
      state,
    };
    if (avatarUrl) patch.avatar_url = avatarUrl;
    const { error } = await (supabase as any).from('profiles').update(patch).eq('id', user.id);
    if (error) {
      const uploadedPath = await memberAvatarPath(avatarUrl, user.id);
      if (uploadedPath) await supabase.storage.from('member-avatars').remove([uploadedPath]);
      return { success: false, error: error.message };
    }
    const { error: authError } = await supabase.auth.updateUser({ data: { name, city, state, ...(avatarUrl ? { avatar_url: avatarUrl } : {}) } });
    if (authError) return { success: false, error: authError.message };

    if (avatarUrl && previousAvatarPath) {
      const prevPath = await previousAvatarPath;
      if (prevPath) await supabase.storage.from('member-avatars').remove([prevPath]);
    }

    revalidatePath('/minha-conta', 'layout');
    return { success: true, avatarUrl };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Não foi possível atualizar o perfil.' };
  }
}
