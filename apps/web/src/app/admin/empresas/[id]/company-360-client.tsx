'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  ArrowLeft,
  Eye,
  Save,
  Loader2,
  Clock,
  History,
  BarChart3,
  Layers,
} from 'lucide-react';
import {
  AdminBusiness360DTO,
  togglePublicationStatusAction,
  toggleRecognitionAction,
} from '@/lib/admin/admin-businesses-service';

interface Props {
  initialData: AdminBusiness360DTO;
}

export default function Company360Client({ initialData }: Props) {
  const [data, setData] = useState<AdminBusiness360DTO>(initialData);
  const [activeTab, setActiveTab] = useState<
    | 'resumo'
    | 'cadastro'
    | 'conteudo'
    | 'plano'
    | 'contrato'
    | 'pagamentos'
    | 'analytics'
    | 'reconhecimentos'
    | 'notificacoes'
    | 'auditoria'
  >('resumo');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State para Ações de Risco (Suspender/Reativar)
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<'published' | 'suspended'>('suspended');
  const [statusJustification, setStatusJustification] = useState('');

  // Modal State para Alterar Reconhecimento
  const [showRecognitionModal, setShowRecognitionModal] = useState(false);
  const [targetRecognitionKey, setTargetRecognitionKey] = useState<
    'is_pedra_fundamental' | 'is_founder' | 'is_coluna_honra' | 'is_verified'
  >('is_pedra_fundamental');
  const [targetRecognitionValue, setTargetRecognitionValue] = useState(true);
  const [recognitionJustification, setRecognitionJustification] = useState('');

  const handleToggleStatus = async () => {
    if (!statusJustification.trim()) {
      setMessage({ type: 'error', text: 'Por favor, informe a justificativa da alteração de status.' });
      return;
    }
    setLoading(true);
    const res = await togglePublicationStatusAction(data.business.id, targetStatus, statusJustification);
    if (res.success) {
      setData((prev) => ({
        ...prev,
        business: { ...prev.business, publication_status: targetStatus },
        audit_timeline: [
          {
            id: `t-${Date.now()}`,
            date: new Date().toISOString(),
            action: targetStatus === 'suspended' ? 'SUSPENSÃO DE ANÚNCIO' : 'REATIVAÇÃO DE ANÚNCIO',
            description: statusJustification,
            performed_by: 'Admin Conexão',
          },
          ...prev.audit_timeline,
        ],
      }));
      setMessage({ type: 'success', text: `Status da empresa alterado para ${targetStatus === 'published' ? 'Publicada' : 'Suspensa'}.` });
      setShowStatusModal(false);
      setStatusJustification('');
    } else {
      setMessage({ type: 'error', text: res.error || 'Erro ao alterar status.' });
    }
    setLoading(false);
  };

  const handleToggleRecognition = async () => {
    if (!recognitionJustification.trim()) {
      setMessage({ type: 'error', text: 'Por favor, informe a justificativa da concessão/revogação.' });
      return;
    }
    setLoading(true);
    const res = await toggleRecognitionAction(
      data.business.id,
      targetRecognitionKey,
      targetRecognitionValue,
      recognitionJustification
    );

    if (res.success) {
      setData((prev) => ({
        ...prev,
        business: { ...prev.business, [targetRecognitionKey]: targetRecognitionValue },
        audit_timeline: [
          {
            id: `t-${Date.now()}`,
            date: new Date().toISOString(),
            action: `ALTERAÇÃO DE RECONHECIMENTO (${targetRecognitionKey})`,
            description: recognitionJustification,
            performed_by: 'Admin Conexão',
          },
          ...prev.audit_timeline,
        ],
      }));
      setMessage({ type: 'success', text: 'Reconhecimento fraterno atualizado e auditado com sucesso.' });
      setShowRecognitionModal(false);
      setRecognitionJustification('');
    } else {
      setMessage({ type: 'error', text: res.error || 'Erro ao alterar reconhecimento.' });
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-left pb-24 lg:pb-6">
      {/* NAVEGAÇÃO E HEADER */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/empresas"
            className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#3B0B14] text-[#C9A227] font-bold text-[10px] uppercase tracking-wider">
                Prontuário 360º de Gestão
              </span>
              <span className="text-xs text-stone-500 font-mono">ID: {data.business.id}</span>
            </div>
            <h1 className="text-2xl font-serif font-bold text-stone-900 mt-0.5">
              {data.business.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/guia"
            target="_blank"
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl border border-stone-300 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-stone-600" />
            <span>Ver no Guia</span>
          </Link>
        </div>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              : 'bg-red-100 text-red-900 border border-red-300'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{message.text}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* 4. TOPO EXECUTIVO DE RESPOSTA RÁPIDA                                */}
      {/* =================================================================== */}
      <div className="bg-[#3B0B14] border border-[#C9A227]/50 rounded-2xl p-6 text-white shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-700/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif font-bold text-xl text-[#C9A227]">{data.business.name}</h2>
              {data.business.publication_status === 'published' ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-700 text-white font-extrabold text-[10px] uppercase">
                  ✓ Publicada
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-700 text-white font-extrabold text-[10px] uppercase">
                  Suspensa
                </span>
              )}
            </div>
            <p className="text-xs text-stone-300 mt-1 line-clamp-1">
              {data.business.category} • Responsável: {data.owner.full_name} ({data.owner.email})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-stone-900/60 border border-stone-700 text-stone-200">
              Plano: <strong className="text-[#C9A227] uppercase">{data.business.plan_code}</strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-stone-900/60 border border-stone-700 text-stone-200">
              Vigência: <strong className="text-emerald-400">Até 24/08/2027</strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-stone-900/60 border border-stone-700 text-stone-200">
              Pagamento: <strong className="text-emerald-400">Confirmado</strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-stone-900/60 border border-stone-700 text-stone-200">
              Completude: <strong className="text-emerald-400">{data.business.completeness_percent}%</strong>
            </div>
            {data.business.is_pedra_fundamental && (
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold">
                Pedra Fundamental (1/10)
              </div>
            )}
          </div>
        </div>

        {/* AÇÕES DE GOVERNANÇA NO TOPO EXECUTIVO */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setTargetStatus(data.business.publication_status === 'published' ? 'suspended' : 'published');
              setShowStatusModal(true);
            }}
            className={`px-4 py-2 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
              data.business.publication_status === 'published'
                ? 'bg-rose-700 hover:bg-rose-800 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {data.business.publication_status === 'published' ? (
              <>
                <XCircle className="w-4 h-4" /> Suspender Anúncio
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" /> Reativar Anúncio
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowRecognitionModal(true)}
            className="px-4 py-2 bg-[#C9A227] hover:bg-amber-400 text-[#3B0B14] font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Sparkles className="w-4 h-4 text-[#3B0B14]" />
            <span>Gerenciar Reconhecimentos</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 5. BARRA DE NAVEGAÇÃO STICKY POR ABAS                               */}
      {/* =================================================================== */}
      <div className="sticky top-16 z-30 bg-white border border-stone-300 rounded-xl p-1.5 shadow-xs flex items-center gap-1 overflow-x-auto scrollbar-none">
        {[
          { id: 'resumo', label: 'Resumo' },
          { id: 'cadastro', label: 'Cadastro' },
          { id: 'conteudo', label: 'Conteúdo' },
          { id: 'plano', label: 'Plano & Cotas' },
          { id: 'contrato', label: 'Contrato' },
          { id: 'pagamentos', label: 'Pagamentos' },
          { id: 'analytics', label: 'Analytics' },
          { id: 'reconhecimentos', label: 'Reconhecimentos' },
          { id: 'notificacoes', label: 'Notificações' },
          { id: 'auditoria', label: 'Timeline & Auditoria' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#3B0B14] text-[#C9A227] shadow-xs'
                : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* =================================================================== */}
      {/* CONTEÚDO DAS ABAS SELECIONADAS                                      */}
      {/* =================================================================== */}

      {/* ABA 1: RESUMO OPERACIONAL */}
      {activeTab === 'resumo' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SAÚDE DO ANÚNCIO E PENDÊNCIAS */}
          <div className="lg:col-span-2 bg-white border border-stone-300 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-sm text-[#3B0B14] border-b border-stone-200 pb-2 uppercase tracking-wider">
              6. Resumo da Saúde Operacional do Anúncio
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-stone-500 block">Status:</span>
                <strong className="text-emerald-700 font-bold">✓ Publicado</strong>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-stone-500 block">Financeiro:</span>
                <strong className="text-emerald-700 font-bold">✓ Em Dia</strong>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-stone-500 block">Próxima Renovação:</span>
                <strong className="text-stone-900 font-mono">24/08/2027</strong>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-stone-500 block">Performance 30d:</span>
                <strong className="text-emerald-700 font-bold">+18.4% visualizações</strong>
              </div>
            </div>
          </div>

          {/* RESUMO DAS COTAS */}
          <div className="bg-white border border-stone-300 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-sm text-stone-800 border-b border-stone-200 pb-2 uppercase tracking-wider">
              Uso de Cotas do Plano
            </h3>
            <div className="space-y-3 text-xs font-semibold text-stone-800">
              <div>
                <div className="flex justify-between mb-1">
                  <span>Fotos na Galeria:</span>
                  <span>{data.content_summary.gallery_count} / {data.content_summary.gallery_limit}</span>
                </div>
                <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#3B0B14] h-full"
                    style={{ width: `${(data.content_summary.gallery_count / data.content_summary.gallery_limit) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span>Serviços Cadastrados:</span>
                  <span>{data.content_summary.services_count} / {data.content_summary.services_limit}</span>
                </div>
                <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#3B0B14] h-full"
                    style={{ width: `${(data.content_summary.services_count / data.content_summary.services_limit) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 8: PLANO & COTAS */}
      {activeTab === 'plano' && (
        <div className="bg-white border border-stone-300 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="font-serif font-bold text-base text-stone-900 border-b border-stone-200 pb-3 flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#3B0B14]" /> 8. Cotas e Direitos do Plano {data.subscription.plan_name}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl">
              <span className="text-stone-500 block font-bold">Galeria de Fotos:</span>
              <p className="text-2xl font-serif font-bold text-stone-900 mt-1">
                {data.content_summary.gallery_count} / {data.content_summary.gallery_limit}
              </p>
            </div>
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl">
              <span className="text-stone-500 block font-bold">Serviços:</span>
              <p className="text-2xl font-serif font-bold text-stone-900 mt-1">
                {data.content_summary.services_count} / {data.content_summary.services_limit}
              </p>
            </div>
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl">
              <span className="text-stone-500 block font-bold">Benefícios Fraternos:</span>
              <p className="text-2xl font-serif font-bold text-stone-900 mt-1">
                {data.content_summary.benefits_count} / {data.content_summary.benefits_limit}
              </p>
            </div>
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl">
              <span className="text-stone-500 block font-bold">Eventos & Posts:</span>
              <p className="text-2xl font-serif font-bold text-stone-900 mt-1">
                {data.content_summary.events_count} / {data.content_summary.events_limit}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ABA 11: ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="bg-white border border-stone-300 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="font-serif font-bold text-base text-stone-900 border-b border-stone-200 pb-3 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#3B0B14]" /> 11. Performance & Interações (Últimos 30 dias)
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl">
              <span className="text-stone-500 block font-bold">Visualizações:</span>
              <p className="text-2xl font-serif font-bold text-stone-900 mt-1">{data.analytics_summary.views_30d}</p>
            </div>
            <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl">
              <span className="text-stone-500 block font-bold">Interações:</span>
              <p className="text-2xl font-serif font-bold text-stone-900 mt-1">{data.analytics_summary.interactions_30d}</p>
            </div>
            <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl">
              <span className="text-stone-500 block font-bold">Cliques WhatsApp:</span>
              <p className="text-2xl font-serif font-bold text-emerald-800 mt-1">{data.analytics_summary.whatsapp_clicks_30d}</p>
            </div>
            <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl">
              <span className="text-stone-500 block font-bold">Solicitações Rota GPS:</span>
              <p className="text-2xl font-serif font-bold text-stone-900 mt-1">{data.analytics_summary.route_clicks_30d}</p>
            </div>
            <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl">
              <span className="text-stone-500 block font-bold">Visitas ao Website:</span>
              <p className="text-2xl font-serif font-bold text-stone-900 mt-1">{data.analytics_summary.website_clicks_30d}</p>
            </div>
          </div>
        </div>
      )}

      {/* ABA 14: TIMELINE ÚNICA & AUDITORIA */}
      {(activeTab === 'auditoria' || activeTab === 'resumo') && (
        <div className="bg-white border border-stone-300 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="font-serif font-bold text-base text-stone-900 border-b border-stone-200 pb-3 flex items-center gap-2">
            <History className="w-5 h-5 text-[#3B0B14]" /> 14. Timeline Operacional & Audit Trail
          </h3>

          <div className="space-y-3">
            {data.audit_timeline.map((log) => (
              <div key={log.id} className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-xs flex items-start gap-3">
                <Clock className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-stone-900 font-bold">{log.action}</strong>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {new Date(log.date).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-stone-600 mt-0.5">{log.description}</p>
                  <span className="text-[10px] text-stone-400 block mt-1">Por: {log.performed_by}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 15: SUSPENDER / REATIVAR COM JUSTIFICATIVA MANDATÓRIA */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-stone-300 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-left">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>{targetStatus === 'suspended' ? 'Suspender Anúncio' : 'Reativar Anúncio'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="text-stone-400 hover:text-stone-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Esta ação alterará a visibilidade do anúncio no Guia Maçônico. Informe a justificativa obrigatória para o registro de auditoria.
            </p>

            <div className="space-y-1 text-xs">
              <label className="block font-bold text-stone-800">Justificativa Operacional:</label>
              <textarea
                rows={3}
                placeholder="Ex: Suspensão temporária a pedido do anunciante ou pendência financeira."
                value={statusJustification}
                onChange={(e) => setStatusJustification(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:border-rose-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={loading}
                className={`px-5 py-2 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md ${
                  targetStatus === 'suspended'
                    ? 'bg-rose-700 hover:bg-rose-800 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4" />}
                <span>Confirmar & Registrar Auditoria</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 12: GERENCIAR RECONHECIMENTOS FRATERNOS */}
      {showRecognitionModal && (
        <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-stone-300 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl text-left">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#C9A227]" /> 12. Gerenciar Reconhecimentos Fraternos
              </h3>
              <button
                type="button"
                onClick={() => setShowRecognitionModal(false)}
                className="text-stone-400 hover:text-stone-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block font-bold text-stone-800">Selecione o Selo:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'is_pedra_fundamental', label: 'Pedra Fundamental (1/10)' },
                  { key: 'is_founder', label: 'Empresa Fundadora' },
                  { key: 'is_coluna_honra', label: 'Coluna de Honra' },
                  { key: 'is_verified', label: 'Selo de Verificação' },
                ].map((rec) => (
                  <button
                    key={rec.key}
                    type="button"
                    onClick={() => setTargetRecognitionKey(rec.key as any)}
                    className={`p-2.5 rounded-xl text-xs font-bold border text-left cursor-pointer ${
                      targetRecognitionKey === rec.key
                        ? 'bg-[#3B0B14] text-[#C9A227] border-[#C9A227]'
                        : 'bg-stone-50 text-stone-700 border-stone-300'
                    }`}
                  >
                    {rec.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="font-bold text-stone-800">Ação:</label>
                <button
                  type="button"
                  onClick={() => setTargetRecognitionValue(true)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer ${
                    targetRecognitionValue ? 'bg-emerald-700 text-white' : 'bg-stone-100 text-stone-700'
                  }`}
                >
                  Conceder Selo
                </button>
                <button
                  type="button"
                  onClick={() => setTargetRecognitionValue(false)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer ${
                    !targetRecognitionValue ? 'bg-rose-700 text-white' : 'bg-stone-100 text-stone-700'
                  }`}
                >
                  Revogar Selo
                </button>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-stone-800">Justificativa Operacional:</label>
                <textarea
                  rows={3}
                  placeholder="Ex: Empresa participante da Pedra Fundamental pioneira do ecossistema."
                  value={recognitionJustification}
                  onChange={(e) => setRecognitionJustification(e.target.value)}
                  className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:border-[#3B0B14]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRecognitionModal(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleToggleRecognition}
                disabled={loading}
                className="px-5 py-2 bg-[#3B0B14] hover:bg-[#4B161B] text-[#C9A227] font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Salvar Reconhecimento</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
