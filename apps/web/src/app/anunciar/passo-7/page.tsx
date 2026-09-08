import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import OnboardingHeader from '@/components/onboarding/OnboardingHeader';
import ContractStepClient from './contract-step-client';

export const metadata = {
  title: 'Onboarding Anunciante · Passo 7 de 7 — Contrato & Formalização',
};

export default async function OnboardingStep7Page() {
  const supabase = await createServerSideClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=%2Fanunciar%2Fpasso-7');
  }

  // Buscar empresa e vínculo
  const { data: biz } = await (supabase as any)
    .from('businesses')
    .select('id, name, cnpj, plan_tier, publication_status')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!biz) {
    redirect('/anunciar/passo-2?error=complete_business_first');
  }

  const { data: masonicLink } = await (supabase as any)
    .from('business_masonic_links')
    .select('status')
    .eq('business_id', biz.id)
    .maybeSingle();

  const masonicStatus = (masonicLink?.status || biz.masonic_validation_status || 'pending') as 'verified' | 'pending' | 'rejected';

  // Buscar se contrato já foi assinado previamente
  const { data: existingContract } = await (supabase as any)
    .from('contracts')
    .select('id, status')
    .eq('business_id', biz.id)
    .eq('status', 'signed')
    .limit(1)
    .maybeSingle();

  return (
    <main className="min-h-screen w-full bg-[#1f0509] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute w-[40vw] h-[40vw] rounded-full bg-[#4B161B]/30 top-[-10%] left-[-10%] blur-3xl pointer-events-none" />
      <div className="absolute w-[40vw] h-[40vw] rounded-full bg-[#C9A227]/15 bottom-[-10%] right-[-10%] blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl z-10 relative space-y-6">
        <OnboardingHeader
          currentStep={7}
          title="7. Termo de Adesão & Assinatura Eletrônica"
          subtitle="Formalização contratual com prova de integridade criptográfica SHA-256."
          businessName={biz.name}
        />

        <div className="bg-[#2b060d]/90 border border-[#C9A227]/30 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
          <ContractStepClient
            userEmail={user.email || 'anunciante@conexaomaconica.com.br'}
            userName={user.user_metadata?.name || 'Responsável Comercial'}
            businessId={biz.id}
            businessName={biz.name}
            businessCnpj={biz.cnpj || 'Não informado'}
            planCode={biz.plan_tier || 'ouro'}
            masonicStatus={masonicStatus}
            alreadySigned={Boolean(existingContract)}
          />
        </div>
      </div>
    </main>
  );
}
