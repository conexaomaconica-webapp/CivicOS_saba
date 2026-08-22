'use client';

import React, { useState } from 'react';
import { ShieldCheck, FileText, AlertCircle, X, CheckCircle2 } from 'lucide-react';

export interface MasonicLinkAuthorizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmAuthorization: (authorizationData: {
    authorizationTermAccepted: boolean;
    representationScope: string;
    termHash: string;
  }) => void;
  companyName: string;
  applicantName: string;
  businessRole: 'legal_representative' | 'authorized_representative' | string;
}

export function MasonicLinkAuthorizationModal({
  isOpen,
  onClose,
  onConfirmAuthorization,
  companyName,
  applicantName,
  businessRole,
}: MasonicLinkAuthorizationModalProps) {
  const [accepted, setAccepted] = useState(false);
  const [scope, setScope] = useState('Anúncio, atualização de perfil comercial e gestão de benefícios no Guia Conexão Maçônica.');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const roleLabel =
    businessRole === 'legal_representative'
      ? 'Representante Legal / Diretor Executivo'
      : 'Procurador / Representante Autorizado';

  const handleConfirm = () => {
    if (!accepted) {
      setErrorMsg('Você precisa declarar e aceitar o Termo de Autorização Empresarial para prosseguir.');
      return;
    }
    setErrorMsg(null);

    // Hash SHA-256 simulado do termo de autorização
    const termContent = `AUTORIZACAO_EMPRESARIAL:${companyName}:${applicantName}:${businessRole}:${scope}:${new Date().toISOString()}`;
    const termHash = btoa(termContent).slice(0, 32);

    onConfirmAuthorization({
      authorizationTermAccepted: true,
      representationScope: scope,
      termHash,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-stone-900 text-stone-100 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#4A0E1A] p-5 text-white flex items-center justify-between border-b border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-xl border border-amber-500/30">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-white">Autorização Empresarial (ADV-007b)</h3>
              <p className="text-xs text-amber-200/80">Termo de Legitimidade e Escopo de Representação</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-amber-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="bg-stone-800/80 border border-stone-700/60 rounded-xl p-4 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-stone-400">Empresa Anunciada:</span>
              <span className="font-bold text-amber-300">{companyName || 'Empresa em cadastro'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Solicitante:</span>
              <span className="font-bold text-stone-200">{applicantName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Papel Declarado:</span>
              <span className="font-bold text-amber-400">{roleLabel}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-amber-400" /> Escopo da Autorização
            </label>
            <textarea
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              rows={3}
              className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-xs text-stone-200 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="p-4 bg-amber-950/40 border border-amber-800/40 rounded-xl space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-stone-700 text-amber-600 focus:ring-amber-500 bg-stone-900"
              />
              <span className="text-xs text-stone-300 leading-relaxed">
                Declaro ter plenos poderes para representar e vincular a empresa <strong>{companyName || 'acima'}</strong> no Guia Conexão Maçônica, assumindo a responsabilidade pela veracidade das informações fornecidas sob as penas da lei.
              </span>
            </label>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-stone-700 text-stone-300 hover:bg-stone-800 text-xs font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-500 transition-colors flex items-center gap-2 shadow-lg shadow-amber-950/50"
          >
            <CheckCircle2 className="w-4 h-4" /> Confirmar Autorização
          </button>
        </div>
      </div>
    </div>
  );
}
