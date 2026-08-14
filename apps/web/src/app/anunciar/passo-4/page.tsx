import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Contratação indisponível',
};

export default async function OnboardingStep4Page() {
  const supabase = await createServerSideClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=%2Fanunciar%2Fpasso-4');
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--space-8) var(--space-4)',
      }}
    >
      <section
        role="status"
        style={{
          width: '100%',
          maxWidth: 640,
          padding: 'var(--space-6)',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--font-weight-semibold)',
            textTransform: 'uppercase',
          }}
        >
          Fase 1 · Contenção comercial
        </p>
        <h1 style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-2xl)' }}>
          Contratação temporariamente indisponível
        </h1>
        <p style={{ marginTop: 'var(--space-3)', color: 'var(--text-secondary)' }}>
          A escolha feita na etapa anterior é somente um rascunho local. Ela não é uma
          cotação persistida, não cria assinatura, não realiza cobrança e não libera
          recursos premium.
        </p>
        <p style={{ marginTop: 'var(--space-3)', color: 'var(--text-secondary)' }}>
          A contratação será reaberta depois que o checkout oficial puder persistir e
          validar assinatura, versão do plano e entitlements no servidor.
        </p>
        <Link
          href="/dashboard"
          style={{
            display: 'inline-block',
            marginTop: 'var(--space-5)',
            padding: 'var(--space-3) var(--space-5)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--accent)',
            color: 'var(--text-inverse)',
            fontWeight: 'var(--font-weight-semibold)',
          }}
        >
          Voltar ao painel
        </Link>
      </section>
    </main>
  );
}
