'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Loader2, Mail, Save, UserRound } from 'lucide-react';
import { createAdminAdvertiserAction } from '@/lib/admin/admin-advertiser-create-service';

interface Option { id: string; name: string }
interface PlanOption { code: string; title: string }

export default function AdvertiserCreateForm({ tenants, categories, plans }: {
  tenants: Option[];
  categories: Option[];
  plans: PlanOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const temporaryPassword = String(data.get('temporaryPassword') ?? '');
    const confirmTemporaryPassword = String(data.get('confirmTemporaryPassword') ?? '');
    if (temporaryPassword !== confirmTemporaryPassword) {
      setError('A confirmação da senha temporária não confere.');
      setLoading(false);
      return;
    }
    const result = await createAdminAdvertiserAction({
      tenantId: String(data.get('tenantId') ?? ''),
      responsibleName: String(data.get('responsibleName') ?? ''),
      responsibleEmail: String(data.get('responsibleEmail') ?? ''),
      temporaryPassword,
      tradingName: String(data.get('tradingName') ?? ''),
      legalName: String(data.get('legalName') ?? ''),
      cnpj: String(data.get('cnpj') ?? ''),
      phone: String(data.get('phone') ?? ''),
      categoryId: String(data.get('categoryId') ?? ''),
      planCode: String(data.get('planCode') ?? ''),
    });
    if (!result.success || !result.businessId) {
      setError(result.error ?? 'Não foi possível cadastrar o anunciante.');
      setLoading(false);
      return;
    }
    router.push(`/admin/empresas/${result.businessId}`);
    router.refresh();
  }

  const inputClass = 'w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-[#3B0B14] focus:ring-2 focus:ring-[#3B0B14]/10';
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-2xl border border-stone-300 bg-white p-5 shadow-xs">
        <h2 className="mb-4 flex items-center gap-2 font-serif text-lg font-bold text-stone-900"><UserRound className="h-5 w-5 text-[#3B0B14]" /> Responsável pelo anúncio</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-xs font-bold text-stone-700">Nome completo<input required name="responsibleName" className={inputClass} /></label>
          <label className="space-y-1.5 text-xs font-bold text-stone-700">E-mail<input required type="email" name="responsibleEmail" className={inputClass} /></label>
          <label className="space-y-1.5 text-xs font-bold text-stone-700">Senha temporária<input required minLength={8} type={showPassword ? 'text' : 'password'} name="temporaryPassword" autoComplete="new-password" className={inputClass} /></label>
          <label className="space-y-1.5 text-xs font-bold text-stone-700">Confirmar senha temporária<input required minLength={8} type={showPassword ? 'text' : 'password'} name="confirmTemporaryPassword" autoComplete="new-password" className={inputClass} /></label>
        </div>
        <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-xs font-semibold text-stone-600"><input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} /> Mostrar senha</label>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-stone-500"><Mail className="h-3.5 w-3.5" /> Para contas novas, o acesso é liberado com esta senha e marcado para troca. Se o e-mail já existir, a senha atual não será alterada.</p>
      </section>

      <section className="rounded-2xl border border-stone-300 bg-white p-5 shadow-xs">
        <h2 className="mb-4 flex items-center gap-2 font-serif text-lg font-bold text-stone-900"><Building2 className="h-5 w-5 text-[#3B0B14]" /> Dados da empresa</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-xs font-bold text-stone-700">Nome fantasia<input required name="tradingName" className={inputClass} /></label>
          <label className="space-y-1.5 text-xs font-bold text-stone-700">Razão social<input required name="legalName" className={inputClass} /></label>
          <label className="space-y-1.5 text-xs font-bold text-stone-700">CNPJ<input required name="cnpj" inputMode="numeric" placeholder="00.000.000/0000-00" className={inputClass} /></label>
          <label className="space-y-1.5 text-xs font-bold text-stone-700">Telefone<input name="phone" placeholder="(00) 00000-0000" className={inputClass} /></label>
          <label className="space-y-1.5 text-xs font-bold text-stone-700">Tenant<select required name="tenantId" defaultValue={tenants.length === 1 ? tenants[0]?.id : ''} className={inputClass}><option value="">Selecione</option>{tenants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="space-y-1.5 text-xs font-bold text-stone-700">Categoria<select required name="categoryId" defaultValue="" className={inputClass}><option value="">Selecione</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="space-y-1.5 text-xs font-bold text-stone-700 md:col-span-2">Plano comercial<select required name="planCode" defaultValue="" className={inputClass}><option value="">Selecione</option>{plans.map((item) => <option key={item.code} value={item.code}>{item.title}</option>)}</select></label>
        </div>
      </section>

      {error && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div>}
      <div className="flex justify-end gap-3">
        <Link href="/admin/empresas" className="rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-bold text-stone-700 hover:bg-stone-50">Cancelar</Link>
        <button disabled={loading} className="flex items-center gap-2 rounded-xl bg-[#3B0B14] px-5 py-2.5 text-sm font-extrabold text-[#C9A227] disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Cadastrar anunciante
        </button>
      </div>
    </form>
  );
}
