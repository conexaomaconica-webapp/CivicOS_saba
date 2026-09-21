'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Clock,
  CreditCard,
  Award,
  AlertTriangle,
  Sparkles,
  List,
  LayoutGrid,
  X,
  RefreshCcw,
} from 'lucide-react';
import {
  getApprovalDirectoryListAction,
  deleteApprovalAction,
  ApprovalDirectoryItem,
} from '@/lib/admin/admin-approval-service';
import { ApprovalTable, ApprovalGrid } from './_components/ApprovalViews';

type ViewMode = 'list' | 'grid';

export default function AdminAprovacoesPage() {
  const [items, setItems] = useState<ApprovalDirectoryItem[]>([]);
  const [counts, setCounts] = useState({
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
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('saba_approval_view_mode');
    if (saved === 'list' || saved === 'grid') {
      setViewMode(saved as ViewMode);
    } else {
      // Padrão: grid para mobile, list para desktop
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setViewMode('grid');
      }
    }
  }, []);

  const handleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('saba_approval_view_mode', mode);
  };

  const loadData = async (filter: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getApprovalDirectoryListAction(filter);
      if (res.success && res.items) {
        setItems(res.items);
        if (res.counts) setCounts(res.counts);
      } else {
        setError(res.error || 'Erro desconhecido ao carregar.');
      }
    } catch (err: any) {
      setError(err.message || 'Falha de rede.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta solicitação de anúncio? Esta ação não pode ser desfeita.')) return;
    
    const res = await deleteApprovalAction(id);
    
    if (res.success) {
      // Reload current view
      loadData(selectedFilter);
    } else {
      alert(res.error || 'Erro ao tentar excluir a solicitação.');
    }
  };

  useEffect(() => {
    loadData(selectedFilter);
  }, [selectedFilter]);

  const filteredItems = items.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    
    return (
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.owner_email && item.owner_email.toLowerCase().includes(q)) ||
      (item.category && item.category.toLowerCase().includes(q)) ||
      (item.cnpj && item.cnpj.replace(/\D/g, '').includes(q.replace(/\D/g, ''))) ||
      (item.city && item.city.toLowerCase().includes(q)) ||
      (item.owner_name && item.owner_name.toLowerCase().includes(q))
    );
  });

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedFilter('todos');
  };

  const hasActiveFilters = selectedFilter !== 'todos' || searchQuery.trim().length > 0;

  if (!mounted) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-left">
      {/* CABEÇALHO DA CENTRAL DE APROVAÇÕES */}
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

      {/* KPIS SUPERIORES DA FILA (TRIAGEM RÁPIDA) */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setSelectedFilter('pending_review')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${selectedFilter === 'pending_review'
            ? 'bg-[#3B0B14] text-white border-[#C9A227]'
            : 'bg-white text-stone-900 border-stone-300 hover:border-[#3B0B14]'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${selectedFilter === 'pending_review' ? 'text-stone-300' : 'text-stone-500'}`}>Aguardando Análise</span>
            <Clock className={`w-4 h-4 ${selectedFilter === 'pending_review' ? 'text-[#C9A227]' : 'text-amber-600'}`} />
          </div>
          <p className="text-2xl font-serif font-bold mt-1">{counts.pendingReview}</p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedFilter('pronto_para_aprovacao')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${selectedFilter === 'pronto_para_aprovacao'
            ? 'bg-[#3B0B14] text-white border-[#C9A227]'
            : 'bg-white text-stone-900 border-stone-300 hover:border-emerald-600'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${selectedFilter === 'pronto_para_aprovacao' ? 'text-emerald-300' : 'text-emerald-800'}`}>Prontos p/ Aprovar</span>
            <Sparkles className={`w-4 h-4 ${selectedFilter === 'pronto_para_aprovacao' ? 'text-emerald-400' : 'text-emerald-600'}`} />
          </div>
          <p className={`text-2xl font-serif font-bold mt-1 ${selectedFilter === 'pronto_para_aprovacao' ? 'text-white' : 'text-emerald-900'}`}>{counts.ready}</p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedFilter('aguardando_pagamento')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${selectedFilter === 'aguardando_pagamento'
            ? 'bg-[#3B0B14] text-white border-[#C9A227]'
            : 'bg-white text-stone-900 border-stone-300 hover:border-amber-600'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${selectedFilter === 'aguardando_pagamento' ? 'text-amber-200' : 'text-stone-500'}`}>Sem Pagamento</span>
            <CreditCard className={`w-4 h-4 ${selectedFilter === 'aguardando_pagamento' ? 'text-amber-400' : 'text-amber-600'}`} />
          </div>
          <p className={`text-2xl font-serif font-bold mt-1 ${selectedFilter === 'aguardando_pagamento' ? 'text-white' : 'text-amber-900'}`}>{counts.missingPayment}</p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedFilter('aguardando_vinculo')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${selectedFilter === 'aguardando_vinculo'
            ? 'bg-[#3B0B14] text-white border-[#C9A227]'
            : 'bg-white text-stone-900 border-stone-300 hover:border-amber-600'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${selectedFilter === 'aguardando_vinculo' ? 'text-stone-300' : 'text-stone-500'}`}>Sem Vínculo</span>
            <Award className={`w-4 h-4 ${selectedFilter === 'aguardando_vinculo' ? 'text-[#C9A227]' : 'text-amber-600'}`} />
          </div>
          <p className="text-2xl font-serif font-bold mt-1">{counts.missingLink}</p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedFilter('cadastro_incompleto')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${selectedFilter === 'cadastro_incompleto'
            ? 'bg-[#3B0B14] text-white border-[#C9A227]'
            : 'bg-white text-stone-900 border-stone-300 hover:border-[#3B0B14]'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${selectedFilter === 'cadastro_incompleto' ? 'text-amber-200' : 'text-stone-500'}`}>Incompletos (&lt;70%)</span>
            <AlertTriangle className={`w-4 h-4 ${selectedFilter === 'cadastro_incompleto' ? 'text-amber-400' : 'text-amber-600'}`} />
          </div>
          <p className="text-2xl font-serif font-bold mt-1">{counts.incomplete}</p>
        </button>
      </section>

      {/* FILTROS RÁPIDOS E BUSCA E CONTROLE DE VISUALIZAÇÃO */}
      <div className="bg-white border border-stone-300 rounded-2xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
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

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-none">
            <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200" role="group" aria-label="Modo de visualização">
              <button
                type="button"
                title="Visualização em Lista"
                aria-pressed={viewMode === 'list'}
                onClick={() => handleViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${viewMode === 'list' ? 'bg-white shadow-xs text-stone-900 border border-stone-200' : 'text-stone-500 hover:text-stone-700'}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                title="Visualização em Cards"
                aria-pressed={viewMode === 'grid'}
                onClick={() => handleViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${viewMode === 'grid' ? 'bg-white shadow-xs text-stone-900 border border-stone-200' : 'text-stone-500 hover:text-stone-700'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 scrollbar-none">
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${selectedFilter === f.id
                ? 'bg-[#3B0B14] text-[#C9A227] border border-[#C9A227]/40 shadow-xs'
                : 'bg-stone-100 text-stone-700 border border-stone-200 hover:bg-stone-200'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
        <span>
          Exibindo {filteredItems.length} de {items.length} solicitações
        </span>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1 hover:text-stone-800 transition-colors cursor-pointer text-rose-700 font-bold"
          >
            <X className="w-3.5 h-3.5" /> Limpar Filtros
          </button>
        )}
      </div>

      {error ? (
        <div className="bg-rose-50 border border-rose-200 p-8 rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-rose-500" />
          <div>
            <h3 className="text-lg font-bold text-rose-900">Falha ao carregar aprovações</h3>
            <p className="text-sm text-rose-700">{error}</p>
          </div>
          <button
            onClick={() => loadData(selectedFilter)}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 transition-colors"
          >
            <RefreshCcw className="w-4 h-4" /> Tentar novamente
          </button>
        </div>
      ) : loading ? (
        <div className={`gap-4 ${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'space-y-3'}`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-stone-100 animate-pulse rounded-2xl h-32 border border-stone-200"></div>
          ))}
        </div>
      ) : viewMode === 'grid' ? (
        <ApprovalGrid items={filteredItems} onDelete={handleDelete} />
      ) : (
        <ApprovalTable items={filteredItems} onDelete={handleDelete} />
      )}
    </div>
  );
}
