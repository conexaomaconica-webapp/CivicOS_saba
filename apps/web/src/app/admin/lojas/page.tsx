import React from 'react';
import Link from 'next/link';
import {
  Compass,
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { getAdminLodgesListAction } from '@/lib/admin/admin-lodges-service';

export const metadata = {
  title: 'Diretório de Lojas Maçônicas · Admin CM',
};

type AdminLojasPageProps = {
  searchParams: Promise<{
    q?: string;
    state?: string;
    potency?: string;
    status?: string;
    missingCoords?: string;
    missingEmblem?: string;
    page?: string;
  }>;
};

export default async function AdminLojasPage({ searchParams }: AdminLojasPageProps) {
  const resolvedParams = await searchParams;
  const q = resolvedParams.q || '';
  const state = resolvedParams.state || 'all';
  const potency = resolvedParams.potency || 'all';
  const status = resolvedParams.status || 'all';
  const missingCoords = resolvedParams.missingCoords === 'true';
  const missingEmblem = resolvedParams.missingEmblem === 'true';
  const page = parseInt(resolvedParams.page || '1', 10);

  const { items, total, kpis } = await getAdminLodgesListAction({
    query: q,
    state: state !== 'all' ? state : undefined,
    potency: potency !== 'all' ? potency : undefined,
    status: status !== 'all' ? status : undefined,
    missingCoords,
    missingEmblem,
    page,
    pageSize: 10,
  });

  const totalPages = Math.max(1, Math.ceil(total / 10));

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#C9A227]/30 pb-4">
        <div>
          <span className="bg-[#3B0B14] text-[#C9A227] font-bold text-xs px-2.5 py-0.5 rounded-full border border-[#C9A227]/40">
            Organizações Maçônicas · Conexão Maçônica
          </span>
          <h1 className="text-2xl font-serif font-bold text-[#1f1914] mt-2 flex items-center gap-2">
            <Compass className="w-6 h-6 text-[#4B161B]" /> Gestão 360º de Lojas Maçônicas & Potências
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Central operacional de qualificação da base de Lojas: auditoria de endereço, reuniões, brasão e geolocalização.
          </p>
        </div>
      </div>

      {/* SUPERIOR KPI CARDS (DADOS REAIS DE QUALIDADE DA BASE) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-stone-300 rounded-2xl p-4 space-y-1 shadow-xs">
          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Total Lojas</span>
          <p className="text-2xl font-serif font-bold text-[#1f1914]">{kpis.total}</p>
          <span className="text-[10px] text-stone-400">Cadastradas</span>
        </div>

        <div className="bg-white border border-stone-300 rounded-2xl p-4 space-y-1 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Publicadas</span>
          <p className="text-2xl font-serif font-bold text-emerald-800">{kpis.published}</p>
          <span className="text-[10px] text-emerald-600 font-semibold">Ativas no Guia</span>
        </div>

        <div className="bg-white border border-stone-300 rounded-2xl p-4 space-y-1 shadow-xs">
          <span className="text-[10px] font-bold text-stone-600 uppercase tracking-wider">Inativas</span>
          <p className="text-2xl font-serif font-bold text-stone-700">{kpis.inactive}</p>
          <span className="text-[10px] text-stone-500">Desativadas</span>
        </div>

        <div className="bg-white border border-stone-300 rounded-2xl p-4 space-y-1 shadow-xs">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Sem Coordenadas</span>
          <p className="text-2xl font-serif font-bold text-amber-900">{kpis.missing_coords}</p>
          <span className="text-[10px] text-amber-700 font-semibold">Sem GPS</span>
        </div>

        <div className="bg-white border border-stone-300 rounded-2xl p-4 space-y-1 shadow-xs">
          <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">Sem Brasão</span>
          <p className="text-2xl font-serif font-bold text-purple-900">{kpis.missing_emblem}</p>
          <span className="text-[10px] text-purple-700">Logo ausente</span>
        </div>

        <div className="bg-[#3B0B14] text-white border border-[#C9A227]/40 rounded-2xl p-4 space-y-1 shadow-md">
          <span className="text-[10px] font-bold text-[#C9A227] uppercase tracking-wider">Duplicidades</span>
          <p className="text-2xl font-serif font-bold text-white">{kpis.possible_duplicates}</p>
          <span className="text-[10px] text-amber-200/80">Para revisão</span>
        </div>
      </div>

      {/* FILTROS E BUSCA DE QUALIDADE */}
      <form className="bg-stone-900 text-white p-4 rounded-2xl border border-stone-800 space-y-3 shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Busca por Nome/Número/Oriente */}
          <div className="md:col-span-1 space-y-1">
            <label className="text-[11px] font-bold text-stone-300">Buscar Nome, Número ou Cidade:</label>
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Ex: 13 de Maio, 450, São Paulo..."
                className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-500 outline-none focus:border-[#C9A227]"
              />
            </div>
          </div>

          {/* Filtro Potência */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-stone-300">Potência Maçônica:</label>
            <select
              name="potency"
              defaultValue={potency}
              className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-white outline-none focus:border-[#C9A227]"
            >
              <option value="all">Todas as Potências</option>
              <option value="GLESP">GLESP</option>
              <option value="GOB">GOB</option>
              <option value="GOSP">GOSP</option>
              <option value="COMAB">COMAB</option>
            </select>
          </div>

          {/* Filtro Status */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-stone-300">Status de Publicação:</label>
            <select
              name="status"
              defaultValue={status}
              className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-white outline-none focus:border-[#C9A227]"
            >
              <option value="all">Todos os Status</option>
              <option value="published">Publicada</option>
              <option value="inactive">Inativa</option>
            </select>
          </div>

          {/* Qualidade da Base (Coordenadas / Brasão) */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-stone-300">Auditoria de Qualidade:</label>
            <div className="flex items-center gap-3 pt-1">
              <label className="flex items-center gap-1.5 text-xs text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  name="missingCoords"
                  value="true"
                  defaultChecked={missingCoords}
                  className="accent-[#C9A227]"
                />
                <span>Sem Coordenadas</span>
              </label>

              <label className="flex items-center gap-1.5 text-xs text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  name="missingEmblem"
                  value="true"
                  defaultChecked={missingEmblem}
                  className="accent-[#C9A227]"
                />
                <span>Sem Brasão</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
          <Link
            href="/admin/lojas"
            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold rounded-xl transition-colors"
          >
            Limpar Filtros
          </Link>
          <button
            type="submit"
            className="px-4 py-1.5 bg-[#C9A227] hover:bg-amber-400 text-[#3B0B14] font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filtrar Lojas</span>
          </button>
        </div>
      </form>

      {/* TABELA DE LOJAS */}
      <div className="bg-white border border-stone-300 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-stone-100 border-b border-stone-300 text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                <th className="py-3 px-4">Loja / Número</th>
                <th className="py-3 px-4">Oriente / UF</th>
                <th className="py-3 px-4">Potência & Rito</th>
                <th className="py-3 px-4">Reunião</th>
                <th className="py-3 px-4">Completude %</th>
                <th className="py-3 px-4">Origem</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Prontuário 360º</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 text-xs">
              {items.map((lodge) => (
                <tr key={lodge.id} className="hover:bg-stone-50/80 transition-colors">
                  {/* Loja & Número */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-0.5">
                      <p className="font-serif font-bold text-stone-900 text-sm">{lodge.name}</p>
                      <p className="text-[11px] text-stone-500 font-mono">Nº {lodge.code_number || 'S/N'}</p>
                    </div>
                  </td>

                  {/* Cidade & Estado */}
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-stone-800">
                      {lodge.city} - {lodge.state}
                    </p>
                  </td>

                  {/* Potência & Rito */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-0.5">
                      <span className="font-bold text-[#4B161B] text-[11px]">{lodge.potency}</span>
                      <p className="text-[10px] text-stone-500">{lodge.rite || 'R.E.A.A.'}</p>
                    </div>
                  </td>

                  {/* Reunião */}
                  <td className="py-3.5 px-4">
                    <p className="text-stone-700 font-medium">{lodge.meeting_schedule || 'Não informada'}</p>
                  </td>

                  {/* Indicador de Completude % */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-1">
                      <span
                        className={`font-mono font-bold text-xs ${
                          lodge.completeness_percent >= 80
                            ? 'text-emerald-700'
                            : lodge.completeness_percent >= 50
                            ? 'text-amber-700'
                            : 'text-red-700'
                        }`}
                      >
                        {lodge.completeness_percent}%
                      </span>
                      <div className="w-16 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            lodge.completeness_percent >= 80
                              ? 'bg-emerald-600'
                              : lodge.completeness_percent >= 50
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${lodge.completeness_percent}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Origem dos Dados (Excel / Manual) */}
                  <td className="py-3.5 px-4">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-300">
                      {lodge.provenance}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        lodge.is_active
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-stone-100 text-stone-600 border border-stone-300'
                      }`}
                    >
                      {lodge.is_active ? 'Publicada' : 'Inativa'}
                    </span>
                  </td>

                  {/* Prontuário 360º */}
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/admin/lojas/${lodge.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#3B0B14] hover:bg-[#4B161B] text-[#C9A227] font-bold text-xs transition-all cursor-pointer shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Visão 360º</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs text-stone-600">
          <span>
            Página <strong className="text-stone-900">{page}</strong> de{' '}
            <strong className="text-stone-900">{totalPages}</strong> ({total} lojas no total)
          </span>

          <div className="flex items-center gap-1">
            {page > 1 && (
              <Link
                href={`/admin/lojas?page=${page - 1}&q=${q}&state=${state}&potency=${potency}&status=${status}`}
                className="p-1.5 rounded-lg border border-stone-300 hover:bg-stone-200 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/lojas?page=${page + 1}&q=${q}&state=${state}&potency=${potency}&status=${status}`}
                className="p-1.5 rounded-lg border border-stone-300 hover:bg-stone-200 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
