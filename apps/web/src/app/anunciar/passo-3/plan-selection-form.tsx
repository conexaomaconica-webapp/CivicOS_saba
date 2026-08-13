'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { CommercialPlan, BillingCycle, PlanTier } from '@/lib/billing/plans-service';
import { savePlanDraft, loadPlanDraft } from '@/lib/onboarding/plan-selection-flow';

export interface PlanSelectionFormProps {
  authenticated: boolean;
  plans: CommercialPlan[];
}

function formatCurrency(amount: number): string {
  if (amount === 0) return 'Grátis';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
}

export default function PlanSelectionForm({
  authenticated,
  plans,
}: PlanSelectionFormProps) {
  const router = useRouter();

  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');
  const [selectedTier, setSelectedTier] = useState<PlanTier>('prata');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const existing = loadPlanDraft();
    if (existing) {
      setSelectedTier(existing.tier);
      setBillingCycle(existing.billingCycle);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const targetPlan = plans.find((p) => p.tier === selectedTier);
    if (!targetPlan) {
      setErrorMsg('Por favor, selecione um plano válido.');
      setLoading(false);
      return;
    }

    const price =
      billingCycle === 'annual'
        ? targetPlan.priceAnnual
        : targetPlan.priceMonthly;

    const saved = savePlanDraft({
      planId: targetPlan.id,
      tier: targetPlan.tier,
      tierName: targetPlan.name,
      billingCycle,
      price,
    });

    if (!saved) {
      setErrorMsg('Não foi possível salvar a escolha do plano neste navegador.');
      setLoading(false);
      return;
    }

    if (authenticated) {
      router.push('/anunciar/passo-4');
    } else {
      router.push('/login?redirect=%2Fanunciar%2Fpasso-3');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
      }}
    >
      {errorMsg && (
        <div
          role="alert"
          style={{
            padding: 'var(--space-3)',
            backgroundColor: 'oklch(0.95 0.05 25 / 0.1)',
            border: '1px solid var(--color-error-500)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-error-500)',
            fontSize: 'var(--text-sm)',
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Cycle Selector Switch */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 'var(--space-3)',
          padding: 'var(--space-2)',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          alignSelf: 'center',
        }}
      >
        <button
          type="button"
          onClick={() => setBillingCycle('annual')}
          style={{
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            backgroundColor:
              billingCycle === 'annual' ? 'var(--accent)' : 'transparent',
            color:
              billingCycle === 'annual'
                ? 'var(--text-inverse)'
                : 'var(--text-secondary)',
            fontWeight: 'var(--font-weight-semibold)',
            fontSize: 'var(--text-xs)',
            cursor: 'pointer',
            transition: 'all var(--duration-fast)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <span>Faturamento Anual</span>
          <span
            style={{
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor:
                billingCycle === 'annual'
                  ? 'rgba(255,255,255,0.2)'
                  : 'var(--accent-subtle)',
              color:
                billingCycle === 'annual'
                  ? 'var(--text-inverse)'
                  : 'var(--accent)',
              fontSize: '10px',
              textTransform: 'uppercase',
            }}
          >
            Economize 20%
          </span>
        </button>

        <button
          type="button"
          onClick={() => setBillingCycle('monthly')}
          style={{
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            backgroundColor:
              billingCycle === 'monthly' ? 'var(--accent)' : 'transparent',
            color:
              billingCycle === 'monthly'
                ? 'var(--text-inverse)'
                : 'var(--text-secondary)',
            fontWeight: 'var(--font-weight-semibold)',
            fontSize: 'var(--text-xs)',
            cursor: 'pointer',
            transition: 'all var(--duration-fast)',
          }}
        >
          Faturamento Mensal
        </button>
      </div>

      {/* Plan Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        {plans.map((plan) => {
          const isSelected = selectedTier === plan.tier;
          const displayPrice =
            billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;

          return (
            <div
              key={plan.tier}
              onClick={() => setSelectedTier(plan.tier)}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: 'var(--space-5)',
                backgroundColor: isSelected
                  ? 'var(--bg-secondary)'
                  : 'var(--bg-tertiary)',
                border: `2px solid ${
                  isSelected ? 'var(--accent)' : 'var(--border-default)'
                }`,
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                transition: 'all var(--duration-fast)',
                boxShadow: isSelected
                  ? '0 8px 24px -6px rgba(0, 0, 0, 0.12)'
                  : 'none',
              }}
            >
              {plan.badge && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-12px',
                    right: 'var(--space-4)',
                    padding: '2px 10px',
                    backgroundColor: 'var(--accent)',
                    color: 'var(--text-inverse)',
                    fontSize: '10px',
                    fontWeight: 'var(--font-weight-bold)',
                    borderRadius: 'var(--radius-full)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {plan.badge}
                </div>
              )}

              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 'var(--space-2)',
                  }}
                >
                  <h3
                    style={{
                      fontSize: 'var(--text-lg)',
                      fontWeight: 'var(--font-weight-bold)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {plan.name}
                  </h3>
                  <input
                    type="radio"
                    name="selectedPlan"
                    value={plan.tier}
                    checked={isSelected}
                    onChange={() => setSelectedTier(plan.tier)}
                    style={{ cursor: 'pointer' }}
                  />
                </div>

                <p
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-secondary)',
                    marginBottom: 'var(--space-4)',
                    minHeight: '36px',
                  }}
                >
                  {plan.tagline}
                </p>

                <div style={{ marginBottom: 'var(--space-5)' }}>
                  <span
                    style={{
                      fontSize: 'var(--text-3xl)',
                      fontWeight: 'var(--font-weight-bold)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {formatCurrency(displayPrice)}
                  </span>
                  {displayPrice > 0 && (
                    <span
                      style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--text-secondary)',
                        marginLeft: 'var(--space-1)',
                      }}
                    >
                      / {billingCycle === 'annual' ? 'ano' : 'mês'}
                    </span>
                  )}
                </div>

                <ul
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-2)',
                    padding: 0,
                    margin: 0,
                    listStyle: 'none',
                  }}
                >
                  {plan.features.map((feat, i) => (
                    <li
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        fontSize: 'var(--text-xs)',
                        color: feat.included
                          ? 'var(--text-primary)'
                          : 'var(--text-tertiary)',
                        textDecoration: feat.included ? 'none' : 'line-through',
                      }}
                    >
                      <span
                        style={{
                          color: feat.included
                            ? 'var(--accent)'
                            : 'var(--text-tertiary)',
                          fontWeight: 'bold',
                        }}
                      >
                        {feat.included ? '✓' : '✕'}
                      </span>
                      <span>{feat.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          marginTop: 'var(--space-4)',
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: loading ? 'var(--accent-subtle)' : 'var(--accent)',
          color: 'var(--text-inverse)',
          fontWeight: 'var(--font-weight-semibold)',
          fontSize: 'var(--text-sm)',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background-color var(--duration-fast)',
        }}
      >
        {loading
          ? 'Salvando...'
          : authenticated
          ? 'Continuar · Resumo Comercial'
          : 'Continuar · Criar minha conta'}
      </button>
    </form>
  );
}
