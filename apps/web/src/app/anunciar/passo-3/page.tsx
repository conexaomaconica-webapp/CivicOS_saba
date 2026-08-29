import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import OnboardingHeader from '@/components/onboarding/OnboardingHeader';
import MasonicBondForm from './masonic-bond-form';

export const metadata = {
  title: 'Onboarding Anunciante · Passo 3 de 6 — Seu Vínculo',
};

export default async function OnboardingStep3Page() {
  const supabase = await createServerSideClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=%2Fanunciar%2Fpasso-3');
  }

  // Buscar rascunho de empresa vinculada
  const { data: draftBiz } = await (supabase as any)
    .from('businesses')
    .select('id, name')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!draftBiz) {
    redirect('/anunciar/passo-2?error=complete_business_first');
  }

  return (
    <main className="min-h-screen w-full bg-[#1f0509] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute w-[40vw] h-[40vw] rounded-full bg-[#4B161B]/30 top-[-10%] left-[-10%] blur-3xl pointer-events-none" />
      <div className="absolute w-[40vw] h-[40vw] rounded-full bg-[#C9A227]/15 bottom-[-10%] right-[-10%] blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl z-10 relative space-y-6">
        <OnboardingHeader
          currentStep={3}
          title="3. Vínculo Fraterno & Comercial"
          subtitle="Declare seu vínculo com a ordem e sua relação administrativa com a empresa."
          businessName={draftBiz.name}
        />

        <div className="bg-[#2b060d]/90 border border-[#C9A227]/30 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
          <MasonicBondForm businessId={draftBiz.id} businessName={draftBiz.name} />
        </div>
      </div>
    </main>
  );
}
