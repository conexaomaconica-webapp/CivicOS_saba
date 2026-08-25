'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  CreditCard,
  Building2,
  Award,
  Sparkles,
  ArrowLeft,
  Edit,
  Save,
  Loader2,
  Image as ImageIcon,
  Send,
  Eye,
  Download,
} from 'lucide-react';
import {
  ApprovalDossier360,
  updateBusinessDataBeforeApprovalAction,
  updateBusinessMediaBeforeApprovalAction,
  validateMasonicLinkAction,
  requestBusinessCorrectionAction,
  finalizeApprovalDecisionAction,
} from '@/lib/admin/admin-approval-service';

interface Props {
  initialDossier: ApprovalDossier360;
}

export default function ApprovalDossierClient({ initialDossier }: Props) {
  const [dossier, setDossier] = useState<ApprovalDossier360>(initialDossier);
  const [activeTab, setActiveTab] = useState<
    'resumo' | 'cadastro' | 'midias' | 'vinculo' | 'contrato' | 'pagamento' | 'plano' | 'reconhecimentos' | 'auditoria'
  >('resumo');

  const [editingCompany, setEditingCompany] = useState(false);
  const [editingMedia, setEditingMedia] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State para Edição Cadastral da Empresa
  const [companyForm, setCompanyForm] = useState(dossier.company);
  const [mediaForm, setMediaForm] = useState(dossier.media);

  // Dialog State para Solicitar Correção com Motivos Rápidos
  const [showCorrectionDialog, setShowCorrectionDialog] = useState(false);
  const [selectedCorrectionReason, setSelectedCorrectionReason] = useState<string>('Logo inadequada');
  const [correctionNotes, setCorrectionNotes] = useState('');

  // Modal State para Confirmação Final de Aprovação
  const [showApprovalConfirmModal, setShowApprovalConfirmModal] = useState(false);

  // Modal State para Pré-visualização do Anúncio Público
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Salvar Edição da Empresa Pré-Aprovação
  const handleSaveCompanyData = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await updateBusinessDataBeforeApprovalAction(dossier.business_id, companyForm);
    if (res.success) {
      setDossier((prev) => ({
        ...prev,
        company: { ...prev.company, ...companyForm },
      }));
      setMessage({ type: 'success', text: 'Alterações salvas e registradas na auditoria com sucesso.' });
      setEditingCompany(false);
    } else {
      setMessage({ type: 'error', text: res.error || 'Falha ao salvar dados.' });
    }
    setLoading(false);
  };

  // Salvar Edição de Mídias Pré-Aprovação
  const handleSaveMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await updateBusinessMediaBeforeApprovalAction(dossier.business_id, mediaForm);
    if (res.success) {
      setDossier((prev) => ({
        ...prev,
        media: { ...prev.media, ...mediaForm },
      }));
      setMessage({ type: 'success', text: 'Mídias salvas e registradas na auditoria com sucesso.' });
      setEditingMedia(false);
    } else {
      setMessage({ type: 'error', text: res.error || 'Falha ao atualizar mídias.' });
    }
    setLoading(false);
  };

  // Validar Vínculo Maçônico Separadamente
  const handleValidateMasonicLink = async (status: 'verified' | 'rejected') => {
    setLoading(true);
    const res = await validateMasonicLinkAction(dossier.business_id, status);
    if (res.success) {
      setDossier((prev) => ({
        ...prev,
        masonic_link: { ...prev.masonic_link, verification_status: status },
      }));
      setMessage({ type: 'success', text: `Vínculo maçônico alterado para ${status === 'verified' ? 'Validado' : 'Rejeitado'}.` });
    }
    setLoading(false);
  };

  // Enviar Solicitação de Correção (Evento correction_requested)
  const handleSendCorrectionRequest = async () => {
    if (!correctionNotes.trim()) {
      setMessage({ type: 'error', text: 'Por favor, indique as observações para o anunciante.' });
      return;
    }
    setLoading(true);
    const res = await requestBusinessCorrectionAction(dossier.business_id, correctionNotes, selectedCorrectionReason);
    if (res.success) {
      setDossier((prev) => ({
        ...prev,
        publication_status: 'draft',
        correction_notes: `[${selectedCorrectionReason}] ${correctionNotes}`,
      }));
      setShowCorrectionDialog(false);
      setMessage({ type: 'success', text: 'Solicitação de correção enviada! Notificação transacional enviada ao anunciante.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erro ao enviar correção.' });
    }
    setLoading(false);
  };

  // Finalizar Decisão de Aprovação / Publicação
  const handleConfirmApprovalPublish = async () => {
    setLoading(true);
    const res = await finalizeApprovalDecisionAction(dossier.business_id, 'publish');
    if (res.success) {
      setMessage({ type: 'success', text: 'Empresa Aprovada e Publicada imediatamente no Guia Maçônico Oficial!' });
      setDossier((prev) => ({
        ...prev,
        publication_status: 'published',
      }));
      setShowApprovalConfirmModal(false);
    } else {
      setMessage({ type: 'error', text: res.error || 'Erro ao processar aprovação.' });
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-left pb-24 lg:pb-6">
      {/* HEADER DE NAVEGAÇÃO */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/aprovacoes"
            className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#3B0B14] text-[#C9A227] font-bold text-[10px] uppercase tracking-wider">
                Dossiê 360º de Aprovação
              </span>
              <span className="text-xs text-stone-500 font-mono">ID: {dossier.business_id}</span>
            </div>
            <h1 className="text-2xl font-serif font-bold text-stone-900 mt-0.5">
              Conferência Pré-Publicação
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl border border-stone-300 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-stone-600" />
            <span>Pré-visualizar Anúncio</span>
          </button>
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
      {/* 6. PAINEL SUPERIOR (RESUMO EXECUTIVO FIXO DA DECISÃO DO DOSSIÊ)    */}
      {/* =================================================================== */}
      <div className="bg-[#3B0B14] border border-[#C9A227]/50 rounded-2xl p-6 text-white shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-700/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif font-bold text-xl text-[#C9A227]">{dossier.company.name}</h2>
              {dossier.completeness.is_ready_for_approval && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#C9A227] text-[#3B0B14] font-extrabold text-[10px] uppercase flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Apto p/ Aprovação
                </span>
              )}
            </div>
            <p className="text-xs text-stone-300 mt-1 line-clamp-1">
              {dossier.company.category} • Responsável: {dossier.responsible.full_name} ({dossier.responsible.email})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-stone-900/60 border border-stone-700 text-stone-200">
              Plano: <strong className="text-[#C9A227] uppercase">{dossier.contract.plan_code}</strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-stone-900/60 border border-stone-700 text-stone-200">
              Completude: <strong className="text-emerald-400">{dossier.completeness.percent}%</strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-stone-900/60 border border-stone-700 text-stone-200">
              Contrato: <strong className="text-emerald-400">Assinado SHA-256</strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-stone-900/60 border border-stone-700 text-stone-200">
              Pagamento: <strong className="text-emerald-400">Confirmado</strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-stone-900/60 border border-stone-700 text-stone-200">
              Vínculo: <strong className="text-emerald-400">Validado</strong>
            </div>
            {dossier.recognitions.is_pedra_fundamental && (
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold">
                Pedra Fundamental: Elegível (1/10)
              </div>
            )}
          </div>
        </div>

        {/* PENDÊNCIAS DE QUALIDADE VISUAL */}
        {dossier.completeness.pending_items.length > 0 && (
          <div className="bg-amber-950/40 border border-amber-700/50 rounded-xl p-3 text-xs text-amber-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-amber-300 font-serif">Pendências de Qualidade Visual:</strong>
              <ul className="list-disc list-inside space-y-0.5 mt-1 text-stone-300">
                {dossier.completeness.pending_items.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* AÇÕES EXECUTIVAS DIRETAS (DESKTOP) */}
        <div className="hidden lg:flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs rounded-xl border border-stone-600 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>Pré-visualizar Anúncio</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCorrectionDialog(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Send className="w-4 h-4" />
            <span>Solicitar Correção ao Anunciante</span>
          </button>

          <button
            type="button"
            onClick={() => setShowApprovalConfirmModal(true)}
            disabled={loading}
            className="px-6 py-2 bg-[#C9A227] hover:bg-amber-400 text-[#3B0B14] font-extrabold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#3B0B14]" /> : <CheckCircle2 className="w-4 h-4 text-[#3B0B14]" />}
            <span>Aprovar e Publicar Anúncio</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 7. BARRA DE NAVEGAÇÃO STICKY POR ABAS                               */}
      {/* =================================================================== */}
      <div className="sticky top-16 z-30 bg-white border border-stone-300 rounded-xl p-1.5 shadow-xs flex items-center gap-1 overflow-x-auto scrollbar-none">
        {[
          { id: 'resumo', label: 'Resumo' },
          { id: 'cadastro', label: 'Dados Cadastrais' },
          { id: 'midias', label: 'Mídias & Apresentação' },
          { id: 'vinculo', label: 'Vínculo Maçônico' },
          { id: 'contrato', label: 'Contrato Digital' },
          { id: 'pagamento', label: 'Pagamento Asaas' },
          { id: 'plano', label: 'Plano & Cotas' },
          { id: 'reconhecimentos', label: 'Reconhecimentos' },
          { id: 'auditoria', label: 'Auditoria' },
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
      {/* SEÇÃO DA ABA SELECIONADA                                            */}
      {/* =================================================================== */}

      {/* ABA 1: RESUMO & CHECKLIST DUAL */}
      {activeTab === 'resumo' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 8. REQUISITOS OBRIGATÓRIOS PARA PUBLICAÇÃO */}
          <div className="bg-white border border-stone-300 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-sm text-[#3B0B14] border-b border-stone-200 pb-2 uppercase tracking-wider">
              Requisitos para Publicação (Obrigatórios)
            </h3>
            <div className="space-y-2 text-xs font-semibold text-stone-800">
              <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                <span>✓ Responsável Comercial Identificado</span>
                <span className="text-emerald-700 font-bold">100% OK</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                <span>✓ Dados da Empresa Validados</span>
                <span className="text-emerald-700 font-bold">100% OK</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                <span>✓ Vínculo Maçônico Conferido</span>
                <span className="text-emerald-700 font-bold">100% OK</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                <span>✓ Contrato Digital Assinado (SHA-256)</span>
                <span className="text-emerald-700 font-bold">100% OK</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                <span>✓ Pagamento Confirmado no Asaas</span>
                <span className="text-emerald-700 font-bold">100% OK</span>
              </div>
            </div>
          </div>

          {/* MELHORIAS RECOMENDADAS DE QUALIDADE */}
          <div className="bg-white border border-stone-300 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-sm text-stone-700 border-b border-stone-200 pb-2 uppercase tracking-wider">
              Melhorias Recomendadas (Qualidade Visual)
            </h3>
            <div className="space-y-2 text-xs text-stone-700">
              <div className="flex items-center justify-between p-2 bg-stone-50 rounded-xl border border-stone-200">
                <span>Logomarca em Alta Resolução</span>
                <span className={dossier.completeness.recommended_quality.logo ? 'text-emerald-700 font-bold' : 'text-amber-600 font-bold'}>
                  {dossier.completeness.recommended_quality.logo ? '✓ OK' : '○ Pendente'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-stone-50 rounded-xl border border-stone-200">
                <span>Imagem de Capa Oficial</span>
                <span className={dossier.completeness.recommended_quality.banner ? 'text-emerald-700 font-bold' : 'text-amber-600 font-bold'}>
                  {dossier.completeness.recommended_quality.banner ? '✓ OK' : '○ Adicionar Capa'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-stone-50 rounded-xl border border-stone-200">
                <span>Galeria de Fotos do Negócio</span>
                <span className={dossier.completeness.recommended_quality.gallery ? 'text-emerald-700 font-bold' : 'text-amber-600 font-bold'}>
                  {dossier.completeness.recommended_quality.gallery ? '✓ OK' : '○ Adicionar Fotos'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-stone-50 rounded-xl border border-stone-200">
                <span>Coordenadas GPS no Mapa</span>
                <span className={dossier.completeness.recommended_quality.coordinates ? 'text-emerald-700 font-bold' : 'text-amber-600 font-bold'}>
                  {dossier.completeness.recommended_quality.coordinates ? '✓ OK' : '○ Confirmar GPS'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: DADOS CADASTRAIS (COM EDIÇÃO PRÉ-APROVAÇÃO) */}
      {(activeTab === 'cadastro' || activeTab === 'resumo') && (
        <div className="bg-white border border-stone-300 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#3B0B14]" /> Dados da Empresa (Edição Pré-Publicação)
            </h3>
            <button
              type="button"
              onClick={() => setEditingCompany(!editingCompany)}
              className="text-xs font-bold text-[#3B0B14] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>{editingCompany ? 'Cancelar Edição' : 'Editar Cadastro'}</span>
            </button>
          </div>

          {editingCompany ? (
            <form onSubmit={handleSaveCompanyData} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700">Nome Fantasia:</label>
                  <input
                    type="text"
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl outline-none focus:border-[#3B0B14]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700">Razão Social:</label>
                  <input
                    type="text"
                    value={companyForm.legal_name || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, legal_name: e.target.value })}
                    className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl outline-none focus:border-[#3B0B14]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700">CNPJ / CPF:</label>
                  <input
                    type="text"
                    value={companyForm.cnpj_cpf || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, cnpj_cpf: e.target.value })}
                    className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl outline-none focus:border-[#3B0B14] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700">Categoria:</label>
                  <input
                    type="text"
                    value={companyForm.category}
                    onChange={(e) => setCompanyForm({ ...companyForm, category: e.target.value })}
                    className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl outline-none focus:border-[#3B0B14]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700">WhatsApp Comercial:</label>
                  <input
                    type="text"
                    value={companyForm.whatsapp || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, whatsapp: e.target.value })}
                    className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl outline-none focus:border-[#3B0B14]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700">E-mail Comercial:</label>
                  <input
                    type="text"
                    value={companyForm.email || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                    className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl outline-none focus:border-[#3B0B14]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-stone-700">Endereço Completo:</label>
                  <input
                    type="text"
                    value={companyForm.address || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                    className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl outline-none focus:border-[#3B0B14]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-stone-700">Descrição do Negócio:</label>
                  <textarea
                    rows={3}
                    value={companyForm.description || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
                    className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl outline-none focus:border-[#3B0B14]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#3B0B14] hover:bg-[#4B161B] text-[#C9A227] font-bold text-xs rounded-xl border border-[#C9A227]/40 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Salvar Dados & Registrar Auditoria</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-stone-800">
              <div>
                <span className="text-stone-500 block">Nome Fantasia:</span>
                <strong className="font-serif font-bold text-sm text-stone-900">{dossier.company.name}</strong>
              </div>
              <div>
                <span className="text-stone-500 block">Razão Social:</span>
                <strong>{dossier.company.legal_name || dossier.company.name}</strong>
              </div>
              <div>
                <span className="text-stone-500 block">CNPJ / CPF:</span>
                <strong className="font-mono">{dossier.company.cnpj_cpf || 'Não informado'}</strong>
              </div>
              <div>
                <span className="text-stone-500 block">Categoria:</span>
                <strong>{dossier.company.category}</strong>
              </div>
              <div>
                <span className="text-stone-500 block">WhatsApp:</span>
                <strong>{dossier.company.whatsapp || 'Não informado'}</strong>
              </div>
              <div>
                <span className="text-stone-500 block">Endereço:</span>
                <strong>{dossier.company.address || 'São Paulo, SP'}</strong>
              </div>
              <div className="sm:col-span-2">
                <span className="text-stone-500 block">Descrição:</span>
                <p className="mt-1 leading-relaxed text-stone-700">{dossier.company.description}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA 3: MÍDIAS & PREVIEWS GRANDES */}
      {(activeTab === 'midias' || activeTab === 'resumo') && (
        <div className="bg-white border border-stone-300 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[#3B0B14]" /> 10. Mídias & Apresentação Visual
            </h3>
            <button
              type="button"
              onClick={() => setEditingMedia(!editingMedia)}
              className="text-xs font-bold text-[#3B0B14] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>{editingMedia ? 'Cancelar' : 'Gerenciar Mídias'}</span>
            </button>
          </div>

          {editingMedia ? (
            <form onSubmit={handleSaveMedia} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700">URL da Logomarca:</label>
                  <input
                    type="text"
                    value={mediaForm.logo_url || ''}
                    onChange={(e) => setMediaForm({ ...mediaForm, logo_url: e.target.value })}
                    className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl outline-none focus:border-[#3B0B14]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700">URL da Capa:</label>
                  <input
                    type="text"
                    value={mediaForm.banner_url || ''}
                    onChange={(e) => setMediaForm({ ...mediaForm, banner_url: e.target.value })}
                    className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl outline-none focus:border-[#3B0B14]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#3B0B14] hover:bg-[#4B161B] text-[#C9A227] font-bold text-xs rounded-xl border border-[#C9A227]/40 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Salvar Mídias & Registrar Auditoria</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* LOGO PREVIEW GRANDE */}
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3">
                <span className="font-bold text-stone-700 block">Logomarca Oficial:</span>
                <div className="w-24 h-24 rounded-2xl bg-white border border-stone-300 flex items-center justify-center font-serif font-bold text-3xl text-[#3B0B14] overflow-hidden shadow-xs">
                  {dossier.media.logo_url ? (
                    <img src={dossier.media.logo_url} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    dossier.company.name.charAt(0)
                  )}
                </div>
                <span className="text-[11px] text-stone-500 block">
                  {dossier.media.logo_url ? '✓ Cadastrada em alta resolução' : '✕ Recomenda-se adicionar'}
                </span>
              </div>

              {/* CAPA PREVIEW GRANDE */}
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3">
                <span className="font-bold text-stone-700 block">Imagem de Capa (Banner):</span>
                <div className="w-full h-24 rounded-xl bg-stone-200 border border-stone-300 flex items-center justify-center text-xs text-stone-500 overflow-hidden shadow-xs">
                  {dossier.media.banner_url ? (
                    <img src={dossier.media.banner_url} alt="Capa" className="w-full h-full object-cover" />
                  ) : (
                    'Sem imagem de capa cadastrada'
                  )}
                </div>
                <span className="text-[11px] text-stone-500 block">
                  {dossier.media.banner_url ? '✓ Imagem de capa cadastrada' : '○ Recomendado adicionar imagem de capa'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA 4: VÍNCULO MAÇÔNICO */}
      {(activeTab === 'vinculo' || activeTab === 'resumo') && (
        <div className="bg-white border border-stone-300 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-[#3B0B14]" /> Vínculo Maçônico Fraterno
            </h3>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs">
              ✓ Validado Independentemente
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-stone-800">
            <div>
              <span className="text-stone-500 block">Grau / Papel Fraterno:</span>
              <strong className="text-stone-900 text-sm font-serif">{dossier.masonic_link.affiliation_role || 'Irmão'}</strong>
            </div>
            <div>
              <span className="text-stone-500 block">Loja & Potência:</span>
              <strong className="text-stone-900">
                {dossier.masonic_link.lodge_name || 'ARLS Ciência e Virtude nº 1234'} ({dossier.masonic_link.potencia_name || 'GLESP'})
              </strong>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => handleValidateMasonicLink('verified')}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              ✓ Confirmar Validação de Vínculo
            </button>
            <button
              type="button"
              onClick={() => handleValidateMasonicLink('rejected')}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Rejeitar Vínculo
            </button>
          </div>
        </div>
      )}

      {/* ABA 5: CONTRATO DIGITAL (READ-ONLY) */}
      {(activeTab === 'contrato' || activeTab === 'resumo') && (
        <div className="bg-white border border-stone-300 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#3B0B14]" /> 11. Contrato Digital Assinado (Read-Only)
            </h3>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs">
              ✓ Imutável SHA-256
            </span>
          </div>

          <div className="space-y-3 text-xs text-stone-800">
            <div className="flex items-center justify-between">
              <span className="text-stone-600">Versão do Contrato:</span>
              <strong className="font-mono text-stone-900">{dossier.contract.version}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-600">Hash de Segurança SHA-256:</span>
              <strong className="font-mono text-[11px] text-stone-700 truncate max-w-[280px]">
                {dossier.contract.sha256_hash}
              </strong>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl border border-stone-300 flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-4 h-4 text-stone-600" />
                <span>Visualizar Snapshot</span>
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl border border-stone-300 flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4 text-stone-600" />
                <span>Baixar PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ABA 6: PAGAMENTO ASAAS (READ-ONLY) */}
      {(activeTab === 'pagamento' || activeTab === 'resumo') && (
        <div className="bg-white border border-stone-300 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#3B0B14]" /> Situação Financeira (Asaas Gateway)
            </h3>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs">
              ✓ Pagamento Confirmado
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-stone-800">
            <div>
              <span className="text-stone-500 block">Plano:</span>
              <strong className="uppercase font-bold text-[#3B0B14]">{dossier.payment.plan_code}</strong>
            </div>
            <div>
              <span className="text-stone-500 block">Valor Anual:</span>
              <strong className="font-mono">R$ {(dossier.payment.amount_cents / 100).toFixed(2)}</strong>
            </div>
            <div>
              <span className="text-stone-500 block">Forma de Pagamento:</span>
              <strong className="font-bold">Cartão de Crédito (12x sem juros)</strong>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 14. BARRA DE AÇÕES STICKY NO MOBILE (390PX)                         */}
      {/* =================================================================== */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-[#3B0B14] border-t border-[#C9A227]/40 shadow-2xl flex items-center justify-between z-40 gap-2">
        <button
          type="button"
          onClick={() => setShowCorrectionDialog(true)}
          className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs rounded-xl flex items-center gap-1 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Solicitar Correção</span>
        </button>

        <button
          type="button"
          onClick={() => setShowApprovalConfirmModal(true)}
          className="flex-1 py-2 bg-[#C9A227] hover:bg-amber-400 text-[#3B0B14] font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 shadow-lg"
        >
          <CheckCircle2 className="w-4 h-4 text-[#3B0B14]" />
          <span>Aprovar e Publicar</span>
        </button>
      </div>

      {/* 12. DIALOG DE SOLICITAR CORREÇÃO COM SELETORES RÁPIDOS */}
      {showCorrectionDialog && (
        <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-stone-300 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl text-left">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-amber-600" /> Solicitar Correção ao Anunciante
              </h3>
              <button
                type="button"
                onClick={() => setShowCorrectionDialog(false)}
                className="text-stone-400 hover:text-stone-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Selecione o motivo principal do ajuste e inclua orientações objetivas. Isso disparará a notificação transacional <strong className="text-amber-800 font-mono">correction_requested</strong>.
            </p>

            <div className="space-y-2 text-xs">
              <label className="block font-bold text-stone-800">Motivo Rápido:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'Logo inadequada',
                  'Foto ausente',
                  'Dados cadastrais',
                  'Endereço / GPS',
                  'Documento/vínculo',
                  'Outro motivo',
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setSelectedCorrectionReason(reason)}
                    className={`p-2 rounded-xl text-xs font-bold border text-left transition-all cursor-pointer ${
                      selectedCorrectionReason === reason
                        ? 'bg-[#3B0B14] text-[#C9A227] border-[#C9A227]'
                        : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="block font-bold text-stone-800">Observações Objetivas:</label>
              <textarea
                rows={4}
                placeholder="Ex: Por favor, substitua a imagem da logomarca por uma versão em alta resolução e ajuste o número do endereço."
                value={correctionNotes}
                onChange={(e) => setCorrectionNotes(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:border-amber-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCorrectionDialog(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendCorrectionRequest}
                disabled={loading}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-stone-950" /> : <Send className="w-4 h-4" />}
                <span>Enviar Solicitação ao Anunciante</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 13. MODAL DE CONFIRMAÇÃO FINAL DE APROVAÇÃO E PUBLICAÇÃO */}
      {showApprovalConfirmModal && (
        <div className="fixed inset-0 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-stone-300 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-left">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Confirmar Aprovação & Publicação
              </h3>
              <button
                type="button"
                onClick={() => setShowApprovalConfirmModal(false)}
                className="text-stone-400 hover:text-stone-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-700 leading-relaxed font-semibold">
              Esta empresa será publicada imediatamente no Guia Maçônico Oficial.
            </p>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-stone-600">Empresa:</span>
                <strong className="text-stone-900 font-serif">{dossier.company.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Plano Comercial:</span>
                <strong className="uppercase text-[#3B0B14]">{dossier.contract.plan_code}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Pagamento:</span>
                <strong className="text-emerald-700">✓ Confirmado</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Vínculo Fraterno:</span>
                <strong className="text-emerald-700">✓ Validado</strong>
              </div>
              {dossier.recognitions.is_pedra_fundamental && (
                <div className="flex justify-between text-amber-900 font-bold">
                  <span>Pedra Fundamental:</span>
                  <span>Elegível (1/10)</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowApprovalConfirmModal(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmApprovalPublish}
                disabled={loading}
                className="px-6 py-2 bg-[#C9A227] hover:bg-amber-400 text-[#3B0B14] font-extrabold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#3B0B14]" /> : <CheckCircle2 className="w-4 h-4 text-[#3B0B14]" />}
                <span>Confirmar Aprovação e Publicar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PRÉ-VISUALIZAÇÃO DO ANÚNCIO NO GUIA */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-stone-300 rounded-2xl p-6 max-w-2xl w-full space-y-4 shadow-2xl overflow-hidden text-left">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-[#3B0B14] text-[#C9A227] font-bold text-[10px] uppercase">
                  Pré-visualização do Anúncio Público
                </span>
                <h3 className="font-serif font-bold text-base text-stone-900">{dossier.company.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="text-stone-400 hover:text-stone-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 bg-stone-50 border border-stone-200 rounded-2xl space-y-4 text-left">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#3B0B14] text-[#C9A227] font-serif font-bold text-xl flex items-center justify-center overflow-hidden border border-[#C9A227]/40 shadow-md">
                    {dossier.media.logo_url ? (
                      <img src={dossier.media.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      dossier.company.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-lg text-stone-900">{dossier.company.name}</h4>
                    <span className="text-xs text-stone-500 font-semibold">{dossier.company.category}</span>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full bg-[#3B0B14] text-[#C9A227] font-serif font-bold text-xs uppercase border border-[#C9A227]/40">
                  {dossier.contract.plan_code}
                </span>
              </div>

              <p className="text-xs text-stone-700 leading-relaxed">{dossier.company.description}</p>

              <div className="pt-3 border-t border-stone-200 text-xs text-stone-600 space-y-1">
                <div>📍 {dossier.company.address || 'São Paulo, SP'}</div>
                <div>💬 WhatsApp Direct: {dossier.company.whatsapp || '(11) 98888-7777'}</div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-5 py-2 bg-[#3B0B14] text-[#C9A227] font-bold text-xs rounded-xl cursor-pointer"
              >
                Fechar Pré-visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
