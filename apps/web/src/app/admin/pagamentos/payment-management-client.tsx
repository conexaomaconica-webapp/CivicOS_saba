'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  DollarSign,
  Search,
  Filter,
  ArrowRight,
  Sparkles,
  Clock,
  AlertTriangle,
  Loader2,
  FileText,
  Calendar,
  Tag,
  RotateCcw,
} from 'lucide-react';
import {
  getAdminPaymentsDashboardAction,
  reprocessPaymentWebhookAction,
  confirmPaymentManuallyAction,
  AdminPaymentsDashboardDTO,
  AdminPaymentListItem,
} from '@/lib/admin/admin-payments-service';
import { getCommercialPlanName } from '@/lib/admin/approval-display';
import { systemConfirm } from '@/components/system/SystemFeedback';
import { formatDateBR } from '@/lib/format/datetime-br';

export interface PaymentManagementClientProps {
  isAsaasConfigured: boolean;
  asaasEnvironment: string;
}

function renderConditionBadges(item: AdminPaymentListItem, align: 'center' | 'start' = 'center') {
  const hasAny =
    item.commercial_modality !== 'padrao' ||
    item.is_pedra_fundamental ||
    item.has_discount;
  if (!hasAny) return null;

  return (
    <div className={`flex flex-wrap items-center ${align === 'center' ? 'justify-center' : 'justify-start'} gap-1 mt-1`}>
      {item.commercial_modality === 'permuta_100' && (
        <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300 font-bold text-[10px]">
          Permuta 100%
        </span>
      )}
      {item.commercial_modality === 'parceria' && (
        <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-900 border border-sky-300 font-bold text-[10px]">
          Parceria 100%
        </span>
      )}
      {item.commercial_modality === 'permuta_50' && (
        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px]">
          Permuta 50%
        </span>
      )}
      {item.is_pedra_fundamental && (
        <span className="px-2 py-0.5 rounded-full bg-[#3B0B14] text-[#C9A227] border border-[#C9A227]/50 font-bold text-[10px]">
          Pedra Fundamental
        </span>
      )}
      {item.has_discount && (
        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10px]">
          Com Desconto
        </span>
      )}
    </div>
  );
}

function formatPaymentMethodLabel(item: AdminPaymentListItem): { title: string; subtitle: string } {
  if (item.commercial_modality === 'permuta_100') {
    return { title: 'Permuta 100%', subtitle: 'Sem cobrança financeira' };
  }
  if (item.commercial_modality === 'parceria') {
    return { title: 'Parceria Institucional', subtitle: 'Cortesia 100%' };
  }
  if (item.commercial_modality === 'permuta_50') {
    return {
      title: 'Permuta 50% + Saldo',
      subtitle: item.installments > 1 ? `${item.installments}x sem juros` : 'À vista',
    };
  }
  return {
    title: item.payment_method === 'credit_card' ? 'Cartão de Crédito' : 'PIX QrCode',
    subtitle: item.installments > 1 ? `${item.installments}x sem juros` : 'À vista',
  };
}

export default function PaymentManagementClient({
  isAsaasConfigured: _isAsaasConfigured,
  asaasEnvironment: _asaasEnvironment,
}: PaymentManagementClientProps) {
  const [data, setData] = useState<AdminPaymentsDashboardDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('todos');
  const [monthFilter, setMonthFilter] = useState<string>('todos');
  const [modalityFilter, setModalityFilter] = useState<string>('todos');
  const [methodFilter, setMethodFilter] = useState<string>('todos');
  const [planFilter, setPlanFilter] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [_activeMainTab, _setActiveMainTab] = useState<'visao_geral' | 'transacoes' | 'conciliacao' | 'assinaturas' | 'gateway'>('visao_geral');
  const [selectedPaymentDetail, setSelectedPaymentDetail] = useState<AdminPaymentListItem | null>(null);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);
  const [manualConfirmingId, setManualConfirmingId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    const res = await getAdminPaymentsDashboardAction({
      statusFilter: selectedFilter,
      monthFilter,
      modalityFilter,
      methodFilter,
      planFilter,
      query: searchQuery,
    });
    setData(res);
    setLoading(false);
  }, [selectedFilter, monthFilter, modalityFilter, methodFilter, planFilter, searchQuery]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const hasActiveFilters =
    selectedFilter !== 'todos' ||
    monthFilter !== 'todos' ||
    modalityFilter !== 'todos' ||
    methodFilter !== 'todos' ||
    planFilter !== 'todos' ||
    searchQuery.trim().length > 0;

  const handleClearFilters = () => {
    setSelectedFilter('todos');
    setMonthFilter('todos');
    setModalityFilter('todos');
    setMethodFilter('todos');
    setPlanFilter('todos');
    setSearchQuery('');
  };

  const selectedMonthLabel =
    monthFilter === 'todos'
      ? null
      : data?.availableMonths?.find((m) => m.value === monthFilter)?.label || monthFilter;

  const handleReprocessWebhook = async (recordId: string) => {
    setReprocessingId(recordId);
    setActionMsg(null);
    try {
      const res = await reprocessPaymentWebhookAction(recordId);
      if (res.success) {
        setActionMsg({ type: 'success', text: res.message || 'Evento reprocessado com sucesso.' });
        await loadDashboard();
      } else {
        setActionMsg({ type: 'error', text: res.error || 'Falha ao reprocessar evento.' });
      }
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err?.message || 'Falha inesperada ao reprocessar evento.' });
    } finally {
      setReprocessingId(null);
    }
  };

  const handleManualConfirmPayment = async (invoiceId: string) => {
    const ok = await systemConfirm({
      title: 'Confirmar pagamento manual',
      message: 'Confirme apenas se o pagamento foi verificado no Asaas Sandbox. Esta ação será auditada no sistema.',
      confirmLabel: 'Confirmar pagamento',
      cancelLabel: 'Cancelar',
    });
    if (!ok) return;

    setManualConfirmingId(invoiceId);
    setActionMsg(null);
    try {
      const res = await confirmPaymentManuallyAction(invoiceId);
      if (res.success) {
        setActionMsg({ type: 'success', text: res.message || 'Pagamento confirmado manualmente.' });
        await loadDashboard();
        setSelectedPaymentDetail((prev) => prev ? { ...prev, status: 'paid', gateway_status: 'RECEIVED' } : prev);
      } else {
        setActionMsg({ type: 'error', text: res.error || 'Falha ao confirmar pagamento manualmente.' });
      }
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err?.message || 'Falha inesperada ao confirmar pagamento manualmente.' });
    } finally {
      setManualConfirmingId(null);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* 1. TOPO EXECUTIVO DE KPIS FINANCEIROS OPERACIONAIS */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 bg-[#3B0B14] text-white border border-[#C9A227]/50 rounded-2xl shadow-md">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#C9A227]">
            <span>{selectedMonthLabel ? `Recebido em ${selectedMonthLabel}` : 'Total Recebido (Histórico)'}</span>
            <DollarSign className="w-4 h-4 text-[#C9A227]" />
          </div>
          <p className="text-2xl font-serif font-bold mt-1 text-white">
            {loading && !data ? (
              <span className="text-sm font-normal text-stone-300">Carregando...</span>
            ) : (
              `R$ ${(selectedMonthLabel ? (data?.kpis?.periodReceivedBrl ?? 0) : (data?.kpis?.totalReceivedBrl ?? 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            )}
          </p>
          {data && (
            <p className="text-[11px] text-[#C9A227]/90 mt-1 font-medium">
              {selectedMonthLabel
                ? `Histórico geral: R$ ${(data.kpis.totalReceivedBrl ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                : `Mês atual: R$ ${(data.kpis.monthlyReceivedBrl ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </p>
          )}
        </div>

        <div className="p-4 bg-white border border-stone-300 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-stone-500">
            <span>A Receber</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-stone-900 mt-1">
            {loading && !data ? (
              <span className="text-sm font-normal text-stone-400">Carregando...</span>
            ) : (
              `R$ ${(data?.kpis?.toReceiveBrl ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            )}
          </p>
          {selectedMonthLabel && (
            <p className="text-[11px] text-stone-500 mt-1">Período: {selectedMonthLabel}</p>
          )}
        </div>

        <div className="p-4 bg-white border border-stone-300 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-stone-500">
            <span>Em Atraso</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-stone-900 mt-1">
            {loading && !data ? (
              <span className="text-sm font-normal text-stone-400">Carregando...</span>
            ) : (
              `R$ ${(data?.kpis?.overdueBrl ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            )}
          </p>
        </div>

        <div className="p-4 bg-white border border-stone-300 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-stone-500">
            <span>Pagamentos c/ Falha</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-stone-900 mt-1">
            {loading && !data ? '-' : (data?.kpis?.failedCount ?? 0)}
          </p>
        </div>

        <div className="p-4 bg-white border border-stone-300 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-emerald-800">
            <span>Assinaturas Ativas</span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-emerald-900 mt-1">
            {loading && !data ? '-' : (data?.kpis?.activeSubscriptionsCount ?? 0)}
          </p>
          {data && (data.kpis.permutaParceriaCount ?? 0) > 0 && (
            <p className="text-[11px] text-purple-800 font-semibold mt-1">
              {data.kpis.permutaParceriaCount} em permuta / parceria
            </p>
          )}
        </div>
      </section>

      {actionMsg && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            actionMsg.type === 'success'
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              : 'bg-red-100 text-red-900 border border-red-300'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{actionMsg.text}</span>
        </div>
      )}

      {/* 2. CENTRAL "PRECISA DE CONCILIAÇÃO" (DESTAQUE DE DIVERGÊNCIAS) */}
      {data && data.reconciliationRequired.length > 0 && (
        <div className="bg-amber-950/20 border border-amber-800/40 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-amber-700/30 pb-2">
            <h3 className="font-serif font-bold text-sm text-amber-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> Precisa de Conciliação Operacional ({data.reconciliationRequired.length})
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">Ação Recomendada</span>
          </div>

          <div className="space-y-2">
            {data.reconciliationRequired.map((item) => (
              <div
                key={item.id}
                className="p-3.5 bg-white border border-amber-300 rounded-xl text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs"
              >
                <div>
                  <strong className="font-serif font-bold text-stone-900 text-sm block">{item.business_name}</strong>
                  <p className="text-stone-600 mt-0.5">{item.divergence_reason}</p>
                  <span className="text-[11px] text-amber-800 font-mono block mt-1">
                    Gateway: {item.gateway_status} • Plataforma: {item.platform_status}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleReprocessWebhook(item.id)}
                  disabled={reprocessingId === item.id}
                  className="px-4 py-2 bg-[#3B0B14] hover:bg-[#4B161B] text-[#C9A227] font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs border border-[#C9A227]/40"
                >
                  {reprocessingId === item.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 text-[#C9A227]" />
                  )}
                  <span>Conciliar & Reprocessar Evento</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. BUSCA & FILTROS OPERACIONAIS */}
      <div className="bg-white border border-stone-300 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar cobrança por empresa, responsável, e-mail ou contrapartida..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:border-[#3B0B14]"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex items-center gap-2">
            {/* Filtro de Mês / Período */}
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-2.5 pointer-events-none" />
              <select
                aria-label="Filtrar por mês"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="w-full lg:w-auto pl-8 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-800 outline-none focus:border-[#3B0B14]"
              >
                <option value="todos">Todos os meses</option>
                {(data?.availableMonths || []).map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro de Condição Comercial / Desconto */}
            <div className="relative">
              <Tag className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-2.5 pointer-events-none" />
              <select
                aria-label="Filtrar por condição comercial"
                value={modalityFilter}
                onChange={(e) => setModalityFilter(e.target.value)}
                className="w-full lg:w-auto pl-8 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-800 outline-none focus:border-[#3B0B14]"
              >
                <option value="todos">Todas condições</option>
                <option value="permuta_100">Permuta 100%</option>
                <option value="parceria">Parceria 100%</option>
                <option value="permuta_50">Permuta 50%</option>
                <option value="desconto">Com Desconto</option>
                <option value="pedra_fundamental">Pedra Fundamental</option>
                <option value="padrao">Cobrança Padrão</option>
              </select>
            </div>

            {/* Filtro de Forma */}
            <select
              aria-label="Filtrar por forma de pagamento"
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full lg:w-auto px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-800 outline-none focus:border-[#3B0B14]"
            >
              <option value="todos">Todas formas</option>
              <option value="credit_card">Cartão de Crédito</option>
              <option value="pix">PIX QrCode</option>
              <option value="sem_cobranca">Sem Cobrança (Permuta/Parceria)</option>
            </select>

            {/* Filtro de Plano */}
            <select
              aria-label="Filtrar por plano"
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="w-full lg:w-auto px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-800 outline-none focus:border-[#3B0B14]"
            >
              <option value="todos">Todos os planos</option>
              <option value="acacia">Plano Acácia</option>
              <option value="compasso">Plano Compasso</option>
              <option value="esquadro">Plano Esquadro</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <Filter className="w-4 h-4 text-stone-500 shrink-0" />
            <span className="text-xs font-bold text-stone-600 shrink-0">Status:</span>

            {[
              { id: 'todos', label: `Todos (${data?.counts.total || 0})` },
              { id: 'paid', label: `Confirmados (${data?.counts.paid || 0})` },
              { id: 'pending', label: `Pendentes (${data?.counts.pending || 0})` },
              { id: 'overdue', label: `Em Atraso (${data?.counts.overdue || 0})` },
              { id: 'divergentes', label: `Divergentes (${data?.counts.divergent || 0})` },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedFilter === f.id
                    ? 'bg-[#3B0B14] text-[#C9A227] border border-[#C9A227]/40 shadow-xs'
                    : 'bg-stone-100 text-stone-700 border border-stone-200 hover:bg-stone-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-[#3B0B14] bg-amber-50 hover:bg-amber-100 border border-amber-200 transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpar filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. TABELA OPERACIONAL DE PAGAMENTOS */}
      <div className="bg-white border border-stone-300 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-stone-500 font-semibold">
            Carregando extrato financeiro operacional...
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CreditCard className="w-8 h-8 text-stone-400 mx-auto" />
            <p className="text-sm font-bold text-stone-800">
              Nenhuma cobrança encontrada neste filtro.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs font-bold text-[#3B0B14] underline cursor-pointer"
              >
                Ver todos os registros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-100 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Empresa</th>
                  <th className="py-3 px-4 text-center">Plano & Condição</th>
                  <th className="py-3 px-4 text-right">Valor Negociado</th>
                  <th className="py-3 px-4 text-center">Forma & Parcelas</th>
                  <th className="py-3 px-4 text-center">Data</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {data.items.map((item) => {
                  const methodLabel = formatPaymentMethodLabel(item);
                  const hasDiscountedDiff =
                    typeof item.original_amount_cents === 'number' &&
                    item.original_amount_cents > item.amount_cents;

                  return (
                    <tr key={item.id} className="hover:bg-stone-50/80 transition-colors">
                      {/* EMPRESA */}
                      <td className="py-3.5 px-4">
                        <div className="font-serif font-bold text-sm text-stone-900 line-clamp-1">
                          {item.business_name}
                        </div>
                        <span className="text-[11px] text-stone-500 font-mono">{item.owner_name} • {item.owner_email}</span>
                        {item.permuta_description && (
                          <p className="text-[11px] text-purple-800 font-medium mt-0.5 line-clamp-1">
                            Contrapartida: {item.permuta_description}
                          </p>
                        )}
                      </td>

                      {/* PLANO & CONDIÇÃO */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-900 font-extrabold text-[10px] uppercase border border-stone-300">
                          {getCommercialPlanName(item.plan_code)}
                        </span>
                        {renderConditionBadges(item, 'center')}
                      </td>

                      {/* VALOR */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <div className="font-bold text-stone-900 text-sm">
                          R$ {(item.amount_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        {hasDiscountedDiff && (
                          <div className="text-[11px] text-stone-400 line-through">
                            R$ {((item.original_amount_cents || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </td>

                      {/* FORMA & PARCELAS */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-semibold text-stone-800 block">
                          {methodLabel.title}
                        </span>
                        <span className="text-[11px] text-stone-500 font-semibold">
                          {methodLabel.subtitle}
                        </span>
                      </td>

                      {/* DATA */}
                      <td className="py-3.5 px-4 text-center font-mono text-stone-700">
                        {item.status === 'paid' && item.paid_at ? (
                          <div>
                            <span className="block text-[10px] text-emerald-700 font-sans font-bold uppercase">Pago em</span>
                            <span>{formatDateBR(item.paid_at)}</span>
                          </div>
                        ) : (
                          <div>
                            <span className="block text-[10px] text-stone-500 font-sans font-bold uppercase">Vencimento</span>
                            <span>{formatDateBR(item.due_date)}</span>
                          </div>
                        )}
                      </td>

                      {/* STATUS */}
                      <td className="py-3.5 px-4 text-center">
                        {item.status === 'paid' ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10px]">
                            ✓ {item.commercial_modality === 'permuta_100' ? 'Liberado (Permuta)' : item.commercial_modality === 'parceria' ? 'Liberado (Parceria)' : 'Confirmado'}
                          </span>
                        ) : item.has_divergence ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px]">
                            ⚠ Divergência
                          </span>
                        ) : item.status === 'overdue' ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300 font-bold text-[10px]">
                            Em Atraso
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-300 font-bold text-[10px]">
                            Pendente
                          </span>
                        )}
                      </td>

                      {/* AÇÃO: VER DETALHES */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedPaymentDetail(item)}
                          className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-900 font-bold text-xs rounded-xl border border-stone-300 transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Ver Detalhes</span>
                          <ArrowRight className="w-3.5 h-3.5 text-stone-600" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. DRAWER / MODAL DE DETALHAMENTO FINANCEIRO OPERACIONAL 360º */}
      {selectedPaymentDetail && (
        <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-stone-300 rounded-2xl p-6 max-w-xl w-full space-y-4 shadow-2xl text-left">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#3B0B14] text-[#C9A227] font-bold text-[10px] uppercase">
                  Prontuário Financeiro 360º
                </span>
                <h3 className="font-serif font-bold text-lg text-stone-900 mt-1">
                  {selectedPaymentDetail.business_name}
                </h3>
                {renderConditionBadges(selectedPaymentDetail, 'start')}
              </div>
              <button
                type="button"
                onClick={() => setSelectedPaymentDetail(null)}
                className="text-stone-400 hover:text-stone-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-stone-600">Referência / ID:</span>
                <strong className="font-mono text-stone-900">{selectedPaymentDetail.asaas_payment_id}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Plano Comercial:</span>
                <strong className="font-bold text-[#3B0B14]">{getCommercialPlanName(selectedPaymentDetail.plan_code)}</strong>
              </div>
              {typeof selectedPaymentDetail.original_amount_cents === 'number' &&
                selectedPaymentDetail.original_amount_cents > selectedPaymentDetail.amount_cents && (
                  <div className="flex justify-between">
                    <span className="text-stone-600">Valor Integral do Plano:</span>
                    <span className="font-mono text-stone-500 line-through">
                      R$ {(selectedPaymentDetail.original_amount_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              <div className="flex justify-between">
                <span className="text-stone-600">Valor Negociado / Cobrado:</span>
                <strong className="font-mono text-stone-900 text-sm">
                  R$ {(selectedPaymentDetail.amount_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Condição de Pagamento:</span>
                <strong>
                  {formatPaymentMethodLabel(selectedPaymentDetail).title} ({formatPaymentMethodLabel(selectedPaymentDetail).subtitle})
                </strong>
              </div>
              {selectedPaymentDetail.paid_at && (
                <div className="flex justify-between">
                  <span className="text-stone-600">Data de Confirmação / Pagamento:</span>
                  <strong className="font-mono text-emerald-800">{formatDateBR(selectedPaymentDetail.paid_at)}</strong>
                </div>
              )}
              {selectedPaymentDetail.permuta_description && (
                <div className="pt-2 border-t border-stone-200">
                  <span className="text-stone-600 block font-bold mb-1">Descrição / Contrapartida:</span>
                  <p className="text-stone-800 bg-white p-2.5 rounded-xl border border-stone-200">
                    {selectedPaymentDetail.permuta_description}
                  </p>
                </div>
              )}
              <div className="flex justify-between pt-1">
                <span className="text-stone-600">Último Evento / Registro:</span>
                <strong className="text-amber-800 font-mono">{selectedPaymentDetail.last_event_title}</strong>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pt-2">
              <Link
                href={`/admin/empresas/${selectedPaymentDetail.business_id}`}
                className="text-xs font-bold text-[#3B0B14] hover:underline flex items-center gap-1"
              >
                <FileText className="w-4 h-4" />
                <span>Abrir Prontuário da Empresa →</span>
              </Link>

              {!selectedPaymentDetail.is_virtual_terms_record && (
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  {selectedPaymentDetail.status !== 'paid' && (
                    <button
                      type="button"
                      onClick={() => handleManualConfirmPayment(selectedPaymentDetail.id)}
                      disabled={manualConfirmingId === selectedPaymentDetail.id}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs border border-emerald-900/20 disabled:opacity-60"
                    >
                      {manualConfirmingId === selectedPaymentDetail.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5 text-white" />
                      )}
                      <span>Confirmar pagamento manualmente</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedPaymentDetail.webhook_event_id) {
                        setActionMsg({
                          type: 'error',
                          text: 'Esta cobrança ainda não possui evento do Asaas registrado. Reenvie o webhook no painel do Asaas depois de corrigir URL e token.',
                        });
                        return;
                      }
                      handleReprocessWebhook(selectedPaymentDetail.webhook_event_id);
                    }}
                    disabled={!selectedPaymentDetail.webhook_event_id || (Boolean(selectedPaymentDetail.webhook_event_id) && reprocessingId === selectedPaymentDetail.webhook_event_id)}
                    className="px-4 py-2 bg-[#3B0B14] hover:bg-[#4B161B] text-[#C9A227] font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs border border-[#C9A227]/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {Boolean(selectedPaymentDetail.webhook_event_id) && reprocessingId === selectedPaymentDetail.webhook_event_id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5 text-[#C9A227]" />
                    )}
                    <span>Reprocessar Evento Asaas</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
