import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { resolveRequestTenantId } from '@/lib/tenant/tenant-resolver';
import { listBusinessCategories } from '@/lib/business/business-registration-service';
import BusinessForm from './business-form';

export const metadata = {
  title: 'Onboarding Anunciante · Passo 2 — Dados da Empresa',
};

export default async function OnboardingStep2Page() {
  const supabase = await createServerSideClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=%2Fanunciar%2Fpasso-2');
  }

  const [tenantId, categories] = await Promise.all([
    resolveRequestTenantId(supabase, user.id),
    listBusinessCategories(supabase),
  ]);

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
      <div style={{ width: '100%', maxWidth: 560 }}>
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <p
            style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Onboarding Anunciante · Passo 2 de 7
          </p>
          <h1
            style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--text-primary)',
              marginTop: 'var(--space-2)',
            }}
          >
            Dados da Empresa
          </h1>
          <p
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--text-secondary)',
              marginTop: 'var(--space-1)',
            }}
          >
            Informe os dados cadastrais. O registro será salvo em formato de rascunho, com você como titular (CRIT-VSC-003).
          </p>
        </div>

        <BusinessForm categories={categories} tenantId={tenantId} />
      </div>
    </main>
  );
}