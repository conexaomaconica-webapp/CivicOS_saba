'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Eye,
  Send,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Trash2,
  Smartphone,
  Monitor,
  X,
  Loader2,
} from 'lucide-react';
import type { Survey, SurveyQuestion, QuestionType } from '@/types/surveys';
import {
  toggleQuestionActiveAction,
  publishSurveyVersionAction,
  saveSurveyQuestionAction,
  saveSurveyBlockAction,
} from '@/app/actions/surveys';

interface Props {
  initialSurvey: Survey;
}

export function SurveyEditorClient({ initialSurvey }: Props) {
  const router = useRouter();
  const [survey, setSurvey] = useState<Survey>(initialSurvey);

  // Preview Drawer State
  const [showPreview, setShowPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('mobile');

  // Question Drawer State
  const [editingQuestion, setEditingQuestion] = useState<Partial<SurveyQuestion> | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string>('');
  const [questionOptions, setQuestionOptions] = useState<Array<{ id?: string; label: string; value: string }>>([]);

  // Block Modal State
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [newBlockTitle, setNewBlockTitle] = useState('');
  const [newBlockDesc, setNewBlockDesc] = useState('');

  // Status & Notifications
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [publishing, setPublishing] = useState(false);

  // Toggle active/inactive per question
  const handleToggleQuestionActive = async (blockId: string, questionId: string, currentActive: boolean) => {
    const nextActive = !currentActive;
    setSaving(true);
    setMessage(null);

    const res = await toggleQuestionActiveAction(survey.id, questionId, nextActive);
    setSaving(false);

    if (res.success) {
      // Update local state
      setSurvey((prev) => ({
        ...prev,
        blocks: prev.blocks?.map((block) => {
          if (block.id !== blockId) return block;
          return {
            ...block,
            questions: block.questions?.map((q) => (q.id === questionId ? { ...q, is_active: nextActive } : q)),
          };
        }),
      }));
      setMessage({ type: 'success', text: `Pergunta ${nextActive ? 'ativada' : 'ocultada'} no rascunho com sucesso.` });
    } else {
      setMessage({ type: 'warning', text: res.warningMessage || res.error || 'Erro ao alterar visibilidade da pergunta.' });
    }
  };

  // Open Question Drawer for Create/Edit
  const handleOpenQuestionDrawer = (blockId: string, question?: SurveyQuestion) => {
    setSelectedBlockId(blockId);
    if (question) {
      setEditingQuestion({ ...question });
      setQuestionOptions(question.options ? question.options.map((o) => ({ id: o.id, label: o.label, value: o.value })) : []);
    } else {
      setEditingQuestion({
        block_id: blockId,
        question_text: '',
        help_text: '',
        question_type: 'short_text',
        is_required: false,
        is_active: true,
        allow_other: false,
      });
      setQuestionOptions([
        { label: 'Opção 1', value: 'opcao_1' },
        { label: 'Opção 2', value: 'opcao_2' },
      ]);
    }
  };

  // Save Question in Drawer
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion || !editingQuestion.question_text?.trim() || !selectedBlockId) return;

    setSaving(true);
    setMessage(null);

    const res = await saveSurveyQuestionAction(survey.id, {
      id: editingQuestion.id,
      block_id: selectedBlockId,
      question_text: editingQuestion.question_text.trim(),
      help_text: editingQuestion.help_text?.trim() || '',
      question_type: editingQuestion.question_type || 'short_text',
      is_required: editingQuestion.is_required ?? false,
      is_active: editingQuestion.is_active ?? true,
      allow_other: editingQuestion.allow_other ?? false,
      conditional_rules: editingQuestion.conditional_rules || null,
      options: questionOptions,
    });

    setSaving(false);

    if (res.success) {
      setEditingQuestion(null);
      setMessage({ type: 'success', text: 'Pergunta salva no rascunho com sucesso!' });
      router.refresh();
    } else {
      setMessage({ type: 'error', text: res.error || 'Erro ao salvar pergunta.' });
    }
  };

  // Add Block
  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockTitle.trim()) return;

    setSaving(true);
    const res = await saveSurveyBlockAction(survey.id, {
      title: newBlockTitle.trim(),
      description: newBlockDesc.trim() || undefined,
    });
    setSaving(false);

    if (res.success) {
      setShowAddBlock(false);
      setNewBlockTitle('');
      setNewBlockDesc('');
      setMessage({ type: 'success', text: 'Novo bloco criado com sucesso!' });
      router.refresh();
    } else {
      setMessage({ type: 'error', text: res.error || 'Erro ao criar bloco.' });
    }
  };

  // Publish New Version Snapshot
  const handlePublishVersion = async () => {
    if (!confirm('Deseja publicar uma nova versão com todas as alterações do rascunho? A nova versão ficará disponível imediatamente para o público.')) return;

    setPublishing(true);
    setMessage(null);

    const res = await publishSurveyVersionAction(survey.id);
    setPublishing(false);

    if (res.success) {
      setMessage({ type: 'success', text: `Versão v${res.versionNumber} publicada com sucesso!` });
      router.refresh();
    } else {
      setMessage({ type: 'error', text: res.error || 'Erro ao publicar nova versão.' });
    }
  };

  return (
    <div className="se-container">
      {/* Top Header */}
      <div className="se-header">
        <div className="se-header-info">
          <div className="se-breadcrumb">
            <Link href="/admin/pesquisas" className="se-link">Pesquisas</Link>
            <span>/</span>
            <span className="se-slug">/pesquisa/{survey.slug}</span>
          </div>
          <h1 className="se-title">{survey.title}</h1>
          <p className="se-subtitle">{survey.description || 'Editor visual de formulário dinâmico'}</p>
        </div>

        <div className="se-header-actions">
          <div className="se-version-badge">
            <span className="se-version-dot"></span>
            Versão no Ar: <strong>v{survey.current_version}</strong>
          </div>

          <button
            type="button"
            className="se-btn-preview"
            onClick={() => setShowPreview(true)}
          >
            <Eye size={16} />
            Pré-visualizar
          </button>

          <button
            type="button"
            className="se-btn-publish"
            onClick={handlePublishVersion}
            disabled={publishing}
          >
            {publishing ? <Loader2 size={16} className="se-spin" /> : <Send size={16} />}
            Publicar Alterações
          </button>
        </div>
      </div>

      {/* Notifications Banner */}
      {message && (
        <div className={`se-alert se-alert-${message.type}`} role="alert">
          {message.type === 'success' && <CheckCircle2 size={18} />}
          {message.type === 'warning' && <AlertTriangle size={18} />}
          {message.type === 'error' && <AlertTriangle size={18} />}
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} className="se-alert-close"><X size={14} /></button>
        </div>
      )}

      {/* Main Canvas - List of Blocks & Questions */}
      <div className="se-canvas">
        <div className="se-canvas-header">
          <h2>Estrutura de Blocos & Perguntas (Rascunho)</h2>
          <button
            type="button"
            className="se-btn-add-block"
            onClick={() => setShowAddBlock(true)}
          >
            <Plus size={16} />
            Adicionar Novo Bloco
          </button>
        </div>

        <div className="se-blocks-list">
          {survey.blocks?.map((block, blockIdx) => (
            <div key={block.id} className={`se-block-card ${!block.is_active ? 'se-block-inactive' : ''}`}>
              <div className="se-block-header">
                <div className="se-block-title-box">
                  <span className="se-block-badge">Bloco {blockIdx + 1}</span>
                  <h3>{block.title}</h3>
                  {block.description && <p className="se-block-desc">{block.description}</p>}
                </div>
                <div className="se-block-actions">
                  <button
                    type="button"
                    className="se-btn-add-question"
                    onClick={() => handleOpenQuestionDrawer(block.id)}
                  >
                    <Plus size={14} />
                    Adicionar Pergunta
                  </button>
                </div>
              </div>

              {/* Questions inside Block */}
              <div className="se-questions-list">
                {block.questions?.length === 0 ? (
                  <div className="se-questions-empty">
                    <p>Nenhuma pergunta neste bloco. Clique em + Adicionar Pergunta.</p>
                  </div>
                ) : (
                  block.questions?.map((q, qIdx) => (
                    <div
                      key={q.id}
                      className={`se-question-item ${!q.is_active ? 'se-question-hidden' : ''}`}
                    >
                      <div className="se-q-left">
                        <div className="se-q-drag-handle">::</div>
                        <div className="se-q-info">
                          <div className="se-q-header">
                            <span className="se-q-num">Q{qIdx + 1}</span>
                            <span className="se-q-text">{q.question_text}</span>
                            {q.is_required && <span className="se-badge-req">Obrigatória</span>}
                            {!q.is_active && <span className="se-badge-hidden">Oculta no Rascunho</span>}
                          </div>
                          {q.help_text && <p className="se-q-help">{q.help_text}</p>}
                          <div className="se-q-meta">
                            <span className="se-meta-type">Tipo: {q.question_type}</span>
                            {q.options && q.options.length > 0 && (
                              <span className="se-meta-options">{q.options.length} alternativas</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="se-q-actions">
                        {/* Toggle Active / Inactive Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleQuestionActive(block.id, q.id, q.is_active)}
                          className={`se-btn-toggle ${q.is_active ? 'se-btn-active' : 'se-btn-inactive'}`}
                          title={q.is_active ? 'Ocultar pergunta' : 'Reativar pergunta'}
                        >
                          {q.is_active ? (
                            <>
                              <Eye size={14} />
                              Ativa
                            </>
                          ) : (
                            <>
                              <EyeOff size={14} />
                              Oculta
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          className="se-btn-edit-q"
                          onClick={() => handleOpenQuestionDrawer(block.id, q)}
                          title="Editar pergunta"
                        >
                          <Edit3 size={15} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Drawer - Edit/Create Question */}
      {editingQuestion && (
        <div className="se-drawer-overlay" onClick={() => setEditingQuestion(null)}>
          <div className="se-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="se-drawer-header">
              <h3>{editingQuestion.id ? 'Editar Pergunta' : 'Nova Pergunta'}</h3>
              <button type="button" onClick={() => setEditingQuestion(null)} className="se-close-btn">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="se-drawer-form">
              <div className="se-field">
                <label className="se-label">Texto da Pergunta *</label>
                <input
                  type="text"
                  className="se-input"
                  value={editingQuestion.question_text || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question_text: e.target.value })}
                  placeholder="Ex: Qual o seu grau maçônico atual?"
                  required
                />
              </div>

              <div className="se-field">
                <label className="se-label">Descrição / Texto de Ajuda</label>
                <input
                  type="text"
                  className="se-input"
                  value={editingQuestion.help_text || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, help_text: e.target.value })}
                  placeholder="Ex: Instrução de preenchimento para o participante"
                />
              </div>

              <div className="se-grid-2">
                <div className="se-field">
                  <label className="se-label">Tipo de Resposta</label>
                  <select
                    className="se-select"
                    value={editingQuestion.question_type || 'short_text'}
                    onChange={(e) =>
                      setEditingQuestion({ ...editingQuestion, question_type: e.target.value as QuestionType })
                    }
                  >
                    <option value="short_text">Texto Curto</option>
                    <option value="long_text">Texto Longo (Parágrafo)</option>
                    <option value="single_choice">Seleção Única (Radio)</option>
                    <option value="multiple_choice">Múltipla Escolha (Checkbox)</option>
                    <option value="dropdown">Lista Suspensa (Select)</option>
                    <option value="rating">Escala de Avaliação (1-10)</option>
                    <option value="boolean">Sim / Não</option>
                    <option value="date">Data</option>
                  </select>
                </div>

                <div className="se-field">
                  <label className="se-label">Visibilidade</label>
                  <div className="se-toggle-group">
                    <label className="se-checkbox-label">
                      <input
                        type="checkbox"
                        checked={editingQuestion.is_required ?? false}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, is_required: e.target.checked })}
                      />
                      <span>Obrigatória</span>
                    </label>
                    <label className="se-checkbox-label">
                      <input
                        type="checkbox"
                        checked={editingQuestion.is_active ?? true}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, is_active: e.target.checked })}
                      />
                      <span>Ativa no Rascunho</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Alternatives Options if choice type */}
              {['single_choice', 'multiple_choice', 'dropdown'].includes(editingQuestion.question_type || '') && (
                <div className="se-options-section">
                  <label className="se-label">Alternativas de Resposta</label>
                  {questionOptions.map((opt, idx) => (
                    <div key={idx} className="se-option-row">
                      <input
                        type="text"
                        className="se-input"
                        value={opt.label}
                        onChange={(e) => {
                          const updated = [...questionOptions];
                          if (updated[idx]) {
                            updated[idx].label = e.target.value;
                          }
                          setQuestionOptions(updated);
                        }}
                        placeholder={`Opção ${idx + 1}`}
                      />
                      <button
                        type="button"
                        className="se-btn-del-opt"
                        onClick={() => setQuestionOptions(questionOptions.filter((_, i) => i !== idx))}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="se-btn-add-opt"
                    onClick={() =>
                      setQuestionOptions([...questionOptions, { label: `Nova Opção ${questionOptions.length + 1}`, value: `opcao_${questionOptions.length + 1}` }])
                    }
                  >
                    + Adicionar Alternativa
                  </button>
                </div>
              )}

              <div className="se-drawer-actions">
                <button type="button" onClick={() => setEditingQuestion(null)} className="se-btn-cancel">
                  Cancelar
                </button>
                <button type="submit" className="se-btn-save" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar Pergunta no Rascunho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Block */}
      {showAddBlock && (
        <div className="se-modal-overlay" onClick={() => setShowAddBlock(false)}>
          <div className="se-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Adicionar Novo Bloco de Perguntas</h3>
            <form onSubmit={handleCreateBlock} className="se-modal-form">
              <div className="se-field">
                <label className="se-label">Título do Bloco *</label>
                <input
                  type="text"
                  className="se-input"
                  value={newBlockTitle}
                  onChange={(e) => setNewBlockTitle(e.target.value)}
                  placeholder="Ex: BLOCO D — Expectativa de Eventos"
                  required
                />
              </div>
              <div className="se-field">
                <label className="se-label">Descrição (Opcional)</label>
                <input
                  type="text"
                  className="se-input"
                  value={newBlockDesc}
                  onChange={(e) => setNewBlockDesc(e.target.value)}
                  placeholder="Instruções gerais sobre as perguntas deste bloco"
                />
              </div>
              <div className="se-modal-actions">
                <button type="button" onClick={() => setShowAddBlock(false)} className="se-btn-cancel">
                  Cancelar
                </button>
                <button type="submit" className="se-btn-save" disabled={saving}>
                  Criar Bloco
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Preview Desktop & Mobile */}
      {showPreview && (
        <div className="se-preview-overlay" onClick={() => setShowPreview(false)}>
          <div className="se-preview-box" onClick={(e) => e.stopPropagation()}>
            <div className="se-preview-header">
              <div className="se-preview-device-toggle">
                <button
                  type="button"
                  className={`se-device-btn ${previewDevice === 'mobile' ? 'active' : ''}`}
                  onClick={() => setPreviewDevice('mobile')}
                >
                  <Smartphone size={16} />
                  Mobile
                </button>
                <button
                  type="button"
                  className={`se-device-btn ${previewDevice === 'desktop' ? 'active' : ''}`}
                  onClick={() => setPreviewDevice('desktop')}
                >
                  <Monitor size={16} />
                  Desktop
                </button>
              </div>
              <button type="button" onClick={() => setShowPreview(false)} className="se-close-btn">
                <X size={20} />
              </button>
            </div>

            <div className={`se-preview-content ${previewDevice}`}>
              <div className="se-preview-frame">
                <div className="se-p-header">
                  <span className="se-p-badge">Conexão Maçônica</span>
                  <h2>{survey.title}</h2>
                  <p>{survey.description}</p>
                </div>

                <div className="se-p-body">
                  {survey.blocks
                    ?.filter((b) => b.is_active)
                    .map((block) => (
                      <div key={block.id} className="se-p-block">
                        <h4>{block.title}</h4>
                        {block.questions
                          ?.filter((q) => q.is_active)
                          .map((q) => (
                            <div key={q.id} className="se-p-question">
                              <label>
                                {q.question_text} {q.is_required && <span style={{ color: '#DC2626' }}>*</span>}
                              </label>
                              {q.help_text && <small>{q.help_text}</small>}
                              {q.question_type === 'short_text' && (
                                <input type="text" disabled placeholder="Sua resposta..." />
                              )}
                              {q.question_type === 'long_text' && (
                                <textarea disabled placeholder="Sua resposta..." rows={2} />
                              )}
                              {(q.question_type === 'single_choice' || q.question_type === 'dropdown') && (
                                <div className="se-p-options">
                                  {q.options?.map((opt) => (
                                    <div key={opt.id} className="se-p-opt">
                                      <input type="radio" disabled name={q.id} />
                                      <span>{opt.label}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {q.question_type === 'multiple_choice' && (
                                <div className="se-p-options">
                                  {q.options?.map((opt) => (
                                    <div key={opt.id} className="se-p-opt">
                                      <input type="checkbox" disabled />
                                      <span>{opt.label}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {q.question_type === 'rating' && (
                                <div className="se-p-rating">
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                                    <span key={n} className="se-p-star">{n}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .se-container { max-width: 1100px; margin: 0 auto; padding-bottom: 5rem; }
        .se-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          padding-bottom: 1.5rem; border-bottom: 1px solid #E5E0D8; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;
        }
        .se-breadcrumb { display: flex; gap: 0.5rem; font-size: 0.8125rem; color: #6B5E62; align-items: center; margin-bottom: 0.25rem; }
        .se-link { color: #3B0B14; font-weight: 600; text-decoration: none; }
        .se-title { font-size: 1.75rem; font-weight: 800; color: #1C0D10; margin: 0; }
        .se-subtitle { font-size: 0.875rem; color: #6B5E62; margin-top: 0.25rem; }
        .se-header-actions { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
        .se-version-badge {
          display: flex; align-items: center; gap: 0.375rem; background: #FAF8F5;
          padding: 0.5rem 0.875rem; border: 1px solid #E5E0D8; border-radius: 8px; font-size: 0.8125rem; color: #374151;
        }
        .se-version-dot { width: 8px; height: 8px; background: #10B981; border-radius: 50%; display: inline-block; }
        .se-btn-preview {
          display: flex; align-items: center; gap: 0.375rem; padding: 0.5rem 1rem;
          background: #FFFFFF; color: #374151; border: 1.5px solid #D1D5DB; border-radius: 8px;
          font-weight: 700; font-size: 0.875rem; cursor: pointer;
        }
        .se-btn-preview:hover { background: #F3F4F6; }
        .se-btn-publish {
          display: flex; align-items: center; gap: 0.375rem; padding: 0.5rem 1.125rem;
          background: #3B0B14; color: #C9A227; border: 1px solid rgba(201,162,39,0.4); border-radius: 8px;
          font-weight: 700; font-size: 0.875rem; cursor: pointer;
        }
        .se-btn-publish:hover { background: #2A080E; }
        
        .se-alert { display: flex; align-items: center; gap: 0.75rem; padding: 0.875rem 1.25rem; border-radius: 10px; font-size: 0.875rem; font-weight: 600; margin-bottom: 1.5rem; justify-content: space-between; }
        .se-alert-success { background: #ECFDF5; color: #065F46; border: 1px solid #6EE7B7; }
        .se-alert-warning { background: #FEF3C7; color: #92400E; border: 1px solid #FCD34D; }
        .se-alert-error { background: #FEF2F2; color: #991B1B; border: 1px solid #FCA5A5; }
        .se-alert-close { background: transparent; border: none; cursor: pointer; color: inherit; }

        .se-canvas { background: #FFFFFF; border: 1px solid #E5E0D8; border-radius: 16px; padding: 1.5rem; }
        .se-canvas-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .se-canvas-header h2 { font-size: 1.125rem; font-weight: 800; color: #1C0D10; margin: 0; }
        .se-btn-add-block { display: flex; align-items: center; gap: 0.375rem; padding: 0.4375rem 0.875rem; background: #FAF8F5; color: #3B0B14; border: 1px solid #E5E0D8; border-radius: 8px; font-size: 0.8125rem; font-weight: 700; cursor: pointer; }

        .se-blocks-list { display: flex; flex-direction: column; gap: 1.5rem; }
        .se-block-card { border: 1px solid #E5E0D8; border-radius: 12px; background: #FAF8F5; overflow: hidden; }
        .se-block-inactive { opacity: 0.6; }
        .se-block-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; background: #FAF8F5; border-bottom: 1px solid #E5E0D8; }
        .se-block-badge { font-size: 0.6875rem; font-weight: 800; background: #3B0B14; color: #C9A227; padding: 0.125rem 0.5rem; border-radius: 4px; display: inline-block; margin-bottom: 0.25rem; }
        .se-block-title-box h3 { margin: 0; font-size: 1rem; font-weight: 700; color: #1C0D10; }
        .se-block-desc { font-size: 0.8125rem; color: #6B5E62; margin: 0.125rem 0 0; }
        .se-btn-add-question { display: flex; align-items: center; gap: 0.25rem; padding: 0.375rem 0.75rem; background: #3B0B14; color: #C9A227; border: none; border-radius: 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer; }

        .se-questions-list { padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; background: #FFFFFF; }
        .se-questions-empty { text-align: center; color: #9CA3AF; padding: 1rem; font-size: 0.875rem; }
        .se-question-item { display: flex; justify-content: space-between; align-items: center; padding: 0.875rem 1rem; border: 1px solid #F0ECE6; border-radius: 8px; background: #FFFFFF; transition: all 0.15s; }
        .se-question-item:hover { border-color: #3B0B14; box-shadow: 0 2px 8px rgba(0,0,0,0.03); }
        .se-question-hidden { background: #F9FAFB; border-style: dashed; }
        .se-q-left { display: flex; align-items: center; gap: 0.75rem; }
        .se-q-drag-handle { color: #9CA3AF; cursor: grab; font-weight: 700; }
        .se-q-header { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .se-q-num { font-size: 0.75rem; font-weight: 800; color: #3B0B14; background: #F3F4F6; padding: 0.125rem 0.375rem; border-radius: 4px; }
        .se-q-text { font-size: 0.9375rem; font-weight: 700; color: #111827; }
        .se-badge-req { font-size: 0.6875rem; background: #FEF2F2; color: #991B1B; font-weight: 700; padding: 0.125rem 0.375rem; border-radius: 4px; }
        .se-badge-hidden { font-size: 0.6875rem; background: #F3F4F6; color: #6B7280; font-weight: 700; padding: 0.125rem 0.375rem; border-radius: 4px; }
        .se-q-help { font-size: 0.8125rem; color: #6B7280; margin: 0.125rem 0 0; }
        .se-q-meta { display: flex; gap: 0.75rem; font-size: 0.75rem; color: #9CA3AF; margin-top: 0.25rem; }

        .se-q-actions { display: flex; align-items: center; gap: 0.5rem; }
        .se-btn-toggle { display: flex; align-items: center; gap: 0.25rem; padding: 0.375rem 0.625rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer; }
        .se-btn-active { background: #ECFDF5; color: #065F46; border: 1px solid #6EE7B7; }
        .se-btn-inactive { background: #F3F4F6; color: #6B7280; border: 1px solid #D1D5DB; }
        .se-btn-edit-q { padding: 0.375rem; background: #FAF8F5; border: 1px solid #D1D5DB; border-radius: 6px; cursor: pointer; color: #374151; }

        /* Drawer overlay */
        .se-drawer-overlay { position: fixed; inset: 0; z-index: 999; background: rgba(15,23,42,0.6); backdrop-filter: blur(2px); display: flex; justify-content: flex-end; }
        .se-drawer { background: #FFFFFF; width: 100%; max-width: 500px; height: 100%; display: flex; flex-direction: column; overflow-y: auto; box-shadow: -10px 0 25px rgba(0,0,0,0.1); }
        .se-drawer-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; background: #3B0B14; color: #FFFFFF; }
        .se-drawer-header h3 { margin: 0; font-size: 1.125rem; font-weight: 700; }
        .se-close-btn { background: transparent; border: none; color: #FFFFFF; cursor: pointer; }
        .se-drawer-form { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
        .se-field { display: flex; flex-direction: column; gap: 0.375rem; }
        .se-label { font-size: 0.8125rem; font-weight: 700; color: #374151; }
        .se-input, .se-select { width: 100%; padding: 0.625rem; border: 1px solid #D1D5DB; border-radius: 8px; font-size: 0.875rem; }
        .se-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .se-toggle-group { display: flex; flex-direction: column; gap: 0.5rem; padding-top: 0.25rem; }
        .se-checkbox-label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; font-weight: 600; color: #374151; cursor: pointer; }

        .se-options-section { border-top: 1px solid #E5E7EB; padding-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
        .se-option-row { display: flex; gap: 0.5rem; align-items: center; }
        .se-btn-del-opt { background: #FEF2F2; color: #991B1B; border: 1px solid #FCA5A5; padding: 0.5rem; border-radius: 6px; cursor: pointer; }
        .se-btn-add-opt { background: #FAF8F5; border: 1px dashed #C9A227; color: #3B0B14; font-weight: 700; font-size: 0.8125rem; padding: 0.5rem; border-radius: 6px; cursor: pointer; margin-top: 0.25rem; }

        .se-drawer-actions { display: flex; justify-content: flex-end; gap: 0.75rem; padding-top: 1rem; border-top: 1px solid #E5E7EB; margin-top: 1rem; }
        .se-btn-cancel { padding: 0.625rem 1.25rem; background: #F3F4F6; border: 1px solid #D1D5DB; border-radius: 8px; font-weight: 600; cursor: pointer; }
        .se-btn-save { padding: 0.625rem 1.25rem; background: #3B0B14; color: #C9A227; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; }

        /* Modal Box */
        .se-modal-overlay { position: fixed; inset: 0; z-index: 999; background: rgba(15,23,42,0.6); display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .se-modal-box { background: #FFFFFF; width: 100%; max-width: 480px; border-radius: 16px; padding: 1.5rem; }
        .se-modal-box h3 { margin-top: 0; font-size: 1.125rem; font-weight: 700; color: #111827; }
        .se-modal-form { display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem; }
        .se-modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.5rem; }

        /* Preview Modal */
        .se-preview-overlay { position: fixed; inset: 0; z-index: 999; background: rgba(15,23,42,0.75); display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .se-preview-box { background: #1E293B; width: 100%; max-width: 900px; height: 90vh; border-radius: 16px; display: flex; flex-direction: column; overflow: hidden; }
        .se-preview-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; background: #0F172A; color: #FFFFFF; }
        .se-preview-device-toggle { display: flex; gap: 0.5rem; }
        .se-device-btn { display: flex; align-items: center; gap: 0.375rem; padding: 0.375rem 0.75rem; background: #334155; color: #94A3B8; border: none; border-radius: 6px; font-weight: 600; font-size: 0.8125rem; cursor: pointer; }
        .se-device-btn.active { background: #3B0B14; color: #C9A227; }
        .se-preview-content { flex: 1; display: flex; justify-content: center; align-items: center; padding: 1.5rem; overflow-y: auto; background: #0F172A; }
        .se-preview-content.mobile .se-preview-frame { width: 375px; height: 667px; border-radius: 24px; border: 12px solid #334155; }
        .se-preview-content.desktop .se-preview-frame { width: 100%; max-width: 760px; height: 100%; border-radius: 12px; border: 2px solid #334155; }
        .se-preview-frame { background: #FAF8F5; overflow-y: auto; display: flex; flex-direction: column; }
        .se-p-header { background: #3B0B14; color: #FFFFFF; padding: 1.5rem; text-align: center; }
        .se-p-badge { font-size: 0.6875rem; font-weight: 800; color: #C9A227; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 0.25rem; }
        .se-p-header h2 { margin: 0; font-size: 1.25rem; font-weight: 800; }
        .se-p-header p { margin: 0.25rem 0 0; font-size: 0.8125rem; color: #D1D5DB; }
        .se-p-body { padding: 1.25rem; display: flex; flex-direction: column; gap: 1.25rem; }
        .se-p-block h4 { font-size: 0.9375rem; font-weight: 800; color: #3B0B14; border-bottom: 1px solid #E5E0D8; padding-bottom: 0.375rem; margin-bottom: 0.75rem; }
        .se-p-question { display: flex; flex-direction: column; gap: 0.375rem; margin-bottom: 1rem; }
        .se-p-question label { font-size: 0.875rem; font-weight: 700; color: #111827; }
        .se-p-question small { font-size: 0.75rem; color: #6B7280; }
        .se-p-question input[type="text"], .se-p-question textarea { width: 100%; padding: 0.5rem; border: 1px solid #D1D5DB; border-radius: 6px; background: #FFFFFF; }
        .se-p-options { display: flex; flex-direction: column; gap: 0.375rem; }
        .se-p-opt { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; color: #374151; }
        .se-p-rating { display: flex; gap: 0.25rem; }
        .se-p-star { flex: 1; text-align: center; padding: 0.375rem 0; background: #FFFFFF; border: 1px solid #D1D5DB; border-radius: 4px; font-size: 0.75rem; font-weight: 700; }
        .se-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
