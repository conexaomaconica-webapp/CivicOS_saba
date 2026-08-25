'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  ArrowRight,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import {
  getAdminBusinessesListAction,
  AdminBusinessListItem,
} from '@/lib/admin/admin-businesses-service';

export default function AdminBusinessesDirectoryPage() {
  const [items, setItems] = useState<AdminBusinessListItem[]>([]);
  const [counts, setCounts] = useState({
    todas: 0,
    publicadas: 0,
    inadimplentes: 0,
    suspensas: 0,
    incompletas: 0,
    bronze: 0,
    prata: 0,
    ouro: 0,
    pedraFundamental: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('todas');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = async (filter: string) => {
    setLoading(true);
    let statusParam = 'all';
    let planParam = 'all';
    let recognitionParam = 'all';

    if (filter === 'publicadas') statusParam = 'published';
    else if (filter === 'suspensas') statusParam = 'suspended';
    else if (filter === 'bronze') planParam = 'bronze';
    else if (filter === 'prata') planParam = 'prata';
    else if (filter === 'ouro') planParam = 'ouro';
    else if (filter === 'pedra_fundamental') recognitionParam = 'pedra_fundamental';

    const res = await getAdminBusinessesListAction({
      status: statusParam,
      plan: planParam,
      recognition: recognitionParam,
      query: searchQuery,
    });

    if (res && res.items) {
      setItems(res.items as AdminBusinessListItem[]);
      if (res.counts) setCounts(res.counts);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData(selectedFilter);
  }, [selectedFilter, searchQuery]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-left">
      {/* 1. CABEÇALHO DA GESTÃO DE CARTEIRA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-300 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#3B0B14] text-[#C9A227] font-bold text-[10px] uppercase tracking-wider">
              Gestão de Carteira Pós-Aprovação
            </span>
            <span className="text-xs text-stone-500 font-bold px-2 py-0.5 rounded-full bg-stone-200 text-stone-800">
              Total: {counts.todas} empresas
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 mt-1">
            Empresas & Prontuário 360º
          </h1>
          <p className="text-xs text-stone-600 mt-1 max-w-3xl leading-relaxed font-medium">
            Gerencie empresas ativas, monitore vigências financeiras, cotas do plano e mantanha a saúde da carteira.
          </p>
        </div>
      </div>

      {/* KPIS SUPERIORES DA CARTEIRA */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setSelectedFilter('publicadas')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedFilter === 'publicadas'
              ? 'bg-[#3B0B14] text-white border-[#C9A227]'
              : 'bg-white text-stone-900 border-stone-300 hover:border-emerald-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Publicadas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-emerald-900 mt-1">{counts.publicadas}</p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedFilter('suspensas')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedFilter === 'suspensas'
              ? 'bg-[#3B0B14] text-white border-[#C9A227]'
              : 'bg-white text-stone-900 border-stone-300 hover:border-rose-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Suspensas</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-stone-900 mt-1">{counts.suspensas}</p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedFilter('inadimplentes')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedFilter === 'inadimplentes'
              ? 'bg-[#3B0B14] text-white border-[#C9A227]'
              : 'bg-white text-stone-900 border-stone-300 hover:border-amber-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Inadimplentes</span>
            <CreditCard className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-amber-900 mt-1">{counts.inadimplentes}</p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedFilter('incompletas')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedFilter === 'incompletas'
              ? 'bg-[#3B0B14] text-white border-[#C9A227]'
              : 'bg-white text-stone-900 border-stone-300 hover:border-amber-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Incompletas (&lt;70%)</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-stone-900 mt-1">{counts.incompletas}</p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedFilter('pedra_fundamental')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedFilter === 'pedra_fundamental'
              ? 'bg-[#3B0B14] text-white border-[#C9A227]'
              : 'bg-white text-stone-900 border-stone-300 hover:border-amber-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">Pedra Fundamental</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-serif font-bold text-amber-900 mt-1">{counts.pedraFundamental}/10</p>
        </button>
      </section>

      {/* BUSCA & FILTROS RÁPIDOS (CHIPS) */}
      <div className="bg-white border border-stone-300 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por empresa, responsável, CNPJ ou cidade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:border-[#3B0B14]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            <Filter className="w-4 h-4 text-stone-500 shrink-0" />
            <span className="text-xs font-bold text-stone-600 shrink-0">Filtro:</span>

            {[
              { id: 'todas', label: `Todas (${counts.todas})` },
              { id: 'publicadas', label: `Publicadas (${counts.publicadas})` },
              { id: 'inadimplentes', label: `Inadimplentes (${counts.inadimplentes})` },
              { id: 'suspensas', label: `Suspensas (${counts.suspensas})` },
              { id: 'incompletas', label: `Incompletas (${counts.incompletas})` },
              { id: 'bronze', label: `Bronze (${counts.bronze})` },
              { id: 'prata', label: `Prata (${counts.prata})` },
              { id: 'ouro', label: `Ouro (${counts.ouro})` },
              { id: 'pedra_fundamental', label: `Pedra Fundamental (${counts.pedraFundamental})` },
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

      {/* 2. LINHA/CARD DA SOLICITAÇÃO NA CARTEIRA */}
      <div className="bg-white border border-stone-300 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-stone-500 font-semibold">
            Carregando prontuários da carteira...
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Building2 className="w-8 h-8 text-stone-400 mx-auto" />
            <p className="text-sm font-bold text-stone-800">
              Nenhuma empresa encontrada com estes filtros.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-100 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Empresa & Categoria</th>
                  <th className="py-3 px-4">Responsável</th>
                  <th className="py-3 px-4 text-center">Plano</th>
                  <th className="py-3 px-4 text-center">Publicação</th>
                  <th className="py-3 px-4 text-center">Pagamento</th>
                  <th className="py-3 px-4 text-center">Completude</th>
                  <th className="py-3 px-4 text-center">Reconhecimentos</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50/80 transition-colors">
                    {/* EMPRESA */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-[#3B0B14] font-serif font-bold text-sm shrink-0">
                          {item.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-serif font-bold text-sm text-stone-900 line-clamp-1">
                            {item.name}
                          </div>
                          <span className="text-[11px] text-stone-500 font-semibold">
                            {item.category} • {item.city}, {item.state}
                          </span>
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

                    {/* PUBLICAÇÃO */}
                    <td className="py-3.5 px-4 text-center">
                      {item.publication_status === 'published' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10px]">
                          ✓ Publicada
                        </span>
                      ) : item.publication_status === 'suspended' ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300 font-bold text-[10px]">
                          Suspensa
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-300 font-bold text-[10px]">
                          {item.publication_status}
                        </span>
                      )}
                    </td>

                    {/* PAGAMENTO */}
                    <td className="py-3.5 px-4 text-center">
                      {item.payment_status === 'paid' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10px]">
                          ✓ Confirmado
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px]">
                          Pendente
                        </span>
                      )}
                    </td>

                    {/* COMPLETUDE */}
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

                    {/* RECONHECIMENTOS */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {item.is_pedra_fundamental && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[9px]">
                            Pedra
                          </span>
                        )}
                        {item.is_founder && (
                          <span className="px-1.5 py-0.5 rounded bg-[#3B0B14] text-[#C9A227] font-bold text-[9px]">
                            Founder
                          </span>
                        )}
                        {item.is_coluna_honra && (
                          <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-800 border border-stone-300 font-bold text-[9px]">
                            Coluna
                          </span>
                        )}
                      </div>
                    </td>

                    {/* CTA: ABRIR PRONTUÁRIO */}
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/admin/empresas/${item.id}`}
                        className="px-3.5 py-1.5 bg-[#3B0B14] hover:bg-[#4B161B] text-[#C9A227] font-extrabold text-xs rounded-xl transition-all inline-flex items-center gap-1.5 shadow-xs border border-[#C9A227]/40 cursor-pointer"
                      >
                        <span>Abrir Prontuário 360º</span>
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
