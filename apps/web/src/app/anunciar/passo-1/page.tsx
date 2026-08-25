import Image from 'next/image';
import { createServerSideClient } from '@/lib/supabase/server';
import ResponsibleForm from './responsible-form';

export const metadata = {
  title: 'Onboarding Anunciante · Passo 1 de 7 — Conta Responsável',
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
      {/* Luzes sutis de fundo */}
      <div className="absolute w-[40vw] h-[40vw] rounded-full bg-[#4B161B]/30 top-[-10%] left-[-10%] blur-3xl pointer-events-none" />
      <div className="absolute w-[40vw] h-[40vw] rounded-full bg-[#C9A227]/15 bottom-[-10%] right-[-10%] blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl z-10 relative space-y-6">
        {/* Cabeçalho da Conexão Maçônica */}
        <div className="bg-[#2b060d]/90 border border-[#C9A227]/30 rounded-3xl p-6 shadow-2xl backdrop-blur-md space-y-3 text-center sm:text-left flex flex-col sm:flex-row items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#3B0B14] border border-[#C9A227]/50 flex items-center justify-center p-2 shadow-lg shrink-0">
            <Image
              src="/logoconexao_red_vert.png"
              alt="Conexão Maçônica Logo"
              width={40}
              height={40}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#C9A227]/20 text-[#C9A227] border border-[#C9A227]/40 uppercase tracking-wider">
              Onboarding Anunciante · Passo 1 de 7
            </span>
            <h1 className="text-2xl font-serif font-bold text-[#FAF7F2] mt-1">
              Conta Responsável & Vínculo Maçônico
            </h1>
            <p className="text-xs text-stone-300 mt-0.5">
              Identifique a pessoa responsável pelo anúncio comercial e sua relação com a fraternidade.
            </p>
          </div>
        </div>

        {/* Formulário Principal */}
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