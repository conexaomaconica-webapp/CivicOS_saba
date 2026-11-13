import React from 'react';
import { notFound } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { getStaffContext, staffCan } from '@/lib/commercial/commercial-auth';

export const dynamic = 'force-dynamic';

async function count(supabase: any, table: string, filter: (q: any) => any, tenantId: string): Promise<number | null> {
  const { count: total, error } = await filter(supabase.from(table).select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId));
  return error ? null : (total ?? 0);
}

export default async function CommercialHomePage() {
  const ctx = await getStaffContext();
  if (!ctx) notFound();

  // Contagens pelo cliente DO USUÁRIO: a RLS só devolve o que a permissão cobre (senão aparece "—").
  const supabase = await createServerSideClient();
  const [active, review, leads, pending] = await Promise.all([
    staffCan(ctx, 'representatives.read') ? count(supabase, 'commercial_representatives', (q) => q.eq('status', 'active'), ctx.tenantId) : null,
    staffCan(ctx, 'representatives.read') ? count(supabase, 'commercial_representatives', (q) => q.in('status', ['invited', 'pending_review']), ctx.tenantId) : null,
    staffCan(ctx, 'leads.manage') ? count(supabase, 'commercial_leads', (q) => q.in('status', ['new', 'contacted', 'qualified', 'proposal']), ctx.tenantId) : null,
    staffCan(ctx, 'attributions.manage') ? count(supabase, 'commercial_attributions', (q) => q.eq('status', 'pending'), ctx.tenantId) : null,
  ]);

  const cards = [
    { label: 'Representantes ativos', value: active },
    { label: 'Aguardando ativação', value: review },
    { label: 'Indicações em andamento', value: leads },
    { label: 'Atribuições pendentes', value: pending },
  ];

  return (
    <div className="space-y-8">
      <section aria-labelledby="resumo-titulo" className="space-y-3">
        <h2 id="resumo-titulo" className="text-xl font-serif font-bold text-[#3B0B14]">Resumo</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <div key={c.label} className="rounded-2xl border border-[#E8E5DF] bg-white p-5 shadow-xs">
              <p className="text-xs font-semibold text-stone-500">{c.label}</p>
              <p className="mt-1 text-3xl font-bold text-[#3B0B14] tabular-nums">{c.value ?? '—'}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-dashed border-[#C9A227]/60 bg-white p-5 text-sm text-stone-600 space-y-1">
        <p className="font-semibold text-[#3B0B14]">Como funciona</p>
        <p>1. Cadastre o representante (ele é vinculado ao usuário existente pelo e-mail, ou convidado).</p>
        <p>2. Ative o representante após conferir contrato e documento.</p>
        <p>3. O representante cadastra indicações; você as converte em anunciante, preservando a origem.</p>
        <p>As comissões e os repasses serão liberados nas próximas etapas do módulo.</p>
      </section>
    </div>
  );
}
