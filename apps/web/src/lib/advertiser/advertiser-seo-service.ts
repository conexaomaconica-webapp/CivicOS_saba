import { createServerSideClient } from '@/lib/supabase/server';
import { scoreBusinessSeo, type SeoIssue, type SeoScoreResult } from '@/lib/seo/seo-score';
import { SEO_BUSINESS_SELECT, buildSeoRowFacts } from '@/lib/seo/seo-score-input';

/** Para onde o anunciante vai para corrigir cada pendência. Itens técnicos (slug, noindex) são só do admin e não aparecem. */
const FIX_LINK_BY_KEY: Record<string, { href: string; cta: string }> = {
  name: { href: '/anunciante/empresa', cta: 'Editar dados' },
  category: { href: '/anunciante/empresa', cta: 'Editar dados' },
  city_state: { href: '/anunciante/empresa', cta: 'Editar dados' },
  description: { href: '/anunciante/empresa', cta: 'Escrever descrição' },
  description_long: { href: '/anunciante/empresa', cta: 'Completar descrição' },
  phone: { href: '/anunciante/empresa', cta: 'Informar telefone' },
  whatsapp: { href: '/anunciante/empresa', cta: 'Informar WhatsApp' },
  website_or_instagram: { href: '/anunciante/empresa', cta: 'Informar site ou Instagram' },
  address: { href: '/anunciante/empresa', cta: 'Informar endereço' },
  hours: { href: '/anunciante/empresa', cta: 'Informar horário' },
  coordinates: { href: '/anunciante/empresa', cta: 'Confirmar localização' },
  services_1: { href: '/anunciante/conteudo/servicos', cta: 'Cadastrar serviços' },
  services_3: { href: '/anunciante/conteudo/servicos', cta: 'Cadastrar serviços' },
  logo: { href: '/anunciante/empresa/midias', cta: 'Enviar logo' },
  cover: { href: '/anunciante/empresa/midias', cta: 'Enviar fotos' },
  gallery: { href: '/anunciante/empresa/midias', cta: 'Enviar fotos' },
};

export type AdvertiserSeoSuggestion = { key: string; label: string; points: number; href: string; cta: string };

/**
 * As até 3 melhorias que mais pontuam e que o próprio anunciante consegue fazer. services_1 e services_3 pedem a mesma
 * ação (e descrição curta/longa também): mostra só a primeira de cada grupo para não repetir a pendência.
 */
export function suggestionsFromIssues(issues: SeoIssue[], limit = 3): AdvertiserSeoSuggestion[] {
  const seen = new Set<string>();
  const suggestions: AdvertiserSeoSuggestion[] = [];
  for (const issue of issues) {
    const fix = FIX_LINK_BY_KEY[issue.key];
    if (!fix) continue;
    const group = issue.key.startsWith('services') ? 'services' : issue.key.startsWith('description') ? 'description' : issue.key;
    if (seen.has(group)) continue;
    seen.add(group);
    suggestions.push({ key: issue.key, label: issue.label, points: issue.points, ...fix });
    if (suggestions.length === limit) break;
  }
  return suggestions;
}

export type AdvertiserSeoProfile = {
  score: number;
  status: SeoScoreResult['status'];
  statusLabel: string;
  suggestions: AdvertiserSeoSuggestion[];
};

/**
 * Nota interna de SEO da empresa do anunciante e as melhorias que ele mesmo pode fazer, da que mais pontua para a que
 * menos pontua. Devolve null se a empresa não puder ser lida (o cartão simplesmente não aparece).
 */
export async function getAdvertiserSeoProfile(businessId: string | null | undefined): Promise<AdvertiserSeoProfile | null> {
  if (!businessId) return null;
  try {
    const supabase = await createServerSideClient();
    let { data, error } = await (supabase as any)
      .from('businesses')
      .select(`${SEO_BUSINESS_SELECT}, seo_indexable`)
      .eq('id', businessId)
      .maybeSingle();
    // Migration 196 ainda não aplicada: lê sem a coluna de indexação.
    if (error) {
      ({ data, error } = await (supabase as any).from('businesses').select(SEO_BUSINESS_SELECT).eq('id', businessId).maybeSingle());
    }
    if (error || !data) return null;

    const result = scoreBusinessSeo(buildSeoRowFacts(data).scoreInput);
    const suggestions = suggestionsFromIssues(result.issues);

    return { score: result.score, status: result.status, statusLabel: result.statusLabel, suggestions };
  } catch {
    return null;
  }
}
