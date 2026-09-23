import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Gift, TicketCheck } from 'lucide-react';
import { createServerSideClient } from '@/lib/supabase/server';
import { getUserRedemptionsAction } from '@/lib/business/benefit-redemption-service';

export const metadata = {
  title: 'Meus benefícios | Conexão Maçônica',
  robots: { index: false, follow: false },
};

export default async function MyBenefitsPage() {
  const supabase = await createServerSideClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=%2Fminha-conta%2Fbeneficios');

  const result = await getUserRedemptionsAction();
  const redemptions = result.redemptions || [];

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 font-serif text-2xl font-bold text-[#4B161B]"><Gift className="h-6 w-6 text-[#C9A227]" />Meus benefícios</h1>
            <p className="mt-1 text-sm text-stone-600">Códigos resgatados e situação de utilização.</p>
          </div>
          <Link href="/guia" className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-bold text-stone-700">Explorar empresas</Link>
        </div>

        {!result.success && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{result.error}</div>}
        {result.success && redemptions.length === 0 && <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">Você ainda não resgatou nenhum benefício.</div>}

        <div className="grid gap-4 sm:grid-cols-2">
          {redemptions.map((item: any) => {
            const snapshot = item.benefit_snapshot || {};
            return (
              <article key={item.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-serif font-bold text-stone-900">{snapshot.title || 'Benefício resgatado'}</h2>
                    <p className="mt-1 text-xs text-stone-500">Resgatado em {new Date(item.redeemed_at).toLocaleString('pt-BR')}</p>
                  </div>
                  <TicketCheck className="h-5 w-5 text-[#C9A227]" />
                </div>
                <div className="mt-4 rounded-xl bg-stone-900 px-4 py-3 text-center font-mono text-lg font-black tracking-wider text-[#E7C65D]">{item.public_code}</div>
                <p className="mt-3 text-xs font-bold uppercase text-stone-600">Status: {item.status === 'redeemed' ? 'Disponível' : item.status === 'used' ? 'Utilizado' : item.status}</p>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
