import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import PaymentManagementClient from './payment-management-client';

export const metadata = {
  title: 'Gestão de Pagamentos & Gateways · Painel Admin',
};

export default async function AdminPaymentsPage() {
  let isUserAuthenticated = false;

  try {
    const supabase = await createServerSideClient();
    const { data } = await supabase.auth.getUser();
    isUserAuthenticated = Boolean(data?.user);
  } catch (_e) {
    isUserAuthenticated = false;
  }

  if (!isUserAuthenticated) {
    redirect('/login?redirect=%2Fadmin%2Fpagamentos');
  }

  // Verifica chaves mascaradas sem expor o segredo
  const isAsaasConfigured = Boolean(process.env.ASAAS_API_KEY && process.env.ASAAS_WEBHOOK_SECRET);
  const asaasEnvironment = process.env.ASAAS_ENVIRONMENT || 'sandbox';

  return (
    <div className="space-y-6">
      <div className="border-b border-[#C9A227]/30 pb-4">
        <span className="bg-[#3B0B14] text-[#C9A227] font-bold text-xs px-2.5 py-0.5 rounded-full border border-[#C9A227]/40">
          Painel de Administração · Pagamentos & Condições
        </span>
        <h1 className="text-2xl font-serif font-bold text-[#1f1914] mt-2">Central de Gateways & Parcelamento</h1>
        <p className="text-xs text-stone-500 mt-1">
          Gerencie os provedores de cobrança, métodos aceitos e regras de parcelamento por plano.
        </p>
      </div>

      <PaymentManagementClient
        isAsaasConfigured={isAsaasConfigured}
        asaasEnvironment={asaasEnvironment}
      />
    </div>
  );
}
