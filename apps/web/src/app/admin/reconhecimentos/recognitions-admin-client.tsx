'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Award,
  ShieldCheck,
  Upload,
  Save,
  Loader2,
  Eye,
} from 'lucide-react';
import {
  InstitutionalRecognitionDTO,
  updateInstitutionalRecognitionAction,
} from '@/app/actions/institutional-recognitions';
import { RecognitionPresentation } from '@/components/public/business/RecognitionPresentation';

export function RecognitionsAdminClient({
  initialRecognitions,
}: {
  initialRecognitions: InstitutionalRecognitionDTO[];
}) {
  const [recognitions, setRecognitions] = useState<InstitutionalRecognitionDTO[]>(initialRecognitions);
  const [selectedKey, setSelectedKey] = useState<string>('pedra_fundamental');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const activeRecognition = recognitions.find((r) => r.key === selectedKey) || recognitions[0]!;

  const handleFieldChange = (field: keyof InstitutionalRecognitionDTO, value: any) => {
    setRecognitions((prev) =>
      prev.map((r) => (r.key === selectedKey ? { ...r, [field]: value } : r))
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await updateInstitutionalRecognitionAction(activeRecognition);
      if (!res.success) throw new Error(res.error);

      setMessage({
        type: 'success',
        text: `Catálogo visual do ${activeRecognition.title} atualizado com sucesso!`,
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao salvar alteração.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* HEADER DE ORIENTAÇÃO CONCEITUAL */}
      <div className="p-4 bg-[#3B0B14] border border-[#C9A227]/40 rounded-2xl text-white space-y-2 shadow-md">
        <div className="flex items-center gap-2 font-serif font-bold text-sm text-[#C9A227]">
          <Award className="w-5 h-5 text-[#C9A227]" />
          <span>Administração dos Assets & Apresentação dos Selos Institucionais</span>
        </div>
        <p className="text-xs text-stone-300 leading-relaxed max-w-4xl">
          Esta página administra <strong>exclusivamente a apresentação visual, textos e imagens dos selos institucionais</strong>. A concessão e revogação dos selos a empresas específicas continuam sendo feitas de forma auditada no <strong>Dossiê de Aprovação</strong> e na <strong>Visão 360 da Empresa</strong>.
        </p>
      </div>

      {/* SELETOR DE RECONHECIMENTO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {recognitions.map((r) => {
          const isSelected = r.key === selectedKey;
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => setSelectedKey(r.key)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#3B0B14] text-white border-[#C9A227] shadow-xl ring-2 ring-[#C9A227]/40'
                  : 'bg-white text-stone-900 border-stone-300 hover:border-stone-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-[#C9A227]' : 'text-stone-500'}`}>
                  Prioridade #{r.priority_order}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.is_active ? 'bg-emerald-100 text-emerald-900' : 'bg-stone-200 text-stone-600'}`}>
                  {r.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <h3 className="font-serif font-bold text-base mt-2">{r.title}</h3>
              <p className={`text-xs mt-1 line-clamp-2 ${isSelected ? 'text-stone-300' : 'text-stone-600'}`}>
                {r.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* FORMULÁRIO DE CONFIGURAÇÃO DE ASSETS */}
      <form onSubmit={handleSave} className="bg-white border border-stone-300 rounded-2xl p-6 shadow-sm space-y-6">
        {message && (
          <div
            className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : 'bg-red-100 text-red-900 border border-red-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{message.text}</span>
          </div>
        )}

        <div className="flex justify-between items-center border-b border-stone-200 pb-3">
          <div>
            <h2 className="font-serif font-bold text-lg text-stone-900">
              Configuração Visual: {activeRecognition.title}
            </h2>
            <p className="text-xs text-stone-500">
              Edite nomes, descrições públicas, tooltips, ordem de exibição e URLs dos selos gráficos.
            </p>
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer">
            <input
              type="checkbox"
              checked={activeRecognition.is_active}
              onChange={(e) => handleFieldChange('is_active', e.target.checked)}
              className="accent-[#C9A227]"
            />
            <span>Selo Ativo no Sistema</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-stone-700">Nome Público do Selo:</label>
            <input
              type="text"
              value={activeRecognition.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:border-[#4B161B]"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-stone-700">Ordem de Prioridade (1 = Mais Alta):</label>
            <input
              type="number"
              min={1}
              max={10}
              value={activeRecognition.priority_order}
              onChange={(e) => handleFieldChange('priority_order', Number(e.target.value))}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:border-[#4B161B]"
            />
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="block text-xs font-bold text-stone-700">Descrição Pública do Reconhecimento:</label>
            <textarea
              rows={2}
              value={activeRecognition.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:border-[#4B161B]"
              required
            />
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="block text-xs font-bold text-stone-700">Texto Auxiliar / Tooltip Explicativo:</label>
            <input
              type="text"
              value={activeRecognition.tooltip || ''}
              onChange={(e) => handleFieldChange('tooltip', e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:border-[#4B161B]"
            />
          </div>
        </div>

        {/* REGRAS DE ASSETS E UPLOAD */}
        <div className="pt-4 border-t border-stone-200 space-y-3">
          <h3 className="font-serif font-bold text-sm text-stone-900 flex items-center gap-1.5">
            <Upload className="w-4 h-4 text-[#4B161B]" /> Assets Gráficos & Versão Compacta (Storage Bucket)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-stone-700">Selo Principal (URL SVG/PNG):</label>
              <input
                type="text"
                value={activeRecognition.seal_url}
                onChange={(e) => handleFieldChange('seal_url', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 font-mono outline-none"
              />
              <p className="text-[11px] text-stone-500">Exibido nos banners principais e dossiê institucional.</p>
            </div>

            <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-stone-700">Versão Compacta (URL SVG/PNG):</label>
              <input
                type="text"
                value={activeRecognition.compact_seal_url}
                onChange={(e) => handleFieldChange('compact_seal_url', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 font-mono outline-none"
              />
              <p className="text-[11px] text-stone-500">Exibido nos cards curtos do diretório e listagens mobile (390px).</p>
            </div>
          </div>
        </div>

        {/* PREVIEW DO SELO EM TEMPO REAL */}
        <div className="pt-4 border-t border-stone-200 space-y-3">
          <h3 className="font-serif font-bold text-sm text-stone-900 flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-[#4B161B]" /> Pré-visualização em Tempo Real da Camada Única
          </h3>

          <div className="p-6 bg-stone-900 rounded-2xl space-y-4">
            <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block">
              Simulação no perfil público (Composição Independente sobre o Template):
            </span>

            <RecognitionPresentation
              isPedraFundamental={activeRecognition.key === 'pedra_fundamental'}
              isFounder={activeRecognition.key === 'empresa_fundadora'}
              isColunaDeHonra={activeRecognition.key === 'coluna_de_honra'}
              isVerified={activeRecognition.key === 'empresa_verificada'}
              variant="full"
            />
          </div>
        </div>

        {/* BOTÃO DE GRAVAÇÃO */}
        <div className="pt-4 border-t border-stone-200 flex justify-between items-center">
          <Link
            href="/admin/reconhecimentos/preview"
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl border border-stone-300 transition-all flex items-center gap-2"
          >
            <Eye className="w-4 h-4 text-stone-600" />
            <span>Matriz de Preview de Combinações (Bronze, Prata, Ouro)</span>
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-[#3B0B14] hover:bg-[#4B161B] text-[#C9A227] font-bold text-xs rounded-xl border border-[#C9A227]/60 shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" />
                <span>Gravando Catálogo Visual...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-[#C9A227]" />
                <span>Salvar Apresentação do {activeRecognition.title}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
