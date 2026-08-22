import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import ContractSigningClient from './contract-signing-client';

export const metadata = {
  title: 'Onboarding Anunciante · Passo 5 — Assinar Contrato',
};

export default async function OnboardingStep5Page() {
  const supabase = await createServerSideClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=%2Fanunciar%2Fpasso-5');
  }

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl space-y-6">
        <div className="space-y-2 border-b border-stone-800 pb-4">
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
            Onboarding Anunciante · Passo 5 de 7
          </p>
          <h1 className="text-2xl font-serif font-bold text-white">Aceite do Contrato de Licença & Serviços</h1>
          <p className="text-xs text-stone-400">
            Leia a minuta renderizada com os dados da sua empresa. O aceite gerará um snapshot imutável com hash SHA-256 para auditoria legal (ADV-005).
          </p>
        </div>

        <ContractSigningClient userEmail={user.email || 'anunciante@conexaomaconica.com.br'} />
      </div>
    </main>
  );
}
