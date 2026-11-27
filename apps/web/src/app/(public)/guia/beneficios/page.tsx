import React from 'react';
import type { Metadata } from 'next';
import { appUrl } from '@/lib/seo/app-url';
import Link from 'next/link';
import { ChevronRight, Award, Sparkles, Search } from 'lucide-react';
import { createServerSideClient } from '@/lib/supabase/server';
import { DirectoryHeader } from '@/components/public/directory/DirectoryHeader';
import { DirectoryFooter } from '@/components/public/directory/DirectoryFooter';
import { BenefitsDirectoryCards, type BenefitDirectoryBusinessItem } from '@/components/public/directory/BenefitsDirectoryCards';
import { StructuredData } from '@/components/seo/StructuredData';
import { FavoritesProvider } from '@/lib/directory/favorites-context';
import type { PublicBusinessBenefit } from '@/lib/business/public-business-presentation';
import '@/styles/directory-home.css';

export const metadata: Metadata = {
  title: { absolute: 'Clube de Benefícios e Vantagens | Conexão Maçônica' },
  description: 'Confira vantagens exclusivas, descontos e benefícios oferecidos por empresas da rede Conexão Maçônica.',
  alternates: { canonical: appUrl('/guia/beneficios') },
};

type Props = {
  searchParams?: Promise<{
    q?: string;
    city?: string;
    cat?: string;
  }>;
};

export default async function PublicBenefitsDirectoryPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const q = params.q?.trim() || '';
  const city = params.city?.trim() || '';
  const cat = params.cat?.trim() || '';

  const supabase = await createServerSideClient();

  // Fetch businesses with active benefits via RPC
  const { data: searchRes } = await (supabase as any).rpc('public_businesses_search', {
    p_host: 'localhost',
    p_query: q || null,
    p_city: city || null,
    p_category_slug: cat || null,
    p_has_benefits: true,
    p_page: 1,
    p_page_size: 24,
  });

  const rawItems = (searchRes as any)?.items || [];
  const businessIds = rawItems
    .map((biz: any) => biz.business_id || biz.id)
    .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0);

  const benefitsByBusiness = new Map<string, PublicBusinessBenefit[]>();
  if (businessIds.length > 0) {
    const { data: benefitRows } = await (supabase as any)
      .from('business_benefits')
      .select('id, business_id, title, description, benefit_type, discount_percentage, badge_text, valid_until, external_url')
      .in('business_id', businessIds)
      .eq('status', 'active')
      .order('display_order', { ascending: true });

    for (const row of benefitRows || []) {
      const bizId = String(row.business_id || '');
      if (!bizId) continue;
      const list = benefitsByBusiness.get(bizId) || [];
      const pct = row.discount_percentage != null ? Number(row.discount_percentage) : null;
      list.push({
        id: String(row.id),
        title: String(row.title || 'Benefício Exclusivo'),
        description: String(row.description || ''),
        benefitType: row.benefit_type ? String(row.benefit_type) : 'special_condition',
        discountPercentage: pct !== null && pct > 0 ? pct : null,
        badgeText: row.badge_text ? String(row.badge_text) : null,
        validUntil: row.valid_until ? String(row.valid_until) : null,
        externalUrl: row.external_url ? String(row.external_url) : null,
      });
      benefitsByBusiness.set(bizId, list);
    }
  }

  const items: BenefitDirectoryBusinessItem[] = rawItems.map((biz: any) => {
    const bizId = String(biz.business_id || biz.id || '');
    const bizSlug = String(biz.business_slug || biz.slug || '');
    const bizName = String(biz.business_name || biz.name || '');
    return {
      business_id: bizId,
      business_name: bizName,
      business_slug: bizSlug,
      primary_category_name: biz.primary_category_name || biz.category || null,
      city: biz.city || null,
      state: biz.state || null,
      description: biz.description || null,
      logo_url: biz.logo_url || null,
      cover_url: biz.cover_url || null,
      is_founder: Boolean(biz.is_founder),
      is_pedra_fundamental: Boolean(biz.is_pedra_fundamental),
      card: {
        id: bizId,
        slug: bizSlug,
        name: bizName,
        short_description: biz.short_description || biz.description || null,
        logo_url: biz.logo_url || null,
        logo_background_color: biz.logo_background_color || null,
        cover_url: biz.cover_url || null,
        category_name: biz.primary_category_name || biz.category || null,
        city: biz.city || null,
        state: biz.state || null,
        is_verified: Boolean(biz.is_verified),
        is_founder: Boolean(biz.is_founder),
        is_pedra_fundamental: Boolean(biz.is_pedra_fundamental),
        pedra_fundamental_card_display: biz.pedra_fundamental_card_display || null,
        effective_plan_code: biz.effective_plan_code || biz.plan_code || null,
        rating_average: biz.rating_average != null ? Number(biz.rating_average) : null,
        reviews_count: biz.reviews_count != null ? Number(biz.reviews_count) : undefined,
        views_count: biz.views_count != null ? Number(biz.views_count) : null,
        badge_custom_text: biz.badge_custom_text || null,
        badge_custom_icon_url: biz.badge_custom_icon_url || null,
        has_benefits: true,
        masonic_relationship_type: biz.masonic_relationship_type || null,
        masonic_member_name: biz.masonic_member_name || null,
        masonic_brother_name: biz.masonic_brother_name || null,
        masonic_lodge_name: biz.masonic_lodge_name || null,
        is_masonic_connection_public:
          typeof biz.is_masonic_connection_public === 'boolean' ? biz.is_masonic_connection_public : undefined,
      },
      benefits: benefitsByBusiness.get(bizId) || [],
    };
  });

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: appUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Guia', item: appUrl('/guia') },
      { '@type': 'ListItem', position: 3, name: 'Clube de Benefícios', item: appUrl('/guia/beneficios') },
    ],
  };

  const listSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Clube de Benefícios & Ofertas | Conexão Maçônica',
    url: appUrl('/guia/beneficios'),
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: items.slice(0, 50).map((biz: any, index: number) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: biz.business_name || biz.name,
        url: appUrl(`/guia/${biz.business_slug || biz.slug}`),
      })),
    },
  };

  return (
    <FavoritesProvider>
      <StructuredData schema={breadcrumbSchema} />
      <StructuredData schema={listSchema} />
      <div className="min-h-screen bg-[#faf7f2] text-[#1f1914] font-sans antialiased relative">

        <DirectoryHeader selectedCity={city} />

        {/* Sub-Hero Header com Paleta Bordô & Dourada do Sistema */}
        <section className="bg-gradient-to-b from-[#4b161b] via-[#4b161b] to-[#3b0b14] text-white py-10 px-4 relative overflow-hidden border-b border-[#c59b27]/30 shadow-lg">
          <div className="dh-container relative z-10">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs text-amber-200/80 mb-3" aria-label="Breadcrumb">
              <Link href="/guia" className="hover:text-amber-300 transition-colors">
                Início
              </Link>
              <ChevronRight className="w-3 h-3 text-[#c59b27]" />
              <span className="text-white font-semibold">Clube de Benefícios</span>
            </nav>

            <div className="flex items-center gap-2 text-[#c59b27] text-xs font-bold uppercase tracking-wider mb-2">
              <Award className="w-4 h-4 text-[#c59b27]" />
              <span>Vantagens Exclusivas</span>
            </div>

            <h1 className="font-serif font-bold text-3xl md:text-4xl text-white">
              Clube de Benefícios & Ofertas
            </h1>
            <p className="text-xs md:text-sm text-amber-100/90 max-w-2xl mt-2 leading-relaxed">
              Condições diferenciadas, descontos especiais e atendimento exclusivo oferecidos por empresários cadastrados na rede Conexão Maçônica.
            </p>

            {/* Barra de Busca Principal (Desktop; no mobile fica exclusivamente no header) */}
            <div className="hidden md:block">
              <form action="/guia/beneficios" method="GET" className="dh-search-box mt-8 max-w-3xl">
                <Sparkles className="w-5 h-5 text-amber-500 ml-3 shrink-0" />
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder="Buscar benefícios, descontos ou empresas..."
                  className="dh-search-box__input text-gray-900"
                />
                {city && <input type="hidden" name="city" value={city} />}
                {cat && <input type="hidden" name="cat" value={cat} />}
                <button type="submit" className="dh-search-box__btn">
                  <Search className="w-4 h-4" />
                  <span>Buscar</span>
                </button>
              </form>
            </div>
          </div>
        </section>

        <main className="dh-container space-y-8 py-7 sm:py-10">
          <section aria-labelledby="beneficios-lista-titulo">
            <h2 id="beneficios-lista-titulo" className="font-serif text-xl font-bold text-[#1f1914]">
              Conexão de Ofertas ativas
            </h2>
            <p className="mt-1 text-xs text-[#6b625b]">
              {items.length === 0
                ? 'Novas ofertas aparecem aqui assim que as empresas as publicarem.'
                : `${items.length} ${items.length === 1 ? 'empresa oferece' : 'empresas oferecem'} benefício para a comunidade.`}
            </p>
          </section>

          {/* Grid de Ofertas Diretas com Botão de Resgate */}
          {items.length > 0 ? (
            <BenefitsDirectoryCards items={items} />
          ) : (
            <div className="p-12 bg-white border border-[#e8e2d9] rounded-2xl text-center space-y-3 shadow-xs">
              <Sparkles className="w-10 h-10 text-[#c59b27] mx-auto" />
              <h3 className="text-lg font-bold font-serif text-[#1f1914]">Nenhum benefício cadastrado no momento</h3>
              <p className="text-xs text-[#6b625b] max-w-md mx-auto">
                À medida que novas empresas entrarem na rede Conexão Maçônica, as ofertas e descontos exclusivos aparecerão nesta página.
              </p>
            </div>
          )}
          <section aria-labelledby="beneficios-como-resgatar" className="rounded-2xl border border-[#e8e2d9] bg-white p-6 shadow-sm">
            <h2 id="beneficios-como-resgatar" className="font-serif text-xl font-bold text-[#1f1914]">
              Como resgatar um benefício
            </h2>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-[#6b625b]">
              <li>Escolha a oferta desejada diretamente no card da empresa acima.</li>
              <li>Entre na sua conta (o cadastro é gratuito) e clique em &ldquo;Resgatar benefício&rdquo;.</li>
              <li>Apresente o código recebido à empresa, que confirma o uso do benefício.</li>
            </ol>
          </section>
        </main>

        <DirectoryFooter />
      </div>
    </FavoritesProvider>
  );
}
