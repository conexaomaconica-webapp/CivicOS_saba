import { NextResponse } from 'next/server';
import { createServerSideClient } from '@/lib/supabase/server';
import { resolveStrictDomainTenantId, getRequestHost } from '@/lib/tenant/tenant-policy';
import { resolveSearchQuery } from '@/lib/directory/normalize-search';
import { findBusinessesByMasonicMember } from '@/lib/directory/masonic-member-search';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQ = searchParams.get('q')?.trim() || '';
    const city = searchParams.get('city')?.trim() || null;
    const cat = searchParams.get('cat')?.trim() || null;
    const limit = Math.min(12, Math.max(1, Number(searchParams.get('limit') || 6) || 6));

    const supabase = await createServerSideClient();
    const host = await getRequestHost();
    const tenantId = await resolveStrictDomainTenantId(supabase, host).catch(() => null);

    const resolvedQ = resolveSearchQuery(rawQ);

    // 1. Executa busca padrão via RPC
    let rpcItems: any[] = [];
    if (resolvedQ || city || cat) {
      const { data: rpcData } = await (supabase as any).rpc('public_businesses_search', {
        p_host: host,
        p_query: resolvedQ || null,
        p_city: city,
        p_category_slug: cat,
        p_page: 1,
        p_page_size: limit,
      });

      if (rpcData?.items && Array.isArray(rpcData.items)) {
        rpcItems = rpcData.items;
      }
    }

    // 2. Executa busca especializada por Irmão, Cunhada, Sobrinho(a) ou Maçom de Referência
    let memberItems: any[] = [];
    if (rawQ.length >= 2) {
      memberItems = await findBusinessesByMasonicMember({
        query: rawQ,
        tenantId,
        city,
        categorySlug: cat,
        limit,
      });
    }

    // 3. Mescla e enriquece os resultados
    const seenIds = new Set<string>();
    const merged: any[] = [];

    // Primeiro, as empresas encontradas diretamente pelo nome do membro/vínculo (se a pessoa buscou especificamente um nome)
    for (const m of memberItems) {
      if (!seenIds.has(m.id)) {
        seenIds.add(m.id);
        merged.push({
          id: m.id,
          slug: m.slug,
          name: m.name,
          logo_url: m.logo_url,
          category_name: m.category_name,
          city: m.city,
          state: m.state,
          is_verified: m.is_verified,
          is_founder: m.is_founder,
          is_pedra_fundamental: m.is_pedra_fundamental,
          effective_plan_code: m.effective_plan_code,
          responsible_name: m.responsible_name,
          responsible_label: m.responsible_label,
          reference_mason_name: m.reference_mason_name,
        });
      }
    }

    // Em seguida, adiciona as empresas encontradas pela RPC textual
    for (const r of rpcItems) {
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id);
        merged.push({
          id: r.id,
          slug: r.slug,
          name: r.name,
          logo_url: r.logo_url,
          category_name: r.category_name,
          city: r.city,
          state: r.state,
          is_verified: r.is_verified,
          is_founder: r.is_founder,
          is_pedra_fundamental: r.is_pedra_fundamental,
          effective_plan_code: r.effective_plan_code,
          responsible_name: r.responsible_name || null,
          responsible_label: r.responsible_label || null,
          reference_mason_name: r.reference_mason_name || null,
        });
      } else {
        // Enriquece o item existente se a RPC tiver mais dados
        const existing = merged.find((x) => x.id === r.id);
        if (existing && !existing.logo_url && r.logo_url) {
          existing.logo_url = r.logo_url;
        }
      }
    }

    return NextResponse.json({
      items: merged.slice(0, limit),
      total: merged.length,
    });
  } catch (error) {
    console.error('Erro no endpoint de live search:', error);
    return NextResponse.json({ items: [], total: 0 }, { status: 500 });
  }
}
