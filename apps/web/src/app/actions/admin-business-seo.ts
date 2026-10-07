'use server';

import { assertPlatformAdminAccess } from '@/lib/admin/admin-auth-helper';
import { revalidatePublicSeo } from '@/lib/seo/revalidate-public-seo';
import { validateSeoOverrides, type BusinessSeoFormValues } from '@/lib/seo/business-seo';
import { scoreBusinessSeo, type SeoScoreResult } from '@/lib/seo/seo-score';
import { SEO_BUSINESS_SELECT, buildSeoRowFacts } from '@/lib/seo/seo-score-input';
import { generateSeoSuggestions, type SeoSuggestions } from '@/lib/seo/seo-suggestions';

export type AdminBusinessSeoData = {
  businessId: string;
  slug: string;
  name: string;
  category: string | null;
  description: string | null;
  city: string | null;
  state: string | null;
  publicationStatus: string | null;
  overrides: BusinessSeoFormValues;
  /** Nota interna de SEO (0-100) e o que falta para chegar a 100. */
  score: SeoScoreResult;
  /** Sugestões automáticas (sem IA, só com dados do cadastro). */
  suggestions: SeoSuggestions;
};

/** Dados para a tela de SEO da empresa. Retorna null se a empresa não existe ou o usuário não é admin. */
export async function getAdminBusinessSeoAction(businessId: string): Promise<AdminBusinessSeoData | null> {
  try {
    const { supabase } = await assertPlatformAdminAccess();
    let { data, error } = await (supabase as any)
      .from('businesses')
      .select(`${SEO_BUSINESS_SELECT}, publication_status, seo_title, seo_description, seo_og_image_url, seo_indexable`)
      .eq('id', businessId)
      .maybeSingle();
    // Migration 196 ainda não aplicada: mostra a tela só com o SEO automático.
    if (error) {
      ({ data, error } = await (supabase as any)
        .from('businesses')
        .select(`${SEO_BUSINESS_SELECT}, publication_status`)
        .eq('id', businessId)
        .maybeSingle());
    }
    if (error || !data) return null;

    const { scoreInput, serviceNames, hoursCount } = buildSeoRowFacts(data);
    const suggestions = generateSeoSuggestions({
      slug: data.slug ?? data.id,
      name: data.name,
      category: scoreInput.category,
      city: scoreInput.city,
      state: scoreInput.state,
      description: scoreInput.description,
      services: serviceNames,
      hasHours: hoursCount > 0,
      hasPhone: Boolean(scoreInput.phone),
      hasWhatsapp: Boolean(scoreInput.whatsapp),
    });

    return {
      businessId: data.id,
      slug: data.slug,
      name: data.name,
      category: data.category ?? null,
      description: data.description ?? null,
      city: scoreInput.city,
      state: scoreInput.state,
      publicationStatus: data.publication_status ?? null,
      overrides: {
        seo_title: data.seo_title ?? '',
        seo_description: data.seo_description ?? '',
        seo_og_image_url: data.seo_og_image_url ?? '',
        seo_indexable: data.seo_indexable !== false,
      },
      score: scoreBusinessSeo(scoreInput),
      suggestions,
    };
  } catch {
    return null;
  }
}

export async function updateAdminBusinessSeoAction(
  businessId: string,
  input: BusinessSeoFormValues
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user } = await assertPlatformAdminAccess();
    const checked = validateSeoOverrides(input);
    if (!checked.ok) return { success: false, error: checked.error };

    const { data: before } = await (supabase as any)
      .from('businesses')
      .select('tenant_id, slug, seo_title, seo_description, seo_og_image_url, seo_indexable')
      .eq('id', businessId)
      .maybeSingle();
    if (!before) return { success: false, error: 'Empresa não encontrada.' };

    const { error } = await (supabase as any)
      .from('businesses')
      .update({ ...checked.values, updated_at: new Date().toISOString() })
      .eq('id', businessId);
    if (error) {
      return {
        success: false,
        error: /seo_/.test(error.message)
          ? 'Os campos de SEO ainda não existem no banco. Aplique a migration 196 e tente de novo.'
          : `Falha ao salvar: ${error.message}`,
      };
    }

    await (supabase as any).from('admin_audit_logs').insert({
      tenant_id: before.tenant_id,
      actor_id: user.id,
      action: 'UPDATE_BUSINESS_SEO',
      entity_type: 'business',
      entity_id: businessId,
      before_value: {
        seo_title: before.seo_title,
        seo_description: before.seo_description,
        seo_og_image_url: before.seo_og_image_url,
        seo_indexable: before.seo_indexable,
      },
      after_value: checked.values,
      reason: 'Personalização de SEO pelo admin',
    });

    revalidatePublicSeo(before.slug);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao salvar o SEO.' };
  }
}

/** Aplica no cadastro (campo Descrição) o texto sugerido, já revisado pelo admin. */
export async function applyAdminBusinessDescriptionAction(
  businessId: string,
  description: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user } = await assertPlatformAdminAccess();
    const text = description.replace(/\s+/g, ' ').trim();
    if (text.length < 50) return { success: false, error: 'A descrição precisa ter ao menos 50 caracteres.' };
    if (text.length > 1000) return { success: false, error: 'A descrição deve ter no máximo 1000 caracteres.' };

    const { data: before } = await (supabase as any)
      .from('businesses')
      .select('tenant_id, slug, description')
      .eq('id', businessId)
      .maybeSingle();
    if (!before) return { success: false, error: 'Empresa não encontrada.' };

    const { error } = await (supabase as any)
      .from('businesses')
      .update({ description: text, updated_at: new Date().toISOString() })
      .eq('id', businessId);
    if (error) return { success: false, error: `Falha ao salvar: ${error.message}` };

    await (supabase as any).from('admin_audit_logs').insert({
      tenant_id: before.tenant_id,
      actor_id: user.id,
      action: 'UPDATE_BUSINESS_DESCRIPTION_FROM_SEO',
      entity_type: 'business',
      entity_id: businessId,
      before_value: { description: before.description },
      after_value: { description: text },
      reason: 'Descrição sugerida pelo gerador de SEO e revisada pelo admin',
    });

    revalidatePublicSeo(before.slug);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao salvar a descrição.' };
  }
}
