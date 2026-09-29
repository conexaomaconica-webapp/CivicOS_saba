'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { createServerSideClient } from '@/lib/supabase/server';

export type DirectoryHomeSettingsInput = {
  hero_title: string;
  hero_subtitle: string;
  hero_search_placeholder: string;
  default_page_size: number;
  sections_config: Array<{ id: string; enabled: boolean; order: number }>;
  sponsored_display_mode?: 'cards' | 'logos';
};

export async function saveDirectoryHomeSettingsAction(input: DirectoryHomeSettingsInput) {
  try {
    const supabase = await createServerSideClient();

    // Obter usuario autenticado e tenant
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      return { success: false, error: 'Usuário não autenticado.' };
    }

    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('tenant_id')
      .eq('id', authData.user.id)
      .maybeSingle();

    const tenantId = profile?.tenant_id || '00000000-0000-0000-0000-000000000010';

    const payload = {
      tenant_id: tenantId,
      hero_title: input.hero_title,
      hero_subtitle: input.hero_subtitle,
      hero_search_placeholder: input.hero_search_placeholder,
      default_page_size: input.default_page_size,
      sections_config: input.sections_config,
      sponsored_display_mode: input.sponsored_display_mode || 'cards',
      updated_at: new Date().toISOString(),
    };

    const { error } = await (supabase as any)
      .from('directory_home_settings')
      .upsert(payload, { onConflict: 'tenant_id' });

    if (error) {
      console.error('Erro ao salvar directory_home_settings:', error);
      return { success: false, error: error.message };
    }

    // INVALIDA O CACHE DO NEXT.JS DA PÁGINA PÚBLICA /guia PARA ATUALIZAR O HERO EM TEMPO REAL
    revalidatePath('/guia');
    revalidatePath('/(public)/guia');
    revalidateTag('directory_home');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado ao salvar hero.' };
  }
}

export async function updateSponsoredDisplayModeAction(mode: 'cards' | 'logos') {
  try {
    const supabase = await createServerSideClient();

    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      return { success: false, error: 'Usuário não autenticado.' };
    }

    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('tenant_id')
      .eq('id', authData.user.id)
      .maybeSingle();

    const tenantId = profile?.tenant_id || '00000000-0000-0000-0000-000000000010';

    // Busca configurações existentes para preservar os dados de hero e seções
    const { data: existing } = await (supabase as any)
      .from('directory_home_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const payload = {
      ...(existing || {}),
      tenant_id: tenantId,
      sponsored_display_mode: mode,
      updated_at: new Date().toISOString(),
    };

    const { error } = await (supabase as any)
      .from('directory_home_settings')
      .upsert(payload, { onConflict: 'tenant_id' });

    if (error) {
      console.error('Erro ao atualizar sponsored_display_mode:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/guia');
    revalidatePath('/(public)/guia');
    revalidateTag('directory_home');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado ao atualizar formato.' };
  }
}

