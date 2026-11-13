import React from 'react';
import { notFound } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { getRepresentativeContext } from '@/lib/commercial/commercial-auth';
import { formatCentsBRL, representativeScopeAllows } from '@/lib/commercial/access-rules';

export const dynamic = 'force-dynamic';

export default async function RepresentativeHomePage() {
  const ctx = await getRepresentativeContext();
  if (!ctx) notFound();
  const { representative } = ctx;

  // Somente leitura, pelo cliente DO USUÁRIO: a RLS limita ao próprio representante.
  const supabase = await createServerSideClient();
  const { data: balance } = await (supabase as any)
    .from('commercial_representative_balances')
    .select('earned_cents, paid_cents, owed_cents')
    .eq('representative_id', representative.id)
    .maybeSingle();

  const canOperate = representativeScopeAllows(representative.status, 'operational');

  return (
    <div className="space-y-8">
      <section aria-labelledby="saldo-titulo" className="space-y-3">
        <h2 id="saldo-titulo" className="text-xl font-serif font-bold text-[#3B0B14]">
          Resumo financeiro
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Comissões registradas', value: balance?.earned_cents },
            { label: 'Já repassado', value: balance?.paid_cents },
            { label: 'Saldo a receber', value: balance?.owed_cents },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-[#E8E5DF] bg-white p-5 shadow-xs">
              <p className="text-xs font-semibold text-stone-500">{card.label}</p>
              <p className="mt-1 text-2xl font-bold text-[#3B0B14] tabular-nums">{formatCentsBRL(card.value)}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-stone-500">
          Valores calculados sobre o que foi efetivamente recebido, conforme as condições acordadas em contrato.
        </p>
      </section>

      <section aria-labelledby="dados-titulo" className="space-y-3">
        <h2 id="dados-titulo" className="text-xl font-serif font-bold text-[#3B0B14]">
          Seus dados
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-[#E8E5DF] bg-white p-5 text-sm">
          <div>
            <dt className="text-xs font-semibold text-stone-500">Nome</dt>
            <dd className="font-semibold">{representative.legal_name}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-stone-500">E-mail</dt>
            <dd className="font-semibold break-all">{representative.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-stone-500">Documento</dt>
            <dd className="font-semibold">{representative.document_last4 ? `final ${representative.document_last4}` : 'não informado'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-stone-500">Seu código de indicação</dt>
            <dd className="font-mono font-bold">{representative.referral_code}</dd>
          </div>
        </dl>
      </section>

      {canOperate && (
        <section aria-labelledby="proximos-titulo" className="rounded-2xl border border-dashed border-[#C9A227]/60 bg-white p-5">
          <h2 id="proximos-titulo" className="text-base font-serif font-bold text-[#3B0B14]">
            Indicações e documentos
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            O cadastro de indicações (leads) e o envio de documentos serão liberados na próxima etapa do módulo.
          </p>
        </section>
      )}
    </div>
  );
}
