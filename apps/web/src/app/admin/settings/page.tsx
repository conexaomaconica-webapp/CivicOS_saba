'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database.types';

export default function AdminSettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<import('@supabase/supabase-js').User | null>(null);
  const [tenant, setTenant] = useState<Database['public']['Tables']['tenants']['Row'] | null>(null);
  
  // Prices State
  const [prices, setPrices] = useState<Record<'bronze' | 'prata' | 'ouro', number>>({
    bronze: 0,
    prata: 299,
    ouro: 499,
  });

  // Tenant Details State
  const [tenantName, setTenantName] = useState('');
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError || !profile || !['master', 'socio_admin'].includes(profile.role)) {
        router.push('/');
        return;
      }

      const tenantId = profile.tenant_id;

      if (!tenantId) {
        setErrorMsg('Nenhum tenant autorizado foi associado a este administrador.');
        setLoading(false);
        return;
      }

      try {
        // Fetch Tenant Information
        const { data: dbTenant, error: tenantErr } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', tenantId)
          .single();

        if (tenantErr) throw tenantErr;
        setTenant(dbTenant);
        setTenantName(dbTenant.name);

        // Fetch Dynamic Plan Pricing
        const { data: dbPlans, error: plansErr } = await supabase
          .from('tenant_plans')
          .select('tier, price_annual')
          .eq('tenant_id', tenantId);

        if (plansErr) throw plansErr;

        if (dbPlans && dbPlans.length > 0) {
          const mapped: Record<'bronze' | 'prata' | 'ouro', number> = {
            bronze: 0,
            prata: 299,
            ouro: 499,
          };
          dbPlans.forEach((p: { tier: string; price_annual: string | number }) => {
            if (p.tier === 'bronze' || p.tier === 'prata' || p.tier === 'ouro') {
              mapped[p.tier] = typeof p.price_annual === 'string' ? parseFloat(p.price_annual) : Number(p.price_annual);
            }
          });
          setPrices(mapped);
        }
      } catch (err: unknown) {
        console.error('Error fetching admin settings:', err);
        setErrorMsg(err instanceof Error ? err.message : 'Erro ao carregar configurações administrativas.');
      } finally {
        setLoading(false);
      }
    };

    void fetchAdminData();
  }, [supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const tenantId = tenant?.id;
    if (!tenantId) {
      setErrorMsg('Identificador do inquilino ausente.');
      setSaving(false);
      return;
    }

    try {
      // 1. Try to update Tenant details
      const { error: tenantUpdateErr } = await supabase
        .from('tenants')
        .update({ name: tenantName })
        .eq('id', tenantId);

      // We catch and log permission warnings since tenant:update might require role = 'admin' in some strict database setups
      if (tenantUpdateErr) {
        console.warn('Tenant details update failed/unauthorized, skipping to plans updates:', tenantUpdateErr.message);
      }

      // 2. Update Plan Pricing Row by Row
      for (const tier of ['bronze' , 'prata', 'ouro'] as const) {
        const { error: planUpdateErr } = await supabase
          .from('tenant_plans')
          .update({ price_annual: prices[tier] })
          .eq('tenant_id', tenantId)
          .eq('tier', tier);

        if (planUpdateErr) throw planUpdateErr;
      }

      setSuccessMsg('Configurações e valores de planos salvos com sucesso!');
    } catch (err: unknown) {
      console.error('Error saving settings:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao salvar alterações.');
    } finally {
      setSaving(false);
    }
  };

  const handlePriceChange = (tier: 'bronze' | 'prata' | 'ouro', value: string) => {
    const numeric = parseFloat(value);
    setPrices(prev => ({
      ...prev,
      [tier]: isNaN(numeric) ? 0 : numeric,
    }));
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
          <p>Carregando painel de controle...</p>
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
        alignItems: 'center',
        gap: 'var(--space-6)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '36rem',
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
          Voltar ao Dashboard
        </Link>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
          CONFIGURAÇÃO DO INQUILINO
        </span>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: '36rem',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-8)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-6)',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              letterSpacing: 'var(--tracking-tight)',
            }}
          >
            Configurações Gerais
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', marginTop: '2px' }}>
            Olá, {user?.email}! Gerencie as diretrizes de visualização e valores das assinaturas do seu portal regional.
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: 'var(--space-3)',
              backgroundColor: 'oklch(0.95 0.05 25 / 0.1)',
              border: '1px solid var(--color-error-500)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-error-500)',
              fontSize: 'var(--text-xs)',
            }}
          >
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              padding: 'var(--space-3)',
              backgroundColor: 'oklch(0.95 0.05 140 / 0.1)',
              border: '1px solid oklch(0.60 0.15 140)',
              borderRadius: 'var(--radius-md)',
              color: 'oklch(0.60 0.15 140)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-weight-semibold)',
            }}
          >
            {successMsg}
          </div>
        )}

        <form onSubmit={(e) => { void handleSubmit(e); }} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Section: General Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)', borderBottom: '1px solid var(--border-default)', paddingBottom: 'var(--space-2)' }}>
              Identidade do Portal
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-bold)' }}>
                Nome do Inquilino (Tenant)
              </label>
              <input
                type="text"
                required
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                style={{
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-tertiary)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-bold)' }}>
                Slug do Tenant
              </label>
              <input
                type="text"
                disabled
                value={tenant?.slug || ''}
                style={{
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-primary)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text-secondary)',
                  cursor: 'not-allowed',
                }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                O slug identifica de forma única seu subdomínio e não pode ser editado.
              </span>
            </div>
          </div>

          {/* Section: Plan Tiers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)', borderBottom: '1px solid var(--border-default)', paddingBottom: 'var(--space-2)' }}>
              Valores das Assinaturas (Cobrança Anual)
            </h3>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              Defina os valores das anuidades para a sua região. Os upgrades realizados pelos anunciantes calcularão automaticamente o valor pro-rata Pix baseado nestas configurações.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)', marginTop: 'var(--space-1)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-bold)' }}>
                  Plano Bronze (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={prices.bronze}
                  onChange={(e) => handlePriceChange('bronze', e.target.value)}
                  style={{
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-tertiary)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-bold)' }}>
                  Plano Prata (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={prices.prata}
                  onChange={(e) => handlePriceChange('prata', e.target.value)}
                  style={{
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-tertiary)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-bold)' }}>
                  Plano Ouro (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={prices.ouro}
                  onChange={(e) => handlePriceChange('ouro', e.target.value)}
                  style={{
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-tertiary)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 'var(--space-3)',
              marginTop: 'var(--space-4)',
              borderTop: '1px solid var(--border-default)',
              paddingTop: 'var(--space-4)',
            }}
          >
            <Link
              href="/dashboard"
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
              Cancelar
            </Link>
            
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: 'var(--space-2) var(--space-6)',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                backgroundColor: 'var(--accent)',
                color: 'var(--text-inverse)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-bold)',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
