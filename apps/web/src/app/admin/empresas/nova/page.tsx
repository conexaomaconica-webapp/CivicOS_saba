import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { resolveCanonicalAdminTenant } from '@/lib/admin/admin-tenant-context';
import { getPedraFundamentalQuotaAction } from '@/app/actions/institutional-recognitions';
import AdvertiserCreateForm from './advertiser-create-form';

export const metadata: Metadata = { title: 'Cadastrar anunciante', robots: { index: false, follow: false } };

export default async function NewAdminAdvertiserPage() {
  const { supabase, tenantId: currentTenantId } = await resolveCanonicalAdminTenant();

  const [{ data: categories }, { data: planRows }, { count: pedraCount }, quotaRes] = await Promise.all([
    (supabase as any).from('categories').select('id, name').eq('is_active', true).order('display_order'),
    (supabase as any).from('plan_payment_rules').select('plan_code, title, amount_cents').order('amount_cents'),
    (supabase as any)
      .from('business_recognitions')
      .select('id', { count: 'exact', head: true })
      .eq('recognition_key', 'pedra_fundamental')
      .eq('is_active', true),
    getPedraFundamentalQuotaAction(),
  ]);

  // Lista canônica oficial dos 3 planos vigentes no Conexão Maçônica
  const CANONICAL_PLANS = [
    { code: 'esquadro', title: 'Plano Esquadro', order: 1 },
    { code: 'compasso', title: 'Plano Compasso', order: 2 },
    { code: 'acacia', title: 'Plano Acácia', order: 3 },
  ];

  // Enriquecer com títulos do banco se existirem, garantindo unicidade estrita
  const plans = CANONICAL_PLANS.map((cp) => {
    const dbMatch = (planRows ?? []).find(
      (r: any) => (r.plan_code || '').toLowerCase().trim() === cp.code
    );
    return {
      code: cp.code,
      title: dbMatch?.title || cp.title,
    };
  });

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="border-b border-stone-300 pb-4">
        <Link href="/admin/empresas" className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-[#3B0B14]"><ArrowLeft className="h-4 w-4" /> Voltar para empresas</Link>
        <h1 className="font-serif text-3xl font-bold text-stone-900">Cadastrar anunciante</h1>
        <p className="mt-1 text-sm text-stone-600">Crie um rascunho vinculado ao responsável. Aprovação e publicação continuam sujeitas ao dossiê obrigatório.</p>
      </div>
      <AdvertiserCreateForm
        tenantId={currentTenantId}
        categories={categories ?? []}
        plans={plans}
        pedraFundamentalCount={pedraCount ?? 0}
        pedraFundamentalQuota={quotaRes?.quota || 50}
      />
    </main>
  );
}
