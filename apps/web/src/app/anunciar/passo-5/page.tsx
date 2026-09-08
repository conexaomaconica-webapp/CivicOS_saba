import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import OnboardingHeader from '@/components/onboarding/OnboardingHeader';
import ContractSigningClient from './contract-signing-client';

export const metadata = {
  title: 'Onboarding Anunciante · Passo 5 de 6 — Revise e Assine',
};

export default async function OnboardingStep5Page() {
  const supabase = await createServerSideClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=%2Fanunciar%2Fpasso-5');
  }

  // Buscar rascunho de empresa e perfil
  const { data: biz } = await (supabase as any)
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!biz) {
    redirect('/anunciar/passo-2?error=complete_business_first');
  }

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('name, email')
    .eq('id', user.id)
    .maybeSingle();

  const planCode = biz.plan_tier || 'ouro';
  const planName = planCode === 'ouro' ? 'Plano Ouro (Anual)' : planCode === 'prata' ? 'Plano Prata (Anual)' : 'Plano Bronze (Essencial)';
  const planPrice = planCode === 'ouro' ? 'R$ 1.000,00 / ano' : planCode === 'prata' ? 'R$ 800,00 / ano' : 'R$ 500,00 / ano';

  return (
    <main className="min-h-screen w-full bg-[#1f0509] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute w-[40vw] h-[40vw] rounded-full bg-[#4B161B]/30 top-[-10%] left-[-10%] blur-3xl pointer-events-none" />
      <div className="absolute w-[40vw] h-[40vw] rounded-full bg-[#C9A227]/15 bottom-[-10%] right-[-10%] blur-3xl pointer-events-none" />

      <div className="w-full max-w-3xl z-10 relative space-y-6">
        <OnboardingHeader
          currentStep={5}
          title="5. Revisão da Contratação & Contrato de Adesão"
          subtitle="Confira o resumo comercial e realize a assinatura digital com timestamp confiável e Hash SHA-256."
          businessName={biz.name}
        />

        <div className="bg-[#2b060d]/90 border border-[#C9A227]/30 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
          <ContractSigningClient
            userEmail={user.email || profile?.email || 'anunciante@conexaomaconica.com.br'}
            userName={profile?.name || user.email || 'Empresário Fraterno'}
            businessName={biz.name}
            documentNumber={biz.cnpj || 'Não Informado'}
            cityState={`${biz.city || 'São Paulo'} / ${biz.state || 'SP'}`}
            planName={planName}
            planPrice={planPrice}
          />
        </div>
      </div>
    </main>
  );
}
