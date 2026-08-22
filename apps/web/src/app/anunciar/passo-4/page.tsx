import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { ShieldCheck, ArrowRight, CheckCircle } from 'lucide-react';

export const metadata = {
  title: 'Onboarding Anunciante · Passo 4 — Resumo Comercial',
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
    <main className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center p-4">
      <section className="w-full max-w-xl bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl space-y-6">
        <div className="space-y-2 border-b border-stone-800 pb-4">
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
            Onboarding Anunciante · Passo 4 de 7
          </p>
          <h1 className="text-2xl font-serif font-bold text-white">Resumo Comercial & Vigência</h1>
          <p className="text-xs text-stone-400">
            Confira as condições da contratação antes de prosseguir para a leitura e aceite do contrato imutável.
          </p>
        </div>

        <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 space-y-3 text-xs">
          <div className="flex justify-between items-center py-1 border-b border-stone-800/60">
            <span className="text-stone-400">Plano Selecionado:</span>
            <span className="font-bold text-amber-300">Plano Prata</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-stone-800/60">
            <span className="text-stone-400">Valor da Anuidade/Assinatura:</span>
            <span className="font-bold text-emerald-400">R$ 149,00 / mês</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-stone-800/60">
            <span className="text-stone-400">Canal de Cobrança:</span>
            <span className="font-bold text-stone-200">Asaas Gateway (PIX / Cartão / Boleto)</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-stone-400">Benefícios Inclusos:</span>
            <span className="font-semibold text-stone-300">Selo Prata, Mídias, Eventos & Cupom</span>
          </div>
        </div>

        <div className="p-4 bg-amber-950/30 border border-amber-800/40 rounded-xl text-xs text-amber-200/90 space-y-1">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <ShieldCheck className="w-4 h-4" /> Garantia de Transparência & LGPD
          </div>
          <p>
            Na próxima etapa você lerá a minuta completa do contrato renderizado com seus dados e gerará o snapshot imutável com hash SHA-256.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <Link
            href="/anunciar/passo-3"
            className="px-4 py-2.5 rounded-xl border border-stone-700 text-stone-300 hover:bg-stone-800 text-xs font-medium transition-colors"
          >
            Voltar
          </Link>
          <Link
            href="/anunciar/passo-5"
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-amber-950/50"
          >
            <span>Ir para Assinatura do Contrato</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
