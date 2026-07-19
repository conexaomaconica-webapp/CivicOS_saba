'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessName: string;
  businessId: string;
  onSuccess: () => void;
}

export default function UpgradeModal({
  isOpen,
  onClose,
  businessName,
  businessId,
  onSuccess,
}: UpgradeModalProps) {
  const supabase = createClient();

  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'success'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selected Upgrade Target Tier
  const [selectedTier, setSelectedTier] = useState<'prata' | 'ouro'>('ouro');

  // Billing Math (Pro-rata unificado 31/12)
  const [daysRemaining, setDaysRemaining] = useState(365);
  const [calculatedPrice, setCalculatedPrice] = useState(499.00);
  const [plansConfig, setPlansConfig] = useState<Record<'bronze' | 'prata' | 'ouro', number>>({
    bronze: 0,
    prata: 299,
    ouro: 499,
  });

  // Fetch prices from DB
  useEffect(() => {
    const fetchPlans = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let tenantId = user.user_metadata?.tenant_id;
      if (!tenantId) {
        const { data: tenantList } = await supabase.from('tenants').select('id').limit(1);
        if (tenantList && tenantList.length > 0) {
          tenantId = tenantList[0]?.id;
        }
      }

      if (tenantId) {
        const { data: dbPlans } = await supabase
          .from('tenant_plans')
          .select('tier, price_annual')
          .eq('tenant_id', tenantId);

        if (dbPlans && dbPlans.length > 0) {
          const mapped: Partial<Record<'bronze' | 'prata' | 'ouro', number>> = {};
          dbPlans.forEach((p: any) => {
            if (p.tier === 'bronze' || p.tier === 'prata' || p.tier === 'ouro') {
              mapped[p.tier as 'bronze' | 'prata' | 'ouro'] = parseFloat(p.price_annual);
            }
          });
          setPlansConfig(prev => ({ ...prev, ...mapped }));
        }
      }
    };
    fetchPlans();
  }, [supabase]);

  // Recalculate pro-rata whenever selectedTier or plansConfig changes
  useEffect(() => {
    const now = new Date();
    const endOfYear = new Date(now.getFullYear(), 11, 31); // 31/12
    const oneDay = 24 * 60 * 60 * 1000;
    const remaining = Math.max(1, Math.ceil((endOfYear.getTime() - now.getTime()) / oneDay));
    
    const annualPrice = plansConfig[selectedTier] || 499.00;
    const computed = parseFloat(((annualPrice / 365) * remaining).toFixed(2));

    setDaysRemaining(remaining);
    setCalculatedPrice(computed);
  }, [selectedTier, plansConfig]);

  const handleSimulatePayment = () => {
    setPaymentStatus('pending');
    
    // Simulate active Pix checking status webhook (2.5 seconds)
    setTimeout(async () => {
      try {
        // 1. Upgrade business to the selected plan_tier in db
        const { error: upgradeError } = await supabase
          .from('businesses')
          .update({ plan_tier: selectedTier })
          .eq('id', businessId);

        if (upgradeError) throw upgradeError;

        // 2. Grant 1 premium banner advertisement placeholder as a bonus if they upgrade to Ouro
        if (selectedTier === 'ouro') {
          const { data: userSession } = await supabase.auth.getUser();
          const tenantId = userSession.user?.user_metadata?.tenant_id;
          
          if (tenantId) {
            await supabase.from('business_banners').insert({
              tenant_id: tenantId,
              business_id: businessId,
              image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
              target_url: 'https://seuguia.com',
              is_active: true,
            });
          }
        }

        setPaymentStatus('success');
        setTimeout(() => {
          onSuccess();
        }, 1500);

      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao processar ativação do plano.');
        setPaymentStatus('idle');
      }
    }, 2500);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--bg-overlay)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 400,
        padding: 'var(--space-4)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '28rem',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)' }}>
              Assinatura do Guia Comercial
            </h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              Escolha seu upgrade para: {businessName}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={paymentStatus === 'pending'}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 'var(--text-lg)',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
            }}
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: 'var(--space-2)',
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

        {paymentStatus === 'idle' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            
            {/* Plan Tier Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                Selecione o plano desejado:
              </span>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                  type="button"
                  onClick={() => setSelectedTier('prata')}
                  style={{
                    flex: 1,
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: selectedTier === 'prata' ? '2px solid var(--accent)' : '1px solid var(--border-default)',
                    backgroundColor: selectedTier === 'prata' ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    fontWeight: 'bold',
                    fontSize: 'var(--text-xs)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  Plano Prata<br />
                  R$ {plansConfig.prata.toFixed(2)}/ano
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTier('ouro')}
                  style={{
                    flex: 1,
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: selectedTier === 'ouro' ? '2px solid var(--accent)' : '1px solid var(--border-default)',
                    backgroundColor: selectedTier === 'ouro' ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    fontWeight: 'bold',
                    fontSize: 'var(--text-xs)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  Plano Ouro<br />
                  R$ {plansConfig.ouro.toFixed(2)}/ano
                </button>
              </div>
            </div>

            {/* Price breakdown table */}
            <div
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-4)',
                fontSize: 'var(--text-xs)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
                border: '1px solid var(--border-default)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Valor Anual Cheio ({selectedTier.toUpperCase()})</span>
                <span>R$ {(plansConfig[selectedTier] || 499).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Pro-rata ({daysRemaining} dias restantes até 31/12)</span>
                <span>R$ {calculatedPrice.toFixed(2)}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 'var(--font-weight-bold)',
                  fontSize: 'var(--text-sm)',
                  borderTop: '1px solid var(--border-default)',
                  paddingTop: 'var(--space-2)',
                  marginTop: 'var(--space-1)',
                  color: 'var(--accent)',
                }}
              >
                <span>Total a Pagar (Pix)</span>
                <span>R$ {calculatedPrice.toFixed(2)}</span>
              </div>
            </div>

            {/* QR Code Pix */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
              <div
                style={{
                  width: '8rem',
                  height: '8rem',
                  border: '2px solid var(--border-strong)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'white',
                  padding: 'var(--space-2)',
                }}
              >
                {/* QR Code mock grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', width: '100%', height: '100%' }}>
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        backgroundColor: (i % 3 === 0 || i % 7 === 0 || i === 0 || i === 15) ? 'var(--color-gray-900)' : 'transparent',
                        borderRadius: '2px',
                      }}
                    />
                  ))}
                </div>
              </div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                Escaneie o QR Code acima para simular a compra.
              </span>
            </div>

            {/* CTA Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <button
                onClick={handleSimulatePayment}
                style={{
                  padding: 'var(--space-3)',
                  backgroundColor: 'var(--accent)',
                  color: 'var(--text-inverse)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 'var(--font-weight-bold)',
                  fontSize: 'var(--text-sm)',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                  textAlign: 'center',
                }}
              >
                Simular Pagamento Pix
              </button>
              <button
                onClick={() => alert('Faturamento: Entre em contato pelo WhatsApp (11) 99999-9999')}
                type="button"
                style={{
                  padding: 'var(--space-2)',
                  background: 'none',
                  border: '1px dashed var(--border-strong)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-secondary)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-weight-semibold)',
                  cursor: 'pointer',
                }}
              >
                Dúvidas no Faturamento? Fale com Suporte
              </button>
            </div>
          </div>
        )}

        {paymentStatus === 'pending' && (
          <div
            style={{
              padding: 'var(--space-8) 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-4)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                border: '4px solid var(--border-default)',
                borderTopColor: 'var(--accent)',
                borderRadius: 'var(--radius-full)',
                animation: 'spin 1s linear infinite',
              }}
            />
            <div>
              <h4 style={{ fontWeight: 'var(--font-weight-bold)' }}>Processando seu Pix...</h4>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Verificando recebimento em tempo real com a adquirente...
              </p>
            </div>
          </div>
        )}

        {paymentStatus === 'success' && (
          <div
            style={{
              padding: 'var(--space-8) 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-4)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'oklch(0.95 0.05 145 / 0.1)',
                border: '2px solid var(--color-success-500)',
                color: 'var(--color-success-500)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'var(--text-2xl)',
                fontWeight: 'var(--font-weight-bold)',
              }}
            >
              ✓
            </div>
            <div>
              <h4 style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--color-success-500)' }}>
                Upgrade Concluído!
              </h4>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Seu anúncio foi promovido para {selectedTier.toUpperCase()} com sucesso.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
