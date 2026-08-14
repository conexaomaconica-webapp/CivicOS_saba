import Link from 'next/link';
import { EmptyState } from '@/components/ui-states/EmptyState';

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-8) var(--space-4)',
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      <p
        style={{
          fontSize: 'var(--text-4xl)',
          fontWeight: 'var(--font-weight-bold)',
          color: 'var(--text-secondary)',
          marginBottom: 'var(--space-2)',
        }}
      >
        404
      </p>
      <div style={{ width: '100%', maxWidth: 560 }}>
        <EmptyState
          title="Conteúdo não encontrado"
          description="A página que você procura não existe ou foi movida. Verifique o endereço ou volte para o início."
          icon="?"
          actionLabel="Voltar para o início"
        />
      </div>
      <Link
        href="/"
        style={{
          marginTop: 'var(--space-4)',
          fontSize: 'var(--text-sm)',
          color: 'var(--text-link)',
          fontWeight: 'var(--font-weight-semibold)',
        }}
      >
        Página inicial
      </Link>
    </main>
  );
}
