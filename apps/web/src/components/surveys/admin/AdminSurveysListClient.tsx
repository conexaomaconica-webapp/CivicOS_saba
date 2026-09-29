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
} from 'lucide-react';
import type { Survey } from '@/types/surveys';
import {
  createSurveyAction,
  toggleSurveyStatusAction,
  deleteSurveyAction,
  updateSurveyDetailsAction,
} from '@/app/actions/surveys';

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
  const [saving, setSaving] = useState(false);

  // Edit states
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSlug, setEditSlug] = useState('');

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
    const res = await createSurveyAction({
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      slug: newSlug.trim() || undefined,
    });
    setSaving(false);

    if (res.success && res.data) {
      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
      setNewSlug('');
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
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSurvey || !editTitle.trim()) return;

    setSaving(true);
    const res = await updateSurveyDetailsAction(editingSurvey.id, {
      title: editTitle.trim(),
      description: editDesc.trim() || undefined,
      slug: editSlug.trim() || undefined,
    });
    setSaving(false);

    if (res.success) {
      setSurveys((prev) =>
        prev.map((s) =>
          s.id === editingSurvey.id
            ? { ...s, title: editTitle.trim(), description: editDesc.trim() || null, slug: editSlug.trim() }
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

                <h3 className="asl-card-title">{survey.title}</h3>
                {survey.description && (
                  <p className="asl-card-desc">{survey.description}</p>
                )}

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
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
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
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
