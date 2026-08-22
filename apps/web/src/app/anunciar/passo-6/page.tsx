import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import CheckoutPaymentClient from './checkout-payment-client';

export const metadata = {
  title: 'Onboarding Anunciante · Passo 6 — Checkout Pagamento',
};

export default async function OnboardingStep6Page() {
  const supabase = await createServerSideClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=%2Fanunciar%2Fpasso-6');
  }

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl space-y-6">
        <div className="space-y-2 border-b border-stone-800 pb-4">
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
            Onboarding Anunciante · Passo 6 de 7
          </p>
          <h1 className="text-2xl font-serif font-bold text-white">Checkout de Pagamento · Asaas Gateway</h1>
          <p className="text-xs text-stone-400">
            Realize o pagamento via PIX, Cartão ou Boleto. A ativação da assinatura ocorrerá exclusivamente via Webhook auditado (ADV-006).
          </p>
        </div>

        <CheckoutPaymentClient userEmail={user.email || 'anunciante@conexaomaconica.com.br'} />
      </div>
    </main>
  );
}
