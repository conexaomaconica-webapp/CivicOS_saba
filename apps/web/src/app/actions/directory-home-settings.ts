'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { createServerSideClient } from '@/lib/supabase/server';

export type DirectoryHomeSettingsInput = {
  hero_title: string;
  hero_subtitle: string;
  hero_search_placeholder: string;
  default_page_size: number;
  sections_config: Array<{ id: string; enabled: boolean; order: number }>;
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
