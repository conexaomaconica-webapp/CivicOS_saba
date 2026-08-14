'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Business {
  id: string;
  name: string;
  category: string;
  phone: string | null;
  address: string | null;
}

interface Banner {
  id: string;
  image_url: string;
  impressions: number | null;
  clicks: number | null;
  is_active: boolean | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<import('@supabase/supabase-js').User | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [stats, setStats] = useState({ clicks: 0, impressions: 0 });

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUser(user);

    try {
      // Load businesses
      const { data: dbBusinesses } = await supabase
        .from('businesses')
        .select('id, name, category, phone, address')
        .eq('owner_id', user.id);

      const loadedBusinesses = (dbBusinesses || []) as unknown as Business[];
      setBusinesses(loadedBusinesses);

      if (loadedBusinesses.length > 0) {
        // Load banners for these businesses
        const businessIds = loadedBusinesses.map(b => b.id);
        const { data: dbBanners } = await supabase
          .from('business_banners')
          .select('*')
          .in('business_id', businessIds);

        const loadedBanners = dbBanners || [];
        setBanners(loadedBanners);

        // Calculate aggregated metrics
        let totalClicks = 0;
        let totalImpressions = 0;
        loadedBanners.forEach(b => {
          totalClicks += b.clicks || 0;
          totalImpressions += b.impressions || 0;
        });

        setStats({
          clicks: totalClicks,
          impressions: totalImpressions,
        });
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [supabase, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: '3px solid var(--border-default)',
              borderTopColor: 'var(--accent)',
              borderRadius: 'var(--radius-full)',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 1rem',
            }}
          />
          <p>Carregando painel...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
        padding: 'var(--space-8) var(--space-6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
      }}
    >
      {/* Header Dashboard */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 'var(--text-3xl)',
              fontWeight: 'var(--font-weight-bold)',
              letterSpacing: 'var(--tracking-tight)',
            }}
          >
            Painel do Anunciante
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
            Olá, {user?.email}! Gerencie seus negócios, campanhas de banners e performance.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          {(user?.user_metadata?.role === 'socio_admin' || user?.user_metadata?.role === 'master') && (
            <Link
              href="/admin/settings"
              style={{
                padding: 'var(--space-2) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--accent)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--text-inverse)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              Configurar Portal
            </Link>
          )}
          <Link
            href="/"
            style={{
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-secondary)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            Página Inicial
          </Link>
          <button
            onClick={() => { void handleLogout(); }}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: 'oklch(0.60 0.22 25 / 0.1)',
              color: 'var(--color-error-500)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-weight-semibold)',
              cursor: 'pointer',
            }}
          >
            Sair
          </button>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
          gap: 'var(--space-6)',
        }}
      >
        {/* Impressions */}
        <div
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-5)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-1)',
          }}
        >
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 'var(--font-weight-semibold)' }}>
            Visualizações (Banners)
          </span>
          <span style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-weight-bold)' }}>
            {stats.impressions.toLocaleString()}
          </span>
        </div>

        {/* Clicks */}
        <div
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-5)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-1)',
          }}
        >
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 'var(--font-weight-semibold)' }}>
            Cliques em Anúncios
          </span>
          <span style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--accent)' }}>
            {stats.clicks.toLocaleString()}
          </span>
        </div>

        {/* Rating */}
        <div
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-5)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-1)',
          }}
        >
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 'var(--font-weight-semibold)' }}>
            Nota Média do Guia
          </span>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Indisponível até a integração com o agregado moderado
          </span>
        </div>
      </div>

      {/* Main Section */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '3fr 1fr',
          gap: 'var(--space-6)',
          alignItems: 'start',
        }}
      >
        {/* Business Listings */}
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
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)' }}>
              Seus Negócios Cadastrados
            </h2>
            <Link
              href="/dashboard/listings/new"
              style={{
                padding: 'var(--space-2) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--accent)',
                color: 'var(--text-inverse)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-weight-bold)',
                textDecoration: 'none',
              }}
            >
              + Anunciar Empresa
            </Link>
          </div>

          {businesses.length === 0 ? (
            <div
              style={{
                padding: 'var(--space-12) 0',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--space-3)',
              }}
            >
              <p>Nenhuma empresa ou guia cadastrada neste painel.</p>
              <Link
                href="/dashboard/listings/new"
                style={{
                  color: 'var(--text-link)',
                  fontWeight: 'var(--font-weight-semibold)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                Cadastre o seu primeiro negócio agora!
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {businesses.map((business) => (
                <div
                  key={business.id}
                  style={{
                    padding: 'var(--space-4)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-tertiary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 'var(--space-4)',
                  }}
                >
                  <div>
                    <h4 style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--text-primary)' }}>
                      {business.name}
                    </h4>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {business.category} • {business.address || 'Sem endereço físico'}
                    </p>
                  </div>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    Plano comercial indisponível
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Banners status */}
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
          <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-weight-bold)' }}>
            Status de Banners
          </h3>

          {banners.length === 0 ? (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textAlign: 'center' }}>
              Sem campanhas de banner ativas. Banners requerem assinatura Ouro.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {banners.map((banner) => (
                <div
                  key={banner.id}
                  style={{
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    overflow: 'hidden',
                    backgroundColor: 'var(--bg-tertiary)',
                  }}
                >
                  <img
                    src={banner.image_url}
                    alt="Banner Anúncio"
                    style={{
                      width: '100%',
                      height: '6rem',
                      objectFit: 'cover',
                    }}
                  />
                  <div style={{ padding: 'var(--space-2)', fontSize: 'var(--text-xs)' }}>
                    <div>
                      <strong>Cliques:</strong> {banner.clicks} • <strong>Imp:</strong> {banner.impressions}
                    </div>
                    <div style={{ marginTop: 'var(--space-1)', color: 'var(--text-secondary)' }}>
                      Status: {banner.is_active ? '✓ Ativo' : '⏸ Pausado'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
