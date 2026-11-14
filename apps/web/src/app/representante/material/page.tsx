import React from 'react';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { getRepresentativeContext } from '@/lib/commercial/commercial-auth';
import { representativeScopeAllows } from '@/lib/commercial/access-rules';
import { fetchTenantPlans, formatCentsToReais, type CommercialPlan } from '@/lib/billing/plans-service';
import CopyLinkButton from './copy-link-button';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Material de vendas | Conexão Maçônica',
  robots: { index: false, follow: false },
};

export default async function RepresentativeSalesMaterialPage() {
  const ctx = await getRepresentativeContext();
  if (!ctx || !representativeScopeAllows(ctx.representative.status, 'operational')) notFound();

  const h = await headers();
  const host = (h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000').split(',')[0]!.trim();
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const referralLink = `${proto}://${host}/r/${ctx.representative.referral_code}`;

  // Planos e valores: sempre da fonte oficial (plan_payment_rules), nunca digitados aqui.
  let plans: CommercialPlan[] = [];
  let plansError = false;
  try {
    const supabase = await createServerSideClient();
    plans = await fetchTenantPlans(supabase as any, ctx.tenantId);
  } catch {
    plansError = true;
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="link-titulo" className="rounded-2xl border border-[#E8E5DF] bg-white p-6 space-y-3">
        <h2 id="link-titulo" className="text-xl font-serif font-bold text-[#3B0B14]">Seu link de indicação</h2>
        <p className="text-sm text-stone-600">
          Envie este link ao anunciante. Quando ele fizer o cadastro da empresa pelo link, a indicação fica registrada em seu nome.
          O cadastro e o pagamento são feitos pelo próprio anunciante, na plataforma.
        </p>
        <CopyLinkButton link={referralLink} />
      </section>

      <section aria-labelledby="passos-titulo" className="space-y-3">
        <h2 id="passos-titulo" className="text-xl font-serif font-bold text-[#3B0B14]">Como indicar</h2>
        <ol className="list-decimal pl-5 space-y-1.5 text-sm text-stone-700">
          <li>Cadastre a empresa em <strong>Indicações</strong> com CNPJ e e-mail de contato: isso reserva o contato em seu nome.</li>
          <li>Envie seu link de indicação ao responsável pela empresa.</li>
          <li>O anunciante conclui o cadastro, aceita os termos e realiza o pagamento.</li>
          <li>A equipe confirma a atribuição e você acompanha tudo em <strong>Comissões</strong>.</li>
        </ol>
      </section>

      <section aria-labelledby="planos-titulo" className="space-y-3">
        <h2 id="planos-titulo" className="text-xl font-serif font-bold text-[#3B0B14]">Planos vigentes</h2>
        {plansError && <p className="text-sm text-rose-700">Não foi possível carregar os planos agora. Tente novamente em instantes.</p>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <article key={plan.id} className="rounded-2xl border border-[#E8E5DF] bg-white p-5 space-y-3">
              <header>
                <h3 className="text-lg font-serif font-bold text-[#3B0B14]">{plan.name}</h3>
                <p className="text-xs text-stone-500">{plan.tagline}</p>
              </header>
              <p className="text-2xl font-bold text-[#3B0B14] tabular-nums">
                {formatCentsToReais(plan.annualPriceCents)}
                <span className="text-xs font-semibold text-stone-500"> /ano</span>
              </p>
              {plan.pixPriceCents ? (
                <p className="text-xs text-stone-600">No PIX: <strong>{formatCentsToReais(plan.pixPriceCents)}</strong></p>
              ) : null}
              <ul className="space-y-1 text-sm text-stone-700">
                {plan.features.map((f) => (
                  <li key={f.text} className={f.included ? '' : 'text-stone-400 line-through'}>
                    {f.included ? '✓ ' : '– '}
                    {f.text}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <p className="text-xs text-stone-500">Valores e benefícios exibidos conforme a configuração oficial de planos da plataforma.</p>
      </section>
    </div>
  );
}
