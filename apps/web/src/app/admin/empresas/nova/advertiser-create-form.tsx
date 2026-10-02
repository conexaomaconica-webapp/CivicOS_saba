'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Loader2,
  Mail,
  Save,
  UserRound,
  Award,
  Sparkles,
  Clock,
  CreditCard,
  CheckCircle2,
} from 'lucide-react';
import { createAdminAdvertiserAction } from '@/lib/admin/admin-advertiser-create-service';
import { formatCpfCnpj, formatPhone } from '@/lib/onboarding/onboarding-validation';

interface Option { id: string; name: string }
interface PlanOption { code: string; title: string }

export default function AdvertiserCreateForm({
  tenantId,
  categories,
  plans,
  pedraFundamentalCount = 0,
  pedraFundamentalQuota = 50,
}: {
  tenantId: string;
  categories: Option[];
  plans: PlanOption[];
  pedraFundamentalCount?: number;
  pedraFundamentalQuota?: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [paymentCondition, setPaymentCondition] = useState<'avista_1200' | 'parcelado_4x325'>('avista_1200');
  const [cnpjCpf, setCnpjCpf] = useState('');
  const [phone, setPhone] = useState('');

  const isPromoPlan = selectedPlan === 'acacia_pedra_fundamental';
  const remainingPromoSpots = Math.max(0, pedraFundamentalQuota - pedraFundamentalCount);

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
      tenantId: String(data.get('tenantId') || tenantId),
      responsibleName: String(data.get('responsibleName') ?? ''),
      responsibleEmail: String(data.get('responsibleEmail') ?? ''),
      temporaryPassword,
      tradingName: String(data.get('tradingName') ?? ''),
      legalName: String(data.get('legalName') ?? ''),
      cnpj: cnpjCpf || String(data.get('cnpj') ?? ''),
      phone: phone || String(data.get('phone') ?? ''),
      categoryId: String(data.get('categoryId') ?? ''),
      planCode: selectedPlan,
      paymentCondition: isPromoPlan ? paymentCondition : undefined,
      closingNotes: isPromoPlan ? String(data.get('closingNotes') ?? '') : undefined,
    });

    if (!result.success || !result.businessId) {
      setError(result.error ?? 'Empresa criada, mas não foi possível identificar o cadastro.');
      setLoading(false);
      return;
    }

    router.push(`/admin/empresas/${result.businessId}/vinculo-maconico`);
    router.refresh();
  }

  const inputClass =
    'w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-[#3B0B14] focus:ring-2 focus:ring-[#3B0B14]/10';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input type="hidden" name="tenantId" value={tenantId} />

      {/* Dados do Responsável */}
      <section className="rounded-2xl border border-stone-300 bg-white p-5 shadow-xs">
        <h2 className="mb-4 flex items-center gap-2 font-serif text-lg font-bold text-stone-900">
          <UserRound className="h-5 w-5 text-[#3B0B14]" /> Responsável pelo anúncio
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-xs font-bold text-stone-700">
            Nome completo
            <input required name="responsibleName" className={inputClass} />
          </label>
          <label className="space-y-1.5 text-xs font-bold text-stone-700">
            E-mail
            <input required type="email" name="responsibleEmail" className={inputClass} />
          </label>
          <label className="space-y-1.5 text-xs font-bold text-stone-700">
            Senha temporária
            <input
              required
              minLength={8}
              type={showPassword ? 'text' : 'password'}
              name="temporaryPassword"
              autoComplete="new-password"
              className={inputClass}
            />
          </label>
          <label className="space-y-1.5 text-xs font-bold text-stone-700">
            Confirmar senha temporária
            <input
              required
              minLength={8}
              type={showPassword ? 'text' : 'password'}
              name="confirmTemporaryPassword"
              autoComplete="new-password"
              className={inputClass}
            />
          </label>
        </div>
        <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-xs font-semibold text-stone-600">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(event) => setShowPassword(event.target.checked)}
          />{' '}
          Mostrar senha
        </label>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-stone-500">
          <Mail className="h-3.5 w-3.5" /> Para contas novas, o acesso é liberado com esta senha e marcado para troca.
          Se o e-mail já existir, a senha atual não será alterada.
        </p>
      </section>

      {/* Dados da Empresa & Plano */}
      <section className="rounded-2xl border border-stone-300 bg-white p-5 shadow-xs space-y-4">
        <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-stone-900">
          <Building2 className="h-5 w-5 text-[#3B0B14]" /> Dados da empresa e plano
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-xs font-bold text-stone-700">
            Nome fantasia
            <input required name="tradingName" className={inputClass} />
          </label>
          <label className="space-y-1.5 text-xs font-bold text-stone-700">
            Razão social
            <input required name="legalName" className={inputClass} />
          </label>
          <label className="space-y-1.5 text-xs font-bold text-stone-700">
            CNPJ ou CPF
            <input
              required
              name="cnpj"
              value={cnpjCpf}
              onChange={(e) => setCnpjCpf(formatCpfCnpj(e.target.value))}
              inputMode="numeric"
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              className={inputClass}
            />
          </label>
          <label className="space-y-1.5 text-xs font-bold text-stone-700">
            Telefone / WhatsApp
            <input
              name="phone"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              inputMode="tel"
              placeholder="(00) 00000-0000"
              className={inputClass}
            />
          </label>
          <label className="space-y-1.5 text-xs font-bold text-stone-700">
            Categoria
            <select required name="categoryId" defaultValue="" className={inputClass}>
              <option value="">Selecione uma categoria</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 text-xs font-bold text-stone-700">
            Plano comercial
            <select
              required
              name="planCode"
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className={inputClass}
            >
              <option value="">Selecione o plano</option>
              {plans.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.title}
                </option>
              ))}
              <option value="acacia_pedra_fundamental" className="font-bold text-[#3B0B14]">
                ⭐ Plano Acácia — Promoção 2 Anos + Pedra Fundamental ({pedraFundamentalQuota} Primeiros Anunciantes)
              </option>
            </select>
          </label>
        </div>

        {/* Card Exclusivo da Promoção de Lançamento (50 Primeiros Anunciantes) */}
        {isPromoPlan && (
          <div className="mt-4 rounded-xl border border-amber-900/30 bg-gradient-to-br from-[#faf6ed] to-[#f4ebe1] p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-900/15 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3B0B14] text-[#C9A227]">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#3B0B14]">
                    Condição Especial de Lançamento — {pedraFundamentalQuota} Primeiros Anunciantes
                  </h3>
                  <p className="text-xs text-amber-950/80">
                    Exclusivo do administrador no fechamento de contratos pioneiros.
                  </p>
                </div>
              </div>

              {/* Contador de Vagas */}
              <div className="flex items-center gap-2 self-start sm:self-auto bg-white/80 border border-amber-900/20 px-3 py-1.5 rounded-lg text-xs">
                <Award className="h-4 w-4 text-[#C9A227]" />
                <span className="font-semibold text-stone-700">
                  <strong className="text-[#3B0B14]">{pedraFundamentalCount}</strong> de {pedraFundamentalQuota} vagas preenchidas
                </span>
                <span className="text-amber-800 font-bold">({remainingPromoSpots} restantes)</span>
              </div>
            </div>

            {/* Benefícios inclusos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-start gap-2 bg-white/70 p-3 rounded-lg border border-amber-900/10">
                <Clock className="h-4 w-4 text-amber-900 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-stone-900 block">Vigência de 2 Anos (Bienal)</strong>
                  <span className="text-stone-600">24 meses de Plano Acácia ativo com prioridade máxima no Guia.</span>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-white/70 p-3 rounded-lg border border-amber-900/10">
                <Award className="h-4 w-4 text-[#C9A227] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-stone-900 block">Outorga Pedra Fundamental</strong>
                  <span className="text-stone-600">
                    Selo institucional histórico concedido automaticamente no dossiê da empresa.
                  </span>
                </div>
              </div>
            </div>

            {/* Condição de Pagamento do Fechamento */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-stone-800">
                Condição comercial acordada no fechamento:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    paymentCondition === 'avista_1200'
                      ? 'border-[#3B0B14] bg-[#3B0B14]/5 ring-1 ring-[#3B0B14]'
                      : 'border-stone-200 bg-white hover:border-amber-900/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentConditionRadio"
                    value="avista_1200"
                    checked={paymentCondition === 'avista_1200'}
                    onChange={() => setPaymentCondition('avista_1200')}
                    className="mt-0.5 text-[#3B0B14] focus:ring-[#3B0B14]"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-xs font-bold text-stone-900">À vista (PIX / Boleto)</span>
                    </div>
                    <span className="text-sm font-extrabold text-[#3B0B14] block mt-0.5">R$ 1.200,00</span>
                    <span className="text-[11px] text-stone-500 block mt-0.5">Pagamento único para os 2 anos</span>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    paymentCondition === 'parcelado_4x325'
                      ? 'border-[#3B0B14] bg-[#3B0B14]/5 ring-1 ring-[#3B0B14]'
                      : 'border-stone-200 bg-white hover:border-amber-900/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentConditionRadio"
                    value="parcelado_4x325"
                    checked={paymentCondition === 'parcelado_4x325'}
                    onChange={() => setPaymentCondition('parcelado_4x325')}
                    className="mt-0.5 text-[#3B0B14] focus:ring-[#3B0B14]"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-amber-900" />
                      <span className="text-xs font-bold text-stone-900">Parcelado em até 4x</span>
                    </div>
                    <span className="text-sm font-extrabold text-[#3B0B14] block mt-0.5">4x de R$ 325,00</span>
                    <span className="text-[11px] text-stone-500 block mt-0.5">Total de R$ 1.300,00</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Observações do Fechamento */}
            <div className="pt-1">
              <label className="block text-xs font-bold text-stone-800 mb-1">
                Notas do fechamento (opcional):
              </label>
              <input
                type="text"
                name="closingNotes"
                placeholder="Ex: Negociado com Ir. Silva · Loja Fraternidade nº 42 · Contrato assinado"
                className="w-full rounded-lg border border-amber-900/20 bg-white px-3 py-2 text-xs text-stone-800 placeholder:text-stone-400 focus:border-[#3B0B14] focus:outline-none"
              />
            </div>
          </div>
        )}
      </section>

      {error && (
        <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Link
          href="/admin/empresas"
          className="rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-bold text-stone-700 hover:bg-stone-50"
        >
          Cancelar
        </Link>
        <button
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-[#3B0B14] px-5 py-2.5 text-sm font-extrabold text-[#C9A227] disabled:opacity-60 shadow-sm hover:brightness-110 transition-all"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isPromoPlan ? 'Cadastrar Acácia + Pedra Fundamental' : 'Cadastrar anunciante'}
        </button>
      </div>
    </form>
  );
}
