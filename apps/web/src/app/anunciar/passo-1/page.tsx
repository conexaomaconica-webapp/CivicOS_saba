import { createServerSideClient } from '@/lib/supabase/server';
import ResponsibleForm from './responsible-form';

export const metadata = {
  title: 'Onboarding Anunciante · Passo 1 — Conta Responsável',
};

export default async function OnboardingStep1Page() {
  const supabase = await createServerSideClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const metadataName = typeof metadata.name === 'string' ? metadata.name : '';

  const {
    data: profile,
  } = user
    ? await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null };

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
            Onboarding Anunciante · Passo 1 de 7
          </p>
          <h1
            style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--text-primary)',
              marginTop: 'var(--space-2)',
            }}
          >
            Conta Responsável
          </h1>
          <p
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--text-secondary)',
              marginTop: 'var(--space-1)',
            }}
          >
            Identifique a pessoa responsável pelo anúncio e sua relação com a empresa (CRIT-VSC-003).
          </p>
        </div>

        <ResponsibleForm
          authenticated={Boolean(user)}
          initial={{
            name: profile?.name ?? metadataName ?? '',
            email: profile?.email ?? user?.email ?? '',
          }}
        />
      </div>
    </main>
  );
}