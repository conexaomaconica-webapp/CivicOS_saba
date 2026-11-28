'use client';

import React, { useState } from 'react';
import {
  Eye,
  Clock,
  Users,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  History,
  Info,
  Lock,
} from 'lucide-react';
import {
  type AdminAnalyticsViewsPolicyOverview,
  type ViewsCountingMode,
  type CooldownMinutesOption,
  updateAdminAnalyticsViewsPolicyAction,
  getAdminAnalyticsViewsPolicyOverviewAction,
} from '@/lib/analytics/views-policy-service';

interface Props {
  initialOverview: AdminAnalyticsViewsPolicyOverview;
}

const COOLDOWN_OPTIONS: CooldownMinutesOption[] = [5, 15, 30, 60];

const MODE_LABELS: Record<ViewsCountingMode, string> = {
  ALL_VIEWS: 'Todas as visualizações (ALL_VIEWS)',
  COOLDOWN: 'Visualizações por intervalo (COOLDOWN)',
  UNIQUE_DAILY: 'Visitantes únicos diários (UNIQUE_DAILY)',
};

export function AnalyticsPolicyClient({ initialOverview }: Props) {
  const [overview, setOverview] = useState<AdminAnalyticsViewsPolicyOverview>(initialOverview);
  const [mode, setMode] = useState<ViewsCountingMode>(initialOverview.policy.counting_mode);
  const [cooldownMinutes, setCooldownMinutes] = useState<CooldownMinutesOption>(
    initialOverview.policy.cooldown_minutes
  );
  const [ignoreInternalTraffic, setIgnoreInternalTraffic] = useState<boolean>(
    initialOverview.policy.ignore_internal_traffic
  );
  const [botAbuseProtection, setBotAbuseProtection] = useState<boolean>(
    initialOverview.policy.bot_abuse_protection_enabled
  );
  const [autoUpdateCounters, setAutoUpdateCounters] = useState<boolean>(
    initialOverview.policy.auto_update_counters_enabled
  );
  const [reason, setReason] = useState<string>('');
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Simulador interativo: 1 visitante acessa a mesma empresa 10 vezes em 2 minutos
  const simulatedViews = mode === 'ALL_VIEWS' ? 10 : 1;
  const simulatedUniqueVisitors = 1;

  const hasChanges =
    mode !== overview.policy.counting_mode ||
    cooldownMinutes !== overview.policy.cooldown_minutes ||
    ignoreInternalTraffic !== overview.policy.ignore_internal_traffic ||
    botAbuseProtection !== overview.policy.bot_abuse_protection_enabled ||
    autoUpdateCounters !== overview.policy.auto_update_counters_enabled;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!confirmed) {
      setFeedback({
        type: 'error',
        message: 'Marque a confirmação obrigatória antes de salvar a alteração de política.',
      });
      return;
    }

    if (reason.trim().length < 8) {
      setFeedback({
        type: 'error',
        message: 'Informe uma justificativa com pelo menos 8 caracteres para registro na auditoria.',
      });
      return;
    }

    setSaving(true);
    try {
      const res = await updateAdminAnalyticsViewsPolicyAction({
        counting_mode: mode,
        cooldown_minutes: cooldownMinutes,
        ignore_internal_traffic: ignoreInternalTraffic,
        bot_abuse_protection_enabled: botAbuseProtection,
        auto_update_counters_enabled: autoUpdateCounters,
        confirmed,
        reason: reason.trim(),
      });

      if (!res.success || !res.data) {
        setFeedback({ type: 'error', message: res.error || 'Não foi possível salvar a política.' });
        return;
      }

      const refreshed = await getAdminAnalyticsViewsPolicyOverviewAction();
      if (refreshed.success && refreshed.data) {
        setOverview(refreshed.data);
      } else {
        setOverview((prev) => ({ ...prev, policy: res.data! }));
      }

      setConfirmed(false);
      setReason('');
      setFeedback({
        type: 'success',
        message:
          'Política de contabilização atualizada com sucesso! A nova regra já está em vigor para os próximos acessos em Web, Android e iOS, preservando 100% do histórico.',
      });
    } catch {
      setFeedback({ type: 'error', message: 'Erro de comunicação ao salvar a política.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 text-left">
      {/* Cabeçalho */}
      <header className="bg-[#2b060d] text-[#F9F6F0] border border-[#C9A227]/40 rounded-3xl p-6 md:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#C9A227]/20 text-[#C9A227] border border-[#C9A227]/40">
              <Eye className="w-3.5 h-3.5" />
              Configurações → Analytics e Visualizações
            </span>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-white">
              Política Oficial de Contabilização de Visualizações
            </h1>
            <p className="text-xs md:text-sm text-amber-100/80 max-w-2xl leading-relaxed">
              Define centralmente como o contador oficial (<code className="text-[#C9A227]">businesses.views_count</code>)
              contabiliza acessos aos perfis empresariais na Web Desktop, Web Mobile, Android e iOS, sem necessidade de
              alterar código ou publicar novas versões dos aplicativos.
            </p>
          </div>

          <div className="bg-black/30 border border-[#C9A227]/30 rounded-2xl p-4 shrink-0 text-right space-y-1">
            <span className="text-[11px] font-mono text-amber-200/70 block">Total Oficial Acumulado</span>
            <strong className="text-3xl font-serif font-bold text-[#C9A227] block">
              {overview.stats.totalOfficialViews.toLocaleString('pt-BR')}
            </strong>
            <span className="text-[11px] text-amber-100/70 block">
              {overview.stats.publishedBusinessesCount} empresas publicadas sincronizadas
            </span>
          </div>
        </div>
      </header>

      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-rose-50 border-rose-200 text-rose-950'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="font-medium">{feedback.message}</div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* 1. Seleção da Modalidade de Contabilização */}
        <section className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs space-y-5">
          <div className="border-b border-stone-100 pb-4">
            <h2 className="text-lg font-serif font-bold text-stone-900">1. Método de Contabilização</h2>
            <p className="text-xs text-stone-500 mt-1">
              Ao alterar o método, a nova regra valerá exclusivamente para os próximos acessos (efeito prospectivo),
              preservando integralmente a contagem acumulada e todo o histórico anterior.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Modo 1: ALL_VIEWS */}
            <label
              className={`relative flex flex-col justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                mode === 'ALL_VIEWS'
                  ? 'border-[#3B0B14] bg-amber-50/40 shadow-sm'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="radio"
                    name="counting_mode"
                    value="ALL_VIEWS"
                    checked={mode === 'ALL_VIEWS'}
                    onChange={() => setMode('ALL_VIEWS')}
                    className="accent-[#3B0B14] w-4 h-4"
                  />
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Recomendado agora
                  </span>
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-stone-900">Todas as visualizações</h3>
                  <span className="text-[11px] font-mono text-stone-500">Modo: ALL_VIEWS</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Contabiliza cada acesso efetivo ao perfil empresarial e atualizações intencionais da página pelo mesmo
                  visitante, mantendo bloqueio contra duplicidade técnica de renderização (<code className="font-mono">cycle_id</code>).
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-stone-200/70 text-[11px] text-stone-500 font-medium">
                Ideal para fase de lançamento e consolidação da plataforma.
              </div>
            </label>

            {/* Modo 2: COOLDOWN */}
            <label
              className={`relative flex flex-col justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                mode === 'COOLDOWN'
                  ? 'border-[#3B0B14] bg-amber-50/40 shadow-sm'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="radio"
                    name="counting_mode"
                    value="COOLDOWN"
                    checked={mode === 'COOLDOWN'}
                    onChange={() => setMode('COOLDOWN')}
                    className="accent-[#3B0B14] w-4 h-4"
                  />
                  <Clock className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-stone-900">Visualizações por intervalo</h3>
                  <span className="text-[11px] font-mono text-stone-500">Modo: COOLDOWN</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  O mesmo visitante ou sessão gera no máximo 1 visualização elegível por empresa dentro da janela de
                  intervalo configurada. Após o intervalo, uma nova visita volta a incrementar.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-200/70 space-y-1.5">
                <span className="text-[11px] font-bold text-stone-700 block">Intervalo do Cooldown:</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {COOLDOWN_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={(ev) => {
                        ev.preventDefault();
                        setMode('COOLDOWN');
                        setCooldownMinutes(opt);
                      }}
                      className={`py-1 rounded-lg text-xs font-mono font-bold border transition-colors ${
                        cooldownMinutes === opt && mode === 'COOLDOWN'
                          ? 'bg-[#3B0B14] text-[#C9A227] border-[#3B0B14]'
                          : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
                      }`}
                    >
                      {opt}m
                    </button>
                  ))}
                </div>
              </div>
            </label>

            {/* Modo 3: UNIQUE_DAILY */}
            <label
              className={`relative flex flex-col justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                mode === 'UNIQUE_DAILY'
                  ? 'border-[#3B0B14] bg-amber-50/40 shadow-sm'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="radio"
                    name="counting_mode"
                    value="UNIQUE_DAILY"
                    checked={mode === 'UNIQUE_DAILY'}
                    onChange={() => setMode('UNIQUE_DAILY')}
                    className="accent-[#3B0B14] w-4 h-4"
                  />
                  <Users className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-stone-900">Visitantes únicos diários</h3>
                  <span className="text-[11px] font-mono text-stone-500">Modo: UNIQUE_DAILY</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Contabiliza 1 visualização por visitante identificado (hash pseudonimizado LGPD) e empresa a cada dia
                  civil.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-stone-200/70 text-[11px] text-stone-500 font-mono">
                Fechamento diário: <strong>America/Sao_Paulo</strong>
              </div>
            </label>
          </div>

          {/* Simulador Interativo e Salvaguardas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
            {/* Simulação em tempo real */}
            <div className="p-5 rounded-2xl bg-stone-900 text-stone-100 border border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-[#C9A227] font-bold">
                  Simulação do Modo Selecionado
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-300">
                  {MODE_LABELS[mode]}
                </span>
              </div>
              <p className="text-xs text-stone-300">
                Cenário: um visitante externo acessa ou atualiza a página da mesma empresa <strong>10 vezes</strong> em
                dois minutos.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-stone-800/90 border border-stone-700">
                  <strong className="text-2xl font-serif font-bold text-[#C9A227] block">{simulatedViews}</strong>
                  <span className="text-[11px] text-stone-300">Visualizações contabilizadas no contador oficial</span>
                </div>
                <div className="p-3.5 rounded-xl bg-stone-800/90 border border-stone-700">
                  <strong className="text-2xl font-serif font-bold text-emerald-400 block">
                    {simulatedUniqueVisitors}
                  </strong>
                  <span className="text-[11px] text-stone-300">Visitante único estimado identificado</span>
                </div>
              </div>
            </div>

            {/* Diretrizes de Governança e Salvaguardas */}
            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
              <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                Salvaguardas e Regras Complementares
              </span>

              <label className="flex items-center justify-between gap-3 text-xs text-stone-700 cursor-pointer py-1">
                <span>Ignorar visitas de administradores e membros da própria empresa</span>
                <input
                  type="checkbox"
                  checked={ignoreInternalTraffic}
                  onChange={(e) => setIgnoreInternalTraffic(e.target.checked)}
                  className="accent-[#3B0B14] w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between gap-3 text-xs text-stone-700 cursor-pointer py-1">
                <span>Proteção contra automações abusivas (robôs / flood não-humano)</span>
                <input
                  type="checkbox"
                  checked={botAbuseProtection}
                  onChange={(e) => setBotAbuseProtection(e.target.checked)}
                  className="accent-[#3B0B14] w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between gap-3 text-xs text-stone-700 cursor-pointer py-1">
                <span>Atualização automática reativa dos contadores na interface</span>
                <input
                  type="checkbox"
                  checked={autoUpdateCounters}
                  onChange={(e) => setAutoUpdateCounters(e.target.checked)}
                  className="accent-[#3B0B14] w-4 h-4"
                />
              </label>

              <div className="flex items-center justify-between gap-3 text-xs text-stone-500 py-1 border-t border-stone-200/80">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-stone-400" />
                  Proteção contra duplicidade técnica (<code className="font-mono">cycle_id</code>) e preservação do histórico
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  SEMPRE ATIVO
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Confirmação e Justificativa de Auditoria */}
        <section className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-base font-serif font-bold text-stone-900">
                2. Confirmação Administrativa e Registro de Auditoria
              </h2>
              <p className="text-xs text-stone-500 leading-relaxed">
                Alterações na política de contabilização são aplicadas centralmente pelo backend e banco de dados para
                Web, Android e iOS. Mudanças entre modalidades podem afetar a comparabilidade estatística entre períodos
                distintos, mas <strong>jamais alteram ou recalculam retroativamente</strong> as visualizações já
                conquistadas pelas empresas.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Justificativa administrativa da alteração (obrigatória para a Trilha de Auditoria):
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex.: Manutenção da regra de lançamento ALL_VIEWS / Ativação de cooldown comercial de 15 minutos..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-[#3B0B14]"
              />
            </div>

            <label className="flex items-center gap-2.5 text-xs font-medium text-stone-800 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="accent-[#3B0B14] w-4 h-4"
              />
              <span>
                Confirmo a aplicação prospectiva desta política de visualizações e o registro na auditoria da
                plataforma.
              </span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={saving || !hasChanges}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-all ${
                  saving || !hasChanges
                    ? 'bg-stone-200 text-stone-500 cursor-not-allowed'
                    : 'bg-[#3B0B14] text-[#C9A227] hover:bg-[#520f1c] cursor-pointer shadow-sm'
                }`}
              >
                {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Salvar Política de Visualizações</span>
              </button>
            </div>
          </div>
        </section>
      </form>

      {/* 3. Histórico de Alterações da Política */}
      <section className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <h2 className="text-base font-serif font-bold text-stone-900 flex items-center gap-2">
            <History className="w-4 h-4 text-[#C9A227]" />
            Histórico de Auditoria da Política de Visualizações
          </h2>
          <span className="text-[11px] font-mono text-stone-500">
            Modo vigente: <strong>{overview.policy.counting_mode}</strong>
          </span>
        </div>

        {overview.auditHistory.length === 0 ? (
          <p className="text-xs text-stone-500 py-4 text-center">
            A plataforma está operando com a configuração padrão inicial (<strong>ALL_VIEWS</strong>). Nenhuma alteração
            manual foi registrada até o momento.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 font-mono text-[11px]">
                  <th className="py-2 pr-4">Data / Horário (BRT)</th>
                  <th className="py-2 pr-4">Política Anterior</th>
                  <th className="py-2 pr-4">Nova Política</th>
                  <th className="py-2 pr-4">Administrador</th>
                  <th className="py-2">Justificativa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {overview.auditHistory.map((item) => (
                  <tr key={item.id} className="text-stone-700">
                    <td className="py-2.5 pr-4 font-mono text-[11px]">
                      {new Date(item.created_at).toLocaleString('pt-BR', {
                        timeZone: 'America/Sao_Paulo',
                      })}
                    </td>
                    <td className="py-2.5 pr-4 font-mono">{item.previous_mode || 'ALL_VIEWS'}</td>
                    <td className="py-2.5 pr-4 font-mono font-bold text-[#3B0B14]">
                      {item.new_mode}
                      {item.new_mode === 'COOLDOWN' ? ` (${item.cooldown_minutes}m)` : ''}
                    </td>
                    <td className="py-2.5 pr-4">{item.actor_email}</td>
                    <td className="py-2.5 text-stone-600">{item.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

