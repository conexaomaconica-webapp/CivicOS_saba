import { resolveTenantBrandContext } from '@/lib/tenant/tenant-brand';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { fetchTenantPlans } from '@/lib/billing/plans-service';
import {
  ADVERTISE_PLAN_COOKIE_NAME,
  isAdvertiseLandingEnabled,
  resolveStep4InitialPlanTier,
} from '@/lib/billing/advertise-landing';
import { resolveRequestTenantId } from '@/lib/tenant/tenant-resolver';
import OnboardingHeader from '@/components/onboarding/OnboardingHeader';
import PlanSelectionForm from './plan-selection-form';

export const metadata = {
  title: 'Onboarding Anunciante · Passo 4 de 6 — Escolha do Plano',
  robots: { index: false, follow: true },
};

type Step4Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OnboardingStep4Page({ searchParams }: Step4Props) {
  const params = searchParams ? await searchParams : {};
  const rawQueryPlan = Array.isArray(params.plan) ? params.plan[0] : params.plan;
  const cookieStore = await cookies();
  const rawCookiePlan = cookieStore.get(ADVERTISE_PLAN_COOKIE_NAME)?.value ?? null;
  const brand = await resolveTenantBrandContext().catch(() => null);
  const supabase = await createServerSideClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=%2Fanunciar%2Fpasso-4');
  }

  const tenantId = await resolveRequestTenantId(supabase);

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
  const initialPlanTier = isAdvertiseLandingEnabled()
    ? resolveStep4InitialPlanTier({
        queryPlan: rawQueryPlan ?? null,
        cookieValue: rawCookiePlan,
        tenantId,
        draftPlanTier: draftBiz.plan_tier ?? null,
      })
    : 'ouro';

  return (
    <main className="min-h-screen w-full bg-[#1f0509] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute w-[40vw] h-[40vw] rounded-full bg-[#4B161B]/30 top-[-10%] left-[-10%] blur-3xl pointer-events-none" />
      <div className="absolute w-[40vw] h-[40vw] rounded-full bg-[#C9A227]/15 bottom-[-10%] right-[-10%] blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl z-10 relative space-y-6">
        <OnboardingHeader
          logoUrl={brand?.logoUrl ?? null}
          brandName={brand?.appName ?? null}
          currentStep={4}
          title="4. Escolha do Plano de Licenciamento"
          subtitle="Selecione a melhor modalidade comercial para destacar sua empresa no Guia."
          businessName={draftBiz.name}
        />

        <div className="bg-[#2b060d]/90 border border-[#C9A227]/30 rounded-3xl p-6 shadow-2xl backdrop-blur-md space-y-4">
          <PlanSelectionForm businessId={draftBiz.id} plans={plans} initialPlanTier={initialPlanTier} />
        </div>
      </div>
    </main>
  );
}
