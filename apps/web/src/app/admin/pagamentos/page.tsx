import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import PaymentManagementClient from './payment-management-client';

export const metadata = {
  title: 'Gestão de Pagamentos & Gateways · Painel Admin',
};

export default async function AdminPaymentsPage() {
  const supabase = await createServerSideClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=%2Fadmin%2Fpagamentos');
  }

  // Verifica chaves mascaradas sem expor o segredo
  const isAsaasConfigured = Boolean(process.env.ASAAS_API_KEY && process.env.ASAAS_WEBHOOK_SECRET);
  const asaasEnvironment = process.env.ASAAS_ENVIRONMENT || 'sandbox';

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100 p-6 max-w-6xl mx-auto space-y-8">
      <div className="border-b border-stone-800 pb-4">
        <span className="bg-amber-500/20 text-amber-300 font-bold text-xs px-2.5 py-0.5 rounded-full border border-amber-500/30">
          Painel de Administração · Pagamentos (CRIT-PAY-001)
        </span>
        <h1 className="text-3xl font-serif font-bold text-white mt-2">Central de Gateways & Transações</h1>
        <p className="text-xs text-stone-400 mt-1">
          Gerencie os provedores de cobrança, métodos aceitos e teste de cobrança técnica avulsa.
        </p>
      </div>

      <PaymentManagementClient
        isAsaasConfigured={isAsaasConfigured}
        asaasEnvironment={asaasEnvironment}
      />
    </main>
  );
}
