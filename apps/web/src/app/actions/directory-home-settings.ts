'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { createServerSideClient } from '@/lib/supabase/server';

export type DirectoryHomeSettingsInput = {
  hero_title: string;
  hero_subtitle: string;
  hero_search_placeholder: string;
  default_page_size: number;
  sections_config: Array<{ id: string; enabled: boolean; order: number; [key: string]: any }>;
  sponsored_display_mode?: 'cards' | 'logos';
  sponsored_marquee_speed?: number;
  sponsored_logo_style?: 'standard' | 'clean';
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

    // Mesclar speed e logo_style em sections_config para o bloco sponsored como garantia
    const updatedSections = (input.sections_config || []).map((sec: any) => {
      if (sec.id === 'sponsored') {
        return {
          ...sec,
          display_mode: input.sponsored_display_mode || sec.display_mode || 'cards',
          speed: input.sponsored_marquee_speed ?? sec.speed ?? 45,
          logo_style: input.sponsored_logo_style ?? sec.logo_style ?? 'standard',
        };
      }
      return sec;
    });

    const payload: any = {
      tenant_id: tenantId,
      hero_title: input.hero_title,
      hero_subtitle: input.hero_subtitle,
      hero_search_placeholder: input.hero_search_placeholder,
      default_page_size: input.default_page_size,
      sections_config: updatedSections,
      sponsored_display_mode: input.sponsored_display_mode || 'cards',
      sponsored_marquee_speed: input.sponsored_marquee_speed ?? 45,
      sponsored_logo_style: input.sponsored_logo_style || 'standard',
      updated_at: new Date().toISOString(),
    };

    let { error } = await (supabase as any)
      .from('directory_home_settings')
      .upsert(payload, { onConflict: 'tenant_id' });

    // Fallback gracioso se colunas ainda não existirem no schema do banco
    if (error && (error.code === '42703' || error.message?.includes('does not exist'))) {
      delete payload.sponsored_marquee_speed;
      delete payload.sponsored_logo_style;
      const retry = await (supabase as any)
        .from('directory_home_settings')
        .upsert(payload, { onConflict: 'tenant_id' });
      error = retry.error;
    }

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

export type UpdateSponsoredSettingsInput = {
  mode: 'cards' | 'logos';
  speed?: number;
  logoStyle?: 'standard' | 'clean';
};

export async function updateSponsoredSettingsAction(input: UpdateSponsoredSettingsInput) {
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

    let updatedSections = existing?.sections_config || [];
    if (Array.isArray(updatedSections)) {
      updatedSections = updatedSections.map((sec: any) => {
        if (sec.id === 'sponsored') {
          return {
            ...sec,
            display_mode: input.mode,
            speed: input.speed ?? sec.speed ?? 45,
            logo_style: input.logoStyle ?? sec.logo_style ?? 'standard',
          };
        }
        return sec;
      });
    }

    const payload: any = {
      ...(existing || {}),
      tenant_id: tenantId,
      sponsored_display_mode: input.mode,
      sponsored_marquee_speed: input.speed ?? existing?.sponsored_marquee_speed ?? 45,
      sponsored_logo_style: input.logoStyle ?? existing?.sponsored_logo_style ?? 'standard',
      sections_config: updatedSections,
      updated_at: new Date().toISOString(),
    };

    let { error } = await (supabase as any)
      .from('directory_home_settings')
      .upsert(payload, { onConflict: 'tenant_id' });

    // Fallback gracioso se colunas ainda não existirem no schema do banco
    if (error && (error.code === '42703' || error.message?.includes('does not exist'))) {
      delete payload.sponsored_marquee_speed;
      delete payload.sponsored_logo_style;
      const retry = await (supabase as any)
        .from('directory_home_settings')
        .upsert(payload, { onConflict: 'tenant_id' });
      error = retry.error;
    }

    if (error) {
      console.error('Erro ao atualizar configurações de empresas patrocinadas:', error);
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

export async function updateSponsoredDisplayModeAction(mode: 'cards' | 'logos') {
  return updateSponsoredSettingsAction({ mode });
}


