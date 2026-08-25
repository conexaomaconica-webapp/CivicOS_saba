'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import {
  getAdminPaymentsDashboardAction,
  reprocessPaymentWebhookAction,
  AdminPaymentsDashboardDTO,
  AdminPaymentListItem,
} from '@/lib/admin/admin-payments-service';

export interface PaymentManagementClientProps {
  isAsaasConfigured: boolean;
  asaasEnvironment: string;
}

export default function PaymentManagementClient({
  isAsaasConfigured: _isAsaasConfigured,
  asaasEnvironment: _asaasEnvironment,
}: PaymentManagementClientProps) {
  const [data, setData] = useState<AdminPaymentsDashboardDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPaymentDetail, setSelectedPaymentDetail] = useState<AdminPaymentListItem | null>(null);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadDashboard = async (filter: string) => {
    setLoading(true);
    const res = await getAdminPaymentsDashboardAction({
      statusFilter: filter,
      query: searchQuery,
    });
    setData(res);
    setLoading(false);
  };

  useEffect(() => {
    loadDashboard(selectedFilter);
  }, [selectedFilter, searchQuery]);

  const handleReprocessWebhook = async (paymentId: string) => {
    setReprocessingId(paymentId);
    setActionMsg(null);
    const res = await reprocessPaymentWebhookAction(paymentId);
    if (res.success) {
      setActionMsg({ type: 'success', text: res.message || 'Evento reprocessado com sucesso.' });
      loadDashboard(selectedFilter);
    } else {
      setActionMsg({ type: 'error', text: res.error || 'Falha ao reprocessar evento.' });
    }
    setReprocessingId(null);
  };

  return (
    <div className="space-y-6 text-left">
      {/* 1. TOPO EXECUTIVO DE KPIS FINANCEIROS OPERACIONAIS */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 bg-[#3B0B14] text-white border border-[#C9A227]/50 rounded-2xl shadow-md">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#C9A227]">
            <span>Recebido no Mês</span>
            <DollarSign className="w-4 h-4 text-[#C9A227]" />
          </div>
          <p className="text-2xl font-serif font-bold mt-1 text-white">
            R$ {data?.kpis.monthlyReceivedBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '2.388,00'}
          </p>
        </div>

        <div className="p-4 bg-white border border-stone-300 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-stone-500">
            <span>A Receber</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-stone-900 mt-1">
            R$ {data?.kpis.toReceiveBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '1.788,00'}
          </p>
        </div>

        <div className="p-4 bg-white border border-stone-300 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-stone-500">
            <span>Em Atraso</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-stone-900 mt-1">
            R$ {data?.kpis.overdueBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
          </p>
        </div>

        <div className="p-4 bg-white border border-stone-300 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-stone-500">
            <span>Pagamentos c/ Falha</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-stone-900 mt-1">{data?.kpis.failedCount || 0}</p>
        </div>

        <div className="p-4 bg-white border border-stone-300 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-emerald-800">
            <span>Assinaturas Ativas</span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-emerald-900 mt-1">{data?.kpis.activeSubscriptionsCount || 15}</p>
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
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar cobrança por empresa, responsável ou e-mail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:border-[#3B0B14]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            <Filter className="w-4 h-4 text-stone-500 shrink-0" />
            <span className="text-xs font-bold text-stone-600 shrink-0">Filtro:</span>

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
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-100 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Empresa</th>
                  <th className="py-3 px-4 text-center">Plano</th>
                  <th className="py-3 px-4 text-right">Valor Anual</th>
                  <th className="py-3 px-4 text-center">Forma & Parcelas</th>
                  <th className="py-3 px-4 text-center">Vencimento</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {data.items.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50/80 transition-colors">
                    {/* EMPRESA */}
                    <td className="py-3.5 px-4">
                      <div className="font-serif font-bold text-sm text-stone-900 line-clamp-1">
                        {item.business_name}
                      </div>
                      <span className="text-[11px] text-stone-500 font-mono">{item.owner_name} • {item.owner_email}</span>
                    </td>

                    {/* PLANO */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-900 font-extrabold text-[10px] uppercase border border-stone-300">
                        {item.plan_code}
                      </span>
                    </td>

                    {/* VALOR */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-900 text-sm">
                      R$ {(item.amount_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>

                    {/* FORMA & PARCELAS */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-semibold text-stone-800 block">
                        {item.payment_method === 'credit_card' ? 'Cartão de Crédito' : 'PIX QrCode'}
                      </span>
                      <span className="text-[11px] text-stone-500 font-semibold">
                        {item.installments > 1 ? `${item.installments}x sem juros` : 'À vista'}
                      </span>
                    </td>

                    {/* VENCIMENTO */}
                    <td className="py-3.5 px-4 text-center font-mono text-stone-700">
                      {new Date(item.due_date).toLocaleDateString('pt-BR')}
                    </td>

                    {/* STATUS */}
                    <td className="py-3.5 px-4 text-center">
                      {item.status === 'paid' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10px]">
                          ✓ Confirmado
                        </span>
                      ) : item.has_divergence ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px]">
                          ⚠ Divergência
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
                ))}
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
              </div>
              <button
                type="button"
                onClick={() => setSelectedPaymentDetail(null)}
                className="text-stone-400 hover:text-stone-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-stone-600">ID da Cobrança Asaas:</span>
                <strong className="font-mono text-stone-900">{selectedPaymentDetail.asaas_payment_id}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Plano Comercial:</span>
                <strong className="uppercase font-bold text-[#3B0B14]">{selectedPaymentDetail.plan_code}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Valor Anual:</span>
                <strong className="font-mono text-stone-900">
                  R$ {(selectedPaymentDetail.amount_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Condição de Pagamento:</span>
                <strong>
                  {selectedPaymentDetail.payment_method === 'credit_card' ? 'Cartão de Crédito' : 'PIX QrCode'} (
                  {selectedPaymentDetail.installments}x)
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Último Evento Gateway:</span>
                <strong className="text-amber-800 font-mono">{selectedPaymentDetail.last_event_title}</strong>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Link
                href={`/admin/empresas/${selectedPaymentDetail.business_id}`}
                className="text-xs font-bold text-[#3B0B14] hover:underline flex items-center gap-1"
              >
                <FileText className="w-4 h-4" />
                <span>Abrir Prontuário da Empresa →</span>
              </Link>

              <button
                type="button"
                onClick={() => handleReprocessWebhook(selectedPaymentDetail.id)}
                disabled={reprocessingId === selectedPaymentDetail.id}
                className="px-4 py-2 bg-[#3B0B14] hover:bg-[#4B161B] text-[#C9A227] font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs border border-[#C9A227]/40"
              >
                {reprocessingId === selectedPaymentDetail.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 text-[#C9A227]" />
                )}
                <span>Reprocessar Evento Asaas</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
