import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { fetchTenantPlans, type CommercialPlan } from '@/lib/billing/plans-service';
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

  // Gate 1: Usuário precisa estar autenticado
  if (!user) {
    redirect('/login?redirect=%2Fanunciar%2Fpasso-3');
  }

  const tenantId = (await resolveRequestTenantId(supabase, user.id)) || '00000000-0000-0000-0000-000000000010';

  // Gate 2: Usuário precisa ter concluído o Passo 2 (Possuir empresa em rascunho vinculada ao usuário no tenant)
  const { data: businessDraft } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .eq('owner_id', user.id)
    .eq('publication_status', 'draft')
    .maybeSingle();

  if (!businessDraft) {
    redirect('/anunciar/passo-2?error=complete_business_first');
  }

  let plans: CommercialPlan[] = [];
  let infrastructureError: string | null = null;

  try {
    plans = await fetchTenantPlans(supabase, tenantId);
  } catch (err: unknown) {
    infrastructureError = err instanceof Error ? err.message : 'Falha na infraestrutura de banco de dados ao buscar ofertas.';
  }

  if (infrastructureError) {
    return (
      <main
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--bg-primary)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-8) var(--space-4)',
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: '100%',
            padding: 'var(--space-6)',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--color-error-500)',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-error-500)',
              marginBottom: 'var(--space-2)',
            }}
          >
            Serviço Temporariamente Indisponível
          </div>
          <p
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--text-secondary)',
              marginBottom: 'var(--space-4)',
            }}
          >
            Não foi possível carregar o catálogo de ofertas vigentes no momento devido a uma falha na conexão com o banco de dados.
          </p>
          <a
            href="/anunciar/passo-3"
            style={{
              display: 'inline-block',
              padding: 'var(--space-3) var(--space-6)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--accent)',
              color: 'var(--text-inverse)',
              fontWeight: 'var(--font-weight-semibold)',
              fontSize: 'var(--text-sm)',
            }}
          >
            Tentar Novamente
          </a>
        </div>
      </main>
    );
  }

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
            Selecione a melhor oferta para conectar-se com a comunidade e impulsionar suas vendas (CRIT-VSC-005).
          </p>
        </div>

        <PlanSelectionForm
          authenticated={true}
          tenantId={tenantId}
          userId={user.id}
          plans={plans}
        />
      </div>
    </main>
  );
}
