/* eslint-disable @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises */
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Mail,
  KeyRound,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Send,
  ChevronRight,
  Server,
  ShieldCheck,
  Clock,
  Info,
  Check,
  Copy,
} from 'lucide-react';
import {
  type EmailIntegrationOverview,
  testAdminEmailConnectionAction,
  sendAdminTestEmailAction,
  getAdminEmailIntegrationOverviewAction,
} from '@/lib/email/email-config-service';

interface Props {
  initialOverview: EmailIntegrationOverview;
}

export function EmailIntegrationClient({ initialOverview }: Props) {
  const [overview, setOverview] = useState<EmailIntegrationOverview>(initialOverview);

  // States de Teste de Conexão
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    success: boolean;
    message: string;
    statusCode?: number;
    latencyMs: number;
    detail?: string;
  } | null>(null);

  // States de Disparo de Teste
  const [testRecipient, setTestRecipient] = useState(initialOverview.currentUserEmail || '');
  const [customSubject, setCustomSubject] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testSendResult, setTestSendResult] = useState<{
    success: boolean;
    status: 'accepted' | 'failed' | 'unknown' | 'not_configured';
    provider: string;
    providerMessageId?: string;
    latencyMs: number;
    error?: string;
    detail?: string;
  } | null>(null);

  const [refreshingDispatches, setRefreshingDispatches] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const res = await testAdminEmailConnectionAction();
      setConnectionResult(res);
    } catch (err: unknown) {
      setConnectionResult({
        success: false,
        message: err instanceof Error ? err.message : 'Falha ao testar conexão com Hostinger Mail API.',
        latencyMs: 0,
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient.trim()) return;

    setSendingTest(true);
    setTestSendResult(null);
    try {
      const res = await sendAdminTestEmailAction({
        recipientEmail: testRecipient,
        customSubject: customSubject.trim() || undefined,
      });
      setTestSendResult(res);

      // Atualiza a tabela de disparos se tiver sido bem sucedido
      if (res.success) {
        await handleRefreshOverview();
      }
    } catch (err: unknown) {
      setTestSendResult({
        success: false,
        status: 'unknown',
        provider: 'hostinger',
        latencyMs: 0,
        error: err instanceof Error ? err.message : 'Erro inesperado ao disparar teste.',
      });
    } finally {
      setSendingTest(false);
    }
  };

  const handleRefreshOverview = async () => {
    setRefreshingDispatches(true);
    try {
      const fresh = await getAdminEmailIntegrationOverviewAction();
      if (fresh.success && fresh.data) {
        setOverview(fresh.data);
      }
    } finally {
      setRefreshingDispatches(false);
    }
  };

  const handleCopyEndpoint = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const isConfigured = overview.hostinger.isConfigured;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 px-4 sm:px-6">
      {/* =================================================================== */}
      {/* 1. CABEÇALHO E BREADCRUMBS                                         */}
      {/* =================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 mb-1">
            <Link href="/admin" className="hover:text-[#5d1523] transition">
              Painel
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span>Configurações</span>
            <ChevronRight className="h-3 w-3" />
            <span>Integrações</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-[#5d1523] font-bold">E-mail (Hostinger)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight flex items-center gap-2.5">
            <span>Integração Hostinger Mail API</span>
            <span
              className={`text-xs font-sans font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                isConfigured
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}
            >
              {isConfigured ? 'Pronto para Envio' : 'Configuração Pendente'}
            </span>
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Ambiente de testes, diagnóstico de credenciais e disparo de e-mails transacionais via API oficial da Hostinger.
          </p>
        </div>

        {/* Status Rápido do Provedor Ativo */}
        <div className="flex items-center gap-2">
          <div
            className={`px-4 py-2.5 rounded-2xl border flex items-center gap-3 shadow-xs ${
              isConfigured
                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                : 'bg-amber-50/80 border-amber-300 text-amber-950'
            }`}
          >
            <div
              className={`h-3 w-3 rounded-full ${
                isConfigured ? 'bg-emerald-600 animate-pulse' : 'bg-amber-600'
              }`}
            />
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500">
                Provedor de E-mail
              </span>
              <span className="text-xs font-bold font-mono">
                {overview.activeProvider.toUpperCase()} MAIL API
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. ABAS DE NAVEGAÇÃO ENTRE INTEGRAÇÕES                              */}
      {/* =================================================================== */}
      <div className="flex items-center gap-2 border-b border-stone-200">
        <Link
          href="/admin/configuracoes/integracoes/asaas"
          className="inline-flex items-center gap-2 px-4 py-2.5 border-b-2 border-transparent text-sm font-semibold text-stone-500 hover:text-stone-800 hover:border-stone-300 transition"
        >
          <KeyRound className="h-4 w-4" />
          <span>Gateway Asaas</span>
        </Link>
        <div className="inline-flex items-center gap-2 px-4 py-2.5 border-b-2 border-[#5d1523] text-sm font-bold text-[#5d1523]">
          <Mail className="h-4 w-4" />
          <span>E-mail Transacional (Hostinger)</span>
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. GRID PRINCIPAL: DIAGNÓSTICO E SANDBOX DE TESTE                   */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Painel Esquerdo: Credenciais & Health Ping (7 Colunas) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-3xl border border-stone-200/90 bg-white p-6 shadow-xs space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-[#C9A227]">
                  <Server className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-900">Configurações da Hostinger Mail API</h2>
                  <p className="text-xs text-stone-500">
                    Credenciais declaradas nas variáveis de ambiente do servidor
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                <span>{testingConnection ? 'Testando...' : 'Testar Conexão'}</span>
              </button>
            </div>

            {/* Resultado do Teste de Conexão */}
            {connectionResult && (
              <div
                className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                  connectionResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {connectionResult.success ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-600" />
                  )}
                  <span>{connectionResult.message}</span>
                </div>
                {connectionResult.latencyMs > 0 && (
                  <p className="text-stone-600 font-mono text-[11px] pl-6">
                    Latência da API: <strong className="text-stone-900">{connectionResult.latencyMs}ms</strong>
                    {connectionResult.statusCode && ` • Status HTTP: ${connectionResult.statusCode}`}
                  </p>
                )}
                {connectionResult.detail && (
                  <pre className="mt-1 p-2 bg-white/70 rounded-lg text-[10px] font-mono text-stone-700 overflow-x-auto">
                    {connectionResult.detail}
                  </pre>
                )}
              </div>
            )}

            {/* Lista de Variáveis Técnicas */}
            <div className="space-y-3 pt-2 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 gap-2">
                <span className="font-semibold text-stone-700 font-mono">HOSTINGER_MAIL_API_TOKEN</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono px-2 py-0.5 rounded bg-white border border-stone-200 text-stone-700 font-semibold text-[11px]">
                    {overview.hostinger.maskedToken}
                  </span>
                  {overview.hostinger.hasToken ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Ativo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-bold">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Ausente
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 gap-2">
                <span className="font-semibold text-stone-700 font-mono">HOSTINGER_MAILBOX_RESOURCE_ID</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono px-2 py-0.5 rounded bg-white border border-stone-200 text-stone-700 font-semibold text-[11px]">
                    {overview.hostinger.mailboxResourceId}
                  </span>
                  {overview.hostinger.hasMailboxResourceId ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Ativo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-bold">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Ausente
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 gap-2">
                <span className="font-semibold text-stone-700 font-mono">Remetente Oficial (MAIL_FROM)</span>
                <span className="font-mono text-stone-800 font-medium">
                  {overview.hostinger.mailFrom}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 gap-2">
                <span className="font-semibold text-stone-700 font-mono">Endpoint Base</span>
                <div className="flex items-center gap-1.5 font-mono text-stone-700 text-[11px]">
                  <span>{overview.hostinger.baseUrl}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyEndpoint(overview.hostinger.baseUrl)}
                    className="p-1 hover:bg-stone-200 rounded text-stone-500 hover:text-stone-800 transition"
                    title="Copiar endpoint"
                  >
                    {copiedToken ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Informações Complementares */}
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Resolução canônica com fallback automático
              </span>
              <span>Hostinger Mail v1 API</span>
            </div>
          </div>
        </div>

        {/* Painel Direito: Sandbox de Envio de E-mail de Teste (5 Colunas) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl border border-stone-200/90 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-[#5d1523]/10 text-[#5d1523]">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-stone-900">Sandbox de Envio de Teste</h2>
                <p className="text-xs text-stone-500">Dispare um e-mail transacional real</p>
              </div>
            </div>

            <form onSubmit={handleSendTestEmail} className="space-y-4 pt-2">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="testRecipient" className="block text-xs font-semibold text-stone-700">
                    E-mail do Destinatário
                  </label>
                  {overview.currentUserEmail && (
                    <button
                      type="button"
                      onClick={() => setTestRecipient(overview.currentUserEmail)}
                      className="text-[11px] font-semibold text-[#5d1523] hover:underline"
                    >
                      Usar meu e-mail
                    </button>
                  )}
                </div>
                <input
                  id="testRecipient"
                  type="email"
                  required
                  placeholder="exemplo@gmail.com"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#5d1523]/30 focus:border-[#5d1523] transition"
                />
              </div>

              <div>
                <label htmlFor="customSubject" className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Assunto da Mensagem <span className="text-stone-400 font-normal">(Opcional)</span>
                </label>
                <input
                  id="customSubject"
                  type="text"
                  placeholder="[Teste de Entrega] Conexão Maçônica"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#5d1523]/30 focus:border-[#5d1523] transition"
                />
              </div>

              <button
                type="submit"
                disabled={sendingTest || !testRecipient.trim()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#5d1523] hover:bg-[#4a101b] text-white text-xs font-bold shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {sendingTest ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Enviando mensagem via Hostinger...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Disparar E-mail de Teste</span>
                  </>
                )}
              </button>
            </form>

            {/* Resultado do Envio de Teste */}
            {testSendResult && (
              <div
                className={`mt-4 p-4 rounded-2xl border text-xs space-y-2 ${
                  testSendResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : testSendResult.status === 'unknown'
                      ? 'bg-amber-50 border-amber-200 text-amber-950'
                      : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {testSendResult.success ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : testSendResult.status === 'unknown' ? (
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  )}
                  <span>
                    {testSendResult.success
                      ? 'E-mail aceito pela Hostinger Mail API com sucesso!'
                      : testSendResult.status === 'unknown'
                        ? 'Envio em estado indeterminado (timeout de resposta).'
                        : 'Falha no envio da mensagem.'}
                  </span>
                </div>

                <div className="space-y-1 font-mono text-[11px] text-stone-700 pl-6">
                  {testSendResult.providerMessageId && (
                    <p>
                      ID da Mensagem: <strong className="text-stone-900">{testSendResult.providerMessageId}</strong>
                    </p>
                  )}
                  <p>
                    Tempo de Resposta: <strong className="text-stone-900">{testSendResult.latencyMs}ms</strong>
                  </p>
                  <p>
                    Provedor: <strong className="text-stone-900">{testSendResult.provider.toUpperCase()}</strong>
                  </p>
                </div>

                {testSendResult.error && (
                  <p className="text-rose-700 pl-6 text-[11px] font-semibold">{testSendResult.error}</p>
                )}
                {testSendResult.detail && (
                  <pre className="p-2 bg-white/80 rounded-lg text-[10px] font-mono text-stone-700 overflow-x-auto">
                    {testSendResult.detail}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 4. HISTÓRICO DE AUDITORIA DE DISPAROS DE CONTRATOS                  */}
      {/* =================================================================== */}
      <div className="rounded-3xl border border-stone-200/90 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-stone-100 text-stone-700">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">Histórico de Disparos Recentes</h2>
              <p className="text-xs text-stone-500">
                Auditoria persistente de e-mails de contratos registrados na tabela contract_email_dispatches
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefreshOverview}
            disabled={refreshingDispatches}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-semibold transition cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`h-3 w-3 ${refreshingDispatches ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>

        {overview.recentDispatches.length === 0 ? (
          <div className="py-10 text-center rounded-2xl border border-dashed border-stone-200 text-stone-500 text-xs space-y-1">
            <Mail className="h-6 w-6 mx-auto text-stone-400 mb-2" />
            <p className="font-semibold text-stone-700">Nenhum disparo de contrato registrado ainda.</p>
            <p>Os envios acionados no Onboarding Comercial aparecerão aqui com status de entrega e ID.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Data / Hora</th>
                  <th className="py-2.5 px-3">Destinatário</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Provedor</th>
                  <th className="py-2.5 px-3">ID da Mensagem</th>
                  <th className="py-2.5 px-3">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {overview.recentDispatches.map((record) => (
                  <tr key={record.id} className="hover:bg-stone-50/60 transition">
                    <td className="py-3 px-3 font-mono text-stone-600 whitespace-nowrap">
                      {new Date(record.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-stone-900">{record.recipient_name}</div>
                      <div className="text-stone-500 text-[11px] font-mono">{record.recipient_email}</div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {record.dispatch_status === 'accepted' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Aceito
                        </span>
                      ) : record.dispatch_status === 'processing' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                          <RefreshCw className="h-3 w-3 text-sky-600 animate-spin" /> Em voo
                        </span>
                      ) : record.dispatch_status === 'unknown' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <AlertTriangle className="h-3 w-3 text-amber-600" /> Indeterminado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                          <XCircle className="h-3 w-3 text-rose-600" /> Falhou
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 uppercase font-mono text-stone-600 text-[11px]">
                      {record.provider}
                    </td>
                    <td className="py-3 px-3 font-mono text-stone-600 text-[11px] truncate max-w-[150px]">
                      {record.provider_message_id || '—'}
                    </td>
                    <td className="py-3 px-3 text-stone-500 text-[11px]">
                      {record.error_message ? (
                        <span className="text-rose-600 truncate max-w-[200px] inline-block" title={record.error_message}>
                          {record.error_message}
                        </span>
                      ) : (
                        <span className="text-emerald-700">Entregue com integridade</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 5. BOAS PRÁTICAS & DNS (SPF, DKIM, DMARC)                           */}
      {/* =================================================================== */}
      <div className="rounded-3xl border border-stone-200/90 bg-stone-50/80 p-6 shadow-xs text-xs space-y-3">
        <div className="flex items-center gap-2 font-bold text-stone-800 text-sm">
          <Info className="h-4 w-4 text-[#C9A227]" />
          <span>Boas Práticas de Entregabilidade e Domínio Oficial</span>
        </div>
        <p className="text-stone-600 leading-relaxed">
          Para que os e-mails enviados pela Hostinger Mail API não caiam na caixa de spam (junk/lixo eletrônico) dos destinatários,
          certifique-se de que os registros DNS do domínio <strong className="text-stone-900">conexaomaconica.com.br</strong> possuam:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3 rounded-2xl bg-white border border-stone-200/80">
            <p className="font-bold text-stone-900 mb-1">1. Registro SPF</p>
            <p className="text-stone-500 text-[11px]">
              Autoriza os servidores da Hostinger a despachar e-mails em nome do seu domínio:
            </p>
            <code className="mt-1.5 block p-1.5 bg-stone-100 rounded text-[10px] text-stone-700 font-mono break-all">
              v=spf1 include:_spf.mail.hostinger.com ~all
            </code>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-stone-200/80">
            <p className="font-bold text-stone-900 mb-1">2. Assinatura DKIM</p>
            <p className="text-stone-500 text-[11px]">
              Chave criptográfica gerada automaticamente no painel hPanel da Hostinger para validação de integridade.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-stone-200/80">
            <p className="font-bold text-stone-900 mb-1">3. Política DMARC</p>
            <p className="text-stone-500 text-[11px]">
              Protege contra falsificação de identidade e phishing (reputação institucional).
            </p>
            <code className="mt-1.5 block p-1.5 bg-stone-100 rounded text-[10px] text-stone-700 font-mono break-all">
              v=DMARC1; p=none; sp=none;
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
