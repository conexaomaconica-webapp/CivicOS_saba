'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ClipboardList,
  Plus,
  ExternalLink,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Power,
  X,
  FileQuestion,
  Calendar,
  Layers,
  Settings,
  Image as ImageIcon,
  FileText,
  Upload,
  MessageSquareText,
  BarChart3,
} from 'lucide-react';
import type { Survey } from '@/types/surveys';
import {
  createSurveyAction,
  toggleSurveyStatusAction,
  deleteSurveyAction,
  updateSurveyDetailsAction,
  uploadSurveyBrandAssetAction,
} from '@/app/actions/surveys';
import { optimizeImageForUpload } from '@/lib/media/optimize-image';

interface Props {
  initialSurveys: Survey[];
}

export function AdminSurveysListClient({ initialSurveys }: Props) {
  const router = useRouter();
  const [surveys, setSurveys] = useState<Survey[]>(initialSurveys);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [deletingSurvey, setDeletingSurvey] = useState<Survey | null>(null);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newLogoMode, setNewLogoMode] = useState<'official' | 'custom' | 'none'>('official');
  const [newLogoUrl, setNewLogoUrl] = useState('/logoconexao_red.png');
  const [saving, setSaving] = useState(false);

  // Edit states
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editLogoMode, setEditLogoMode] = useState<'official' | 'custom' | 'none'>('official');
  const [editLogoUrl, setEditLogoUrl] = useState('/logoconexao_red.png');
  const [editLogoSize, setEditLogoSize] = useState<'small' | 'medium' | 'large' | 'full'>('medium');
  const [editLogoPosition, setEditLogoPosition] = useState<'left' | 'center' | 'right'>('center');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Status feedback
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleCreateSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSaving(true);
    const showLogo = newLogoMode !== 'none';
    const logoUrl =
      newLogoMode === 'official'
        ? '/logoconexao_red.png'
        : newLogoMode === 'custom'
        ? (newLogoUrl.trim() || '/logoconexao_red.png')
        : null;

    const res = await createSurveyAction({
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      slug: newSlug.trim() || undefined,
      logo_url: logoUrl || undefined,
      show_logo: showLogo,
    });
    setSaving(false);

    if (res.success && res.data) {
      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
      setNewSlug('');
      setNewLogoMode('official');
      setNewLogoUrl('/logoconexao_red.png');
      showFeedback('success', 'Pesquisa criada com sucesso! Redirecionando para o editor...');
      // Leva direto para o construtor visual de perguntas
      router.push(`/admin/pesquisas/${res.data.id}/editor`);
    } else {
      showFeedback('error', res.error || 'Erro ao criar pesquisa.');
    }
  };

  const handleToggleStatus = async (survey: Survey) => {
    const nextStatus = survey.status === 'published' ? 'draft' : 'published';
    setActionLoadingId(survey.id);
    const res = await toggleSurveyStatusAction(survey.id, nextStatus);
    setActionLoadingId(null);

    if (res.success) {
      setSurveys((prev) =>
        prev.map((s) => (s.id === survey.id ? { ...s, status: nextStatus } : s))
      );
      showFeedback(
        'success',
        `Pesquisa ${nextStatus === 'published' ? 'publicada' : 'inativada / despublicada'} com sucesso!`
      );
    } else {
      showFeedback('error', res.error || 'Erro ao alterar status da pesquisa.');
    }
  };

  const handleOpenEditModal = (survey: Survey) => {
    setEditingSurvey(survey);
    setEditTitle(survey.title);
    setEditDesc(survey.description || '');
    setEditSlug(survey.slug);
    const isCustom = survey.logo_url && survey.logo_url !== '/logoconexao_red.png';
    setEditLogoMode(survey.show_logo === false ? 'none' : isCustom ? 'custom' : 'official');
    setEditLogoUrl(survey.logo_url || '/logoconexao_red.png');
    setEditLogoSize(survey.logo_size || 'medium');
    setEditLogoPosition(survey.logo_position || 'center');
  };

  const handleEditLogoUpload = async (file?: File) => {
    if (!file) return;
    setUploadingLogo(true);
    try {
      const optimized = await optimizeImageForUpload(file, { maxBytes: 4.5 * 1024 * 1024, maxDimension: 1600 });
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Falha ao ler a imagem.'));
        reader.readAsDataURL(optimized);
      });
      const result = await uploadSurveyBrandAssetAction(dataUrl);
      if (!result.success || !result.data) throw new Error(result.error || 'Falha no upload.');
      setEditLogoMode('custom');
      setEditLogoUrl(result.data.url);
      showFeedback('success', 'Logomarca enviada com sucesso.');
    } catch (error) {
      showFeedback('error', error instanceof Error ? error.message : 'Não foi possível enviar a logomarca.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSurvey || !editTitle.trim()) return;

    setSaving(true);
    const showLogo = editLogoMode !== 'none';
    const logoUrl =
      editLogoMode === 'official'
        ? '/logoconexao_red.png'
        : editLogoMode === 'custom'
        ? (editLogoUrl.trim() || '/logoconexao_red.png')
        : null;

    const res = await updateSurveyDetailsAction(editingSurvey.id, {
      title: editTitle.trim(),
      description: editDesc.trim() || undefined,
      slug: editSlug.trim() || undefined,
      logo_url: logoUrl,
      show_logo: showLogo,
      logo_size: editLogoSize,
      logo_position: editLogoPosition,
    });
    setSaving(false);

    if (res.success) {
      setSurveys((prev) =>
        prev.map((s) =>
          s.id === editingSurvey.id
            ? {
                ...s,
                title: editTitle.trim(),
                description: editDesc.trim() || null,
                slug: editSlug.trim(),
                logo_url: logoUrl,
                show_logo: showLogo,
                logo_size: editLogoSize,
                logo_position: editLogoPosition,
              }
            : s
        )
      );
      setEditingSurvey(null);
      showFeedback('success', 'Dados da pesquisa atualizados com sucesso!');
    } else {
      showFeedback('error', res.error || 'Erro ao atualizar pesquisa.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSurvey) return;

    setActionLoadingId(deletingSurvey.id);
    const res = await deleteSurveyAction(deletingSurvey.id);
    setActionLoadingId(null);

    if (res.success) {
      setSurveys((prev) => prev.filter((s) => s.id !== deletingSurvey.id));
      setDeletingSurvey(null);
      showFeedback('success', 'Pesquisa excluída com sucesso.');
    } else {
      showFeedback('error', res.error || 'Erro ao excluir pesquisa.');
    }
  };

  return (
    <div className="asl-container">
      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <div className="asl-header">
        <div>
          <div className="asl-breadcrumb">
            <span className="asl-badge-tag">Engajamento & Feedback</span>
          </div>
          <h1 className="asl-title">Pesquisas & Formulários</h1>
          <p className="asl-subtitle">
            Crie pesquisas de satisfação, diagnósticos fraternos e formulários dinâmicos com ramificação condicional e analytics em tempo real.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="asl-btn-primary"
          id="btn-create-new-survey"
        >
          <Plus size={18} />
          <span>Nova Pesquisa</span>
        </button>
      </div>

      {/* ── FEEDBACK ALERT ──────────────────────────────────────────────── */}
      {feedback && (
        <div className={`asl-alert asl-alert--${feedback.type}`} role="alert">
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* ── LISTAGEM ────────────────────────────────────────────────────── */}
      {surveys.length === 0 ? (
        <div className="asl-empty">
          <div className="asl-empty-icon">
            <FileQuestion size={40} />
          </div>
          <h3>Nenhuma pesquisa criada ainda</h3>
          <p>
            Crie sua primeira pesquisa para coletar feedback de irmãos, empresas e membros da rede.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="asl-btn-primary"
          >
            <Plus size={16} />
            <span>Criar Primeira Pesquisa</span>
          </button>
        </div>
      ) : (
        <div className="asl-grid">
          {surveys.map((survey) => {
            const isPublished = survey.status === 'published';
            const publicUrl = `/pesquisas/${survey.slug}`;

            return (
              <div key={survey.id} className="asl-card">
                <div className="asl-card-header">
                  <div className="asl-card-title-wrap">
                    <span className={`asl-status-badge asl-status-badge--${survey.status}`}>
                      {survey.status === 'published' ? '● Publicada' : survey.status === 'draft' ? '○ Rascunho' : 'Arquivada'}
                    </span>
                    <span className="asl-version-badge">
                      <Layers size={12} /> v{survey.current_version}
                    </span>
                  </div>

                  <div className="asl-card-actions-quick">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(survey)}
                      className="asl-icon-btn"
                      title="Editar Informações Básicas"
                    >
                      <Settings size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingSurvey(survey)}
                      className="asl-icon-btn asl-icon-btn--danger"
                      title="Excluir Pesquisa"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="asl-card-brand-thumb-wrap">
                  {survey.show_logo !== false ? (
                    <img
                      src={survey.logo_url || '/logoconexao_red.png'}
                      alt="Logomarca Conexão Maçônica"
                      className="asl-card-logo-thumb"
                    />
                  ) : (
                    <span className="asl-badge-text-only">Sem Logomarca (Texto)</span>
                  )}
                </div>

                <h3 className="asl-card-title">{survey.title}</h3>
                {survey.description && (
                  <p className="asl-card-desc">{survey.description}</p>
                )}

                <div className="asl-response-kpi">
                  <MessageSquareText size={18} />
                  <div>
                    <strong>{(survey.response_count ?? 0).toLocaleString('pt-BR')}</strong>
                    <span>pesquisa(s) respondida(s)</span>
                  </div>
                </div>

                <div className="asl-card-meta">
                  <div className="asl-meta-item">
                    <Calendar size={13} />
                    <span>
                      {survey.created_at
                        ? new Date(survey.created_at).toLocaleDateString('pt-BR')
                        : 'Recente'}
                    </span>
                  </div>
                  <div className="asl-meta-slug">
                    <code>/{survey.slug}</code>
                  </div>
                </div>

                <div className="asl-card-footer">
                  <Link
                    href={`/admin/pesquisas/${survey.id}/editor`}
                    className="asl-btn-editor"
                  >
                    <Edit3 size={15} />
                    <span>Editar Perguntas</span>
                  </Link>

                  <div className="asl-footer-btns">
                    <Link
                      href={`/admin/pesquisas/${survey.id}/resultados`}
                      className="asl-btn-public"
                      title="Ver resultados e gráficos"
                    >
                      <BarChart3 size={14} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(survey)}
                      disabled={actionLoadingId === survey.id}
                      className={`asl-btn-status ${isPublished ? 'asl-btn-status--active' : ''}`}
                      title={isPublished ? 'Inativar Pesquisa' : 'Publicar Pesquisa'}
                    >
                      {actionLoadingId === survey.id ? (
                        <Loader2 size={14} className="asl-spin" />
                      ) : (
                        <Power size={14} />
                      )}
                      <span>{isPublished ? 'Ativa' : 'Inativa'}</span>
                    </button>

                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="asl-btn-public"
                      title="Abrir página pública da pesquisa"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL CRIAR PESQUISA ────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="asl-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="asl-modal" onClick={(e) => e.stopPropagation()}>
            <div className="asl-modal-header">
              <div className="asl-modal-header-title">
                <ClipboardList size={20} className="asl-icon-gold" />
                <h3>Criar Nova Pesquisa</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="asl-modal-close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSurvey} className="asl-modal-form">
              <div className="asl-field">
                <label htmlFor="create-title">Título da Pesquisa *</label>
                <input
                  id="create-title"
                  type="text"
                  required
                  placeholder="Ex.: Diagnóstico Comercial e Relacionamento 2026"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="asl-input"
                />
              </div>

              <div className="asl-field">
                <label htmlFor="create-desc">Descrição / Instruções</label>
                <textarea
                  id="create-desc"
                  rows={3}
                  placeholder="Explique o objetivo da pesquisa e tempo estimado de resposta..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="asl-textarea"
                />
              </div>

              <div className="asl-field">
                <label htmlFor="create-slug">Slug Personalizado (opcional)</label>
                <input
                  id="create-slug"
                  type="text"
                  placeholder="ex.: diagnostico-comercial-2026"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  className="asl-input"
                />
                <span className="asl-help">Deixe em branco para gerar automaticamente do título.</span>
              </div>

              {/* IDENTIDADE VISUAL & MARCA */}
              <div className="asl-field">
                <label>Identidade Visual & Logomarca</label>
                <div className="asl-logo-mode-grid">
                  <button
                    type="button"
                    className={`asl-logo-mode-card ${newLogoMode === 'official' ? 'active' : ''}`}
                    onClick={() => {
                      setNewLogoMode('official');
                      setNewLogoUrl('/logoconexao_red.png');
                    }}
                  >
                    <div className="asl-lmc-header">
                      <ImageIcon size={15} className="text-[#C9A227]" />
                      <strong>Logo Conexão Maçônica</strong>
                    </div>
                    <span className="asl-lmc-desc">Logomarca oficial com brasão maçônico</span>
                  </button>

                  <button
                    type="button"
                    className={`asl-logo-mode-card ${newLogoMode === 'custom' ? 'active' : ''}`}
                    onClick={() => setNewLogoMode('custom')}
                  >
                    <div className="asl-lmc-header">
                      <ImageIcon size={15} className="text-blue-500" />
                      <strong>Logo Personalizada</strong>
                    </div>
                    <span className="asl-lmc-desc">URL de imagem de Loja ou Patrocinador</span>
                  </button>

                  <button
                    type="button"
                    className={`asl-logo-mode-card ${newLogoMode === 'none' ? 'active' : ''}`}
                    onClick={() => setNewLogoMode('none')}
                  >
                    <div className="asl-lmc-header">
                      <FileText size={15} className="text-gray-500" />
                      <strong>Apenas Nome (Texto)</strong>
                    </div>
                    <span className="asl-lmc-desc">Exibe apenas texto, sem imagem</span>
                  </button>
                </div>

                {newLogoMode === 'custom' && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="URL da imagem da logomarca (https://...)"
                      value={newLogoUrl}
                      onChange={(e) => setNewLogoUrl(e.target.value)}
                      className="asl-input"
                    />
                  </div>
                )}
              </div>

              <div className="asl-modal-actions">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="asl-btn-cancel"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button type="submit" className="asl-btn-submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 size={16} className="asl-spin" />
                      <span>Criando...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>Criar e Abrir Construtor</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL EDITAR DETALHES ────────────────────────────────────────── */}
      {editingSurvey && (
        <div className="asl-modal-overlay" onClick={() => setEditingSurvey(null)}>
          <div className="asl-modal" onClick={(e) => e.stopPropagation()}>
            <div className="asl-modal-header">
              <div className="asl-modal-header-title">
                <Settings size={20} className="asl-icon-gold" />
                <h3>Editar Dados da Pesquisa</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingSurvey(null)}
                className="asl-modal-close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="asl-modal-form">
              <div className="asl-field">
                <label htmlFor="edit-title">Título da Pesquisa *</label>
                <input
                  id="edit-title"
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="asl-input"
                />
              </div>

              <div className="asl-field">
                <label htmlFor="edit-desc">Descrição / Instruções</label>
                <textarea
                  id="edit-desc"
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="asl-textarea"
                />
              </div>

              <div className="asl-field">
                <label htmlFor="edit-slug">Slug da URL</label>
                <input
                  id="edit-slug"
                  type="text"
                  required
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value)}
                  className="asl-input"
                />
              </div>

              {/* IDENTIDADE VISUAL & MARCA */}
              <div className="asl-field">
                <label>Identidade Visual & Logomarca</label>
                <div className="asl-logo-mode-grid">
                  <button
                    type="button"
                    className={`asl-logo-mode-card ${editLogoMode === 'official' ? 'active' : ''}`}
                    onClick={() => {
                      setEditLogoMode('official');
                      setEditLogoUrl('/logoconexao_red.png');
                    }}
                  >
                    <div className="asl-lmc-header">
                      <ImageIcon size={15} className="text-[#C9A227]" />
                      <strong>Logo Conexão Maçônica</strong>
                    </div>
                    <span className="asl-lmc-desc">Logomarca oficial com brasão maçônico</span>
                  </button>

                  <button
                    type="button"
                    className={`asl-logo-mode-card ${editLogoMode === 'custom' ? 'active' : ''}`}
                    onClick={() => setEditLogoMode('custom')}
                  >
                    <div className="asl-lmc-header">
                      <ImageIcon size={15} className="text-blue-500" />
                      <strong>Logo Personalizada</strong>
                    </div>
                    <span className="asl-lmc-desc">URL de imagem de Loja ou Patrocinador</span>
                  </button>

                  <button
                    type="button"
                    className={`asl-logo-mode-card ${editLogoMode === 'none' ? 'active' : ''}`}
                    onClick={() => setEditLogoMode('none')}
                  >
                    <div className="asl-lmc-header">
                      <FileText size={15} className="text-gray-500" />
                      <strong>Apenas Nome (Texto)</strong>
                    </div>
                    <span className="asl-lmc-desc">Exibe apenas texto, sem imagem</span>
                  </button>
                </div>

                {editLogoMode === 'custom' && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="URL da imagem da logomarca (https://...)"
                      value={editLogoUrl}
                      onChange={(e) => setEditLogoUrl(e.target.value)}
                      className="asl-input"
                    />
                    <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:border-[#4B161B]">
                      {uploadingLogo ? <Loader2 size={16} className="asl-spin" /> : <Upload size={16} />}
                      {uploadingLogo ? 'Enviando...' : 'Fazer upload da logomarca'}
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={uploadingLogo} onChange={(event) => void handleEditLogoUpload(event.target.files?.[0])} />
                    </label>
                  </div>
                )}

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="text-xs font-bold text-gray-700">Tamanho
                    <select className="asl-input mt-1" value={editLogoSize} onChange={(event) => setEditLogoSize(event.target.value as typeof editLogoSize)}>
                      <option value="small">Pequeno</option><option value="medium">Médio</option><option value="large">Grande</option><option value="full">Largura máxima</option>
                    </select>
                  </label>
                  <label className="text-xs font-bold text-gray-700">Posição
                    <select className="asl-input mt-1" value={editLogoPosition} onChange={(event) => setEditLogoPosition(event.target.value as typeof editLogoPosition)}>
                      <option value="left">Esquerda</option><option value="center">Centralizada</option><option value="right">Direita</option>
                    </select>
                  </label>
                </div>

                {/* Preview */}
                <div style={{ marginTop: '0.5rem', background: '#4B161B', border: '1px dashed #C9A227', borderRadius: '8px', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: editLogoPosition === 'left' ? 'flex-start' : editLogoPosition === 'right' ? 'flex-end' : 'center', minHeight: '80px' }}>
                  {editLogoMode !== 'none' ? (
                    <img
                      src={editLogoMode === 'official' ? '/logoconexao_red.png' : (editLogoUrl || '/logoconexao_red.png')}
                      alt="Prévia"
                      style={{ maxHeight: editLogoSize === 'small' ? '80px' : editLogoSize === 'medium' ? '130px' : editLogoSize === 'large' ? '210px' : '300px', width: editLogoSize === 'small' ? '180px' : editLogoSize === 'medium' ? '320px' : editLogoSize === 'large' ? '480px' : '100%', maxWidth: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280' }}>Conexão Maçônica (Apenas Texto)</span>
                  )}
                </div>
              </div>

              <div className="asl-modal-actions">
                <button
                  type="button"
                  onClick={() => setEditingSurvey(null)}
                  className="asl-btn-cancel"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button type="submit" className="asl-btn-submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 size={16} className="asl-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar Alterações</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL EXCLUIR CONFIRMAÇÃO ─────────────────────────────────────── */}
      {deletingSurvey && (
        <div className="asl-modal-overlay" onClick={() => setDeletingSurvey(null)}>
          <div className="asl-modal asl-modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="asl-modal-header">
              <div className="asl-modal-header-title">
                <Trash2 size={20} style={{ color: '#DC2626' }} />
                <h3>Excluir Pesquisa</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeletingSurvey(null)}
                className="asl-modal-close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="asl-modal-form">
              <p style={{ fontSize: '0.875rem', color: '#4B5563', lineHeight: 1.5 }}>
                Tem certeza que deseja excluir a pesquisa <strong>&quot;{deletingSurvey.title}&quot;</strong>?
                <br />
                <span style={{ fontSize: '0.8125rem', color: '#DC2626', marginTop: '0.5rem', display: 'block' }}>
                  Esta ação é irreversível e apagará todas as perguntas, opções e respostas já coletadas.
                </span>
              </p>

              <div className="asl-modal-actions">
                <button
                  type="button"
                  onClick={() => setDeletingSurvey(null)}
                  className="asl-btn-cancel"
                  disabled={Boolean(actionLoadingId)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="asl-btn-submit"
                  style={{ background: '#DC2626', borderColor: '#B91C1C', color: '#FFFFFF' }}
                  disabled={Boolean(actionLoadingId)}
                >
                  {actionLoadingId ? (
                    <>
                      <Loader2 size={16} className="asl-spin" />
                      <span>Excluindo...</span>
                    </>
                  ) : (
                    <span>Sim, Excluir Pesquisa</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CSS EMBUTIDO ─────────────────────────────────────────────────── */}
      <style>{`
        .asl-container {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
          font-family: 'Inter', sans-serif;
        }
        .asl-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        .asl-breadcrumb {
          margin-bottom: 0.5rem;
        }
        .asl-badge-tag {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #C9A227;
          background: rgba(201, 162, 39, 0.1);
          padding: 0.25rem 0.625rem;
          border-radius: 6px;
          border: 1px solid rgba(201, 162, 39, 0.2);
        }
        .asl-title {
          font-size: 1.75rem;
          font-weight: 800;
          color: #1C0D10;
          letter-spacing: -0.02em;
          margin: 0 0 0.5rem 0;
        }
        .asl-subtitle {
          font-size: 0.875rem;
          color: #6B7280;
          margin: 0;
          max-width: 700px;
          line-height: 1.5;
        }
        .asl-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: #3B0B14;
          color: #FFFFFF;
          border: 1px solid rgba(201, 162, 39, 0.4);
          padding: 0.625rem 1.25rem;
          border-radius: 10px;
          font-size: 0.875rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
          white-space: nowrap;
        }
        .asl-btn-primary:hover {
          background: #2C080E;
          transform: translateY(-1px);
        }

        .asl-alert {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.875rem 1.25rem;
          border-radius: 10px;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
        }
        .asl-alert--success {
          background: #ECFDF5;
          color: #065F46;
          border: 1px solid #A7F3D0;
        }
        .asl-alert--error {
          background: #FEF2F2;
          color: #991B1B;
          border: 1px solid #FECACA;
        }

        .asl-empty {
          background: #FFFFFF;
          border: 1.5px dashed #D1D5DB;
          border-radius: 16px;
          padding: 4rem 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .asl-empty-icon {
          color: #9CA3AF;
          margin-bottom: 1rem;
        }
        .asl-empty h3 {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1F2937;
          margin: 0 0 0.5rem 0;
        }
        .asl-empty p {
          font-size: 0.875rem;
          color: #6B7280;
          max-width: 440px;
          margin: 0 0 1.5rem 0;
        }

        .asl-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(min(100%, 360px), 1fr));
          gap: 1.5rem;
        }
        .asl-card {
          background: #FFFFFF;
          border: 1.5px solid #E5E7EB;
          border-radius: 14px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .asl-card:hover {
          border-color: #C9A227;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
        }
        .asl-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.875rem;
        }
        .asl-card-title-wrap {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .asl-status-badge {
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.2rem 0.5rem;
          border-radius: 6px;
        }
        .asl-status-badge--published {
          background: #DEF7EC;
          color: #03543F;
        }
        .asl-status-badge--draft {
          background: #F3F4F6;
          color: #4B5563;
        }
        .asl-status-badge--archived {
          background: #FDE8E8;
          color: #9B1C1C;
        }
        .asl-version-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.6875rem;
          font-weight: 600;
          background: #F3F4F6;
          color: #6B7280;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
        }
        .asl-card-actions-quick {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .asl-icon-btn {
          background: transparent;
          border: none;
          color: #6B7280;
          cursor: pointer;
          padding: 0.35rem;
          border-radius: 6px;
          transition: background 0.15s, color 0.15s;
        }
        .asl-icon-btn:hover {
          background: #F3F4F6;
          color: #111827;
        }
        .asl-icon-btn--danger:hover {
          background: #FEE2E2;
          color: #DC2626;
        }
        .asl-card-title {
          font-size: 1.0625rem;
          font-weight: 700;
          color: #111827;
          margin: 0 0 0.5rem 0;
          line-height: 1.35;
        }
        .asl-card-desc {
          font-size: 0.8125rem;
          color: #6B7280;
          margin: 0 0 1rem 0;
          line-height: 1.45;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .asl-response-kpi {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          margin-bottom: 0.875rem;
          padding: 0.75rem;
          border: 1px solid #E5D49B;
          border-radius: 10px;
          background: #FFFBEB;
          color: #713F12;
        }
        .asl-response-kpi strong { display: block; font-size: 1.125rem; line-height: 1; }
        .asl-response-kpi span { display: block; margin-top: 0.2rem; font-size: 0.6875rem; font-weight: 700; }
        .asl-card-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.75rem;
          color: #9CA3AF;
          margin-top: auto;
          padding-top: 0.875rem;
          border-top: 1px solid #F3F4F6;
          margin-bottom: 1rem;
        }
        .asl-meta-item {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .asl-meta-slug code {
          background: #F9FAFB;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          color: #4B5563;
        }
        .asl-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }
        .asl-btn-editor {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          background: #3B0B14;
          color: #C9A227;
          text-decoration: none;
          padding: 0.5rem 0.875rem;
          border-radius: 8px;
          font-size: 0.8125rem;
          font-weight: 700;
          transition: background 0.15s;
        }
        .asl-btn-editor:hover {
          background: #2C080E;
        }
        .asl-footer-btns {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .asl-btn-status {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.5rem 0.625rem;
          border-radius: 8px;
          border: 1px solid #D1D5DB;
          background: #FFFFFF;
          color: #6B7280;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .asl-btn-status--active {
          background: #DEF7EC;
          border-color: #31C48D;
          color: #03543F;
        }
        .asl-btn-public {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem;
          border-radius: 8px;
          border: 1px solid #D1D5DB;
          background: #FFFFFF;
          color: #4B5563;
          text-decoration: none;
          transition: all 0.15s;
        }
        .asl-btn-public:hover {
          border-color: #9CA3AF;
          background: #F9FAFB;
        }

        .asl-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1rem;
          backdrop-filter: blur(3px);
        }
        .asl-modal {
          background: #FFFFFF;
          width: 100%;
          max-width: 580px;
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
          overflow: hidden;
        }
        .asl-modal--sm {
          max-width: 460px;
        }
        .asl-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          background: #FAF8F5;
          border-bottom: 1px solid #E5E0D8;
        }
        .asl-modal-header-title {
          display: flex;
          align-items: center;
          gap: 0.625rem;
        }
        .asl-modal-header-title h3 {
          font-size: 1.0625rem;
          font-weight: 800;
          color: #1C0D10;
          margin: 0;
        }
        .asl-icon-gold {
          color: #C9A227;
        }
        .asl-modal-close {
          background: transparent;
          border: none;
          color: #6B7280;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 6px;
        }
        .asl-modal-close:hover {
          background: #E5E0D8;
          color: #1C0D10;
        }
        .asl-modal-form {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.125rem;
        }
        .asl-field {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .asl-field label {
          font-size: 0.8125rem;
          font-weight: 700;
          color: #374151;
        }
        .asl-input, .asl-textarea {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border: 1.5px solid #D1D5DB;
          border-radius: 8px;
          font-size: 0.875rem;
          color: #111827;
          background: #FFFFFF;
          font-family: inherit;
        }
        .asl-input:focus, .asl-textarea:focus {
          outline: none;
          border-color: #3B0B14;
          box-shadow: 0 0 0 3px rgba(59, 11, 20, 0.1);
        }
        .asl-help {
          font-size: 0.75rem;
          color: #6B7280;
        }
        .asl-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 0.5rem;
          padding-top: 1rem;
          border-top: 1px solid #F3F4F6;
        }
        .asl-btn-cancel {
          padding: 0.625rem 1.25rem;
          background: #F3F4F6;
          color: #4B5563;
          border: 1px solid #D1D5DB;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
        }
        .asl-btn-cancel:hover {
          background: #E5E7EB;
        }
        .asl-btn-submit {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          background: #3B0B14;
          color: #FFFFFF;
          border: 1px solid rgba(201, 162, 39, 0.4);
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 700;
          cursor: pointer;
        }
        .asl-btn-submit:hover {
          background: #2C080E;
        }
        .asl-spin {
          animation: spin 1s linear infinite;
        }

        /* Branding & Logo Thumb in Card & Modal */
        .asl-card-brand-thumb-wrap {
          margin-bottom: 0.75rem;
          min-height: 28px;
          display: flex;
          align-items: center;
        }
        .asl-card-logo-thumb {
          height: 28px;
          max-width: 130px;
          object-fit: contain;
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.06));
        }
        .asl-badge-text-only {
          font-size: 0.6875rem;
          font-weight: 700;
          color: #9CA3AF;
          background: #F3F4F6;
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
        }
        .asl-logo-mode-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.625rem;
          margin-top: 0.25rem;
        }
        .asl-logo-mode-card {
          border: 1.5px solid #E5E0D8;
          border-radius: 8px;
          padding: 0.625rem 0.5rem;
          background: #FFFFFF;
          cursor: pointer;
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          transition: all 0.15s;
        }
        .asl-logo-mode-card:hover {
          border-color: #3B0B14;
          background: #FFFDF9;
        }
        .asl-logo-mode-card.active {
          border-color: #3B0B14;
          background: #FAF8F5;
          box-shadow: 0 0 0 2px rgba(59,11,20,0.12);
        }
        .asl-lmc-header {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: #111827;
        }
        .asl-lmc-desc {
          font-size: 0.6875rem;
          color: #6B7280;
          line-height: 1.2;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Mobile: cartões e cabeçalhos quebram linha; grades de 3 colunas viram 1 */
        @media (max-width: 640px) {
          .asl-card { padding: 1.125rem; }
          .asl-card-header { flex-wrap: wrap; gap: 0.5rem; }
          .asl-card-footer { flex-wrap: wrap; gap: 0.5rem; }
          .asl-header { flex-wrap: wrap; gap: 0.75rem; }
          .asl-logo-mode-grid { grid-template-columns: 1fr !important; }
          .asl-grid { gap: 1rem; }
        }
      `}</style>
    </div>
  );
}
