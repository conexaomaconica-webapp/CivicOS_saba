'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  KeyRound,
  Webhook,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  ArrowRightLeft,
  Server,
  Sparkles,
  Lock,
} from 'lucide-react';
import {
  type AsaasIntegrationOverview,
  type AsaasEnvironmentDetails,
  saveAdminAsaasCredentialsAction,
  switchAdminAsaasEnvironmentAction,
  testAdminAsaasConnectionAction,
  configureAdminAsaasWebhookAction,
} from '@/lib/payment/asaas-config-service';
import type { AsaasEnvironment } from '@/lib/payment/asaas-config';

interface Props {
  initialOverview: AsaasIntegrationOverview;
}

export function AsaasIntegrationClient({ initialOverview }: Props) {
  const [overview, setOverview] = useState<AsaasIntegrationOverview>(initialOverview);
  const [selectedTab, setSelectedTab] = useState<AsaasEnvironment>(initialOverview.activeEnvironment);

  // States de Formulário de Credenciais
  const [sandboxApiKey, setSandboxApiKey] = useState('');
  const [sandboxWebhookToken, setSandboxWebhookToken] = useState('');
  const [prodApiKey, setProdApiKey] = useState('');
  const [prodWebhookToken, setProdWebhookToken] = useState('');

  const [editingSandboxKey, setEditingSandboxKey] = useState(!initialOverview.sandbox.hasApiKey);
  const [editingSandboxWh, setEditingSandboxWh] = useState(!initialOverview.sandbox.hasWebhookToken);
  const [editingProdKey, setEditingProdKey] = useState(!initialOverview.production.hasApiKey);
  const [editingProdWh, setEditingProdWh] = useState(!initialOverview.production.hasWebhookToken);

  // States de Feedback
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [configuringWebhook, setConfiguringWebhook] = useState(false);
  const [switchingEnvironment, setSwitchingEnvironment] = useState(false);

  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning';
    text: string;
  } | null>(null);

  const [testResult, setTestResult] = useState<{
    environment: AsaasEnvironment;
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  // Modal de Alternância de Ambiente
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [targetEnvToSwitch, setTargetEnvToSwitch] = useState<AsaasEnvironment>('sandbox');
  const [confirmationInput, setConfirmationInput] = useState('');
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const handleCopyWebhookUrl = () => {
    navigator.clipboard.writeText(overview.systemWebhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  // Salvar Credenciais
  const handleSaveCredentials = async (env: AsaasEnvironment) => {
    setSavingCredentials(true);
    setNotification(null);
    try {
      const apiKey = env === 'sandbox' ? sandboxApiKey : prodApiKey;
      const webhookToken = env === 'sandbox' ? sandboxWebhookToken : prodWebhookToken;

      if (!apiKey && !webhookToken) {
        setNotification({
          type: 'warning',
          text: 'Preencha ao menos a Chave de API ou o Token de Webhook para salvar.',
        });
        return;
      }

      const res = await saveAdminAsaasCredentialsAction({
        environment: env,
        apiKey: apiKey || undefined,
        webhookToken: webhookToken || undefined,
      });

      if (res.success) {
        setNotification({ type: 'success', text: res.message || 'Configurações salvas com sucesso!' });
        if (env === 'sandbox') {
          setSandboxApiKey('');
          setSandboxWebhookToken('');
          setEditingSandboxKey(false);
          setEditingSandboxWh(false);
          setOverview((prev) => ({
            ...prev,
            sandbox: {
              ...prev.sandbox,
              hasApiKey: Boolean(apiKey) || prev.sandbox.hasApiKey,
              hasWebhookToken: Boolean(webhookToken) || prev.sandbox.hasWebhookToken,
              maskedApiKey: apiKey ? `${apiKey.slice(0, 6)}••••••••${apiKey.slice(-4)}` : prev.sandbox.maskedApiKey,
            },
          }));
        } else {
          setProdApiKey('');
          setProdWebhookToken('');
          setEditingProdKey(false);
          setEditingProdWh(false);
          setOverview((prev) => ({
            ...prev,
            production: {
              ...prev.production,
              hasApiKey: Boolean(apiKey) || prev.production.hasApiKey,
              hasWebhookToken: Boolean(webhookToken) || prev.production.hasWebhookToken,
              maskedApiKey: apiKey ? `${apiKey.slice(0, 6)}••••••••${apiKey.slice(-4)}` : prev.production.maskedApiKey,
            },
          }));
        }
      } else {
        setNotification({ type: 'error', text: res.error || 'Falha ao salvar credenciais.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err?.message || 'Erro inesperado.' });
    } finally {
      setSavingCredentials(false);
    }
  };

  // Testar Conexão
  const handleTestConnection = async (env: AsaasEnvironment) => {
    setTestingConnection(true);
    setTestResult(null);
    setNotification(null);
    try {
      const res = await testAdminAsaasConnectionAction(env);
      setTestResult({
        environment: env,
        success: res.success,
        message: res.message,
        details: res.accountDetails || { error: res.error },
      });

      if (res.success) {
        setOverview((prev) => {
          const target = env === 'sandbox' ? 'sandbox' : 'production';
          return {
            ...prev,
            [target]: {
              ...prev[target],
              lastConnectionTestAt: new Date().toISOString(),
              lastConnectionTestSuccess: true,
              lastConnectionError: null,
            },
          };
        });
      } else {
        setOverview((prev) => {
          const target = env === 'sandbox' ? 'sandbox' : 'production';
          return {
            ...prev,
            [target]: {
              ...prev[target],
              lastConnectionTestAt: new Date().toISOString(),
              lastConnectionTestSuccess: false,
              lastConnectionError: res.error || res.message,
            },
          };
        });
      }
    } catch (err: any) {
      setTestResult({
        environment: env,
        success: false,
        message: 'Erro inesperado ao testar conexão.',
        details: { error: err?.message },
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Configuração Automática de Webhook
  const handleAutoConfigureWebhook = async (env: AsaasEnvironment) => {
    setConfiguringWebhook(true);
    setNotification(null);
    try {
      const res = await configureAdminAsaasWebhookAction(env, overview.systemWebhookUrl);
      if (res.success && res.webhookId) {
        setNotification({
          type: 'success',
          text: `Webhook configurado automaticamente no Asaas ${env.toUpperCase()} com ID: ${res.webhookId}!`,
        });
        setOverview((prev) => {
          const target = env === 'sandbox' ? 'sandbox' : 'production';
          return {
            ...prev,
            [target]: {
              ...prev[target],
              webhookId: res.webhookId || null,
              hasWebhookToken: true,
              maskedWebhookToken: res.authToken
                ? `${res.authToken.slice(0, 6)}••••••••${res.authToken.slice(-4)}`
                : prev[target].maskedWebhookToken,
            },
          };
        });
      } else {
        setNotification({
          type: 'error',
          text: res.error || 'Falha ao configurar webhook no Asaas.',
        });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err?.message || 'Erro inesperado.' });
    } finally {
      setConfiguringWebhook(false);
    }
  };

  // Alternar Ambiente Ativo
  const handleConfirmSwitchEnvironment = async () => {
    setSwitchingEnvironment(true);
    setNotification(null);
    try {
      const res = await switchAdminAsaasEnvironmentAction({
        targetEnvironment: targetEnvToSwitch,
        confirmationWord: confirmationInput,
      });

      if (res.success && res.activeEnvironment) {
        setOverview((prev) => ({
          ...prev,
          activeEnvironment: res.activeEnvironment!,
          sandbox: { ...prev.sandbox, isActive: res.activeEnvironment === 'sandbox' },
          production: { ...prev.production, isActive: res.activeEnvironment === 'production' },
        }));
        setSelectedTab(res.activeEnvironment);
        setShowSwitchModal(false);
        setConfirmationInput('');
        setNotification({
          type: 'success',
          text: `Ambiente financeiro alternado para ${res.activeEnvironment.toUpperCase()} com sucesso!`,
        });
      } else {
        setNotification({ type: 'error', text: res.error || 'Falha ao alternar ambiente.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err?.message || 'Erro inesperado.' });
    } finally {
      setSwitchingEnvironment(false);
    }
  };

  const currentTabDetails: AsaasEnvironmentDetails =
    selectedTab === 'sandbox' ? overview.sandbox : overview.production;

  return (
    <div className="space-y-6 pb-12">
      {/* =================================================================== */}
      {/* CABEÇALHO DA CENTRAL DE INTEGRAÇÕES                                 */}
      {/* =================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 mb-1">
            <Link href="/admin" className="hover:text-[#3B0B14]">
              Painel
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span>Configurações</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-[#3B0B14] font-bold">Integração Asaas</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <span>Integração Asaas — Gateway de Pagamentos</span>
            <span className="text-xs font-sans font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#C9A227]/20 text-[#856404] border border-[#C9A227]/40">
              Sandbox & Produção
            </span>
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Configure credenciais independentes para testes em Sandbox e operação financeira real em Produção sem reiniciar o servidor.
          </p>
        </div>

        {/* Status Rápido do Ambiente Ativo */}
        <div className="flex items-center gap-3">
          <div
            className={`px-4 py-2 rounded-2xl border flex items-center gap-2.5 shadow-xs ${
              overview.activeEnvironment === 'production'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-amber-50 border-amber-300 text-amber-950'
            }`}
          >
            <div
              className={`h-3 w-3 rounded-full animate-pulse ${
                overview.activeEnvironment === 'production' ? 'bg-emerald-600' : 'bg-amber-600'
              }`}
            />
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500">
                Ambiente Ativo
              </span>
              <span className="text-xs font-bold font-mono">
                {overview.activeEnvironment === 'production' ? 'PRODUÇÃO OFICIAL' : 'SANDBOX (TESTES)'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setTargetEnvToSwitch(overview.activeEnvironment === 'sandbox' ? 'production' : 'sandbox');
              setConfirmationInput('');
              setShowSwitchModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition shadow-xs cursor-pointer"
          >
            <ArrowRightLeft className="h-3.5 w-3.5 text-stone-500" />
            <span>Alternar Ambiente</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* NOTIFICAÇÕES E FEEDBACK GLOBAL                                      */}
      {/* =================================================================== */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border text-sm flex items-start justify-between gap-3 shadow-xs ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : notification.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : notification.type === 'error' ? (
              <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-stone-400 hover:text-stone-600 font-bold text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* BANNER FORTE QUANDO SANDBOX ESTÁ ATIVO                              */}
      {/* =================================================================== */}
      {overview.activeEnvironment === 'sandbox' ? (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/70 p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <span className="text-xl">🧪</span>
            <span>MODO SANDBOX ATIVO NO SISTEMA</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Todas as cobranças geradas (PIX e Cartão) serão processadas no ambiente fictício do Asaas (Sandbox).{' '}
            <strong>Nenhuma operação financeira real é realizada.</strong> Para iniciar a cobrança com valores reais de clientes, alterne para o ambiente de Produção.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/70 p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <span>MODO PRODUÇÃO OFICIAL ATIVO</span>
          </div>
          <p className="text-xs text-emerald-800 leading-relaxed">
            O sistema está operando com a API oficial do Asaas. <strong>Todas as cobranças criadas geram transações financeiras reais</strong> para os anunciantes e emitem Pix / transações bancárias autênticas.
          </p>
        </div>
      )}

      {/* =================================================================== */}
      {/* NAVEGAÇÃO ENTRE AMBIENTES (ABAS SANDBOX / PRODUÇÃO)                 */}
      {/* =================================================================== */}
      <div className="flex items-center gap-2 border-b border-stone-200">
        <button
          type="button"
          onClick={() => setSelectedTab('sandbox')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition cursor-pointer ${
            selectedTab === 'sandbox'
              ? 'border-[#3B0B14] text-[#3B0B14]'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <span>🧪 Asaas Sandbox (Testes)</span>
          {overview.sandbox.hasApiKey ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
              Configurado
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-stone-200 text-stone-600">
              Pendente
            </span>
          )}
          {overview.activeEnvironment === 'sandbox' && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-200 text-amber-900">
              Ativo
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSelectedTab('production')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition cursor-pointer ${
            selectedTab === 'production'
              ? 'border-[#3B0B14] text-[#3B0B14]'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <span>🛡️ Asaas Produção (Real)</span>
          {overview.production.hasApiKey ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
              Configurado
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-stone-200 text-stone-600">
              Pendente
            </span>
          )}
          {overview.activeEnvironment === 'production' && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-200 text-emerald-900">
              Ativo
            </span>
          )}
        </button>
      </div>

      {/* =================================================================== */}
      {/* DETALHES DO AMBIENTE SELECIONADO                                    */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Configuração de Credenciais & Webhook */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: API Key & URL Fixa */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-[#3B0B14]/10 text-[#3B0B14] flex items-center justify-center font-bold">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    Credenciais de API ({selectedTab.toUpperCase()})
                  </h3>
                  <p className="text-xs text-stone-500">
                    Chave secreta de autenticação do Asaas enviada no header <code>access_token</code>.
                  </p>
                </div>
              </div>

              {currentTabDetails.hasApiKey ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Pronto para uso
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 border border-rose-200 text-rose-800">
                  <XCircle className="h-3.5 w-3.5 text-rose-600" />
                  Chave não configurada
                </span>
              )}
            </div>

            {/* URL Fixa Canônica (Não digitável para evitar erros humanos) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-700">
                URL Base da API (Canônica Automática)
              </label>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-stone-100 border border-stone-200 text-xs font-mono text-stone-800">
                <Server className="h-4 w-4 text-stone-500 shrink-0" />
                <span className="font-semibold">{currentTabDetails.apiUrl}</span>
                <span className="ml-auto text-[10px] text-stone-500 font-sans italic">
                  Fixa pelo sistema (não digitável)
                </span>
              </div>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-stone-700">
                  API Key ({selectedTab.toUpperCase()})
                </label>
                {currentTabDetails.hasApiKey && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedTab === 'sandbox') setEditingSandboxKey(!editingSandboxKey);
                      else setEditingProdKey(!editingProdKey);
                    }}
                    className="text-xs text-[#3B0B14] hover:underline font-semibold cursor-pointer"
                  >
                    {(selectedTab === 'sandbox' ? editingSandboxKey : editingProdKey)
                      ? 'Cancelar alteração'
                      : 'Alterar Chave'}
                  </button>
                )}
              </div>

              {(selectedTab === 'sandbox' ? editingSandboxKey : editingProdKey) ? (
                <div className="space-y-2">
                  <input
                    type="password"
                    placeholder={`Cole aqui a API Key do Asaas ${selectedTab.toUpperCase()} ($aact_...)`}
                    value={selectedTab === 'sandbox' ? sandboxApiKey : prodApiKey}
                    onChange={(e) =>
                      selectedTab === 'sandbox'
                        ? setSandboxApiKey(e.target.value)
                        : setProdApiKey(e.target.value)
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#3B0B14]"
                  />
                  <p className="text-[11px] text-stone-500">
                    A chave será criptografada em repouso no servidor com AES-256-GCM antes de ser gravada no banco.
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-emerald-600" />
                    <span className="font-mono text-xs text-stone-800 font-bold">
                      {currentTabDetails.maskedApiKey || '••••••••••••••••••••••••••••'}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Criptografada em repouso
                  </span>
                </div>
              )}
            </div>

            {/* Botão de Salvar Credenciais se em modo edição */}
            {((selectedTab === 'sandbox' && editingSandboxKey) ||
              (selectedTab === 'production' && editingProdKey)) && (
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  disabled={savingCredentials}
                  onClick={() => handleSaveCredentials(selectedTab)}
                  className="px-5 py-2 rounded-xl bg-[#3B0B14] hover:bg-[#2b060d] text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingCredentials ? 'Criptografando e Salvando...' : 'Salvar API Key'}
                </button>
              </div>
            )}
          </div>

          {/* Card 2: Webhooks (Configuração Automática & Auth Token) */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-[#C9A227]/10 text-[#856404] flex items-center justify-center font-bold">
                  <Webhook className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    Webhook de Notificações Financeiras
                  </h3>
                  <p className="text-xs text-stone-500">
                    Obrigatoriedade Asaas 2026: URL de recebimento de pagamentos e token de integridade (<code>authToken</code>).
                  </p>
                </div>
              </div>

              {currentTabDetails.hasWebhookToken ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Webhook Ativo
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 border border-amber-200 text-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  Token pendente
                </span>
              )}
            </div>

            {/* URL do Webhook do Sistema */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-700">
                URL do Webhook do Conexão Maçônica
              </label>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono">
                <span className="truncate flex-1 text-stone-800 font-semibold px-1">
                  {overview.systemWebhookUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyWebhookUrl}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-stone-300 hover:bg-stone-100 text-[11px] font-bold text-stone-700 shadow-2xs cursor-pointer"
                >
                  {copiedWebhook ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-stone-500" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Auth Token do Webhook */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-stone-700">
                  Auth Token do Webhook (Exigido pelo Asaas desde 02/2026)
                </label>
                {currentTabDetails.hasWebhookToken && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedTab === 'sandbox') setEditingSandboxWh(!editingSandboxWh);
                      else setEditingProdWh(!editingProdWh);
                    }}
                    className="text-xs text-[#3B0B14] hover:underline font-semibold cursor-pointer"
                  >
                    {(selectedTab === 'sandbox' ? editingSandboxWh : editingProdWh)
                      ? 'Cancelar'
                      : 'Alterar Token'}
                  </button>
                )}
              </div>

              {(selectedTab === 'sandbox' ? editingSandboxWh : editingProdWh) ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="whsec_... ou deixe em branco para gerar automaticamente"
                    value={selectedTab === 'sandbox' ? sandboxWebhookToken : prodWebhookToken}
                    onChange={(e) =>
                      selectedTab === 'sandbox'
                        ? setSandboxWebhookToken(e.target.value)
                        : setProdWebhookToken(e.target.value)
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#3B0B14]"
                  />
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      disabled={savingCredentials}
                      onClick={() => handleSaveCredentials(selectedTab)}
                      className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                    >
                      Salvar Token
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-emerald-600" />
                    <span className="font-mono text-xs text-stone-800 font-bold">
                      {currentTabDetails.maskedWebhookToken || 'whsec_••••••••••••••••'}
                    </span>
                  </div>
                  {currentTabDetails.webhookId && (
                    <span className="text-[10px] font-mono text-stone-500">
                      ID: {currentTabDetails.webhookId}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Ação Automática: Criar Webhook via API */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <strong className="block text-xs font-bold text-stone-900">
                  Configuração Automática via API
                </strong>
                <span className="text-xs text-stone-500">
                  Cria ou atualiza o webhook na conta do Asaas sem precisar abrir o painel deles manualmente.
                </span>
              </div>
              <button
                type="button"
                disabled={configuringWebhook || !currentTabDetails.hasApiKey}
                onClick={() => handleAutoConfigureWebhook(selectedTab)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C9A227] hover:bg-[#b08d20] text-stone-950 text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{configuringWebhook ? 'Configurando...' : 'Configurar no Asaas Automaticamente'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Coluna 3: Diagnóstico, Teste de Conexão & Estatísticas */}
        <div className="space-y-6">
          {/* Card de Teste de Conexão */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#3B0B14]" />
              <span>Diagnóstico de Conexão</span>
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Dispara uma requisição real autenticada à API do Asaas ({selectedTab.toUpperCase()}) para validar se a chave está operacional.
            </p>

            <button
              type="button"
              disabled={testingConnection || !currentTabDetails.hasApiKey}
              onClick={() => handleTestConnection(selectedTab)}
              className="w-full py-3 rounded-xl bg-[#3B0B14] hover:bg-[#2b060d] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {testingConnection ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Testando Conexão...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-[#C9A227]" />
                  <span>Testar Conexão com Asaas {selectedTab.toUpperCase()}</span>
                </>
              )}
            </button>

            {/* Resultado do Teste */}
            {testResult && testResult.environment === selectedTab && (
              <div
                className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-600" />
                  )}
                  <span>{testResult.message}</span>
                </div>
                {testResult.details?.name && (
                  <p className="text-[11px] text-stone-700">
                    Conta: <strong>{testResult.details.name}</strong> ({testResult.details.email || ''})
                  </p>
                )}
                {testResult.details?.error && (
                  <p className="text-[11px] text-rose-800 font-mono">
                    Detalhe: {testResult.details.error}
                  </p>
                )}
              </div>
            )}

            {/* Histórico do último teste no banco */}
            {currentTabDetails.lastConnectionTestAt && (
              <div className="text-[11px] text-stone-500 border-t border-stone-100 pt-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Último teste registrado:</span>
                  <span className="font-mono font-semibold text-stone-700">
                    {new Date(currentTabDetails.lastConnectionTestAt).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Resultado:</span>
                  <span
                    className={`font-bold ${
                      currentTabDetails.lastConnectionTestSuccess
                        ? 'text-emerald-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {currentTabDetails.lastConnectionTestSuccess ? '✓ Sucesso' : '✕ Falha'}
                  </span>
                </div>
                {currentTabDetails.lastConnectionError && (
                  <p className="text-rose-700 text-[10px] font-mono line-clamp-2">
                    {currentTabDetails.lastConnectionError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Links e Recomendações Úteis do Asaas */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 space-y-3 text-xs">
            <strong className="block font-bold text-stone-900">
              Guias Oficiais do Asaas
            </strong>
            <ul className="space-y-2 text-stone-600">
              <li>
                <a
                  href="https://sandbox.asaas.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between hover:text-[#3B0B14] hover:underline"
                >
                  <span>Painel do Asaas Sandbox</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.asaas.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between hover:text-[#3B0B14] hover:underline"
                >
                  <span>Painel do Asaas Produção</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </li>
              <li>
                <a
                  href="https://docs.asaas.com/docs/authentication"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between hover:text-[#3B0B14] hover:underline"
                >
                  <span>Documentação: Header access_token</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* MODAL DE SEGURANÇA PARA ALTERNAR AMBIENTE                           */}
      {/* =================================================================== */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div
                className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  targetEnvToSwitch === 'production'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                <ArrowRightLeft className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-stone-900">
                  Alternar para {targetEnvToSwitch === 'production' ? 'PRODUÇÃO OFICIAL' : 'SANDBOX'}
                </h3>
                <span className="text-xs text-stone-500">
                  Ambiente atual: <strong>{overview.activeEnvironment.toUpperCase()}</strong>
                </span>
              </div>
            </div>

            {targetEnvToSwitch === 'production' ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-950 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-rose-900">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Atenção: Ativação de Cobranças Reais</span>
                  </div>
                  <p>
                    Ao mudar para <strong>PRODUÇÃO</strong>, todas as novas cobranças geradas pelo sistema emitirão transações com dinheiro real no Asaas.
                  </p>
                  {overview.pendingChargesCount > 0 && (
                    <p className="font-bold text-rose-900 border-t border-rose-200 pt-1.5">
                      ⚠️ Existem {overview.pendingChargesCount} cobrança(s) pendente(s) no Sandbox. Elas não serão reconciliadas na conta de produção.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-stone-800">
                    Digite <span className="text-rose-700 font-mono">PRODUÇÃO</span> para confirmar:
                  </label>
                  <input
                    type="text"
                    value={confirmationInput}
                    onChange={(e) => setConfirmationInput(e.target.value)}
                    placeholder="PRODUÇÃO"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 font-mono text-center tracking-widest font-bold text-sm focus:outline-none focus:ring-2 focus:ring-rose-600"
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-2">
                <p>
                  Você está alternando para o <strong>SANDBOX</strong>. Nenhuma cobrança gerada neste modo terá valor financeiro real.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowSwitchModal(false);
                  setConfirmationInput('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  switchingEnvironment ||
                  (targetEnvToSwitch === 'production' &&
                    confirmationInput.trim() !== 'PRODUÇÃO' &&
                    confirmationInput.trim() !== 'PRODUCAO')
                }
                onClick={handleConfirmSwitchEnvironment}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm disabled:opacity-40 cursor-pointer ${
                  targetEnvToSwitch === 'production'
                    ? 'bg-rose-700 hover:bg-rose-800'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {switchingEnvironment
                  ? 'Alternando...'
                  : `Confirmar e Ativar ${targetEnvToSwitch.toUpperCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
