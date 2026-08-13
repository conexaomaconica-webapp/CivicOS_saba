import { createServerSideClient } from '@/lib/supabase/server';
import { fetchTenantPlans } from '@/lib/billing/plans-service';
import { resolveRequestTenantId } from '@/lib/tenant/tenant-resolver';
import PlanSelectionForm from './plan-selection-form';

export const metadata = {
  title: 'Onboarding Anunciante · Passo 3 — Seleção do Plano',
};

export default async function OnboardingStep3Page() {
  const supabase = await createServerSideClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const tenantId = await resolveRequestTenantId(supabase, user?.id);
  const plans = await fetchTenantPlans(supabase, tenantId);

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'var(--space-8) var(--space-4)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 900 }}>
        <div style={{ marginBottom: 'var(--space-6)', textAlign: 'center' }}>
          <p
            style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Onboarding Anunciante · Passo 3 de 7
          </p>
          <h1
            style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--text-primary)',
              marginTop: 'var(--space-2)',
            }}
          >
            Escolha o Plano Ideal para Sua Empresa
          </h1>
          <p
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--text-secondary)',
              marginTop: 'var(--space-1)',
              maxWidth: 600,
              marginInline: 'auto',
            }}
          >
            Aumente a visibilidade do seu negócio e conecte-se com membros da comunidade com planos flexíveis (CRIT-VSC-005).
          </p>
        </div>

        <PlanSelectionForm
          authenticated={Boolean(user)}
          plans={plans}
        />
      </div>
    </main>
  );
}
