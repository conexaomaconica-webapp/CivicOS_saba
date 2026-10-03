'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Award,
  ShieldCheck,
  Upload,
  Save,
  Loader2,
  Eye,
  Sparkles,
  Crown,
} from 'lucide-react';
import {
  InstitutionalRecognitionDTO,
  updateInstitutionalRecognitionAction,
  uploadRecognitionSealAction,
  getPedraFundamentalQuotaAction,
  updatePedraFundamentalQuotaAction,
} from '@/app/actions/institutional-recognitions';
import { optimizeImageForUpload } from '@/lib/media/optimize-image';
import { InstitutionalBadges } from '@/components/public/business/shared/InstitutionalBadges';

const DEFAULT_CATALOG: InstitutionalRecognitionDTO[] = [
  {
    id: 'rec_pedra_fundamental',
    key: 'pedra_fundamental',
    title: 'Pedra Fundamental',
    description: 'Condecoração histórica destinada às empresas fundadoras da Conexão Maçônica.',
    tooltip: 'Condecoração de fundador, independente do plano comercial.',
    seal_url: '/selos/pedra-fundamental.svg',
    compact_seal_url: '/selos/pedra-fundamental-compact.svg',
    sealUrl: '/selos/pedra-fundamental.svg',
    compactSealUrl: '/selos/pedra-fundamental-compact.svg',
    header_display: 'badge',
    card_display: 'circular_seal',
    priority_order: 1,
    is_active: true,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'rec_selo_ouro',
    key: 'selo_ouro',
    title: 'Selo Acácia',
    description: 'Reconhecimento e presença comercial de máxima distinção para empresas do Plano Acácia.',
    tooltip: 'Concedido a todos os anunciantes ativos no Plano Acácia.',
    seal_url: '/selos/plano-ouro.svg',
    compact_seal_url: '/selos/plano-ouro-compact.svg',
    sealUrl: '/selos/plano-ouro.svg',
    compactSealUrl: '/selos/plano-ouro-compact.svg',
    header_display: 'badge',
    priority_order: 2,
    is_active: true,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'rec_selo_prata', key: 'selo_prata', title: 'Selo Compasso',
    description: 'Identificação comercial das empresas ativas no Plano Compasso.', tooltip: 'Exibido para anunciantes ativos no Plano Compasso.',
    seal_url: '/selos/plano-prata.svg', compact_seal_url: '/selos/plano-prata.svg', sealUrl: '/selos/plano-prata.svg', compactSealUrl: '/selos/plano-prata.svg',
    header_display: 'badge',
    priority_order: 3, is_active: true, updated_at: new Date().toISOString(),
  },
  {
    id: 'rec_selo_bronze', key: 'selo_bronze', title: 'Selo Esquadro',
    description: 'Identificação comercial das empresas ativas no Plano Esquadro.', tooltip: 'Exibido para anunciantes ativos no Plano Esquadro.',
    seal_url: '/selos/plano-bronze.svg', compact_seal_url: '/selos/plano-bronze.svg', sealUrl: '/selos/plano-bronze.svg', compactSealUrl: '/selos/plano-bronze.svg',
    header_display: 'badge',
    priority_order: 4,
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

  // Cota Dinâmica da Pedra Fundamental (Ajustável pelo Admin: ex. 30, 50, etc.)
  const [pedraQuota, setPedraQuota] = useState<number>(50);
  const [pedraAllocated, setPedraAllocated] = useState<number>(0);
  const [savingQuota, setSavingQuota] = useState(false);

  useEffect(() => {
    getPedraFundamentalQuotaAction().then((res) => {
      if (res && res.quota) {
        setPedraQuota(res.quota);
        setPedraAllocated(res.allocated);
      }
    });
  }, []);

  const handleSavePedraQuota = async () => {
    setSavingQuota(true);
    setMessage(null);
    try {
      const res = await updatePedraFundamentalQuotaAction(pedraQuota);
      if (res.success && res.quota) {
        setPedraQuota(res.quota);
        setMessage({
          type: 'success',
          text: `Cota máxima de Pedra Fundamental ajustada com sucesso para ${res.quota} empresas!`,
        });
      } else {
        throw new Error(res.error || 'Erro ao salvar cota.');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao salvar cota.' });
    } finally {
      setSavingQuota(false);
    }
  };

  const mainFileInputRef = useRef<HTMLInputElement>(null);
  const horizontalFileInputRef = useRef<HTMLInputElement>(null);

  const activeRecognition = recognitions.find((r) => r.key === selectedKey) || recognitions[0]!;

  const handleFieldChange = (field: keyof InstitutionalRecognitionDTO, value: any) => {
    setRecognitions((prev) =>
      prev.map((r) => (r.key === selectedKey ? { ...r, [field]: value } : r))
    );
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'seal_url' | 'compact_seal_url',
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingField(field);
    setMessage(null);

    try {
      const optimizedFile = await optimizeImageForUpload(file, { maxBytes: 1.8 * 1024 * 1024, maxDimension: 1800 });
      const formData = new FormData();
      formData.append('file', optimizedFile);
      formData.append('sealType', `${selectedKey}-${field === 'compact_seal_url' ? 'horizontal' : 'seal'}`);

      const res = await uploadRecognitionSealAction(formData);
      if (!res.success || !res.url) {
        throw new Error(res.error || 'Falha no upload do arquivo.');
      }

      const newUrl = res.url;
      const updatedRecognition = {
        ...activeRecognition,
        [field]: newUrl,
        ...(field === 'seal_url' ? { sealUrl: newUrl } : { compactSealUrl: newUrl }),
      };

      // Atualizar estado React local
      setRecognitions((prev) =>
        prev.map((r) =>
          r.key === selectedKey
            ? { ...r, [field]: newUrl, ...(field === 'seal_url' ? { sealUrl: newUrl } : { compactSealUrl: newUrl }) }
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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {recognitions
          .filter((r) => r.key === 'pedra_fundamental' || r.key === 'selo_ouro' || r.key === 'selo_prata' || r.key === 'selo_bronze')
          .map((r) => {
            const isSelected = r.key === selectedKey;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => setSelectedKey(r.key)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${isSelected
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
            className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${message.type === 'success'
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

        {/* Bloco de Ajuste de Cota Máxima da Pedra Fundamental */}
        {selectedKey === 'pedra_fundamental' && (
          <div className="rounded-xl border border-amber-900/30 bg-gradient-to-br from-[#faf6ed] to-[#f4ebe1] p-4.5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-900/15 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#3B0B14] text-[#C9A227]">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-xs font-bold text-[#3B0B14] uppercase tracking-wider">
                    Cota Máxima de Empresas (Limite de Vagas)
                  </h3>
                  <p className="text-[11px] text-amber-950/80">
                    Ajuste o teto de anunciantes pioneiros que podem receber o selo histórico.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto bg-white/80 border border-amber-900/20 px-3 py-1 rounded-lg text-xs">
                <span className="font-semibold text-stone-700">
                  <strong className="text-[#3B0B14]">{pedraAllocated}</strong> de {pedraQuota} vagas preenchidas
                </span>
                <span className="text-amber-800 font-bold">({Math.max(0, pedraQuota - pedraAllocated)} restantes)</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="flex items-center gap-2">
                <label htmlFor="pedra-quota-input" className="text-xs font-bold text-stone-800">
                  Limite Total:
                </label>
                <input
                  id="pedra-quota-input"
                  type="number"
                  min={1}
                  max={1000}
                  value={pedraQuota}
                  onChange={(e) => setPedraQuota(Math.max(1, Number(e.target.value) || 1))}
                  className="w-20 px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-bold text-stone-900 text-center focus:border-[#3B0B14] focus:outline-none"
                />
                <span className="text-xs text-stone-600 font-medium">empresas</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-stone-500 mr-1">Atalhos:</span>
                {[10, 30, 50, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPedraQuota(preset)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      pedraQuota === preset
                        ? 'bg-[#3B0B14] text-[#C9A227] border-[#3B0B14] shadow-xs'
                        : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    {preset} vagas
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={savingQuota}
                onClick={handleSavePedraQuota}
                className="px-4 py-1.5 bg-[#3B0B14] hover:bg-[#4B161B] text-[#C9A227] text-xs font-extrabold rounded-lg shadow-xs transition-colors ml-auto flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
              >
                {savingQuota ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Salvar Cota</span>
              </button>
            </div>
          </div>
        )}

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

          <fieldset className="md:col-span-2 space-y-3">
            <legend className="block text-xs font-bold text-stone-700">Exibição & Escala no cabeçalho da empresa:</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className={`p-3 border rounded-xl cursor-pointer ${activeRecognition.header_display === 'badge' ? 'border-[#4B161B] bg-[#4B161B]/5' : 'border-stone-300'}`}>
                <input
                  type="radio"
                  name="header_display"
                  value="badge"
                  checked={activeRecognition.header_display === 'badge'}
                  onChange={() => handleFieldChange('header_display', 'badge')}
                  className="mr-2 accent-[#4B161B]"
                />
                <span className="text-xs font-bold text-stone-900">Badge com nome</span>
                <span className="block ml-5 mt-1 text-[11px] text-stone-500">Exibe somente o nome em formato compacto.</span>
              </label>
              <label className={`p-3 border rounded-xl cursor-pointer ${activeRecognition.header_display === 'horizontal_seal' ? 'border-[#4B161B] bg-[#4B161B]/5' : 'border-stone-300'}`}>
                <input
                  type="radio"
                  name="header_display"
                  value="horizontal_seal"
                  checked={activeRecognition.header_display === 'horizontal_seal'}
                  onChange={() => handleFieldChange('header_display', 'horizontal_seal')}
                  className="mr-2 accent-[#4B161B]"
                />
                <span className="text-xs font-bold text-stone-900">Selo horizontal</span>
                <span className="block ml-5 mt-1 text-[11px] text-stone-500">Usa a arte horizontal enviada abaixo.</span>
              </label>
            </div>

            {/* CONTROLE DE ESCALA DO SELO NO CABEÇALHO */}
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-2 mt-2">
              <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                <label htmlFor="header_scale_slider">Ajuste de Escala do Selo no Cabeçalho:</label>
                <span className="px-2 py-0.5 bg-[#3B0B14] text-[#C9A227] font-mono text-xs rounded-md">
                  {activeRecognition.header_scale ?? 100}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  id="header_scale_slider"
                  type="range"
                  min={60}
                  max={180}
                  step={5}
                  value={activeRecognition.header_scale ?? 100}
                  onChange={(e) => handleFieldChange('header_scale', Number(e.target.value))}
                  className="w-full accent-[#3B0B14] cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-stone-500">
                <span>60% (Compacto)</span>
                <div className="flex gap-1.5">
                  {[80, 100, 120, 150].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleFieldChange('header_scale', preset)}
                      className={`px-2 py-0.5 rounded border text-[10px] font-mono cursor-pointer ${
                        (activeRecognition.header_scale ?? 100) === preset
                          ? 'bg-[#3B0B14] text-[#C9A227] border-[#C9A227]'
                          : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                      }`}
                    >
                      {preset}%
                    </button>
                  ))}
                </div>
                <span>180% (Destaque)</span>
              </div>
            </div>
          </fieldset>

          {/* FORMATO DE EXIBIÇÃO NO CARD DA EMPRESA (GRID E LISTA DO GUIA) */}
          <fieldset className="md:col-span-2 space-y-3 pt-3 border-t border-stone-200">
            <div className="flex items-center justify-between">
              <legend className="block text-xs font-bold text-stone-800">
                Formato de Exibição no Card da Empresa (Guia Comercial — Grid e Lista):
              </legend>
              <span className="text-[11px] font-mono text-stone-500">
                Define a apresentação no card quando a empresa for Pedra Fundamental
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Opção 1: Selo Normal (Circular) */}
              <label
                className={`p-3.5 border rounded-2xl cursor-pointer transition-all ${
                  (activeRecognition.card_display || 'circular_seal') === 'circular_seal'
                    ? 'border-[#3B0B14] bg-[#3B0B14]/5 ring-2 ring-[#3B0B14]/20 shadow-xs'
                    : 'border-stone-300 hover:border-stone-400 bg-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="card_display"
                    value="circular_seal"
                    checked={(activeRecognition.card_display || 'circular_seal') === 'circular_seal'}
                    onChange={() => handleFieldChange('card_display', 'circular_seal')}
                    className="accent-[#3B0B14]"
                  />
                  <span className="text-xs font-bold text-stone-900">Selo Normal (Circular)</span>
                </div>
                <p className="ml-5 mt-1.5 text-[11px] text-stone-600 leading-snug">
                  Medalha redonda oficial de Pedra Fundamental em tamanho nobre com animação de zoom e relevo dinâmico no hover.
                </p>
                <div className="mt-3 ml-5 flex items-center justify-center h-14 bg-stone-100/80 rounded-xl p-1">
                  <div className="w-10 h-10 rounded-full border-2 border-amber-400 bg-[#1C1917] flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                    <Crown className="w-5 h-5 text-amber-400" />
                  </div>
                </div>
              </label>

              {/* Opção 2: Selo Horizontal */}
              <label
                className={`p-3.5 border rounded-2xl cursor-pointer transition-all ${
                  activeRecognition.card_display === 'horizontal_seal'
                    ? 'border-[#3B0B14] bg-[#3B0B14]/5 ring-2 ring-[#3B0B14]/20 shadow-xs'
                    : 'border-stone-300 hover:border-stone-400 bg-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="card_display"
                    value="horizontal_seal"
                    checked={activeRecognition.card_display === 'horizontal_seal'}
                    onChange={() => handleFieldChange('card_display', 'horizontal_seal')}
                    className="accent-[#3B0B14]"
                  />
                  <span className="text-xs font-bold text-stone-900">Selo Horizontal</span>
                </div>
                <p className="ml-5 mt-1.5 text-[11px] text-stone-600 leading-snug">
                  Faixa/selo horizontal oficial com borda dourada, brasão e inscrição estilizada da condecoração.
                </p>
                <div className="mt-3 ml-5 flex items-center justify-center h-14 bg-stone-100/80 rounded-xl p-1">
                  <div className="h-6 px-3 rounded-full border border-amber-400 bg-[#1C1917] flex items-center gap-1.5 shadow-xs">
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span className="text-[9px] font-bold tracking-wider text-amber-400 uppercase">PEDRA FUNDAMENTAL</span>
                  </div>
                </div>
              </label>

              {/* Opção 3: Badge em Formato de Texto */}
              <label
                className={`p-3.5 border rounded-2xl cursor-pointer transition-all ${
                  activeRecognition.card_display === 'badge_text'
                    ? 'border-[#3B0B14] bg-[#3B0B14]/5 ring-2 ring-[#3B0B14]/20 shadow-xs'
                    : 'border-stone-300 hover:border-stone-400 bg-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="card_display"
                    value="badge_text"
                    checked={activeRecognition.card_display === 'badge_text'}
                    onChange={() => handleFieldChange('card_display', 'badge_text')}
                    className="accent-[#3B0B14]"
                  />
                  <span className="text-xs font-bold text-stone-900">Badge em Formato de Texto</span>
                </div>
                <p className="ml-5 mt-1.5 text-[11px] text-stone-600 leading-snug">
                  Pílula clássica com fundo dourado suave, ícone de coroa dourada e texto "Pedra Fundamental".
                </p>
                <div className="mt-3 ml-5 flex items-center justify-center h-14 bg-stone-100/80 rounded-xl p-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-amber-400 bg-amber-100 text-amber-950 font-bold text-[10px] shadow-2xs">
                    <Crown className="w-3 h-3 text-amber-800" />
                    Pedra Fundamental
                  </span>
                </div>
              </label>
            </div>
          </fieldset>
        </div>

        {/* REGRAS DE ASSETS E UPLOAD (Sem exibição de links de texto) */}
        <div className="pt-4 border-t border-stone-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-sm text-stone-900 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-[#4B161B]" /> Assets Gráficos & Pré-visualização em Fundos Claro/Bordô
            </h3>
            <span className="text-[11px] font-mono text-stone-500">SVG, PNG, JPEG ou WebP · otimização automática</span>
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
                        selo_ouro: '/selos/plano-ouro.svg',
                        selo_prata: '/selos/plano-prata.svg',
                        selo_bronze: '/selos/plano-bronze.svg',
                      };
                      const defaultUrl = defaults[selectedKey] || '/selos/pedra-fundamental.svg';
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
                  accept="image/svg+xml,image/png,image/jpeg,image/webp,.svg,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={(event) => handleFileUpload(event, 'seal_url')}
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

            <div className="p-5 bg-stone-50 border border-stone-200 rounded-2xl space-y-4 shadow-xs mt-4">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-800">Selo horizontal do cabeçalho:</label>
                  <span className="text-[11px] text-stone-500">Recomendado: arte larga, com fundo transparente.</span>
                </div>
                <button
                  type="button"
                  onClick={() => horizontalFileInputRef.current?.click()}
                  disabled={uploadingField === 'compact_seal_url'}
                  className="px-3 py-1.5 bg-[#3B0B14] hover:bg-[#4B161B] text-[#C9A227] font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
                >
                  {uploadingField === 'compact_seal_url' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span>Enviar selo horizontal</span>
                </button>
                <input
                  ref={horizontalFileInputRef}
                  type="file"
                  accept="image/svg+xml,image/png,image/jpeg,image/webp,.svg,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={(event) => handleFileUpload(event, 'compact_seal_url')}
                />
              </div>
              <div className="h-20 p-3 bg-[#3B0B14] border border-[#C9A227]/40 rounded-xl flex items-center justify-center">
                <img
                  key={activeRecognition.compact_seal_url}
                  src={activeRecognition.compact_seal_url}
                  alt={`Versão horizontal de ${activeRecognition.title}`}
                  className="max-h-14 max-w-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>

        {/* PREVIEW DO SELO EM TEMPO REAL */}
        <div className="pt-4 border-t border-stone-200 space-y-3">
          <h3 className="font-serif font-bold text-sm text-stone-900 flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-[#4B161B]" /> Pré-visualização do Selo no Cabeçalho (Tempo Real)
          </h3>

          <div className="p-6 bg-stone-900 rounded-2xl space-y-4">
            <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block">
              Simulação de Exibição no Cabeçalho do Perfil Público com Escala ({activeRecognition.header_scale ?? 100}%):
            </span>

            <InstitutionalBadges
              recognition={{
                pedraFundamental: true,
                colunaDeHonra: false,
                founder: true,
                goldPlanBadge: true,
                verified: false,
              }}
              catalog={recognitions}
              variant="compact"
            />
          </div>
        </div>

        {/* BARRA DE BOTÕES DE PRE-VISUALIZAÇÃO E GRAVAÇÃO */}
        <div className="pt-4 border-t border-stone-200 space-y-4">
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2">
            <span className="text-xs font-bold text-stone-800 block">
              Pré-visualização por Plano (Visual Lab & Matriz Simuladora):
            </span>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/reconhecimentos/preview"
                className="px-3 py-1.5 bg-[#3B0B14] text-[#C9A227] border border-[#C9A227]/60 hover:bg-[#4B161B] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Simulador Completo (Matriz Todos os Planos)</span>
              </Link>
              <Link
                href="/visual-lab/bronze"
                target="_blank"
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
              >
                <span>Selo Esquadro</span>
              </Link>
              <Link
                href="/visual-lab/prata"
                target="_blank"
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
              >
                <span>Selo Compasso</span>
              </Link>
              <Link
                href="/visual-lab/ouro"
                target="_blank"
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
              >
                <span>Selo Acácia</span>
              </Link>
              <Link
                href="/visual-lab/pedra-fundamental"
                target="_blank"
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
              >
                <span>Pedra Fundamental</span>
              </Link>
            </div>
          </div>

          <div className="flex justify-end items-center">
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
        </div>
      </form>
    </div>
  );
}
