'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { createServerSideClient } from '@/lib/supabase/server';
import { resolveCanonicalAdminTenant } from '@/lib/admin/admin-tenant-context';
import {
  SUPPORT_CONTACT_ENTRY_ID,
  buildSupportContactEntry,
  normalizeSupportEmail,
  normalizeSupportWhatsapp,
} from '@/lib/directory/support-contact';

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

// Configurações do Guia pertencem ao tenant do domínio administrado.
// O perfil do usuário não define o destino da gravação.
async function resolvePublicDirectoryTenantId(): Promise<string> {
  const { tenantId } = await resolveCanonicalAdminTenant();
  return tenantId;
}

export async function saveDirectoryHomeSettingsAction(input: DirectoryHomeSettingsInput) {
  try {
    const supabase = await createServerSideClient();

    // Obter usuario autenticado e tenant
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      return { success: false, error: 'Usuário não autenticado.' };
    }

    const tenantId = await resolvePublicDirectoryTenantId();
    if (!tenantId) {
      return { success: false, error: 'Tenant do administrador não identificado. Nenhuma configuração foi alterada.' };
    }

    // Contato de suporte (botão flutuante): valida antes de gravar; vazio é permitido (volta ao número padrão).
    const supportEntry = (input.sections_config || []).find((sec: any) => sec?.id === SUPPORT_CONTACT_ENTRY_ID) as any;
    if (supportEntry) {
      const rawWhatsapp = String(supportEntry.whatsapp ?? '').trim();
      const rawEmail = String(supportEntry.email ?? '').trim();
      if (rawWhatsapp && !normalizeSupportWhatsapp(rawWhatsapp)) {
        return { success: false, error: 'WhatsApp do suporte inválido. Informe DDD e número, por exemplo (75) 98127-2323.' };
      }
      if (rawEmail && !normalizeSupportEmail(rawEmail)) {
        return { success: false, error: 'E-mail do suporte inválido.' };
      }
    }

    // Mesclar speed e logo_style em sections_config para o bloco sponsored como garantia
    const updatedSections = (input.sections_config || []).map((sec: any) => {
      if (sec.id === SUPPORT_CONTACT_ENTRY_ID) return buildSupportContactEntry({ whatsapp: sec.whatsapp, email: sec.email });
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
    if (error && (
      error.code === '42703'
      || error.code === 'PGRST204'
      || error.message?.includes('does not exist')
      || error.message?.includes('schema cache')
    )) {
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

    const { data: savedSettings, error: verificationError } = await (supabase as any)
      .from('directory_home_settings')
      .select('hero_title, hero_subtitle, hero_search_placeholder, default_page_size, sections_config, sponsored_display_mode')
      .eq('tenant_id', tenantId)
      .single();

    if (verificationError || !savedSettings) {
      return {
        success: false,
        error: `A configuração foi enviada, mas não pôde ser confirmada: ${verificationError?.message || 'registro não encontrado'}`,
      };
    }

    if (
      savedSettings.hero_title !== input.hero_title
      || savedSettings.hero_subtitle !== input.hero_subtitle
      || savedSettings.hero_search_placeholder !== input.hero_search_placeholder
      || Number(savedSettings.default_page_size) !== Number(input.default_page_size)
    ) {
      return { success: false, error: 'O banco não confirmou as configurações da Hero e da paginação.' };
    }

    const savedSponsoredConfig = Array.isArray(savedSettings.sections_config)
      ? savedSettings.sections_config.find((section: any) => section.id === 'sponsored')
      : null;
    if (
      savedSettings.sponsored_display_mode !== input.sponsored_display_mode
      || savedSponsoredConfig?.display_mode !== input.sponsored_display_mode
      || savedSponsoredConfig?.logo_style !== input.sponsored_logo_style
    ) {
      return { success: false, error: 'O banco não confirmou o formato configurado para as empresas patrocinadas.' };
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

    const tenantId = await resolvePublicDirectoryTenantId();
    if (!tenantId) {
      return { success: false, error: 'Tenant do administrador não identificado. Nenhuma configuração foi alterada.' };
    }

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

      if (!updatedSections.some((sec: any) => sec.id === 'sponsored')) {
        updatedSections.push({
          id: 'sponsored',
          enabled: true,
          order: 4,
          display_mode: input.mode,
          speed: input.speed ?? 45,
          logo_style: input.logoStyle ?? 'standard',
        });
      }
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


