'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  ArrowRight,
  Sparkles,
  Building2,
  Clock,
  CreditCard,
  Award,
  AlertTriangle,
} from 'lucide-react';
import {
  getApprovalDirectoryListAction,
  ApprovalDirectoryItem,
} from '@/lib/admin/admin-approval-service';

export default function AdminAprovacoesPage() {
  const [items, setItems] = useState<ApprovalDirectoryItem[]>([]);
  const [counts, setCounts] = useState<{
    total: number;
    ready: number;
    pendingReview: number;
    missingContract: number;
    missingPayment: number;
    missingLink: number;
    incomplete: number;
    correctionRequested: number;
    rejected: number;
  }>({
    total: 0,
    ready: 0,
    pendingReview: 0,
    missingContract: 0,
    missingPayment: 0,
    missingLink: 0,
    incomplete: 0,
    correctionRequested: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = async (filter: string) => {
    setLoading(true);
    const res = await getApprovalDirectoryListAction(filter);
    if (res.success && res.items) {
      setItems(res.items);
      if (res.counts) setCounts(res.counts);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData(selectedFilter);
  }, [selectedFilter]);

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.owner_email && item.owner_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-left">
      {/* 1. CABEÇALHO DA CENTRAL DE APROVAÇÕES */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-300 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#3B0B14] text-[#C9A227] font-bold text-[10px] uppercase tracking-wider">
              Mesa de Conferência Pré-Publicação
            </span>
            <span className="text-xs text-stone-500 font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
              {counts.pendingReview} pendentes
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 mt-1">
            Aprovações & Preparação de Anúncios
          </h1>
          <p className="text-xs text-stone-600 mt-1 max-w-3xl leading-relaxed font-medium">
            Analise e prepare novos anúncios antes da publicação no Guia Maçônico Oficial.
          </p>
        </div>
      </div>

      {/* 2. KPIS SUPERIORES DA FILA (TRIAGEM RÁPIDA) */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setSelectedFilter('pending_review')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedFilter === 'pending_review'
              ? 'bg-[#3B0B14] text-white border-[#C9A227]'
              : 'bg-white text-stone-900 border-stone-300 hover:border-[#3B0B14]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Aguardando Análise</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-serif font-bold mt-1">{counts.pendingReview}</p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedFilter('pronto_para_aprovacao')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedFilter === 'pronto_para_aprovacao'
              ? 'bg-[#3B0B14] text-white border-[#C9A227]'
              : 'bg-white text-stone-900 border-stone-300 hover:border-emerald-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Prontos p/ Aprovar</span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-emerald-900 mt-1">{counts.ready}</p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedFilter('aguardando_pagamento')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedFilter === 'aguardando_pagamento'
              ? 'bg-[#3B0B14] text-white border-[#C9A227]'
              : 'bg-white text-stone-900 border-stone-300 hover:border-amber-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Sem Pagamento</span>
            <CreditCard className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-amber-900 mt-1">{counts.missingPayment}</p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedFilter('aguardando_vinculo')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedFilter === 'aguardando_vinculo'
              ? 'bg-[#3B0B14] text-white border-[#C9A227]'
              : 'bg-white text-stone-900 border-stone-300 hover:border-amber-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Sem Vínculo</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-stone-900 mt-1">{counts.missingLink}</p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedFilter('cadastro_incompleto')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedFilter === 'cadastro_incompleto'
              ? 'bg-[#3B0B14] text-white border-[#C9A227]'
              : 'bg-white text-stone-900 border-stone-300 hover:border-[#3B0B14]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Incompletos (&lt;70%)</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-stone-900 mt-1">{counts.incomplete}</p>
        </button>
      </section>

      {/* 3. FILTROS RÁPIDOS & BUSCA */}
      <div className="bg-white border border-stone-300 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por empresa, responsável, CNPJ ou cidade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:border-[#4B161B]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            <Filter className="w-4 h-4 text-stone-500 shrink-0" />
            <span className="text-xs font-bold text-stone-600 shrink-0">Filtro:</span>

            {[
              { id: 'todos', label: `Todos (${counts.total})` },
              { id: 'pronto_para_aprovacao', label: `⭐ Prontos (${counts.ready})` },
              { id: 'cadastro_incompleto', label: `Incompletos (${counts.incomplete})` },
              { id: 'aguardando_contrato', label: `Sem Contrato (${counts.missingContract})` },
              { id: 'aguardando_pagamento', label: `Sem Pagamento (${counts.missingPayment})` },
              { id: 'aguardando_vinculo', label: `Sem Vínculo (${counts.missingLink})` },
              { id: 'correction_requested', label: `Correção Solicitada (${counts.correctionRequested})` },
              { id: 'rejected', label: `Rejeitados (${counts.rejected})` },
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

      {/* 4. LISTA DA FILA COM PRIORIDADE VISUAL HARMONIOSA */}
      <div className="bg-white border border-stone-300 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-stone-500 font-semibold">
            Carregando estação de conferência pré-publicação...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Building2 className="w-8 h-8 text-stone-400 mx-auto" />
            <p className="text-sm font-bold text-stone-800">
              Nenhuma solicitação aguardando análise neste filtro.
            </p>
            <p className="text-xs text-stone-500">Tudo em dia por aqui!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-100 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Empresa & Categoria</th>
                  <th className="py-3 px-4">Responsável</th>
                  <th className="py-3 px-4 text-center">Plano</th>
                  <th className="py-3 px-4 text-center">Completude</th>
                  <th className="py-3 px-4 text-center">Vínculo</th>
                  <th className="py-3 px-4 text-center">Contrato</th>
                  <th className="py-3 px-4 text-center">Pagamento</th>
                  <th className="py-3 px-4 text-center">Status / Apto</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50/80 transition-colors">
                    {/* EMPRESA */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-[#3B0B14] font-serif font-bold text-sm shrink-0">
                          {item.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-serif font-bold text-sm text-stone-900 line-clamp-1 flex items-center gap-1.5">
                            <span>{item.name}</span>
                            {item.is_pedra_fundamental && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 font-sans text-[9px] font-extrabold">
                                Pedra Fundamental
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-stone-500 font-semibold">{item.category}</span>
                        </div>
                      </div>
                    </td>

                    {/* RESPONSÁVEL */}
                    <td className="py-3.5 px-4 text-stone-700">
                      <div className="font-bold text-stone-900">{item.owner_name}</div>
                      <div className="text-[11px] text-stone-500 font-mono line-clamp-1">{item.owner_email}</div>
                    </td>

                    {/* PLANO */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-900 font-extrabold text-[10px] uppercase border border-stone-300">
                        {item.plan_code}
                      </span>
                    </td>

                    {/* COMPLETUDE % */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <div className="w-12 bg-stone-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              item.completeness_percent >= 90
                                ? 'bg-emerald-600'
                                : item.completeness_percent >= 70
                                ? 'bg-amber-500'
                                : 'bg-rose-600'
                            }`}
                            style={{ width: `${item.completeness_percent}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-stone-800">{item.completeness_percent}%</span>
                      </div>
                    </td>

                    {/* VÍNCULO */}
                    <td className="py-3.5 px-4 text-center">
                      {item.has_masonic_link ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10px]">
                          ✓ Validado
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px]">
                          Pendente
                        </span>
                      )}
                    </td>

                    {/* CONTRATO */}
                    <td className="py-3.5 px-4 text-center">
                      {item.has_signed_contract ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10px]">
                          ✓ Assinado
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300 font-bold text-[10px]">
                          Sem Contrato
                        </span>
                      )}
                    </td>

                    {/* PAGAMENTO */}
                    <td className="py-3.5 px-4 text-center">
                      {item.has_valid_payment ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10px]">
                          ✓ Confirmado
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px]">
                          Pendente
                        </span>
                      )}
                    </td>

                    {/* STATUS / BADGE PRONTO */}
                    <td className="py-3.5 px-4 text-center space-y-1">
                      {item.is_ready_for_approval ? (
                        <span className="px-2.5 py-1 rounded-full bg-[#C9A227] text-[#3B0B14] font-extrabold text-[10px] tracking-wider uppercase shadow-xs flex items-center justify-center gap-1">
                          <Sparkles className="w-3 h-3" /> Pronto p/ Aprovar
                        </span>
                      ) : item.publication_status === 'correction_requested' ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px] uppercase">
                          Correção Solicitada
                        </span>
                      ) : item.publication_status === 'rejected' ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300 font-bold text-[10px] uppercase">
                          Rejeitado
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-300 font-bold text-[10px] uppercase">
                          {item.publication_status}
                        </span>
                      )}
                    </td>

                    {/* AÇÃO: ANALISAR CADASTRO */}
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/admin/aprovacoes/${item.id}`}
                        className="px-3.5 py-1.5 bg-[#3B0B14] hover:bg-[#4B161B] text-[#C9A227] font-extrabold text-xs rounded-xl transition-all inline-flex items-center gap-1.5 shadow-xs border border-[#C9A227]/40 cursor-pointer"
                      >
                        <span>Analisar Cadastro</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#C9A227]" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
