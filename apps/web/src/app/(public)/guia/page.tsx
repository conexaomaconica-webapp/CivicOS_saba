import React from 'react';
import Link from 'next/link';
import { headers } from 'next/headers';
import { createServerSideClient } from '@/lib/supabase/server';

type Props = {
  searchParams: Promise<{ q?: string; cat?: string }>;
};

export default async function GuiaPage({ searchParams }: Props) {
  const { q = '', cat = 'Todas' } = await searchParams;

  // 1. Resolve current Tenant by subdomain
  const headersList = await headers();
  const host = headersList.get('host') ?? '';
  let subdomain: string | null = null;
  if (!host.startsWith('localhost') && !/^\d+\.\d+\.\d+\.\d+/.test(host)) {
    const parts = host.split('.');
    if (parts.length >= 3) {
      subdomain = parts[0] || null;
    }
  }

  // Fallback to florianopolis for local developer testing
  const tenantSlug = subdomain || 'florianopolis';

  const supabase = await createServerSideClient();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('slug', tenantSlug)
    .maybeSingle();

  if (!tenant) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#09090b', color: '#fafafa', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Portal não encontrado</h1>
          <p style={{ color: '#a1a1aa', marginTop: '1rem' }}>Inquilino "{tenantSlug}" inválido ou desativado.</p>
          <Link href="/" style={{ color: '#6366f1', textDecoration: 'none', display: 'inline-block', marginTop: '1.5rem' }}>Voltar ao Início</Link>
        </div>
      </main>
    );
  }

  // 2. Fetch business listings with filters
  let queryBuilder = supabase
    .from('businesses')
    .select('*')
    .eq('tenant_id', tenant.id);

  if (q.trim()) {
    queryBuilder = queryBuilder.or(`name.ilike.%${q.trim()}%,category.ilike.%${q.trim()}%,description.ilike.%${q.trim()}%`);
  }

  if (cat !== 'Todas') {
    queryBuilder = queryBuilder.eq('category', cat);
  }

  const { data: dbBusinesses } = await queryBuilder;
  const rawList = dbBusinesses || [];

  // 3. Sort lists by tiers: Ouro -> Prata -> Bronze
  const sortedBusinesses = [...rawList].sort((a: any, b: any) => {
    const tierOrder: Record<string, number> = { ouro: 1, prata: 2, bronze: 3 };
    const orderA = tierOrder[a.plan_tier] ?? 4;
    const orderB = tierOrder[b.plan_tier] ?? 4;
    return orderA - orderB;
  });

  const categories = ['Todas', 'Restaurantes', 'Serviços', 'Saúde', 'Mercados', 'Outros'];

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary, #09090b)',
        color: 'var(--text-primary, #fafafa)',
        fontFamily: 'var(--font-sans, "Inter", sans-serif)',
        padding: 'var(--space-8, 2rem) var(--space-6, 1.5rem)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-8, 2rem)',
      }}
    >
      {/* Search Page Header */}
      <div
        style={{
          width: '100%',
          maxWidth: '64rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
          borderBottom: '1px solid var(--border-default, #27272a)',
          paddingBottom: 'var(--space-6, 1.5rem)',
        }}
      >
        <div>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--accent, #6366f1)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Portal de Guia Comercial
          </span>
          <h1 style={{ fontSize: 'var(--text-3xl, 1.875rem)', fontWeight: 'var(--font-weight-bold, 700)', marginTop: '2px' }}>
            {tenant.name}
          </h1>
        </div>

        <Link
          href="/"
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--text-secondary, #a1a1aa)',
            textDecoration: 'none',
            border: '1px solid var(--border-default, #27272a)',
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-secondary)',
          }}
        >
          Voltar ao Início
        </Link>
      </div>

      {/* Integrated Search Form & Category Pills */}
      <div style={{ width: '100%', maxWidth: '64rem', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <form
          action="/guia"
          method="GET"
          style={{
            display: 'flex',
            gap: 'var(--space-3)',
            width: '100%',
          }}
        >
          <input type="hidden" name="cat" value={cat} />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="O que você está procurando hoje? Ex: Café, Pizza, Advogado..."
            style={{
              flex: 1,
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default, #27272a)',
              backgroundColor: 'var(--bg-secondary, #18181b)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              padding: 'var(--space-3) var(--space-6)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--accent, #6366f1)',
              color: 'var(--text-inverse)',
              fontWeight: 'bold',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Pesquisar
          </button>
        </form>

        {/* Category Filter Pills */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-2)',
            flexWrap: 'wrap',
            paddingBottom: '2px',
          }}
        >
          {categories.map((c) => {
            const isSelected = cat === c;
            // Build URL manually
            const searchParamsString = `cat=${encodeURIComponent(c)}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
            
            return (
              <Link
                key={c}
                href={`/guia?${searchParamsString}`}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-full, 9999px)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: '500',
                  textDecoration: 'none',
                  border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-default)',
                  backgroundColor: isSelected ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                  color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                  transition: 'all 0.2s ease',
                }}
              >
                {c}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Grid of Results */}
      <div
        style={{
          width: '100%',
          maxWidth: '64rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(19rem, 1fr))',
          gap: 'var(--space-6, 1.5rem)',
          marginTop: 'var(--space-4)',
        }}
      >
        {sortedBusinesses.length > 0 ? (
          sortedBusinesses.map((b: any) => {
            const isOuro = b.plan_tier === 'ouro';
            const isPrata = b.plan_tier === 'prata';

            return (
              <div
                key={b.id}
                style={{
                  backgroundColor: 'var(--bg-secondary, #18181b)',
                  borderRadius: 'var(--radius-xl, 0.75rem)',
                  border: isOuro 
                    ? '2px solid var(--accent, #6366f1)' 
                    : '1px solid var(--border-default, #27272a)',
                  boxShadow: isOuro 
                    ? '0 10px 15px -3px rgba(99, 102, 241, 0.15)' 
                    : 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  position: 'relative',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                {/* Visual Accent for Tiers */}
                {isOuro && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '0.75rem',
                      right: '0.75rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--accent)',
                      color: 'var(--text-inverse)',
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      zIndex: 2,
                    }}
                  >
                    ★ DESTAQUE OURO
                  </div>
                )}
                {isPrata && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '0.75rem',
                      right: '0.75rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)',
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      zIndex: 2,
                    }}
                  >
                    PLANO PRATA
                  </div>
                )}

                {/* Simulated Cap/Image Area */}
                <div
                  style={{
                    height: '6rem',
                    background: isOuro 
                      ? 'linear-gradient(135deg, var(--accent) 0%, var(--color-primary-700) 100%)' 
                      : 'var(--bg-tertiary, #09090b)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontWeight: 'bold',
                    fontSize: '1.25rem',
                    padding: 'var(--space-4)',
                    opacity: 0.9,
                  }}
                >
                  {isOuro ? b.name : ''}
                </div>

                {/* Listing Details */}
                <div
                  style={{
                    padding: 'var(--space-5, 1.25rem)',
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    gap: 'var(--space-3)',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      {b.category}
                    </span>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold', marginTop: '2px', color: 'var(--text-primary)' }}>
                      {b.name}
                    </h3>
                  </div>

                  <p
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-secondary)',
                      lineHeight: 'var(--leading-relaxed)',
                      flex: 1,
                      minHeight: '2.5rem',
                    }}
                  >
                    {b.description 
                      ? (b.description.length > 90 ? `${b.description.substring(0, 90)}...` : b.description)
                      : 'Sem descrição disponível para esta empresa comercial.'}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)' }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {b.address ? b.address.split(',')[0] : 'Endereço não disponível'}
                    </span>
                  </div>

                  {/* Actions CTAs */}
                  <Link
                    href={`/guia/${b.slug}`}
                    style={{
                      width: '100%',
                      padding: 'var(--space-2-5, 0.625rem)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isOuro ? 'var(--accent)' : 'var(--bg-tertiary)',
                      color: isOuro ? 'var(--text-inverse)' : 'var(--text-primary)',
                      border: isOuro ? 'none' : '1px solid var(--border-default)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      textDecoration: 'none',
                      boxShadow: 'var(--shadow-xs)',
                      marginTop: 'var(--space-2)',
                    }}
                  >
                    {isOuro ? 'Ver Anúncio Premium' : 'Ver Detalhes'}
                  </Link>
                </div>
              </div>
            );
          })
        ) : (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: 'var(--space-12, 3rem) var(--space-4)',
              textAlign: 'center',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px dashed var(--border-default)',
              borderRadius: 'var(--radius-xl)',
            }}
          >
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold' }}>Nenhuma empresa localizada</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: '0.5rem' }}>
              Não encontramos resultados com o termo "{q}" {cat !== 'Todas' ? `na categoria "${cat}"` : ''}.
            </p>
            <Link
              href="/guia"
              style={{
                display: 'inline-block',
                marginTop: '1rem',
                fontSize: 'var(--text-xs)',
                color: 'var(--accent)',
                fontWeight: 'bold',
                textDecoration: 'none',
              }}
            >
              Limpar Filtros de Busca
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
