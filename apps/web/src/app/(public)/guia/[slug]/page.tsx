import { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { headers } from 'next/headers';
import { createServerSideClient } from '@/lib/supabase/server';
import { StructuredData } from '@/components/seo/StructuredData';
import { appUrl } from '@/lib/seo/app-url';
import { resolveEffectiveBusinessPlan } from '@/lib/business/effective-business-plan';
import type { Database } from '@/types/database.types';

type Props = {
  params: Promise<{ slug: string }>;
};

// Public directory fields only. Reviews remain hidden until the schema has an
// explicit moderation/publication state and a corresponding public policy.
// LGPD: apenas campos públicos de diretório — nunca cnpj/legal_name/email/owner_id.
type PublicBusinessDetail =
  Database['public']['Functions']['public_business_detail']['Returns'][number];

function publicString(value: unknown, maxLength = 512): string | null {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength
    ? value.trim()
    : null;
}

function firstPublicContact(value: unknown, type: string): string | null {
  if (!Array.isArray(value)) return null;
  const match = value.find(
    (item) => item && typeof item === 'object' && (item as Record<string, unknown>).type === type,
  ) as Record<string, unknown> | undefined;
  return publicString(match?.value);
}

function publicAddress(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const rows = value.filter((item): item is Record<string, unknown> =>
    Boolean(item && typeof item === 'object'),
  );
  const row = rows.find((item) => item.is_headquarters === true) ?? rows[0];
  if (!row) return null;
  return ['street', 'number', 'complement', 'neighborhood', 'city', 'state']
    .map((key) => publicString(row[key], 160))
    .filter(Boolean)
    .join(', ') || null;
}

const getCompanyBySlug = cache(async (slug: string) => {
  const supabase = await createServerSideClient();
  const headersList = await headers();
  const host = headersList.get('host') ?? '';
  if (!host || host.length > 253 || slug.length > 160) return null;

  const { data, error } = await supabase.rpc('public_business_detail', {
    p_host: host,
    p_business_slug: slug,
  });
  const row: PublicBusinessDetail | undefined = Array.isArray(data) ? data[0] : undefined;
  const name = publicString(row?.business_name, 200);
  const businessSlug = publicString(row?.business_slug, 160);
  if (error || !row || !name || !businessSlug) return null;

  return {
    name,
    slug: businessSlug,
    description: publicString(row.description, 5000),
    logo_url: publicString(row.logo_url, 512),
    plan_tier: publicString(row.effective_plan_code, 96),
    phone: firstPublicContact(row.contacts, 'phone'),
    category: publicString(row.primary_category_name, 160),
    address: publicAddress(row.locations),
  };
});

// 1. DYNAMIC METADATA GENERATOR (SEO)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);

  if (!company) {
    return {
      title: 'Empresa não encontrada',
      description: 'A empresa solicitada não foi encontrada no nosso Guia Comercial.'
    };
  }

  const title = `${company.name} - Guia Comercial`;
  const description = company.description 
    ? `${company.description.substring(0, 150)}...` 
    : `Encontre informações públicas e formas de contato de ${company.name} no Guia Comercial.`;
  const canonical = appUrl(`/guia/${company.slug}`);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonical,
      images: company.logo_url 
        ? [{ url: company.logo_url, width: 800, height: 800, alt: company.name }] 
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: company.logo_url ? [company.logo_url] : [],
    }
  };
}

// 2. MAIN COMPONENTE (SERVER COMPONENT)
export default async function CompanyDetailsPage({ params }: Props) {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);

  if (!company) {
    notFound();
  }

  // plan_tier is configuration only. Anonymous reads cannot currently prove
  // subscription + entitlements, so no premium presentation is authorized.
  const effectivePlan = resolveEffectiveBusinessPlan({
    configuredTier: 'bronze',
    subscriptionStatus: company.plan_tier ? 'active' : null,
    subscriptionTier: company.plan_tier,
  });
  const isOuro = effectivePlan.effectiveTier === 'ouro';
  const isPrata = effectivePlan.effectiveTier === 'prata';

  // Sanitizing links and CTAs
  const cleanPhone = company.phone ? company.phone.replace(/\D/g, '') : '';
  const waMessage = encodeURIComponent(`Olá, vi o anúncio de vocês no Guia Comercial da Conexão Maçônica e gostaria de mais informações!`);
  
  const waUrl = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${waMessage}` : null;
  const telUrl = cleanPhone ? `tel:+55${cleanPhone}` : null;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: appUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Guia', item: appUrl('/guia') },
      { '@type': 'ListItem', position: 3, name: company.name },
    ],
  };

  const businessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: company.name,
    description: company.description || undefined,
    image: company.logo_url || undefined,
    telephone: company.phone || undefined,
    address: company.address || undefined,
    url: appUrl(`/guia/${company.slug}`),
  };

  return (
    <>
      <StructuredData schema={breadcrumbSchema} />
      <StructuredData schema={businessSchema} />
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
        paddingBottom: '8rem',
      }}
    >
      {/* Upper Navigation bar */}
      <div
        style={{
          maxWidth: '56rem',
          margin: '0 auto',
          padding: 'var(--space-4) var(--space-6)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Link
          href="/guia"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontWeight: 'var(--font-weight-medium)',
            transition: 'color 0.2s ease',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Voltar para o guia
        </Link>
        {effectivePlan.effectiveTier && <span
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 'bold',
            padding: 'var(--space-1) var(--space-3)',
            borderRadius: 'var(--radius-full)',
            backgroundColor: isOuro
              ? 'var(--highlight)'
              : isPrata
              ? 'var(--bg-tertiary)'
              : 'var(--bg-tertiary)',
            color: isOuro
              ? 'var(--color-gray-900)'
              : isPrata
              ? 'var(--text-primary)'
              : 'var(--text-secondary)',
            border: isOuro
              ? '1px solid var(--highlight)'
              : isPrata
              ? '1px solid var(--border-default)'
              : '1px solid var(--border-default)',
          }}
        >
          PLANO {effectivePlan.effectiveTier.toUpperCase()}
        </span>}
      </div>

      {/* Main Cover Section (Ouro and Prata only) */}
      {(isOuro || isPrata) && (
        <div
          style={{
            maxWidth: '56rem',
            margin: '0 auto',
            padding: '0 var(--space-6)',
          }}
        >
          <div
            style={{
              height: '12rem',
              width: '100%',
              borderRadius: 'var(--radius-xl)',
              background: isOuro
                ? 'linear-gradient(135deg, var(--color-primary-700), var(--color-primary-900))'
                : 'linear-gradient(135deg, var(--color-gray-300), var(--color-gray-200))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)',
              border: isOuro ? '1px solid var(--highlight)' : '1px solid var(--border-default)',
            }}
          >
            <span style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 'var(--text-sm)', fontWeight: 'bold', letterSpacing: '0.05em' }}>
              {isOuro ? '★ Destaque Ouro' : 'Destaque Prata'}
            </span>
          </div>
        </div>
      )}

      {/* Business Meta Section (Avatar & Header) */}
      <div
        style={{
          maxWidth: '56rem',
          margin: '0 auto',
          padding: 'var(--space-4) var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)',
            flexWrap: 'wrap',
          }}
        >
          {/* Logo container */}
          <div
            style={{
              width: '5.5rem',
              height: '5.5rem',
              borderRadius: 'var(--radius-xl)',
              backgroundColor: 'var(--bg-secondary)',
              border: '2px solid var(--border-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--text-3xl)',
              fontWeight: 'bold',
              color: 'var(--accent)',
              overflow: 'hidden',
            }}
          >
            {company.logo_url ? (
              <Image
                src={company.logo_url}
                alt={`Logo de ${company.name}`}
                width={88}
                height={88}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              company.name.charAt(0)
            )}
          </div>

          <div>
            <h1
              style={{
                fontSize: 'var(--text-2xl)',
                fontWeight: 'var(--font-weight-bold)',
                letterSpacing: 'var(--tracking-tight)',
              }}
            >
              {company.name}
            </h1>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-secondary)',
                marginTop: 'var(--space-1)',
              }}
            >
              <span
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  padding: 'var(--space-1) var(--space-2)',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 'var(--font-weight-medium)',
                }}
              >
                {company.category}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div
        style={{
          maxWidth: '56rem',
          margin: '0 auto',
          padding: '0 var(--space-6)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(18rem, 1fr))',
          gap: 'var(--space-6)',
          marginTop: 'var(--space-4)',
        }}
      >
        {/* Left main content block */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* About Card */}
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-6)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'bold', marginBottom: 'var(--space-3)' }}>
              Sobre a Empresa
            </h3>
            <p
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--text-secondary)',
                lineHeight: 'var(--leading-relaxed)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {company.description || 'Nenhuma descrição detalhada cadastrada para esta empresa.'}
            </p>
          </div>

        </div>

        {/* Right sidebar block (Premium/Prata and basic info fallback) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Contact Details Card */}
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-6)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
            }}
          >
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'bold' }}>
              Informações e Contato
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              
              {/* Address */}
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <svg style={{ color: 'var(--accent)', marginTop: '2px', flexShrink: 0 }} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <div style={{ fontSize: 'var(--text-xs)' }}>
                  <strong>Endereço</strong>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {company.address || 'Sem endereço físico informado'}
                  </p>
                </div>
              </div>

              {/* Phone (Only Prata/Ouro get fully styled click to call links) */}
              {company.phone && (isOuro || isPrata) && (
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <svg style={{ color: 'var(--accent)', marginTop: '2px', flexShrink: 0 }} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  <div style={{ fontSize: 'var(--text-xs)' }}>
                    <strong>Telefone</strong>
                    <p style={{ marginTop: '2px' }}>
                      <a href={telUrl || '#'} style={{ color: 'var(--text-link)', textDecoration: 'none' }}>
                        {company.phone}
                      </a>
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* Premium quick action desktop buttons */}
            {(isOuro || isPrata) && waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-3)',
                  backgroundColor: 'var(--color-success-500)',
                  color: 'white',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'bold',
                  boxShadow: 'var(--shadow-sm)',
                  textDecoration: 'none',
                  marginTop: 'var(--space-2)',
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                Falar no WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 3. MOBILE FLOATING CTAs (Ouro tier gets bottom fixed navigation panel) */}
      {isOuro && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border-default)',
            padding: 'var(--space-4)',
            display: 'flex',
            justifyContent: 'space-around',
            gap: 'var(--space-2)',
            zIndex: 100,
            boxShadow: 'var(--shadow-lg)',
          }}
          className="mobile-only-bar"
        >
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-success-500)',
                color: 'white',
                fontSize: 'var(--text-xs)',
                fontWeight: 'bold',
                textAlign: 'center',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
              }}
            >
              WhatsApp
            </a>
          )}

          {telUrl && (
            <a
              href={telUrl}
              style={{
                flex: 1,
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--accent)',
                color: 'var(--text-inverse)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'bold',
                textAlign: 'center',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
              }}
            >
              Ligar
            </a>
          )}
        </div>
      )}

      {/* Media query styling in JSX */}
      <style>{`
        @media (min-width: 768px) {
          .mobile-only-bar { display: none !important; }
        }
      `}</style>
    </div>
    </>
  );
}
