import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ContinueRecoveryButton } from './continue-button';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Criar nova senha | Conexão Maçônica', robots: { index: false, follow: false } };

/**
 * Página intermediária do link de recuperação de senha. O token só é gasto quando a PESSOA clica no botão (em /auth/confirm):
 * leitores automáticos de e-mail que apenas abrem o endereço não consomem o link.
 * Mesma identidade visual das telas de entrada (fundo bordô, logomarca, destaques dourados).
 */
export default async function RedefinirPage({ searchParams }: { searchParams: Promise<{ token_hash?: string | string[] }> }) {
  const raw = (await searchParams).token_hash;
  const tokenHash = typeof raw === 'string' && /^[A-Za-z0-9_-]{10,200}$/.test(raw) ? raw : null;

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#1f0509] p-4 font-sans">
      <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-[50vw] w-[50vw] rounded-full bg-gradient-to-r from-[#4B161B]/40 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] h-[50vw] w-[50vw] rounded-full bg-gradient-to-l from-[#C9A227]/15 to-transparent blur-3xl" />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-5 rounded-3xl border border-[#C9A227]/30 bg-[#2b060d]/90 p-6 text-center text-white shadow-2xl backdrop-blur-md sm:p-8">
        <Image
          src="/logoconexao_red_vert.png"
          alt="Conexão Maçônica"
          width={971}
          height={208}
          className="h-auto w-full max-w-[320px] object-contain drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]"
          priority
        />
        <h1 className="font-serif text-2xl font-bold tracking-tight text-[#FAF7F2]">Criar nova senha</h1>
        {tokenHash ? (
          <>
            <p className="text-sm leading-relaxed text-stone-200">
              Clique no botão abaixo para continuar e definir a nova senha da sua conta.
            </p>
            <ContinueRecoveryButton tokenHash={tokenHash} />
          </>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-stone-200">
              Este link é inválido ou está incompleto. Peça um novo link de recuperação.
            </p>
            <Link href="/forgot-password" className="font-semibold text-amber-300 underline underline-offset-2 hover:text-amber-200">
              Pedir novo link
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
