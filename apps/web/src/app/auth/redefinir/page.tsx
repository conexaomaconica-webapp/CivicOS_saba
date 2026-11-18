import type { Metadata } from 'next';
import Link from 'next/link';
import { ContinueRecoveryButton } from './continue-button';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Criar nova senha | Conexão Maçônica', robots: { index: false, follow: false } };

/**
 * Página intermediária do link de recuperação de senha. O token só é gasto quando a PESSOA clica no botão (em /auth/confirm):
 * leitores automáticos de e-mail que apenas abrem o endereço não consomem o link.
 */
export default async function RedefinirPage({ searchParams }: { searchParams: Promise<{ token_hash?: string | string[] }> }) {
  const raw = (await searchParams).token_hash;
  const tokenHash = typeof raw === 'string' && /^[A-Za-z0-9_-]{10,200}$/.test(raw) ? raw : null;

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', background: '#faf7f2' }}>
      <div style={{ width: '100%', maxWidth: 440, background: '#fff', border: '1px solid #e7e5e4', borderRadius: 16, padding: 28, textAlign: 'center', fontFamily: 'Arial, Helvetica, sans-serif' }}>
        <h1 style={{ margin: '0 0 12px', fontSize: 22, color: '#5d1523' }}>Criar nova senha</h1>
        {tokenHash ? (
          <>
            <p style={{ margin: '0 0 22px', fontSize: 15, lineHeight: 1.55, color: '#292524' }}>
              Clique no botão abaixo para continuar e definir a nova senha da sua conta.
            </p>
            <ContinueRecoveryButton tokenHash={tokenHash} />
          </>
        ) : (
          <>
            <p style={{ margin: '0 0 22px', fontSize: 15, lineHeight: 1.55, color: '#292524' }}>
              Este link é inválido ou está incompleto. Peça um novo link de recuperação.
            </p>
            <Link href="/forgot-password" style={{ color: '#5d1523', fontWeight: 700 }}>Pedir novo link</Link>
          </>
        )}
      </div>
    </main>
  );
}
