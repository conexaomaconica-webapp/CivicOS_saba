import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { fetchTenantPlans } from '@/lib/billing/plans-service';
import { resolveRequestTenantId } from '@/lib/tenant/tenant-resolver';
import OnboardingHeader from '@/components/onboarding/OnboardingHeader';
import PlanSelectionForm from './plan-selection-form';

export const metadata = {
  title: 'Onboarding Anunciante · Passo 4 de 6 — Escolha do Plano',
};

export default async function OnboardingStep4Page() {
  const supabase = await createServerSideClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=%2Fanunciar%2Fpasso-4');
  }

  const tenantId = (await resolveRequestTenantId(supabase, user.id)) || '00000000-0000-0000-0000-000000000001';

  // Buscar rascunho de empresa vinculada
  const { data: draftBiz } = await (supabase as any)
    .from('businesses')
    .select('id, name, plan_tier')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!draftBiz) {
    redirect('/anunciar/passo-2?error=complete_business_first');
  }

  const plans = await fetchTenantPlans(supabase, tenantId);

  return (
    <main className="min-h-screen w-full bg-[#1f0509] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute w-[40vw] h-[40vw] rounded-full bg-[#4B161B]/30 top-[-10%] left-[-10%] blur-3xl pointer-events-none" />
      <div className="absolute w-[40vw] h-[40vw] rounded-full bg-[#C9A227]/15 bottom-[-10%] right-[-10%] blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl z-10 relative space-y-6">
        <OnboardingHeader
          currentStep={4}
          title="4. Escolha do Plano de Licenciamento"
          subtitle="Selecione a melhor modalidade comercial para destacar sua empresa no Guia."
          businessName={draftBiz.name}
        />

        <div className="bg-[#2b060d]/90 border border-[#C9A227]/30 rounded-3xl p-6 shadow-2xl backdrop-blur-md space-y-4">
          <PlanSelectionForm businessId={draftBiz.id} plans={plans} />
        </div>
      </div>
    </main>
  );
}
