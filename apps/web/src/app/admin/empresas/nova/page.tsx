import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { assertPlatformAdminAccess } from '@/lib/admin/admin-auth-helper';
import AdvertiserCreateForm from './advertiser-create-form';

export const metadata: Metadata = { title: 'Cadastrar anunciante', robots: { index: false, follow: false } };

export default async function NewAdminAdvertiserPage() {
  const { supabase, user } = await assertPlatformAdminAccess();

  const [{ data: profile }, { data: categories }, { data: planRows }] = await Promise.all([
    (supabase as any).from('profiles').select('tenant_id').eq('id', user.id).maybeSingle(),
    (supabase as any).from('categories').select('id, name').eq('is_active', true).order('display_order'),
    (supabase as any).from('plan_payment_rules').select('plan_code, title, amount_cents').order('amount_cents'),
  ]);

  const currentTenantId = profile?.tenant_id || '00000000-0000-0000-0000-000000000010';

  // Desduplica planos por título e padroniza para os códigos canônicos vigentes
  const CANONICAL_MAP: Record<string, { code: string; title: string; order: number }> = {
    esquadro: { code: 'esquadro', title: 'Plano Esquadro', order: 1 },
    bronze: { code: 'esquadro', title: 'Plano Esquadro', order: 1 },
    compasso: { code: 'compasso', title: 'Plano Compasso', order: 2 },
    prata: { code: 'compasso', title: 'Plano Compasso', order: 2 },
    acacia: { code: 'acacia', title: 'Plano Acácia', order: 3 },
    ouro: { code: 'acacia', title: 'Plano Acácia', order: 3 },
  };

  const planMap = new Map<string, { code: string; title: string; order: number }>();
  for (const row of planRows ?? []) {
    const rawCode = (row.plan_code || '').toLowerCase().trim();
    const canonical = CANONICAL_MAP[rawCode] || {
      code: row.plan_code,
      title: row.title || row.plan_code,
      order: 99,
    };
    if (!planMap.has(canonical.title)) {
      planMap.set(canonical.title, canonical);
    }
  }

  const plans = Array.from(planMap.values())
    .sort((a, b) => a.order - b.order)
    .map(({ code, title }) => ({ code, title }));

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="border-b border-stone-300 pb-4">
        <Link href="/admin/empresas" className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-[#3B0B14]"><ArrowLeft className="h-4 w-4" /> Voltar para empresas</Link>
        <h1 className="font-serif text-3xl font-bold text-stone-900">Cadastrar anunciante</h1>
        <p className="mt-1 text-sm text-stone-600">Crie um rascunho vinculado ao responsável. Aprovação e publicação continuam sujeitas ao dossiê obrigatório.</p>
      </div>
      <AdvertiserCreateForm tenantId={currentTenantId} categories={categories ?? []} plans={plans} />
    </main>
  );
}
