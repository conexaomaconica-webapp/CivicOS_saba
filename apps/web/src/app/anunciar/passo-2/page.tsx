import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { resolveRequestTenantId } from '@/lib/tenant/tenant-resolver';
import { listBusinessCategories } from '@/lib/business/business-registration-service';
import OnboardingHeader from '@/components/onboarding/OnboardingHeader';
import BusinessForm from './business-form';

export const metadata = {
  title: 'Onboarding Anunciante · Passo 2 de 6 — Sua Empresa',
};

export default async function OnboardingStep2Page() {
  const supabase = await createServerSideClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=%2Fanunciar%2Fpasso-2');
  }

  const [tenantId, categories] = await Promise.all([
    resolveRequestTenantId(supabase, user.id),
    listBusinessCategories(supabase),
  ]);

  // Buscar rascunho de empresa existente para UPDATE idempotente
  const { data: existingBiz } = await (supabase as any)
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle();

  return (
    <main className="min-h-screen w-full bg-[#1f0509] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute w-[40vw] h-[40vw] rounded-full bg-[#4B161B]/30 top-[-10%] left-[-10%] blur-3xl pointer-events-none" />
      <div className="absolute w-[40vw] h-[40vw] rounded-full bg-[#C9A227]/15 bottom-[-10%] right-[-10%] blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl z-10 relative space-y-6">
        <OnboardingHeader
          currentStep={2}
          title="2. Sua Empresa Comercial"
          subtitle="Informe os dados essenciais da empresa. Você poderá completar fotos e galeria no seu painel."
          businessName={existingBiz?.name}
        />

        <div className="bg-[#2b060d]/90 border border-[#C9A227]/30 rounded-3xl p-6 shadow-2xl backdrop-blur-md space-y-4">
          <p className="text-xs text-[#C9A227] bg-[#3B0B14] p-3 rounded-2xl border border-[#C9A227]/30">
            💡 <strong>Dica:</strong> Logo, capa corporativa, galeria de fotos e horários detalhados poderão ser preenchidos depois no seu Portal do Anunciante.
          </p>

          <BusinessForm categories={categories} tenantId={tenantId} />
        </div>
      </div>
    </main>
  );
}