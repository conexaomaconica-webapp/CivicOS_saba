'use client';

import React, { useState, useTransition } from 'react';
import { CheckCircle2, MessageCircle, Sparkles, Loader2, X, AlertCircle } from 'lucide-react';
import { DEFAULT_SUPPORT_WHATSAPP } from '@/lib/directory/support-contact';
import { approveBusinessByClientAction } from '@/lib/admin/admin-businesses-service';

interface BusinessPreviewApprovalBarProps {
  businessId: string;
  businessName: string;
  publicationStatus?: string | null;
  isClientApproved?: boolean;
  clientApprovedAt?: string | null;
  clientApprovedBy?: string | null;
  supportWhatsapp?: string;
}

export function BusinessPreviewApprovalBar({
  businessId,
  businessName,
  publicationStatus,
  isClientApproved: initialApproved = false,
  clientApprovedAt,
  clientApprovedBy,
  supportWhatsapp = DEFAULT_SUPPORT_WHATSAPP,
}: BusinessPreviewApprovalBarProps) {
  const [isApproved, setIsApproved] = useState(initialApproved);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [approverName, setApproverName] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleConfirmApproval = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await approveBusinessByClientAction({
        businessId,
        approverName: approverName.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        setIsApproved(true);
        setShowConfirmModal(false);
      } else {
        setErrorMessage(res.error || 'Não foi possível registrar a aprovação. Tente novamente.');
      }
    });
  };

  const handleOpenWhatsAppAdjustments = () => {
    const waNumber = (supportWhatsapp || DEFAULT_SUPPORT_WHATSAPP).replace(/\D/g, '');
    const text = encodeURIComponent(
      `Olá! Sou da equipe de "${businessName}" e estou revisando a prévia do nosso anúncio no Guia Conexão Maçônica. Gostaria de solicitar alguns ajustes antes da publicação oficial.`
    );
    window.open(`https://wa.me/${waNumber}?text=${text}`, '_blank');
  };

  return (
    <>
      <aside
        role="status"
        aria-label="Modo de Pré-visualização para Aprovação"
        className={`sticky top-0 z-[100] w-full border-b-2 px-4 py-2.5 shadow-xl backdrop-blur-md transition-colors ${
          isApproved
            ? 'bg-emerald-950/95 text-emerald-100 border-emerald-500/80'
            : 'bg-[#2B0B14]/95 text-amber-100 border-[#C9A227]'
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          
          {/* Lado Esquerdo: Identificação do Modo */}
          <div className="flex flex-wrap items-center gap-2.5 text-center md:text-left">
            <span
              className={`px-2.5 py-0.5 rounded-md font-black uppercase tracking-wider text-[10px] shadow-xs ${
                isApproved
                  ? 'bg-emerald-500 text-stone-950'
                  : 'bg-[#C9A227] text-[#2B0B14]'
              }`}
            >
              {isApproved ? '✓ Anúncio Aprovado' : 'Modo Pré-visualização'}
            </span>

            <span className="font-semibold text-stone-200">
              {isApproved ? (
                <span>
                  Este anúncio foi aprovado para publicação oficial no Conexão Maçônica.
                </span>
              ) : (
                <span>
                  Revise os dados, fotos e serviços da sua empresa antes da publicação definitiva no Guia.
                </span>
              )}
            </span>
          </div>

          {/* Lado Direito: Ações de Aprovação ou Status */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-center">
            {isApproved ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  {clientApprovedBy ? `Aprovado por ${clientApprovedBy}!` : 'Aprovação confirmada!'} Publicação em processo.
                </span>
                {clientApprovedAt && (
                  <span className="text-[10px] text-emerald-400/80 font-mono hidden sm:inline">
                    ({new Date(clientApprovedAt).toLocaleDateString('pt-BR')})
                  </span>
                )}
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleOpenWhatsAppAdjustments}
                  className="px-3 py-1.5 rounded-xl bg-stone-900/60 hover:bg-stone-900 text-amber-200 border border-[#C9A227]/40 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Solicitar alterações via WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Solicitar Ajustes</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/40 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                  <span>Aprovar Página para Publicação</span>
                </button>
              </>
            )}

            <span className="px-2.5 py-0.5 rounded-full bg-black/40 border border-white/10 text-stone-300 text-[11px] font-mono hidden lg:inline-block">
              {publicationStatus === 'published' ? 'Publicada' : 'Rascunho'}
            </span>
          </div>
        </div>
      </aside>

      {/* Modal de Confirmação de Aprovação */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-stone-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="approval-modal-title"
            className="w-full max-w-lg rounded-3xl border-2 border-[#C9A227] bg-[#1a0509] p-6 text-stone-100 shadow-2xl text-left space-y-5"
          >
            <div className="flex items-start justify-between border-b border-[#C9A227]/30 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#C9A227]/20 border border-[#C9A227]/40 rounded-2xl text-[#C9A227]">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 id="approval-modal-title" className="font-serif text-lg font-bold text-white">
                    Confirmar Aprovação do Anúncio
                  </h3>
                  <p className="text-xs text-amber-200/80">
                    {businessName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Fechar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed">
              Ao confirmar a aprovação, você atesta que revisou os dados cadastrais, apresentação, serviços e imagens da empresa. A equipe administrativa receberá a notificação imediata para a publicação definitiva no portal.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-amber-200 mb-1">
                  Seu Nome / Responsável pela Aprovação (Opcional)
                </label>
                <input
                  type="text"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  placeholder="Ex.: João da Silva (Proprietário)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-700 bg-stone-900/90 text-white outline-none focus:border-[#C9A227] focus:ring-1 focus:ring-[#C9A227]"
                />
              </div>

              <div>
                <label className="block font-bold text-amber-200 mb-1">
                  Observações ou Comentários (Opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex.: Tudo revisado e de acordo para publicação imediata."
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-700 bg-stone-900/90 text-white outline-none focus:border-[#C9A227] focus:ring-1 focus:ring-[#C9A227]"
                />
              </div>

              {errorMessage && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isPending}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmApproval}
                disabled={isPending}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs transition-all flex items-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Registrando Aprovação...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Confirmar Aprovação Oficial</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
