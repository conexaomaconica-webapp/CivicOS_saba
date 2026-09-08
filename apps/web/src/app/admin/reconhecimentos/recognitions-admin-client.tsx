'use client';

import React, { useState, useRef } from 'react';
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
  uploadRecognitionSealAction,
} from '@/app/actions/institutional-recognitions';
import { InstitutionalBadges } from '@/components/public/business/shared/InstitutionalBadges';

const DEFAULT_CATALOG: InstitutionalRecognitionDTO[] = [
  {
    id: 'rec_pedra_fundamental',
    key: 'pedra_fundamental',
    title: 'Selo Pedra Fundamental (10/10)',
    description: 'Reconhecimento histórico/institucional permanente dos 10 primeiros apoiadores da rede Conexão Maçônica.',
    tooltip: 'Concedido exclusivamente aos 10 primeiros apoiadores históricos da plataforma.',
    seal_url: '/selos/pedra-fundamental.svg',
    compact_seal_url: '/selos/pedra-fundamental-compact.svg',
    sealUrl: '/selos/pedra-fundamental.svg',
    compactSealUrl: '/selos/pedra-fundamental-compact.svg',
    priority_order: 1,
    is_active: true,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'rec_coluna_de_honra',
    key: 'coluna_de_honra',
    title: 'Coluna de Honra (Empresa Fundadora)',
    description: 'Membro fundador e destaque de mérito e contribuição exemplar na fraternidade.',
    tooltip: 'Reconhecimento institucional aos membros fundadores da comunidade.',
    seal_url: '/selos/coluna-honra.svg',
    compact_seal_url: '/selos/coluna-honra-compact.svg',
    sealUrl: '/selos/coluna-honra.svg',
    compactSealUrl: '/selos/coluna-honra-compact.svg',
    priority_order: 2,
    is_active: true,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'rec_selo_ouro',
    key: 'selo_ouro',
    title: 'Selo Anunciante Ouro',
    description: 'Reconhecimento e presença comercial de máxima distinção para empresas do Plano Ouro.',
    tooltip: 'Concedido a todos os anunciantes ativos no Plano Ouro.',
    seal_url: '/selos/plano-ouro.svg',
    compact_seal_url: '/selos/plano-ouro-compact.svg',
    sealUrl: '/selos/plano-ouro.svg',
    compactSealUrl: '/selos/plano-ouro-compact.svg',
    priority_order: 3,
    is_active: true,
    updated_at: new Date().toISOString(),
  },
];

export function RecognitionsAdminClient({
  initialRecognitions,
}: {
  initialRecognitions: InstitutionalRecognitionDTO[];
}) {
  const [recognitions, setRecognitions] = useState<InstitutionalRecognitionDTO[]>(() => {
    const list = [...initialRecognitions];
    DEFAULT_CATALOG.forEach((def) => {
      if (!list.some((r) => r.key === def.key)) {
        list.push(def);
      }
    });
    return list;
  });
  const [selectedKey, setSelectedKey] = useState<string>('pedra_fundamental');
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<'seal_url' | 'compact_seal_url' | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const mainFileInputRef = useRef<HTMLInputElement>(null);

  const activeRecognition = recognitions.find((r) => r.key === selectedKey) || recognitions[0]!;

  const handleFieldChange = (field: keyof InstitutionalRecognitionDTO, value: any) => {
    setRecognitions((prev) =>
      prev.map((r) => (r.key === selectedKey ? { ...r, [field]: value } : r))
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingField('seal_url');
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sealType', `${selectedKey}-seal`);

      const res = await uploadRecognitionSealAction(formData);
      if (!res.success || !res.url) {
        throw new Error(res.error || 'Falha no upload do arquivo.');
      }

      const newUrl = res.url;
      const updatedRecognition = {
        ...activeRecognition,
        seal_url: newUrl,
        compact_seal_url: newUrl,
        sealUrl: newUrl,
        compactSealUrl: newUrl,
      };

      // Atualizar estado React local
      setRecognitions((prev) =>
        prev.map((r) =>
          r.key === selectedKey
            ? { ...r, seal_url: newUrl, compact_seal_url: newUrl, sealUrl: newUrl, compactSealUrl: newUrl }
            : r
        )
      );

      // Auto-salvar no banco de dados imediatamente para garantir persistência ao trocar de aba
      const saveRes = await updateInstitutionalRecognitionAction(updatedRecognition);
      if (saveRes.success && saveRes.data) {
        setRecognitions((current) =>
          current.map((item) => (item.key === saveRes.data!.key ? saveRes.data! : item))
        );
        setMessage({
          type: 'success',
          text: `Arquivo de imagem enviado e salvo no banco de dados com sucesso!`,
        });
      } else {
        setMessage({
          type: 'success',
          text: `Imagem enviada! Clique em "Salvar Apresentação" para confirmar a gravação.`,
        });
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Erro ao realizar upload da imagem do selo.',
      });
    } finally {
      setUploadingField(null);
      e.target.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await updateInstitutionalRecognitionAction(activeRecognition);
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Falha ao salvar o reconhecimento no banco de dados.');
      }

      // Atualizar o array de estado com o registro retornado do servidor
      const savedRecord = res.data;
      setRecognitions((current) =>
        current.map((item) => (item.key === savedRecord.key ? savedRecord : item))
      );

      setMessage({
        type: 'success',
        text: `Catálogo visual do ${savedRecord.title} salvo com sucesso no banco de dados!`,
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao salvar alteração no servidor.' });
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
          Esta página administra <strong>exclusivamente a apresentação visual, textos e upload de imagens dos selos institucionais</strong>. A concessão e revogação dos selos a empresas específicas continuam sendo feitas de forma auditada no <strong>Dossiê de Aprovação</strong> e na <strong>Visão 360 da Empresa</strong>.
        </p>
      </div>

      {/* SELETOR DE RECONHECIMENTO (Selos Institucionais & Selo Anunciante Ouro) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {recognitions
          .filter((r) => r.key === 'pedra_fundamental' || r.key === 'coluna_de_honra' || r.key === 'selo_ouro')
          .map((r) => {
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
              Edite nomes, descrições públicas, tooltips, ordem de exibição e faça upload dos selos gráficos em SVG/PNG.
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

        {/* REGRAS DE ASSETS E UPLOAD (Sem exibição de links de texto) */}
        <div className="pt-4 border-t border-stone-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-sm text-stone-900 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-[#4B161B]" /> Assets Gráficos & Pré-visualização em Fundos Claro/Bordô
            </h3>
            <span className="text-[11px] font-mono text-stone-500">Formatos aceitos: SVG, PNG, WebP (Max 2 MB)</span>
          </div>

          <div className="max-w-2xl">
            {/* Upload e Preview Único da Imagem do Selo */}
            <div className="p-5 bg-stone-50 border border-stone-200 rounded-2xl space-y-4 shadow-xs">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-stone-800">Imagem Gráfica do Selo (Oficial):</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => mainFileInputRef.current?.click()}
                    disabled={uploadingField === 'seal_url'}
                    className="px-3 py-1.5 bg-[#3B0B14] hover:bg-[#4B161B] text-[#C9A227] font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {uploadingField === 'seal_url' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" />
                    ) : (
                      <Upload className="w-4 h-4 text-[#C9A227]" />
                    )}
                    <span>Substituir Imagem do Selo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const defaults: Record<string, string> = {
                        pedra_fundamental: '/selos/pedra-fundamental.svg',
                        coluna_de_honra: '/selos/coluna-honra.svg',
                        selo_ouro: '/selos/plano-ouro.svg',
                      };
                      const defaultUrl = defaults[selectedKey] || '/selos/coluna-honra.svg';
                      handleFieldChange('seal_url', defaultUrl);
                      handleFieldChange('compact_seal_url', defaultUrl);
                    }}
                    className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Restaurar Padrão
                  </button>
                </div>
                <input
                  ref={mainFileInputRef}
                  type="file"
                  accept="image/svg+xml,image/png,image/webp,.svg,.png,.webp"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              {/* Preview em Duplo Fundo (Claro e Bordô) */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-4 bg-stone-100 border border-stone-300 rounded-xl text-center space-y-1.5">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Fundo Claro</span>
                  <div className="h-16 flex items-center justify-center">
                    <img
                      key={activeRecognition.seal_url}
                      src={activeRecognition.seal_url}
                      alt={activeRecognition.title}
                      className="max-h-14 max-w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>

                <div className="p-4 bg-[#3B0B14] border border-[#C9A227]/40 rounded-xl text-center space-y-1.5">
                  <span className="text-[10px] font-bold text-[#C9A227] uppercase tracking-wider block">Fundo Bordô</span>
                  <div className="h-16 flex items-center justify-center">
                    <img
                      key={activeRecognition.seal_url}
                      src={activeRecognition.seal_url}
                      alt={activeRecognition.title}
                      className="max-h-14 max-w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PREVIEW DO SELO EM TEMPO REAL */}
        <div className="pt-4 border-t border-stone-200 space-y-3">
          <h3 className="font-serif font-bold text-sm text-stone-900 flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-[#4B161B]" /> Pré-visualização em Tempo Real (Catálogo & Logo Oficial)
          </h3>

          <div className="p-6 bg-stone-900 rounded-2xl space-y-4">
            <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block">
              Simulação de Exibição no Cabeçalho do Perfil Público:
            </span>

            <InstitutionalBadges
              recognition={{
                pedraFundamental: true,
                colunaDeHonra: true,
                founder: true,
                goldPlanBadge: true,
                verified: false,
              }}
              catalog={recognitions}
              variant="compact"
            />
          </div>
        </div>

        {/* BOTÃO DE GRAVAÇÃO */}
        <div className="pt-4 border-t border-stone-200 flex justify-between items-center">
          <Link
            href="/visual-lab/pedra-fundamental"
            target="_blank"
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl border border-stone-300 transition-all flex items-center gap-2"
          >
            <Eye className="w-4 h-4 text-stone-600" />
            <span>Ver Visual Lab dos Selos Institucionais (Nova Aba)</span>
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
