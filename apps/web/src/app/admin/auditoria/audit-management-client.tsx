'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  History,
  UserCheck,
  AlertTriangle,
  Search,
  ArrowRight,
  Layers,
  FileText,
} from 'lucide-react';
import {
  getAdminAuditLogsDashboardAction,
  AdminAuditDashboardDTO,
  AdminAuditLogItem,
} from '@/lib/admin/admin-audit-service';

export default function AuditManagementClient() {
  const [data, setData] = useState<AdminAuditDashboardDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [queryAdmin, setQueryAdmin] = useState('');
  const [queryTarget, setQueryTarget] = useState('');
  const [severityFilter, setSeverityFilter] = useState('todos');
  const [moduleFilter, setModuleFilter] = useState('todos');
  const [selectedAuditLog, setSelectedAuditLog] = useState<AdminAuditLogItem | null>(null);

  const loadAuditLogs = async () => {
    setLoading(true);
    const res = await getAdminAuditLogsDashboardAction({
      queryAdmin,
      queryTarget,
      severityFilter,
      moduleFilter,
      page: 1,
      pageSize: 50,
    });
    setData(res);
    setLoading(false);
  };

  useEffect(() => {
    loadAuditLogs();
  }, [queryAdmin, queryTarget, severityFilter, moduleFilter]);

  return (
    <div className="space-y-6 text-left">
      {/* 1. TOPO EXECUTIVO DE KPIS DE GOVERNANÇA */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-[#3B0B14] text-white border border-[#C9A227]/50 rounded-2xl shadow-md">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#C9A227]">
            <span>Total de Ações (30d)</span>
            <History className="w-4 h-4 text-[#C9A227]" />
          </div>
          <p className="text-2xl font-serif font-bold mt-1 text-white">{data?.kpis.totalActions30d || 0}</p>
          <span className="text-[10px] text-stone-300">Trilha imutável registrada</span>
        </div>

        <div className="p-4 bg-white border border-stone-300 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-rose-800">
            <span>Ações Sensíveis / Riscos</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-rose-900 mt-1">{data?.kpis.sensitiveActionsCount || 0}</p>
          <span className="text-[10px] text-rose-700 font-semibold">Suspensões & Preço</span>
        </div>

        <div className="p-4 bg-white border border-stone-300 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-emerald-800">
            <span>Administradores Ativos</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-emerald-900 mt-1">{data?.kpis.activeAdminsCount || 3}</p>
          <span className="text-[10px] text-emerald-600">Com percurso auditado</span>
        </div>

        <div className="p-4 bg-white border border-stone-300 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-stone-500">
            <span>Módulos Impactados</span>
            <Layers className="w-4 h-4 text-stone-500" />
          </div>
          <p className="text-2xl font-serif font-bold text-stone-900 mt-1">{data?.kpis.affectedModulesCount || 5}</p>
          <span className="text-[10px] text-stone-400">Escopo da plataforma</span>
        </div>
      </section>

      {/* 2. FILTROS & BUSCA DE GOVERNANÇA */}
      <div className="bg-white border border-stone-300 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por Admin (nome/e-mail)..."
              value={queryAdmin}
              onChange={(e) => setQueryAdmin(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:border-[#3B0B14]"
            />
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por Empresa ou Alvo..."
              value={queryTarget}
              onChange={(e) => setQueryTarget(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:border-[#3B0B14]"
            />
          </div>

          <div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:border-[#3B0B14] cursor-pointer"
            >
              <option value="todos">Todas as Severidades</option>
              <option value="critical">Crítica (Suspensão / Preço)</option>
              <option value="warning">Alerta (Selo / Re-processamento)</option>
              <option value="info">Informativa (Aprovação / Atualização)</option>
            </select>
          </div>

          <div>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:border-[#3B0B14] cursor-pointer"
            >
              <option value="todos">Todos os Módulos</option>
              <option value="empresas">Empresas</option>
              <option value="aprovações">Aprovações</option>
              <option value="planos">Planos</option>
              <option value="pagamentos">Pagamentos</option>
              <option value="lojas">Lojas</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. TABELA DE LOGS DE AUDITORIA */}
      <div className="bg-white border border-stone-300 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-stone-500 font-semibold">
            Carregando trilha de auditoria administrativa...
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <History className="w-8 h-8 text-stone-400 mx-auto" />
            <p className="text-sm font-bold text-stone-800">
              Nenhum evento registrado nesta busca de auditoria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-100 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Operador (Admin)</th>
                  <th className="py-3 px-4 text-center">Ação & Módulo</th>
                  <th className="py-3 px-4">Alvo / Entidade</th>
                  <th className="py-3 px-4">Justificativa</th>
                  <th className="py-3 px-4 text-right">Comparativo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {data.items.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50/80 transition-colors">
                    {/* DATA / HORA */}
                    <td className="py-3.5 px-4 font-mono text-stone-600 text-[11px]">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </td>

                    {/* OPERADOR */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-stone-900 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>{log.actor_name}</span>
                      </div>
                      <span className="text-[11px] text-stone-500 font-mono">{log.actor_email}</span>
                    </td>

                    {/* AÇÃO & MÓDULO */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded font-mono font-bold text-[10px] uppercase border inline-block ${
                          log.severity === 'critical'
                            ? 'bg-rose-100 text-rose-900 border-rose-300'
                            : log.severity === 'warning'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-stone-100 text-stone-800 border-stone-300'
                        }`}
                      >
                        {log.action_type}
                      </span>
                      <span className="text-[10px] text-stone-500 font-semibold block mt-0.5">
                        {log.module_name}
                      </span>
                    </td>

                    {/* ALVO */}
                    <td className="py-3.5 px-4">
                      <Link
                        href={log.entity_link}
                        className="font-serif font-bold text-stone-900 hover:text-[#3B0B14] hover:underline flex items-center gap-1"
                      >
                        <span>{log.entity_name}</span>
                      </Link>
                      <span className="text-[10px] text-stone-400 font-mono">ID: {log.entity_id}</span>
                    </td>

                    {/* JUSTIFICATIVA */}
                    <td className="py-3.5 px-4 text-stone-700 italic max-w-xs line-clamp-2">
                      "{log.justification}"
                    </td>

                    {/* COMPARATIVO BEFORE / AFTER */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedAuditLog(log)}
                        className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-900 font-bold text-xs rounded-xl border border-stone-300 transition-all inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Before / After</span>
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

      {/* 4. DRAWER / MODAL DE DETALHAMENTO DE AUDITORIA BEFORE / AFTER */}
      {selectedAuditLog && (
        <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-stone-300 rounded-2xl p-6 max-w-2xl w-full space-y-4 shadow-2xl text-left">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#3B0B14] text-[#C9A227] font-bold text-[10px] uppercase">
                  Prontuário de Governança & Auditoria
                </span>
                <h3 className="font-serif font-bold text-lg text-stone-900 mt-1">
                  Evento: {selectedAuditLog.action_type}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAuditLog(null)}
                className="text-stone-400 hover:text-stone-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-stone-600">Administrador / Autor:</span>
                <strong className="text-stone-900 font-bold">{selectedAuditLog.actor_name} ({selectedAuditLog.actor_email})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Alvo / Entidade Afetada:</span>
                <strong className="font-serif text-[#3B0B14]">{selectedAuditLog.entity_name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Data / IP:</span>
                <strong className="font-mono">{new Date(selectedAuditLog.created_at).toLocaleString('pt-BR')} • IP {selectedAuditLog.ip_address}</strong>
              </div>
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 mt-2">
                <span className="font-bold block">Justificativa Oficial Registrada:</span>
                <p className="italic font-sans mt-0.5 font-medium">"{selectedAuditLog.justification}"</p>
              </div>
            </div>

            {/* COMPARATIVO BEFORE VS AFTER */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-red-50/60 border border-red-200 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-900 block">
                  Estado Anterior (Before):
                </span>
                <pre className="font-mono text-[11px] text-red-950 whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(selectedAuditLog.before_state || { status: 'original' }, null, 2)}
                </pre>
              </div>

              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 block">
                  Novo Estado (After):
                </span>
                <pre className="font-mono text-[11px] text-emerald-950 whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(selectedAuditLog.after_state || { status: 'modified' }, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Link
                href={selectedAuditLog.entity_link}
                className="text-xs font-bold text-[#3B0B14] hover:underline flex items-center gap-1"
              >
                <FileText className="w-4 h-4" />
                <span>Abrir Objeto Afetado →</span>
              </Link>

              <button
                type="button"
                onClick={() => setSelectedAuditLog(null)}
                className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-900 font-bold text-xs rounded-xl cursor-pointer"
              >
                Fechar Prontuário
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
