'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CreditCard,
  Sparkles,
  Trash2,
  X,
  ShieldAlert,
  Archive,
  AlertOctagon,
  Pencil,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronUp,
  Columns,
  RotateCcw,
  SlidersHorizontal,
  Check,
  EyeOff,
} from 'lucide-react';


import {
  getAdminBusinessesListAction,
  AdminBusinessListItem,
} from '@/lib/admin/admin-businesses-service';
import { deleteBusinessAdminAction } from '@/app/actions/business-management';

// Definção de Colunas Disponíveis
type ColumnKey =
  | 'company'
  | 'owner'
  | 'plan'
  | 'publication'
  | 'payment'
  | 'completeness'
  | 'recognitions'
  | 'actions';

interface ColumnDef {
  key: ColumnKey;
  label: string;
  defaultWidth: number;
  minWidth: number;
  align?: 'left' | 'center' | 'right';
}

const COLUMNS_CONFIG: ColumnDef[] = [
  { key: 'company', label: 'Empresa & Categoria', defaultWidth: 280, minWidth: 180, align: 'left' },
  { key: 'owner', label: 'Responsável', defaultWidth: 220, minWidth: 150, align: 'left' },
  { key: 'plan', label: 'Plano', defaultWidth: 110, minWidth: 90, align: 'center' },
  { key: 'publication', label: 'Publicação', defaultWidth: 130, minWidth: 100, align: 'center' },
  { key: 'payment', label: 'Pagamento', defaultWidth: 130, minWidth: 100, align: 'center' },
  { key: 'completeness', label: 'Status do cadastro', defaultWidth: 160, minWidth: 120, align: 'center' },
  { key: 'recognitions', label: 'Reconhecimentos', defaultWidth: 160, minWidth: 120, align: 'center' },
  { key: 'actions', label: 'Ação', defaultWidth: 110, minWidth: 90, align: 'right' },
];

const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
  company: true,
  owner: true,
  plan: true,
  publication: true,
  payment: true,
  completeness: true,
  recognitions: true,
  actions: true,
};

const DEFAULT_COL_WIDTHS: Record<ColumnKey, number> = COLUMNS_CONFIG.reduce(
  (acc, col) => ({ ...acc, [col.key]: col.defaultWidth }),
  {} as Record<ColumnKey, number>
);

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
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);


  // PAGINAÇÃO
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalCount, setTotalCount] = useState<number>(0);

  // VISIBILIDADE E LARGURA DE COLUNAS
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS);
  const [colWidths, setColWidths] = useState<Record<ColumnKey, number>>(DEFAULT_COL_WIDTHS);
  const [showColumnMenu, setShowColumnMenu] = useState<boolean>(false);
  const columnMenuRef = useRef<HTMLDivElement>(null);

  // REDIMENSIONAMENTO DRAG-AND-DROP DE COLUNAS
  const [resizingCol, setResizingCol] = useState<ColumnKey | null>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  // SCROLLBAR DUPLO (TOPO E BASE)
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState<number>(0);

  // ESTADO DO MODAL DE EXCLUSÃO / ARQUIVAMENTO
  const [targetDeleteBiz, setTargetDeleteBiz] = useState<AdminBusinessListItem | null>(null);
  const [deleteMode, setDeleteMode] = useState<'archive' | 'hard_delete'>('archive');
  const [confirmNameInput, setConfirmNameInput] = useState('');
  const [isExecutingDelete, setIsExecutingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadData = useCallback(async (filter: string, targetPage: number, targetSize: number) => {
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
      page: targetPage,
      pageSize: targetSize,
    });

    if (res && res.items) {
      setItems(res.items as AdminBusinessListItem[]);
      setTotalCount(res.total || 0);
      if (res.counts) setCounts(res.counts);
    }
    setLoading(false);
  }, [searchQuery]);

  // Recarregar dados quando mudam filtros ou paginação
  useEffect(() => {
    loadData(selectedFilter, page, pageSize);
  }, [selectedFilter, page, pageSize, loadData]);

  // Resetar para página 1 ao alterar filtro ou busca
  const handleFilterChange = (filterId: string) => {
    setSelectedFilter(filterId);
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  // SINCRONIZAÇÃO DE SCROLLBAR DUAL
  const handleTopScroll = () => {
    if (topScrollRef.current && bottomScrollRef.current) {
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };

  const handleBottomScroll = () => {
    if (topScrollRef.current && bottomScrollRef.current) {
      topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
    }
  };

  // Atualizar largura da scrollbar superior quando a tabela renderiza
  useEffect(() => {
    const updateWidth = () => {
      if (tableRef.current) {
        setTableScrollWidth(tableRef.current.scrollWidth);
      }
    };
    updateWidth();
    const timer = setTimeout(updateWidth, 100);
    window.addEventListener('resize', updateWidth);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateWidth);
    };
  }, [items, visibleColumns, colWidths]);

  // FECHAR MENU DE COLUNAS AO CLICAR FORA
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
        setShowColumnMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // LÓGICA DE REDIMENSIONAMENTO DE COLUNA
  const handleMouseDownResize = (colKey: ColumnKey, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingCol(colKey);
    startXRef.current = e.clientX;
    startWidthRef.current = colWidths[colKey];
  };

  useEffect(() => {
    if (!resizingCol) return;

    const colConfig = COLUMNS_CONFIG.find((c) => c.key === resizingCol);
    const minW = colConfig ? colConfig.minWidth : 80;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startXRef.current;
      const newWidth = Math.max(minW, startWidthRef.current + deltaX);
      setColWidths((prev) => ({ ...prev, [resizingCol]: newWidth }));
    };

    const handleMouseUp = () => {
      setResizingCol(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingCol]);

  // TOGGLE DE VISIBILIDADE DE COLUNA
  const toggleColumnVisibility = (key: ColumnKey) => {
    // Garantir que ao menos 1 coluna fique visível
    const activeCount = Object.values(visibleColumns).filter(Boolean).length;
    if (visibleColumns[key] && activeCount <= 1) return;

    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const resetColumnConfig = () => {
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
    setColWidths(DEFAULT_COL_WIDTHS);
  };

  const handleExecuteDelete = async () => {
    if (!targetDeleteBiz) return;
    setIsExecutingDelete(true);
    setDeleteError(null);

    try {
      const res = await deleteBusinessAdminAction(
        targetDeleteBiz.id,
        deleteMode,
        confirmNameInput
      );

      if (!res.success) {
        setDeleteError(res.error || 'Falha ao executar ação de exclusão.');
        setIsExecutingDelete(false);
        return;
      }

      setTargetDeleteBiz(null);
      setConfirmNameInput('');
      setIsExecutingDelete(false);
      loadData(selectedFilter, page, pageSize);
    } catch (err: any) {
      setDeleteError(err.message || 'Erro inesperado durante a exclusão.');
      setIsExecutingDelete(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

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
            Gerencie empresas ativas, monitore vigências financeiras, cotas do plano e mantenha a saúde da carteira.
          </p>
        </div>
      </div>

      {/* KPIS SUPERIORES DA CARTEIRA */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => handleFilterChange('publicadas')}
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
          onClick={() => handleFilterChange('suspensas')}
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
          onClick={() => handleFilterChange('inadimplentes')}
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
          onClick={() => handleFilterChange('incompletas')}
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
          onClick={() => handleFilterChange('pedra_fundamental')}
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

      {/* BUSCA, FILTROS RÁPIDOS E OPÇÕES DE COLUNAS */}
      <div className="bg-white border border-stone-300 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por empresa, responsável, CNPJ ou cidade..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:border-[#3B0B14]"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* BOTÃO TOGGLE DE FILTROS */}
            <button
              type="button"
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isFilterExpanded || selectedFilter !== 'todas'
                  ? 'bg-[#3B0B14] text-[#C9A227] border-[#C9A227]/40 shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-300'
              }`}
              title="Clique para expandir ou colapsar os filtros"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filtros</span>
              {selectedFilter !== 'todas' && (
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              )}
              {isFilterExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 text-[#C9A227]" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
              )}
            </button>

            {/* SELETOR DE EXIBIÇÃO DE COLUNAS */}
            <div className="relative shrink-0" ref={columnMenuRef}>
              <button
                type="button"
                onClick={() => setShowColumnMenu(!showColumnMenu)}
                className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Configurar visibilidade e largura de colunas"
              >
                <Columns className="w-3.5 h-3.5 text-stone-600" />
                <span className="hidden sm:inline">Colunas</span>
              </button>


              {showColumnMenu && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-stone-300 rounded-2xl shadow-xl z-30 p-3 space-y-2 text-stone-900 animate-in fade-in zoom-in duration-150">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                    <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#3B0B14]" />
                      Exibir / Ocultar Colunas
                    </span>
                    <button
                      type="button"
                      onClick={resetColumnConfig}
                      className="text-[10px] font-bold text-stone-500 hover:text-[#3B0B14] flex items-center gap-1 cursor-pointer"
                      title="Restaurar padrão"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset
                    </button>
                  </div>

                  <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                    {COLUMNS_CONFIG.map((col) => (
                      <label
                        key={col.key}
                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-stone-100 cursor-pointer text-xs font-medium text-stone-700"
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={visibleColumns[col.key]}
                            onChange={() => toggleColumnVisibility(col.key)}
                            className="rounded border-stone-300 text-[#3B0B14] focus:ring-[#3B0B14]"
                          />
                          {col.label}
                        </span>
                        {visibleColumns[col.key] && (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>




        {/* CHIPS DE FILTROS EM MULTILINHAS (DESCOLAPSA E COLAPSA AO CLICAR EM FILTROS) */}
        {isFilterExpanded && (
          <div className="pt-3 border-t border-stone-200 animate-in fade-in zoom-in-95 duration-150 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                Filtrar por Status / Plano / Reconhecimento:
              </span>
              {selectedFilter !== 'todas' && (
                <button
                  type="button"
                  onClick={() => handleFilterChange('todas')}
                  className="text-[11px] font-bold text-stone-500 hover:text-red-700 underline cursor-pointer"
                >
                  Limpar Filtro
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 max-w-full">
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
                  onClick={() => handleFilterChange(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
        )}
      </div>


      {/* 2. TABELA DE EMPRESAS COM DUAL HORIZONTAL SCROLLBAR E COLUNAS REDIMENSIONÁVEIS */}
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
          <div>
            {/* 2.1. BARRA DE ROLAGEM HORIZONTAL SUPERIOR */}
            <div
              ref={topScrollRef}
              onScroll={handleTopScroll}
              className="overflow-x-auto bg-stone-50 border-b border-stone-200 scrollbar-thin scrollbar-thumb-stone-300"
              style={{ minHeight: '12px' }}
            >
              <div style={{ width: `${tableScrollWidth}px`, height: '8px' }} />
            </div>

            {/* 2.2. CONTAINER PRINCIPAL COM TABELA */}
            <div
              ref={bottomScrollRef}
              onScroll={handleBottomScroll}
              className="overflow-x-auto scrollbar-thin scrollbar-thumb-stone-300"
            >
              <table ref={tableRef} className="w-full text-left text-xs border-collapse table-fixed">
                <thead>
                  <tr className="bg-stone-100 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider select-none">
                    {COLUMNS_CONFIG.map(
                      (col) =>
                        visibleColumns[col.key] && (
                          <th
                            key={col.key}
                            style={{ width: `${colWidths[col.key]}px` }}
                            className={`py-3 px-4 relative group ${
                              col.align === 'center'
                                ? 'text-center'
                                : col.align === 'right'
                                ? 'text-right'
                                : 'text-left'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 min-w-0 pr-1">
                              <span className="truncate block">{col.label}</span>
                              {col.key !== 'company' && col.key !== 'actions' && (
                                <button
                                  type="button"
                                  onClick={() => toggleColumnVisibility(col.key)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-stone-200 text-stone-400 hover:text-stone-700 cursor-pointer shrink-0"
                                  title={`Ocultar coluna "${col.label}"`}
                                >
                                  <EyeOff className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {/* HANDLER DE REDIMENSIONAMENTO DA COLUNA */}
                            <div
                              onMouseDown={(e) => handleMouseDownResize(col.key, e)}
                              className={`absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-[#C9A227] transition-colors z-10 flex items-center justify-center ${
                                resizingCol === col.key ? 'bg-[#3B0B14]' : ''
                              }`}
                              title="Arraste para redimensionar esta coluna"
                            >
                              <div className="w-0.5 h-4 bg-stone-300 group-hover:bg-[#3B0B14]" />
                            </div>
                          </th>

                        )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-stone-50/80 transition-colors">
                      {/* EMPRESA */}
                      {visibleColumns.company && (
                        <td className="py-3.5 px-4" style={{ width: `${colWidths.company}px` }}>
                          <div className="flex items-start gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-[#3B0B14] font-serif font-bold text-sm shrink-0">
                              {item.name.charAt(0)}
                            </div>
                            <div className="overflow-hidden">
                              <div className="font-serif font-bold text-sm text-stone-900 truncate">
                                {item.name}
                              </div>
                              <span className="text-[11px] text-stone-500 font-semibold truncate block">
                                {item.category} • {item.city}, {item.state}
                              </span>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* RESPONSÁVEL */}
                      {visibleColumns.owner && (
                        <td className="py-3.5 px-4 text-stone-700" style={{ width: `${colWidths.owner}px` }}>
                          <div className="font-bold text-stone-900 truncate">{item.owner_name}</div>
                          <div className="text-[11px] text-stone-500 font-mono truncate">{item.owner_email}</div>
                        </td>
                      )}

                      {/* PLANO */}
                      {visibleColumns.plan && (
                        <td className="py-3.5 px-4 text-center" style={{ width: `${colWidths.plan}px` }}>
                          <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-900 font-extrabold text-[10px] uppercase border border-stone-300 inline-block">
                            {item.plan_code}
                          </span>
                        </td>
                      )}

                      {/* PUBLICAÇÃO */}
                      {visibleColumns.publication && (
                        <td className="py-3.5 px-4 text-center" style={{ width: `${colWidths.publication}px` }}>
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
                      )}

                      {/* PAGAMENTO */}
                      {visibleColumns.payment && (
                        <td className="py-3.5 px-4 text-center" style={{ width: `${colWidths.payment}px` }}>
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
                      )}

                      {/* COMPLETUDE */}
                      {visibleColumns.completeness && (
                        <td className="py-3.5 px-4 text-center" style={{ width: `${colWidths.completeness}px` }}>
                          <div className="inline-flex items-center gap-1.5">
                            <div className="w-12 bg-stone-200 h-2 rounded-full overflow-hidden shrink-0">
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
                      )}

                      {/* RECONHECIMENTOS */}
                      {visibleColumns.recognitions && (
                        <td className="py-3.5 px-4 text-center" style={{ width: `${colWidths.recognitions}px` }}>
                          <div className="flex items-center justify-center gap-1 flex-wrap">
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
                      )}

                      {/* CTA: EDITAR PRONTUÁRIO 360 & BOTÃO EXCLUIR */}
                      {visibleColumns.actions && (
                        <td className="py-3.5 px-4 text-right" style={{ width: `${colWidths.actions}px` }}>
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/admin/empresas/${item.id}`}
                              title="Editar Anunciante / Prontuário 360º"
                              className="p-1.5 rounded-xl bg-[#3B0B14] hover:bg-[#4B161B] text-[#C9A227] border border-[#C9A227]/40 transition-all cursor-pointer shadow-xs inline-flex items-center justify-center"
                            >
                              <Pencil className="w-4 h-4" />
                            </Link>

                            <button
                              type="button"
                              onClick={() => {
                                setTargetDeleteBiz(item);
                                setDeleteMode('archive');
                                setConfirmNameInput('');
                                setDeleteError(null);
                              }}
                              title="Excluir ou Inativar Anunciante"
                              className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all cursor-pointer shadow-xs"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 2.3. CONTROLES DE PAGINAÇÃO DA TABELA */}
            <div className="p-4 border-t border-stone-200 bg-stone-50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-stone-700">
              <div className="flex items-center gap-3">
                <span>
                  Exibindo{' '}
                  <strong className="text-stone-900">
                    {totalCount > 0 ? (page - 1) * pageSize + 1 : 0}
                  </strong>{' '}
                  até{' '}
                  <strong className="text-stone-900">
                    {Math.min(page * pageSize, totalCount)}
                  </strong>{' '}
                  de <strong className="text-stone-900">{totalCount}</strong> empresas
                </span>

                <div className="flex items-center gap-1.5 ml-2">
                  <span className="text-stone-500 font-normal">Por página:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="px-2 py-1 bg-white border border-stone-300 rounded-lg text-xs font-bold text-stone-900 outline-none focus:border-[#3B0B14]"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {/* BOTÕES NAVEGADORES DE PÁGINA */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage(1)}
                  disabled={page <= 1}
                  title="Primeira página"
                  className="p-1.5 rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1}
                  title="Página anterior"
                  className="p-1.5 rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-3 py-1 bg-stone-200 text-stone-900 rounded-lg font-bold">
                  Página {page} de {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page >= totalPages}
                  title="Próxima página"
                  className="p-1.5 rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                  title="Última página"
                  className="p-1.5 rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. MODAL DE CONFIRMAÇÃO DE EXCLUSÃO / INATIVAÇÃO */}
      {targetDeleteBiz && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-[#C9A227]/40 text-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative animate-in fade-in zoom-in duration-200">
            {/* FECHAR */}
            <button
              type="button"
              onClick={() => setTargetDeleteBiz(null)}
              className="absolute top-4 right-4 text-stone-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* TÍTULO */}
            <div className="flex items-center gap-3 border-b border-stone-800 pb-4">
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-400 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-white">
                  Gerenciar Status / Exclusão
                </h3>
                <p className="text-xs text-stone-400">
                  Empresa: <strong className="text-white">{targetDeleteBiz.name}</strong>
                </p>
              </div>
            </div>

            {/* ERRO */}
            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-medium flex items-start gap-2">
                <AlertOctagon className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            {/* OPÇÕES DE MODO */}
            <div className="space-y-3">
              <p className="text-xs text-stone-300 font-medium">Selecione o tipo de ação desejada:</p>

              {/* OPÇÃO 1: SOFT DELETE (ARQUIVAR / INATIVAR) */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                  deleteMode === 'archive'
                    ? 'bg-amber-950/40 border-[#C9A227] text-white shadow-xs'
                    : 'bg-stone-800/60 border-stone-700 text-stone-400 hover:bg-stone-800'
                }`}
              >
                <input
                  type="radio"
                  name="deleteMode"
                  checked={deleteMode === 'archive'}
                  onChange={() => {
                    setDeleteMode('archive');
                    setDeleteError(null);
                  }}
                  className="mt-1 accent-[#C9A227]"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-serif font-bold text-sm text-[#C9A227]">
                    <Archive className="w-4 h-4" />
                    <span>Inativar / Arquivar Anunciante (Recomendado)</span>
                  </div>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    Desativa a exibição pública do anúncio no guia e suspende os acessos. Preserva faturas, pagamentos e históricos de auditoria no banco.
                  </p>
                </div>
              </label>

              {/* OPÇÃO 2: HARD DELETE (EXCLUSÃO PERMANENTE) */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                  deleteMode === 'hard_delete'
                    ? 'bg-rose-950/40 border-rose-500 text-white shadow-xs'
                    : 'bg-stone-800/60 border-stone-700 text-stone-400 hover:bg-stone-800'
                }`}
              >
                <input
                  type="radio"
                  name="deleteMode"
                  checked={deleteMode === 'hard_delete'}
                  onChange={() => {
                    setDeleteMode('hard_delete');
                    setDeleteError(null);
                  }}
                  className="mt-1 accent-rose-500"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-serif font-bold text-sm text-rose-400">
                    <Trash2 className="w-4 h-4" />
                    <span>Excluir Definitivamente do Banco de Dados</span>
                  </div>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    Remove permanentemente a empresa e todos os seus registros de mídia, localização e contatos do banco. <strong>Ação irreversível.</strong>
                  </p>
                </div>
              </label>
            </div>

            {/* CONFIRMAÇÃO DE TEXTO PARA HARD DELETE */}
            {deleteMode === 'hard_delete' && (
              <div className="p-3.5 rounded-xl bg-stone-800/80 border border-stone-700 space-y-2">
                <label className="text-xs text-stone-300 block font-semibold">
                  Para confirmar a exclusão permanente, digite exatamente o nome da empresa abaixo:
                </label>
                <input
                  type="text"
                  value={confirmNameInput}
                  onChange={(e) => setConfirmNameInput(e.target.value)}
                  placeholder={targetDeleteBiz.name}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-lg text-xs text-white placeholder-stone-600 focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>
            )}

            {/* BOTÕES DE AÇÃO DO MODAL */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setTargetDeleteBiz(null)}
                disabled={isExecutingDelete}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={
                  isExecutingDelete ||
                  (deleteMode === 'hard_delete' &&
                    confirmNameInput.trim().toLowerCase() !== targetDeleteBiz.name.trim().toLowerCase())
                }
                className={`px-5 py-2 font-extrabold text-xs rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                  deleteMode === 'hard_delete'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-[#3B0B14] hover:bg-[#4B161B] text-[#C9A227] border border-[#C9A227]/40'
                }`}
              >
                {isExecutingDelete ? (
                  <span>Executando...</span>
                ) : deleteMode === 'hard_delete' ? (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Excluir Permanentemente</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4" />
                    <span>Inativar Anunciante</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
