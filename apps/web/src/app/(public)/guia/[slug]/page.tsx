import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerSideClient } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ slug: string }>;
};

// Database helper fetching details, ratings, and count
async function getCompanyBySlug(slug: string) {
  const supabase = await createServerSideClient();
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) return null;

  // Query ratings dynamically
  const { data: reviews } = await supabase
    .from('business_reviews')
    .select('rating')
    .eq('business_id', data.id);
  
  const review_count = reviews?.length || 0;
  const average_rating = (reviews && review_count > 0)
    ? (reviews.reduce((acc: number, curr: { rating: number }) => acc + curr.rating, 0) / review_count).toFixed(1)
    : '5.0';

  return {
    ...data,
    review_count,
    average_rating,
  };
}

// 1. DYNAMIC METADATA GENERATOR (SEO)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);

  if (!company) {
    return {
      title: 'Empresa não encontrada | CivicOS',
      description: 'A empresa solicitada não foi encontrada no nosso Guia Comercial.'
    };
  }

  const title = `${company.name} - Guia Comercial | CivicOS`;
  const description = company.description 
    ? `${company.description.substring(0, 150)}...` 
    : `Encontre contatos, endereço e avaliações de ${company.name} no nosso portal de utilidade pública.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://civicos.com.br/guia/${company.slug}`,
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

  const isOuro = company.plan_tier === 'ouro';
  const isPrata = company.plan_tier === 'prata';

  // Sanitizing links and CTAs
  const cleanPhone = company.phone ? company.phone.replace(/\D/g, '') : '';
  const waMessage = encodeURIComponent(`Olá, vi seu anúncio no Guia Comercial do CivicOS e gostaria de mais informações!`);
  
  const waUrl = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${waMessage}` : null;
  const telUrl = cleanPhone ? `tel:+55${cleanPhone}` : null;
  const instagramUrl = company.email // fallback using website or simple links if none exists
    ? `https://instagram.com/${company.name.toLowerCase().replace(/\s+/g, '')}` 
    : null;

  // Mock photo gallery for Ouro businesses to simulate visually stunning galleries
  const images = isOuro 
    ? [
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80'
      ]
    : [];

  return (
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
          href="/dashboard"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontWeight: 'var(--font-weight-medium)',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Voltar para o busca
        </Link>
        <span
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 'bold',
            padding: 'var(--space-1) var(--space-3)',
            borderRadius: 'var(--radius-full)',
            backgroundColor: isOuro 
              ? 'oklch(0.95 0.05 85 / 0.1)' 
              : isPrata 
              ? 'oklch(0.95 0.01 200 / 0.1)' 
              : 'var(--bg-tertiary)',
            color: isOuro 
              ? 'oklch(0.70 0.15 85)' 
              : isPrata 
              ? 'oklch(0.60 0.01 200)' 
              : 'var(--text-secondary)',
            border: isOuro 
              ? '1px solid oklch(0.70 0.15 85 / 0.3)' 
              : isPrata 
              ? '1px solid oklch(0.60 0.01 200 / 0.3)' 
              : '1px solid var(--border-default)',
          }}
        >
          PLANO {company.plan_tier.toUpperCase()}
        </span>
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
                ? 'linear-gradient(135deg, oklch(0.40 0.15 85), oklch(0.15 0.05 85))' 
                : 'linear-gradient(135deg, oklch(0.40 0.01 200), oklch(0.15 0.01 200))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-inner)',
              border: '1px solid var(--border-default)',
            }}
          >
            <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 'var(--text-sm)', fontWeight: 'bold' }}>
              {isOuro ? 'Destaque Ouro' : 'Destaque Prata'}
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
              <img
                src={company.logo_url}
                alt={company.name}
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
                fontWeight: 'var(--font-weight-extrabold)',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'oklch(0.70 0.15 85)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                {company.average_rating} ({company.review_count} avaliações)
              </div>
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

          {/* Photo Gallery (Ouro only) */}
          {isOuro && images.length > 0 && (
            <div
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-6)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'bold', marginBottom: 'var(--space-4)' }}>
                Galeria de Fotos
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 'var(--space-3)',
                }}
              >
                {images.map((url, idx) => (
                  <div
                    key={idx}
                    style={{
                      aspectRatio: '16/9',
                      borderRadius: 'var(--radius-lg)',
                      overflow: 'hidden',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    <img
                      src={url}
                      alt={`Galeria ${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews List */}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'bold' }}>Avaliações</h3>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                {company.review_count} comentários
              </span>
            </div>
            <div
              style={{
                padding: 'var(--space-6)',
                border: '1px dashed var(--border-strong)',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: 'var(--text-sm)',
              }}
            >
              Seja o primeiro a avaliar {company.name}!
            </div>
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

              {/* Instagram (Ouro and Prata only) */}
              {instagramUrl && (isOuro || isPrata) && (
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <svg style={{ color: 'var(--accent)', marginTop: '2px', flexShrink: 0 }} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                  <div style={{ fontSize: 'var(--text-xs)' }}>
                    <strong>Instagram</strong>
                    <p style={{ marginTop: '2px' }}>
                      <a href={instagramUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-link)' }}>
                        Siga no Instagram
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
                  backgroundColor: 'oklch(0.60 0.18 145)',
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
                Conversar no WhatsApp
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
                backgroundColor: 'oklch(0.60 0.18 145)',
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

          {instagramUrl && (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
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
              Instagram
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
  );
}
