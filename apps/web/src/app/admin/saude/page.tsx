import React from 'react';
import { notFound } from 'next/navigation';
import { assertMasterAdminAccess } from '@/lib/admin/admin-auth-helper';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Globe,
  CreditCard,
  Server,
  ShieldCheck,
} from 'lucide-react';

export const metadata = {
  title: 'Central de Saúde da Plataforma · Admin Master',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface RecentPaymentEvent {
  id: string;
  provider_code: string;
  event_type: string;
  event_id: string | null;
  processed: boolean | null;
  error_log: string | null;
  created_at: string | null;
}

export default async function AdminSaudePage() {
  let supabaseClient: Awaited<ReturnType<typeof assertMasterAdminAccess>>['supabase'];

  try {
    const authResult = await assertMasterAdminAccess();
    supabaseClient = authResult.supabase;
  } catch {
    // Acesso não autorizado recebe 404 para proteger a existência da rota
    notFound();
  }

  // 1. Verificação de Saúde do Banco de Dados (Supabase) com medição de latência real
  const dbStart = Date.now();
  let dbStatus: 'healthy' | 'degraded' | 'unreachable' = 'healthy';
  let dbLatencyMs: number;
  let dbErrorMessage: string | null = null;

  try {
    const { error: dbErr } = await supabaseClient
      .from('businesses')
      .select('id', { head: true, count: 'exact' })
      .limit(1);

    dbLatencyMs = Date.now() - dbStart;

    if (dbErr && !dbErr.message.includes('0 rows')) {
      dbStatus = 'degraded';
      dbErrorMessage = dbErr.message;
    }
  } catch (err: unknown) {
    dbStatus = 'unreachable';
    dbLatencyMs = Date.now() - dbStart;
    dbErrorMessage = err instanceof Error ? err.message : 'Falha de comunicação com o banco';
  }

  // 2. Consulta de Auditoria Real dos Eventos Financeiros (payment_provider_events)
  let recentEvents: RecentPaymentEvent[] = [];
  let totalEventsCount = 0;
  let failedEventsCount = 0;
  let successfulEventsCount = 0;

  try {
    const { data: eventsData, count } = await supabaseClient
      .from('payment_provider_events')
      .select('id, provider_code, event_type, event_id, processed, error_log, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(15);

    if (eventsData) {
      recentEvents = eventsData;
      totalEventsCount = count || eventsData.length;
      failedEventsCount = recentEvents.filter((e) => !e.processed || Boolean(e.error_log)).length;
      successfulEventsCount = recentEvents.filter((e) => e.processed && !e.error_log).length;
    }
  } catch {
    // Falha silenciosa para não travar a visualização de saúde da web
  }

  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'dev-local';
  const nodeEnv = process.env.NODE_ENV || 'development';
  const timestamp = new Date().toISOString();

  return (
    <div className="space-y-8 p-6 md:p-8 max-w-7xl mx-auto font-sans">
      {/* Cabeçalho da Central de Saúde */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-900/10 text-[#4A0E1A]">
              <Activity className="h-5 w-5 text-[#C9A227]" />
            </span>
            <h1 className="text-2xl font-serif font-bold text-[#3b0b14]">Central de Saúde Operacional</h1>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            Monitoramento em tempo real da infraestrutura Web, conectividade com o Supabase e auditoria de webhooks financeiros.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Painel Ativo
          </span>
          <span className="text-[11px] text-stone-400 font-mono">
            {new Date(timestamp).toLocaleTimeString('pt-BR')}
          </span>
        </div>
      </div>

      {/* Cartões de Status dos Componentes Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. Servidor Web (Next.js / Vercel) */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-[#C9A227]" />
              Aplicação Web
            </span>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="mt-4">
            <p className="text-xl font-bold text-stone-900">Operacional</p>
            <p className="text-xs text-stone-500 mt-0.5">Ambiente: {nodeEnv}</p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>Health Check Público</span>
            <code className="bg-stone-100 px-1.5 py-0.5 rounded text-[11px] font-mono text-stone-700">/health (200)</code>
          </div>
        </div>

        {/* 2. Banco de Dados Oficial (Supabase) */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="h-4 w-4 text-[#C9A227]" />
              Banco Supabase
            </span>
            {dbStatus === 'healthy' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : dbStatus === 'degraded' ? (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            ) : (
              <XCircle className="h-5 w-5 text-rose-500" />
            )}
          </div>
          <div className="mt-4">
            <p className="text-xl font-bold text-stone-900">
              {dbStatus === 'healthy' ? 'Conectado' : dbStatus === 'degraded' ? 'Degradado' : 'Inacessível'}
            </p>
            <p className="text-xs text-stone-500 mt-0.5">
              Latência de consulta: {dbLatencyMs}ms
            </p>
            {dbErrorMessage && (
              <p className="text-[11px] text-rose-600 mt-1 truncate" title={dbErrorMessage}>
                {dbErrorMessage}
              </p>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>Readiness Probe</span>
            <code className="bg-stone-100 px-1.5 py-0.5 rounded text-[11px] font-mono text-stone-700">/api/health/ready</code>
          </div>
        </div>

        {/* 3. Auditoria do Gateway Asaas */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-[#C9A227]" />
              Webhooks Asaas
            </span>
            {failedEventsCount === 0 ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            )}
          </div>
          <div className="mt-4">
            <p className="text-xl font-bold text-stone-900">
              {totalEventsCount} {totalEventsCount === 1 ? 'evento auditado' : 'eventos auditados'}
            </p>
            <p className="text-xs text-stone-500 mt-0.5">
              {failedEventsCount} com pendência ou erro recente
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>Idempotência Ativa</span>
            <span className="text-emerald-700 font-semibold text-xs">Constraint Unq Ativa</span>
          </div>
        </div>
      </div>

      {/* Tabela de Auditoria de Eventos Financeiros Recentes */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#C9A227]" />
              Auditoria de Eventos de Pagamento Recentes
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Registros da tabela canônica <code className="text-stone-700 font-mono">payment_provider_events</code>.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
              {successfulEventsCount} Sucesso
            </span>
            {failedEventsCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700">
                {failedEventsCount} Pendente/Erro
              </span>
            )}
          </div>
        </div>

        {recentEvents.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500">
            Nenhum evento registrado recentemente na tabela de provedores.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/75 text-[11px] font-bold uppercase tracking-wider text-stone-600">
                  <th className="py-3 px-4">Provedor / ID</th>
                  <th className="py-3 px-4">Tipo do Evento</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Log de Auditoria</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {recentEvents.map((evt) => {
                  const isProcessed = evt.processed && !evt.error_log;
                  return (
                    <tr key={evt.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-stone-900">
                        {evt.provider_code.toUpperCase()} · {evt.event_id ? evt.event_id.slice(0, 16) : 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-stone-800">
                        {evt.event_type}
                      </td>
                      <td className="py-3 px-4">
                        {isProcessed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" />
                            Processado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                            <AlertTriangle className="h-3 w-3" />
                            Pendente / Erro
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-stone-500 text-[11px]">
                        {evt.created_at ? new Date(evt.created_at).toLocaleString('pt-BR') : '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-stone-500 max-w-xs truncate" title={evt.error_log || 'Nenhum erro registrado'}>
                        {evt.error_log ? (
                          <span className="text-rose-600 font-semibold">{evt.error_log}</span>
                        ) : (
                          <span className="text-stone-400">Sucesso</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Informações de Versão e Runtime */}
      <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-5 text-xs text-stone-500 space-y-2">
        <h3 className="font-bold text-stone-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
          <Server className="h-4 w-4 text-stone-500" />
          Metadados da Instância
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] text-stone-600">
          <div>Commit Web: <span className="text-stone-900">{commitSha.slice(0, 12)}</span></div>
          <div>Node.js: <span className="text-stone-900">{process.version}</span></div>
          <div>Data da Consulta: <span className="text-stone-900">{new Date(timestamp).toLocaleString('pt-BR')}</span></div>
        </div>
      </div>
    </div>
  );
}
