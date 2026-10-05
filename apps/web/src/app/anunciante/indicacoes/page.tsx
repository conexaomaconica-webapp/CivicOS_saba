import { Users } from 'lucide-react';
import { getMyBusinessReferralFunnelAction } from '@/app/actions/referrals';
import { ReferralFunnelView } from '@/components/referrals/ReferralFunnel';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Indicações · Portal do Anunciante',
  robots: { index: false, follow: false },
};

export default async function AdvertiserReferralsPage() {
  const result = await getMyBusinessReferralFunnelAction();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-serif text-2xl font-bold text-[#3B0B14]">
          <Users className="h-6 w-6 text-[#C9A227]" />
          Indicações pessoais
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Membros e visitantes que chegaram a {result.businessName || 'sua empresa'} por um link de indicação. Indicação vale mais do que visualização: é alguém que recomendou você a outra pessoa.
        </p>
      </div>

      {!result.success && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{result.error}</div>}

      {result.funnel && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs sm:p-6">
          {result.funnel.total === 0 ? (
            <p className="text-sm text-stone-600">
              Ainda não há indicações. Peça aos seus clientes e irmãos para usarem o botão <strong>Indicar</strong> na página da sua empresa: cada pessoa que abrir o link dele conta aqui.
            </p>
          ) : null}
          <ReferralFunnelView funnel={result.funnel} />
        </section>
      )}
    </div>
  );
}
