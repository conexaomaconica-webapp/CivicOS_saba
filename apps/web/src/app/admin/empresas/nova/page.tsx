import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { assertPlatformAdminAccess } from '@/lib/admin/admin-auth-helper';
import AdvertiserCreateForm from './advertiser-create-form';

export const metadata: Metadata = { title: 'Cadastrar anunciante', robots: { index: false, follow: false } };

export default async function NewAdminAdvertiserPage() {
  const { supabase } = await assertPlatformAdminAccess();
  const [{ data: tenants }, { data: categories }, { data: planRows }] = await Promise.all([
    (supabase as any).from('tenants').select('id, name').order('name'),
    (supabase as any).from('categories').select('id, name').eq('is_active', true).order('display_order'),
    (supabase as any).from('plan_payment_rules').select('plan_code, title').order('amount_cents'),
  ]);
  const plans = Array.from(new Map((planRows ?? []).map((row: any) => [row.plan_code, { code: row.plan_code, title: row.title || row.plan_code }])).values()) as Array<{ code: string; title: string }>;

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="border-b border-stone-300 pb-4">
        <Link href="/admin/empresas" className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-[#3B0B14]"><ArrowLeft className="h-4 w-4" /> Voltar para empresas</Link>
        <h1 className="font-serif text-3xl font-bold text-stone-900">Cadastrar anunciante</h1>
        <p className="mt-1 text-sm text-stone-600">Crie um rascunho vinculado ao responsável. Aprovação e publicação continuam sujeitas ao dossiê obrigatório.</p>
      </div>
      <AdvertiserCreateForm tenants={tenants ?? []} categories={categories ?? []} plans={plans} />
    </main>
  );
}
