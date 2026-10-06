'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Loader2, Wand2 } from 'lucide-react';
import {
  convertSignupInviteAction,
  type InviteListItem,
} from '@/lib/onboarding/signup-invite-service';
import { createAdminBusinessCategoryAction } from '@/lib/admin/admin-businesses-service';
import { MASONIC_RELATION_LABEL, MASONIC_RELATIONS } from '@/lib/onboarding/signup-invite-shared';
import type { SignupSubmission } from '@/lib/onboarding/signup-invite-core';
import { AdminLodgeNameCombobox } from '@/components/admin/AdminLodgeNameCombobox';
import { AdminPotencyCombobox } from '@/components/admin/AdminPotencyCombobox';
import { formatCpfCnpj, formatPhone } from '@/lib/onboarding/onboarding-validation';

const PLANS = [
  { code: 'esquadro', label: 'Plano Esquadro' },
  { code: 'compasso', label: 'Plano Compasso' },
  { code: 'acacia', label: 'Plano Acácia' },
];

const inputClass = 'w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#3B0B14] focus:ring-2 focus:ring-[#3B0B14]/10';

function randomPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  return `${Array.from(bytes, (n) => alphabet[n % alphabet.length]).join('')}#7`;
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1 text-xs font-bold text-stone-700">
      <span>{label}</span>
      {children}
      {hint && <span className="block text-[11px] font-normal text-stone-500">{hint}</span>}
    </label>
  );
}

export default function ReviewClient({
  tenantId,
  invite,
  categories: initialCategories,
}: {
  tenantId: string;
  invite: InviteListItem & { submitted_data: SignupSubmission | null };
  categories: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const submitted = invite.submitted_data;
  const [data, setData] = useState<SignupSubmission | null>(submitted);
  const [categories, setCategories] = useState(initialCategories);
  const [categoryId, setCategoryId] = useState(submitted?.categoryId || '');
  const [creatingCategory, setCreatingCategory] = useState(false);
  // Se o cliente escolheu a Loja na lista, já vem identificada (a equipe pode trocar abaixo).
  const [organizationId, setOrganizationId] = useState<string | undefined>(submitted?.lodgeOrganizationId || undefined);
  const [planCode, setPlanCode] = useState('esquadro');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ businessId: string; warnings: string[] } | null>(null);

  if (!data) {
    return <p className="rounded-xl border border-stone-300 bg-white p-4 text-sm text-stone-600">Este convite ainda não recebeu dados do cliente.</p>;
  }
  const set = <K extends keyof SignupSubmission>(key: K, value: SignupSubmission[K]) => setData((current) => (current ? { ...current, [key]: value } : current));

  async function createSuggestedCategory() {
    if (!data?.categoryOther) return;
    setCreatingCategory(true);
    setError(null);
    // A ação devolve a categoria existente quando o nome já está no catálogo (não duplica).
    const res = await createAdminBusinessCategoryAction(tenantId, data.categoryOther);
    setCreatingCategory(false);
    if (!res.success || !res.category) {
      setError(res.error || 'Não foi possível criar a categoria.');
      return;
    }
    const created = res.category;
    setCategories((current) => [...current.filter((c) => c.id !== created.id), created].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
    setCategoryId(created.id);
  }

  async function convert() {
    if (!data) return;
    setError(null);
    setBusy(true);
    const res = await convertSignupInviteAction({
      inviteId: invite.id,
      data,
      categoryId,
      planCode,
      temporaryPassword: password,
      organizationId,
    });
    setBusy(false);
    if (!res.success || !res.businessId) {
      setError(res.error || 'Não foi possível criar o cadastro.');
      return;
    }
    setResult({ businessId: res.businessId, warnings: res.warnings || [] });
    router.refresh();
  }

  if (result) {
    return (
      <div className="space-y-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-6">
        <h2 className="flex items-center gap-2 font-serif text-xl font-bold text-emerald-900"><CheckCircle2 className="h-5 w-5" /> Cadastro criado</h2>
        <p className="text-sm text-emerald-900">
          A empresa está em rascunho e o vínculo maçônico ficou pendente. Entregue ao responsável o e-mail de acesso e a senha
          temporária definida aqui (ele deverá trocá-la no primeiro acesso).
        </p>
        {result.warnings.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm font-semibold text-amber-800">
            {result.warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/empresas/${result.businessId}/vinculo-maconico`} className="rounded-xl bg-[#3B0B14] px-4 py-2 text-sm font-bold text-[#C9A227]">Conferir o vínculo maçônico</Link>
          <Link href={`/admin/empresas/${result.businessId}`} className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-bold text-stone-700">Abrir a empresa</Link>
        </div>
      </div>
    );
  }

  const notReady = invite.status !== 'submitted';

  return (
    <div className="space-y-6">
      {notReady && <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900">Este convite não está aguardando conferência (situação: {invite.status}).</p>}
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p>}

      <section className="space-y-4 rounded-2xl border border-stone-300 bg-white p-5 shadow-xs">
        <h2 className="font-serif text-lg font-bold text-stone-900">Responsável</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome"><input className={inputClass} value={data.responsibleName} onChange={(e) => set('responsibleName', e.target.value)} /></Field>
          <Field label="E-mail (acesso ao painel)"><input type="email" className={inputClass} value={data.responsibleEmail} onChange={(e) => set('responsibleEmail', e.target.value)} /></Field>
          <Field label="Telefone"><input className={inputClass} value={data.responsiblePhone} onChange={(e) => set('responsiblePhone', formatPhone(e.target.value))} /></Field>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-stone-300 bg-white p-5 shadow-xs">
        <h2 className="font-serif text-lg font-bold text-stone-900">Empresa</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome fantasia"><input className={inputClass} value={data.tradingName} onChange={(e) => set('tradingName', e.target.value)} /></Field>
          <Field label="Razão social"><input className={inputClass} value={data.legalName} onChange={(e) => set('legalName', e.target.value)} /></Field>
          <Field label="CNPJ / CPF"><input className={inputClass} value={formatCpfCnpj(data.document)} onChange={(e) => set('document', e.target.value.replace(/\D/g, '').slice(0, 14))} /></Field>
          <Field label="Telefone da empresa"><input className={inputClass} value={data.businessPhone} onChange={(e) => set('businessPhone', formatPhone(e.target.value))} /></Field>
          <Field label="E-mail público"><input className={inputClass} value={data.publicEmail} onChange={(e) => set('publicEmail', e.target.value)} /></Field>
          <Field label="Site"><input className={inputClass} value={data.website} onChange={(e) => set('website', e.target.value)} /></Field>
        </div>

        <Field label="Categoria (catálogo)" hint={data.categoryOther ? `O cliente sugeriu: “${data.categoryOther}”. Escolha uma da lista ou crie a sugerida (só é criada se não existir).` : undefined}>
          <select className={inputClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Selecione uma categoria</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        {data.categoryOther && (
          <button type="button" onClick={createSuggestedCategory} disabled={creatingCategory} className="inline-flex items-center gap-1.5 rounded-lg border border-[#3B0B14] px-3 py-1.5 text-xs font-bold text-[#3B0B14] disabled:opacity-60">
            {creatingCategory && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Criar “{data.categoryOther}” e selecionar
          </button>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-stone-300 bg-white p-5 shadow-xs">
        <h2 className="font-serif text-lg font-bold text-stone-900">Endereço</h2>
        <div className="grid gap-4 sm:grid-cols-6">
          <div className="sm:col-span-2"><Field label="CEP"><input className={inputClass} value={data.postalCode} onChange={(e) => set('postalCode', e.target.value)} /></Field></div>
          <div className="sm:col-span-4"><Field label="Rua"><input className={inputClass} value={data.street} onChange={(e) => set('street', e.target.value)} /></Field></div>
          <div className="sm:col-span-2"><Field label="Número"><input className={inputClass} value={data.number} onChange={(e) => set('number', e.target.value)} /></Field></div>
          <div className="sm:col-span-4"><Field label="Bairro"><input className={inputClass} value={data.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} /></Field></div>
          <div className="sm:col-span-4"><Field label="Cidade"><input className={inputClass} value={data.city} onChange={(e) => set('city', e.target.value)} /></Field></div>
          <div className="sm:col-span-2"><Field label="UF"><input className={inputClass} maxLength={2} value={data.state} onChange={(e) => set('state', e.target.value.toUpperCase())} /></Field></div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-stone-300 bg-white p-5 shadow-xs">
        <h2 className="font-serif text-lg font-bold text-stone-900">Vínculo maçônico (declarado pelo cliente)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Relação">
            <select className={inputClass} value={data.masonicRelation} onChange={(e) => set('masonicRelation', e.target.value as SignupSubmission['masonicRelation'])}>
              {MASONIC_RELATIONS.map((key) => <option key={key} value={key}>{MASONIC_RELATION_LABEL[key]}</option>)}
            </select>
          </Field>
          <Field label="Maçom de referência"><input className={inputClass} value={data.referenceMasonName} onChange={(e) => set('referenceMasonName', e.target.value)} /></Field>
          <Field label="CIM"><input className={inputClass} value={data.referenceMasonCim} onChange={(e) => set('referenceMasonCim', e.target.value)} /></Field>
          <Field label="Potência"><AdminPotencyCombobox value={data.potency} onChange={(v) => set('potency', v)} className={inputClass} /></Field>
          <div className="sm:col-span-2">
            <Field label="Loja Maçônica" hint="Escolha a loja na lista para identificá-la no cadastro; se não existir, será criada uma básica.">
              <AdminLodgeNameCombobox
                value={data.lodgeName}
                onChange={(v) => set('lodgeName', v)}
                onPick={(lodge) => {
                  setOrganizationId(lodge?.id);
                  if (lodge?.potency) set('potency', lodge.potency);
                }}
                className={inputClass}
              />
            </Field>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-stone-300 bg-white p-5 shadow-xs">
        <h2 className="font-serif text-lg font-bold text-stone-900">Plano e acesso (definidos pela equipe)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Plano">
            <select className={inputClass} value={planCode} onChange={(e) => setPlanCode(e.target.value)}>
              {PLANS.map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}
            </select>
          </Field>
          <Field label="Senha temporária do responsável" hint="Mínimo exigido pela plataforma. Ele troca no primeiro acesso.">
            <div className="flex gap-2">
              <input className={`${inputClass} font-mono`} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
              <button type="button" onClick={() => setPassword(randomPassword())} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-stone-300 px-3 text-xs font-bold text-stone-700">
                <Wand2 className="h-4 w-4" /> Gerar
              </button>
            </div>
          </Field>
        </div>
      </section>

      <button
        type="button"
        onClick={convert}
        disabled={busy || notReady || !categoryId || !password}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#3B0B14] px-5 text-sm font-bold text-[#C9A227] disabled:opacity-50"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Dados conferidos: criar cadastro
      </button>
    </div>
  );
}
