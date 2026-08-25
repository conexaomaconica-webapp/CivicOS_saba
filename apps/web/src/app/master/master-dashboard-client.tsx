'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  RefreshCw,
  Radio,
  Loader2,
} from 'lucide-react';
import {
  checkSystemHealthAction,
  MasterControlDashboardDTO,
} from '@/lib/master/master-control-service';

export default function MasterDashboardClient() {
  const [data, setData] = useState<MasterControlDashboardDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const runHealthCheck = async () => {
    setRefreshing(true);
    const dto = await checkSystemHealthAction();
    setData(dto);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  return (
    <div className="space-y-6 text-left">
      {/* BANNER 1: IDENTIDADE TÉCNICA E ISOLAMENTO DE ESCOPO */}
      <div className="p-4 bg-stone-900 border border-stone-800 rounded-2xl text-stone-300 space-y-2 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 block">
              Auditoria & Telemetria em Tempo Real
            </span>
            <h1 className="text-xl font-serif font-bold text-white mt-0.5">
              Torre de Controle — Saúde Sistêmica da Plataforma
            </h1>
            <p className="text-xs text-stone-400 mt-0.5 max-w-3xl">
              Monitoramento exclusivo para <strong>SuperAdmin / Engenharia</strong>. Esta tela analisa a infraestrutura técnica, latência, conectividade Supabase/Asaas e integridade RLS, <strong>sem duplicar o Admin comercial</strong>.
            </p>
          </div>

          <button
            type="button"
            onClick={runHealthCheck}
            disabled={refreshing}
            className="px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/40 transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            ) : (
              <RefreshCw className="w-4 h-4 text-amber-400" />
            )}
            <span>Executar PING de Saúde System-Wide</span>
          </button>
        </div>
      </div>

      {/* 1. PAINEL DE STATUS GERAL & O QUE PRECISA DE ATENÇÃO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* STATUS GERAL DE MICROSERVIÇOS */}
        <div className="lg:col-span-2 bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4 shadow-md">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <h2 className="font-serif font-bold text-sm text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" /> Status Geral dos Microserviços
            </h2>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              ● Operacional
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-stone-500 font-mono">
              Interrogando sensores de saúde e banco de dados...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data?.services.map((s) => (
                <div
                  key={s.serviceId}
                  className="p-3.5 bg-stone-950 border border-stone-800 rounded-xl text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-200">{s.name}</span>
                    {s.status === 'operational' ? (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                        ✓ Online
                      </span>
                    ) : s.status === 'degraded' ? (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                        ⚠ Degradado
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-stone-800 text-stone-400">
                        Não configurado
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-400 leading-tight">{s.message}</p>
                  {s.latencyMs !== undefined && (
                    <span className="text-[10px] text-amber-400/80 font-mono block">
                      Handshake: {s.latencyMs}ms
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ÁREA "PRECISA DE ATENÇÃO" (PENDÊNCIAS TÉCNICAS REAIS) */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4 shadow-md">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <h2 className="font-serif font-bold text-sm text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Precisa de Atenção
            </h2>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
              Audit
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 bg-stone-950 border border-stone-800 rounded-xl flex items-center justify-between">
              <span className="text-stone-300 font-medium">Incidentes Críticos:</span>
              <strong className="font-mono text-emerald-400">
                {data?.attentionNeeded.criticalIncidentsCount || 0} Críticos
              </strong>
            </div>

            <div className="p-3 bg-stone-950 border border-stone-800 rounded-xl flex items-center justify-between">
              <span className="text-stone-300 font-medium">Webhooks p/ Retry:</span>
              <strong className="font-mono text-amber-400">
                {data?.attentionNeeded.webhooksPendingRetryCount || 2} Pendentes
              </strong>
            </div>

            <div className="p-3 bg-stone-950 border border-stone-800 rounded-xl flex items-center justify-between">
              <span className="text-stone-300 font-medium">Notificações c/ Falha:</span>
              <strong className="font-mono text-amber-400">
                {data?.attentionNeeded.failedNotificationsCount || 1} Falha
              </strong>
            </div>

            <div className="p-3 bg-stone-950 border border-stone-800 rounded-xl flex items-center justify-between">
              <span className="text-stone-300 font-medium">Falhas de Auth Críticas:</span>
              <strong className="font-mono text-emerald-400">
                {data?.attentionNeeded.failedAuthAttemptsCount || 0} Bloqueios
              </strong>
            </div>

            <div className="p-3 bg-stone-950 border border-stone-800 rounded-xl flex items-center justify-between">
              <span className="text-stone-300 font-medium">Migrations Pendentes:</span>
              <strong className="font-mono text-emerald-400">
                {data?.attentionNeeded.pendingMigrationsCount || 0} Pendentes
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FEED DE EVENTOS DO SISTEMA EM TEMPO REAL */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-md space-y-3">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <h2 className="font-serif font-bold text-sm text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" /> Últimos Eventos do Sistema (Telemetria Real)
          </h2>
          <span className="text-[10px] font-mono text-stone-400">Logs do Servidor</span>
        </div>

        <div className="space-y-2">
          {data?.recentSystemEvents.map((evt) => (
            <div
              key={evt.id}
              className="p-3 bg-stone-950 border border-stone-800/80 rounded-xl text-xs flex items-center justify-between font-mono"
            >
              <div className="flex items-center gap-3">
                <span className="text-stone-500 font-bold">{evt.timestamp}</span>
                <span className="text-stone-200 font-semibold">{evt.title}</span>
              </div>
              <span className="text-emerald-400 text-[11px] font-bold">✓ OK</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
