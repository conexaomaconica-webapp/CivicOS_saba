import { createServerSideClient } from '@/lib/supabase/server';
import OnboardingHeader from '@/components/onboarding/OnboardingHeader';
import ResponsibleForm from './responsible-form';

export const metadata = {
  title: 'Onboarding Anunciante · Passo 1 de 6 — Sua Conta',
};

export default async function OnboardingStep1Page() {
  const supabase = await createServerSideClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const metadataName = typeof metadata.name === 'string' ? metadata.name : '';

  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null };

  return (
    <main className="min-h-screen w-full bg-[#1f0509] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute w-[40vw] h-[40vw] rounded-full bg-[#4B161B]/30 top-[-10%] left-[-10%] blur-3xl pointer-events-none" />
      <div className="absolute w-[40vw] h-[40vw] rounded-full bg-[#C9A227]/15 bottom-[-10%] right-[-10%] blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl z-10 relative space-y-6">
        <OnboardingHeader
          currentStep={1}
          title="1. Sua Conta de Acesso"
          subtitle="Identifique a pessoa responsável que administrará a conta comercial no Guia."
        />

        <div className="bg-[#2b060d]/90 border border-[#C9A227]/30 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
          <ResponsibleForm
            authenticated={Boolean(user)}
            initial={{
              name: profile?.name ?? metadataName ?? '',
              email: profile?.email ?? user?.email ?? '',
            }}
          />
        </div>
      </div>
    </main>
  );
}