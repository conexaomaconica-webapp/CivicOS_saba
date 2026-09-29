'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Eye,
  Send,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Trash2,
  Copy,
  Smartphone,
  Monitor,
  X,
  Loader2,
  Layers,
  CircleDot,
  CheckSquare,
  ListFilter,
  ToggleLeft,
  Star,
  FileText,
  AlignLeft,
  Calendar,
  MousePointer,
  PenTool,
} from 'lucide-react';
import type { Survey, SurveyQuestion } from '@/types/surveys';
import {
  toggleQuestionActiveAction,
  publishSurveyVersionAction,
  saveSurveyQuestionAction,
  saveSurveyBlockAction,
  deleteSurveyQuestionAction,
  deleteSurveyBlockAction,
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
  const [fieldCategoryTab, setFieldCategoryTab] = useState<'click' | 'fill'>('click');

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
      // Ajusta a aba inicial da categoria
      const isClickType = ['single_choice', 'multiple_choice', 'dropdown', 'boolean', 'rating'].includes(question.question_type);
      setFieldCategoryTab(isClickType ? 'click' : 'fill');
    } else {
      setEditingQuestion({
        block_id: blockId,
        question_text: '',
        help_text: '',
        question_type: 'single_choice',
        is_required: false,
        is_active: true,
        allow_other: false,
      });
      setQuestionOptions([
        { label: 'Opção 1', value: 'opcao_1' },
        { label: 'Opção 2', value: 'opcao_2' },
      ]);
      setFieldCategoryTab('click');
    }
  };

  // Duplicate Question
  const handleDuplicateQuestion = async (blockId: string, q: SurveyQuestion) => {
    setSaving(true);
    setMessage(null);
    const res = await saveSurveyQuestionAction(survey.id, {
      block_id: blockId,
      question_text: `${q.question_text} (Cópia)`,
      help_text: q.help_text || '',
      question_type: q.question_type,
      is_required: q.is_required,
      is_active: true,
      allow_other: q.allow_other,
      options: q.options?.map((opt) => ({ label: opt.label, value: opt.value })),
    });
    setSaving(false);
    if (res.success) {
      setMessage({ type: 'success', text: 'Pergunta duplicada com sucesso no rascunho!' });
      router.refresh();
    } else {
      setMessage({ type: 'error', text: res.error || 'Erro ao duplicar pergunta.' });
    }
  };

  // Delete Question
  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Deseja realmente excluir esta pergunta do questionário?')) return;
    setSaving(true);
    setMessage(null);
    const res = await deleteSurveyQuestionAction(survey.id, questionId);
    setSaving(false);
    if (res.success) {
      setMessage({ type: 'success', text: 'Pergunta excluída com sucesso!' });
      router.refresh();
    } else {
      setMessage({ type: 'error', text: res.error || 'Erro ao excluir pergunta.' });
    }
  };

  // Delete Block
  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm('Deseja excluir esta seção e todas as perguntas dentro dela?')) return;
    setSaving(true);
    setMessage(null);
    const res = await deleteSurveyBlockAction(survey.id, blockId);
    setSaving(false);
    if (res.success) {
      setMessage({ type: 'success', text: 'Seção de perguntas excluída com sucesso!' });
      router.refresh();
    } else {
      setMessage({ type: 'error', text: res.error || 'Erro ao excluir seção.' });
    }
  };

  // Save Question in Drawer
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion || !editingQuestion.question_text?.trim() || !selectedBlockId) return;

    setSaving(true);
    setMessage(null);

    const qType = editingQuestion.question_type || 'short_text';
    const isChoice = ['single_choice', 'multiple_choice', 'dropdown'].includes(qType);

    const res = await saveSurveyQuestionAction(survey.id, {
      id: editingQuestion.id,
      block_id: selectedBlockId,
      question_text: editingQuestion.question_text.trim(),
      help_text: editingQuestion.help_text?.trim() || '',
      question_type: qType,
      is_required: editingQuestion.is_required ?? false,
      is_active: editingQuestion.is_active ?? true,
      allow_other: editingQuestion.allow_other ?? false,
      conditional_rules: editingQuestion.conditional_rules || null,
      options: isChoice ? questionOptions : undefined,
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
    setMessage(null);
    const res = await saveSurveyBlockAction(survey.id, {
      title: newBlockTitle.trim(),
      description: newBlockDesc.trim() || undefined,
    });
    setSaving(false);

    if (res.success) {
      setShowAddBlock(false);
      setNewBlockTitle('');
      setNewBlockDesc('');
      setMessage({ type: 'success', text: 'Nova seção criada com sucesso!' });
      router.refresh();
    } else {
      setMessage({ type: 'error', text: res.error || 'Erro ao criar seção de perguntas.' });
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

  const currentType = editingQuestion?.question_type || 'short_text';

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
          <h2>Estrutura de Seções & Perguntas (Rascunho)</h2>
          <button
            type="button"
            className="se-btn-add-block"
            onClick={() => setShowAddBlock(true)}
          >
            <Plus size={16} />
            Adicionar Nova Seção
          </button>
        </div>

        {/* Empty Blocks State */}
        {(!survey.blocks || survey.blocks.length === 0) ? (
          <div className="se-empty-canvas">
            <Layers size={48} className="se-empty-icon" />
            <h3>Nenhuma seção criada ainda</h3>
            <p>Para adicionar perguntas, primeiro crie uma seção para organizá-las no questionário.</p>
            <button
              type="button"
              className="se-btn-first-block"
              onClick={() => setShowAddBlock(true)}
            >
              <Plus size={16} />
              Criar Primeira Seção
            </button>
          </div>
        ) : (
          <div className="se-blocks-list">
            {survey.blocks.map((block, bIdx) => (
              <div key={block.id} className={`se-block-card ${!block.is_active ? 'se-block-inactive' : ''}`}>
                <div className="se-block-header">
                  <div className="se-block-title-box">
                    <span className="se-block-badge">Seção {bIdx + 1}</span>
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
                    <button
                      type="button"
                      className="se-btn-del-block"
                      title="Excluir Seção"
                      onClick={() => handleDeleteBlock(block.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Questions List */}
                <div className="se-questions-list">
                  {(!block.questions || block.questions.length === 0) ? (
                    <div className="se-questions-empty">
                      <p>Nenhuma pergunta nesta seção.</p>
                      <button
                        type="button"
                        className="se-btn-add-q-empty"
                        onClick={() => handleOpenQuestionDrawer(block.id)}
                      >
                        <Plus size={14} /> Adicionar Pergunta
                      </button>
                    </div>
                  ) : (
                    block.questions.map((q, qIdx) => (
                      <div
                        key={q.id}
                        className={`se-question-item ${!q.is_active ? 'se-question-hidden' : ''}`}
                      >
                        <div className="se-q-left">
                          <span className="se-q-num">Q{qIdx + 1}</span>
                          <div>
                            <div className="se-q-header">
                              <span className="se-q-text">{q.question_text}</span>
                              {q.is_required && <span className="se-badge-req">Obrigatória</span>}
                              {!q.is_active && <span className="se-badge-hidden">Ocultada</span>}
                            </div>
                            {q.help_text && <p className="se-q-help">{q.help_text}</p>}
                            <div className="se-q-meta">
                              <span className="se-q-type-badge">
                                {q.question_type === 'single_choice' && '🔘 Opção Única (Radio)'}
                                {q.question_type === 'multiple_choice' && '☑️ Múltipla Escolha (Checkbox)'}
                                {q.question_type === 'dropdown' && '🔽 Lista Suspensa (Select)'}
                                {q.question_type === 'boolean' && '⚖️ Sim / Não'}
                                {q.question_type === 'rating' && '⭐ Escala (1 a 10)'}
                                {q.question_type === 'short_text' && '✍️ Texto Curto'}
                                {q.question_type === 'long_text' && '📄 Texto Longo'}
                                {q.question_type === 'date' && '📅 Data'}
                              </span>
                              {q.options && q.options.length > 0 && (
                                <span className="se-q-opts-count">{q.options.length} alternativas</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="se-q-actions">
                          <button
                            type="button"
                            className={`se-btn-toggle ${q.is_active ? 'se-btn-active' : 'se-btn-inactive'}`}
                            onClick={() => handleToggleQuestionActive(block.id, q.id, q.is_active)}
                            title={q.is_active ? 'Ocultar esta pergunta do rascunho' : 'Ativar esta pergunta'}
                          >
                            {q.is_active ? 'Ativa' : 'Oculta'}
                          </button>

                          <button
                            type="button"
                            className="se-btn-icon"
                            onClick={() => handleOpenQuestionDrawer(block.id, q)}
                            title="Editar Pergunta"
                          >
                            <Edit3 size={15} />
                          </button>

                          <button
                            type="button"
                            className="se-btn-icon"
                            onClick={() => handleDuplicateQuestion(block.id, q)}
                            title="Duplicar Pergunta"
                          >
                            <Copy size={15} />
                          </button>

                          <button
                            type="button"
                            className="se-btn-icon se-btn-icon-del"
                            onClick={() => handleDeleteQuestion(q.id)}
                            title="Excluir Pergunta"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drawer: Add / Edit Question com Seletor Visual Clicar vs Preencher */}
      {editingQuestion && (
        <div className="se-drawer-overlay" onClick={() => setEditingQuestion(null)}>
          <div className="se-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="se-drawer-header">
              <h3>{editingQuestion.id ? 'Editar Pergunta' : 'Adicionar Nova Pergunta'}</h3>
              <button type="button" onClick={() => setEditingQuestion(null)} className="se-close-btn">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="se-drawer-form">
              {/* Título da Pergunta */}
              <div className="se-field">
                <label className="se-label">Enunciado / Pergunta *</label>
                <input
                  type="text"
                  className="se-input"
                  value={editingQuestion.question_text || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question_text: e.target.value })}
                  placeholder="Ex: Qual o seu grau maçônico atual?"
                  required
                  autoFocus
                />
              </div>

              {/* Texto de Ajuda */}
              <div className="se-field">
                <label className="se-label">Descrição / Instrução de Apoio (Opcional)</label>
                <input
                  type="text"
                  className="se-input"
                  value={editingQuestion.help_text || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, help_text: e.target.value })}
                  placeholder="Ex: Marque a opção correspondente ao seu grau regular"
                />
              </div>

              {/* SELETOR PRINCIPAL: CLICAR VS PREENCHER */}
              <div className="se-field">
                <label className="se-label">Como o participante responderá a esta pergunta?</label>
                <div className="se-type-tabs">
                  <button
                    type="button"
                    className={`se-type-tab ${fieldCategoryTab === 'click' ? 'active' : ''}`}
                    onClick={() => {
                      setFieldCategoryTab('click');
                      if (!['single_choice', 'multiple_choice', 'dropdown', 'boolean', 'rating'].includes(currentType)) {
                        setEditingQuestion({ ...editingQuestion, question_type: 'single_choice' });
                      }
                    }}
                  >
                    <MousePointer size={15} />
                    <span>Opções para Clicar (Seleção)</span>
                  </button>
                  <button
                    type="button"
                    className={`se-type-tab ${fieldCategoryTab === 'fill' ? 'active' : ''}`}
                    onClick={() => {
                      setFieldCategoryTab('fill');
                      if (!['short_text', 'long_text', 'date'].includes(currentType)) {
                        setEditingQuestion({ ...editingQuestion, question_type: 'short_text' });
                      }
                    }}
                  >
                    <PenTool size={15} />
                    <span>Opções para Preenchimento (Digitação)</span>
                  </button>
                </div>

                {/* Subopções da Categoria Clicar */}
                {fieldCategoryTab === 'click' && (
                  <div className="se-type-cards-grid">
                    <button
                      type="button"
                      className={`se-type-card ${currentType === 'single_choice' ? 'active' : ''}`}
                      onClick={() => setEditingQuestion({ ...editingQuestion, question_type: 'single_choice' })}
                    >
                      <CircleDot size={20} className="se-tc-icon" />
                      <div className="se-tc-text">
                        <strong>Opção Única (Radio)</strong>
                        <span>O participante clica e escolhe apenas 1 opção</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`se-type-card ${currentType === 'multiple_choice' ? 'active' : ''}`}
                      onClick={() => setEditingQuestion({ ...editingQuestion, question_type: 'multiple_choice' })}
                    >
                      <CheckSquare size={20} className="se-tc-icon" />
                      <div className="se-tc-text">
                        <strong>Múltipla Escolha (Checkbox)</strong>
                        <span>O participante pode clicar e marcar várias opções</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`se-type-card ${currentType === 'dropdown' ? 'active' : ''}`}
                      onClick={() => setEditingQuestion({ ...editingQuestion, question_type: 'dropdown' })}
                    >
                      <ListFilter size={20} className="se-tc-icon" />
                      <div className="se-tc-text">
                        <strong>Lista Suspensa (Dropdown)</strong>
                        <span>O participante clica para abrir uma lista de opções</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`se-type-card ${currentType === 'boolean' ? 'active' : ''}`}
                      onClick={() => setEditingQuestion({ ...editingQuestion, question_type: 'boolean' })}
                    >
                      <ToggleLeft size={20} className="se-tc-icon" />
                      <div className="se-tc-text">
                        <strong>Sim ou Não</strong>
                        <span>Dois botões clicáveis: [Sim] ou [Não]</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`se-type-card ${currentType === 'rating' ? 'active' : ''}`}
                      onClick={() => setEditingQuestion({ ...editingQuestion, question_type: 'rating' })}
                    >
                      <Star size={20} className="se-tc-icon" />
                      <div className="se-tc-text">
                        <strong>Escala / Nota (1 a 10)</strong>
                        <span>Botões de 1 a 10 para clicar na nota</span>
                      </div>
                    </button>
                  </div>
                )}

                {/* Subopções da Categoria Preencher */}
                {fieldCategoryTab === 'fill' && (
                  <div className="se-type-cards-grid">
                    <button
                      type="button"
                      className={`se-type-card ${currentType === 'short_text' ? 'active' : ''}`}
                      onClick={() => setEditingQuestion({ ...editingQuestion, question_type: 'short_text' })}
                    >
                      <FileText size={20} className="se-tc-icon" />
                      <div className="se-tc-text">
                        <strong>Texto Curto (Linha)</strong>
                        <span>Uma linha para digitar respostas diretas (Nome, Cidade, etc.)</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`se-type-card ${currentType === 'long_text' ? 'active' : ''}`}
                      onClick={() => setEditingQuestion({ ...editingQuestion, question_type: 'long_text' })}
                    >
                      <AlignLeft size={20} className="se-tc-icon" />
                      <div className="se-tc-text">
                        <strong>Texto Longo (Parágrafo)</strong>
                        <span>Caixa ampla para comentários, depoimentos e sugestões</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`se-type-card ${currentType === 'date' ? 'active' : ''}`}
                      onClick={() => setEditingQuestion({ ...editingQuestion, question_type: 'date' })}
                    >
                      <Calendar size={20} className="se-tc-icon" />
                      <div className="se-tc-text">
                        <strong>Data</strong>
                        <span>Campo de data com calendário para selecionar dia/mês/ano</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Alternativas se for tipo de escolha (radio, checkbox, dropdown) */}
              {['single_choice', 'multiple_choice', 'dropdown'].includes(currentType) && (
                <div className="se-options-section">
                  <div className="se-opt-head">
                    <label className="se-label">Alternativas de Resposta para Clicar</label>
                    <span className="se-opt-count-tag">{questionOptions.length} opções</span>
                  </div>
                  {questionOptions.map((opt, idx) => (
                    <div key={idx} className="se-option-row">
                      <span className="se-opt-bullet">
                        {currentType === 'single_choice' && '⚪'}
                        {currentType === 'multiple_choice' && '⬜'}
                        {currentType === 'dropdown' && `${idx + 1}.`}
                      </span>
                      <input
                        type="text"
                        className="se-input"
                        value={opt.label}
                        onChange={(e) => {
                          const updated = [...questionOptions];
                          if (updated[idx]) {
                            updated[idx].label = e.target.value;
                            updated[idx].value = e.target.value.toLowerCase().trim().replace(/\s+/g, '_');
                          }
                          setQuestionOptions(updated);
                        }}
                        placeholder={`Digite a opção ${idx + 1}`}
                        required
                      />
                      {questionOptions.length > 1 && (
                        <button
                          type="button"
                          className="se-btn-del-opt"
                          onClick={() => setQuestionOptions(questionOptions.filter((_, i) => i !== idx))}
                          title="Remover esta opção"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="se-btn-add-opt"
                    onClick={() =>
                      setQuestionOptions([
                        ...questionOptions,
                        {
                          label: `Opção ${questionOptions.length + 1}`,
                          value: `opcao_${questionOptions.length + 1}`,
                        },
                      ])
                    }
                  >
                    <Plus size={14} /> Adicionar Mais uma Opção
                  </button>
                </div>
              )}

              {/* LIVE PREVIEW IMEDIATO DO CAMPO */}
              <div className="se-live-box">
                <div className="se-live-tag">
                  <Eye size={13} /> Prévia: É assim que o participante verá na tela
                </div>
                <div className="se-live-field">
                  <strong className="se-live-label">
                    {editingQuestion.question_text || 'Enunciado da sua pergunta'}
                    {editingQuestion.is_required && <span className="text-red-600"> *</span>}
                  </strong>
                  {editingQuestion.help_text && <p className="se-live-help">{editingQuestion.help_text}</p>}

                  {currentType === 'short_text' && (
                    <input type="text" className="se-input se-disabled" disabled placeholder="Digite a resposta curta aqui..." />
                  )}

                  {currentType === 'long_text' && (
                    <textarea className="se-input se-disabled" disabled rows={3} placeholder="Digite sua resposta detalhada aqui..." />
                  )}

                  {currentType === 'date' && (
                    <input type="date" className="se-input se-disabled" disabled />
                  )}

                  {currentType === 'boolean' && (
                    <div className="se-live-bool">
                      <button type="button" className="se-live-bool-btn">Sim</button>
                      <button type="button" className="se-live-bool-btn">Não</button>
                    </div>
                  )}

                  {currentType === 'rating' && (
                    <div className="se-live-rating">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <span key={n} className="se-live-rate-btn">{n}</span>
                      ))}
                    </div>
                  )}

                  {currentType === 'single_choice' && (
                    <div className="se-live-opts">
                      {questionOptions.map((opt, i) => (
                        <label key={i} className="se-live-opt-row">
                          <input type="radio" disabled name="live_preview_radio" />
                          <span>{opt.label || `Opção ${i + 1}`}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {currentType === 'multiple_choice' && (
                    <div className="se-live-opts">
                      {questionOptions.map((opt, i) => (
                        <label key={i} className="se-live-opt-row">
                          <input type="checkbox" disabled />
                          <span>{opt.label || `Opção ${i + 1}`}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {currentType === 'dropdown' && (
                    <select className="se-select se-disabled" disabled>
                      <option value="">Selecione uma opção...</option>
                      {questionOptions.map((opt, i) => (
                        <option key={i}>{opt.label || `Opção ${i + 1}`}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Configurações de Obrigatoriedade e Status */}
              <div className="se-config-row">
                <label className="se-checkbox-label">
                  <input
                    type="checkbox"
                    checked={editingQuestion.is_required ?? false}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, is_required: e.target.checked })}
                  />
                  <span>Pergunta Obrigatória</span>
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

              {/* Actions Footer */}
              <div className="se-drawer-actions">
                <button type="button" onClick={() => setEditingQuestion(null)} className="se-btn-cancel">
                  Cancelar
                </button>
                <button type="submit" className="se-btn-save" disabled={saving}>
                  {saving ? 'Salvando...' : editingQuestion.id ? 'Salvar Alterações' : 'Adicionar Pergunta'}
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
            <h3>Adicionar Nova Seção de Perguntas</h3>
            <form onSubmit={handleCreateBlock} className="se-modal-form">
              <div className="se-field">
                <label className="se-label">Título da Seção *</label>
                <input
                  type="text"
                  className="se-input"
                  value={newBlockTitle}
                  onChange={(e) => setNewBlockTitle(e.target.value)}
                  placeholder="Ex: BLOCO B — Satisfação e Benefícios"
                  required
                  autoFocus
                />
              </div>
              <div className="se-field">
                <label className="se-label">Descrição (Opcional)</label>
                <input
                  type="text"
                  className="se-input"
                  value={newBlockDesc}
                  onChange={(e) => setNewBlockDesc(e.target.value)}
                  placeholder="Instruções gerais sobre as perguntas desta seção"
                />
              </div>
              <div className="se-modal-actions">
                <button type="button" onClick={() => setShowAddBlock(false)} className="se-btn-cancel">
                  Cancelar
                </button>
                <button type="submit" className="se-btn-save" disabled={saving}>
                  {saving ? 'Criando...' : 'Criar Seção'}
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
                              {q.question_type === 'date' && (
                                <input type="date" disabled />
                              )}
                              {q.question_type === 'boolean' && (
                                <div className="se-live-bool">
                                  <button type="button" className="se-live-bool-btn">Sim</button>
                                  <button type="button" className="se-live-bool-btn">Não</button>
                                </div>
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
        .se-title { font-size: 1.75rem; font-weight: 800; color: #1C0D10; margin: 0; font-family: serif; }
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
          font-weight: 700; font-size: 0.875rem; cursor: pointer; transition: all 0.15s;
        }
        .se-btn-preview:hover { background: #F3F4F6; }
        .se-btn-publish {
          display: flex; align-items: center; gap: 0.375rem; padding: 0.5rem 1.125rem;
          background: #3B0B14; color: #C9A227; border: 1px solid rgba(201,162,39,0.4); border-radius: 8px;
          font-weight: 700; font-size: 0.875rem; cursor: pointer; transition: all 0.15s;
        }
        .se-btn-publish:hover { background: #2A080E; }
        
        .se-alert { display: flex; align-items: center; gap: 0.75rem; padding: 0.875rem 1.25rem; border-radius: 10px; font-size: 0.875rem; font-weight: 600; margin-bottom: 1.5rem; justify-content: space-between; }
        .se-alert-success { background: #ECFDF5; color: #065F46; border: 1px solid #6EE7B7; }
        .se-alert-warning { background: #FEF3C7; color: #92400E; border: 1px solid #FCD34D; }
        .se-alert-error { background: #FEF2F2; color: #991B1B; border: 1px solid #FCA5A5; }
        .se-alert-close { background: transparent; border: none; cursor: pointer; color: inherit; }

        .se-canvas { background: #FFFFFF; border: 1px solid #E5E0D8; border-radius: 16px; padding: 1.5rem; }
        .se-canvas-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .se-canvas-header h2 { font-size: 1.125rem; font-weight: 800; color: #1C0D10; margin: 0; font-family: serif; }
        .se-btn-add-block { display: flex; align-items: center; gap: 0.375rem; padding: 0.5rem 1rem; background: #FAF8F5; color: #3B0B14; border: 1px solid #E5E0D8; border-radius: 8px; font-size: 0.8125rem; font-weight: 700; cursor: pointer; }
        .se-btn-add-block:hover { background: #F3ECE1; }

        /* Empty State */
        .se-empty-canvas { text-align: center; padding: 3rem 1.5rem; border: 2px dashed #E5E0D8; border-radius: 12px; background: #FAF8F5; }
        .se-empty-icon { color: #C9A227; margin: 0 auto 0.75rem; }
        .se-empty-canvas h3 { font-size: 1.125rem; font-weight: 800; color: #1C0D10; margin: 0 0 0.25rem; font-family: serif; }
        .se-empty-canvas p { font-size: 0.875rem; color: #6B5E62; margin: 0 0 1.25rem; }
        .se-btn-first-block { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.625rem 1.25rem; background: #3B0B14; color: #C9A227; border: 1px solid rgba(201,162,39,0.4); border-radius: 8px; font-size: 0.875rem; font-weight: 700; cursor: pointer; }

        .se-blocks-list { display: flex; flex-direction: column; gap: 1.5rem; }
        .se-block-card { border: 1px solid #E5E0D8; border-radius: 12px; background: #FAF8F5; overflow: hidden; }
        .se-block-inactive { opacity: 0.6; }
        .se-block-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; background: #FAF8F5; border-bottom: 1px solid #E5E0D8; }
        .se-block-badge { font-size: 0.6875rem; font-weight: 800; background: #3B0B14; color: #C9A227; padding: 0.125rem 0.5rem; border-radius: 4px; display: inline-block; margin-bottom: 0.25rem; }
        .se-block-title-box h3 { margin: 0; font-size: 1rem; font-weight: 700; color: #1C0D10; }
        .se-block-desc { font-size: 0.8125rem; color: #6B5E62; margin: 0.125rem 0 0; }
        .se-block-actions { display: flex; align-items: center; gap: 0.5rem; }
        .se-btn-add-question { display: flex; align-items: center; gap: 0.25rem; padding: 0.4rem 0.75rem; background: #3B0B14; color: #C9A227; border: none; border-radius: 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer; }
        .se-btn-del-block { padding: 0.4rem; background: #FEE2E2; color: #DC2626; border: 1px solid #FCA5A5; border-radius: 6px; cursor: pointer; }

        .se-questions-list { padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; background: #FFFFFF; }
        .se-questions-empty { text-align: center; color: #9CA3AF; padding: 1.5rem; font-size: 0.875rem; border: 1px dashed #E5E0D8; border-radius: 8px; }
        .se-btn-add-q-empty { margin-top: 0.5rem; display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.375rem 0.75rem; background: #3B0B14; color: #C9A227; border-radius: 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer; border: none; }

        .se-question-item { display: flex; justify-content: space-between; align-items: center; padding: 0.875rem 1rem; border: 1px solid #F0ECE6; border-radius: 8px; background: #FFFFFF; transition: all 0.15s; }
        .se-question-item:hover { border-color: #3B0B14; box-shadow: 0 2px 8px rgba(0,0,0,0.03); }
        .se-question-hidden { background: #F9FAFB; border-style: dashed; }
        .se-q-left { display: flex; align-items: center; gap: 0.75rem; }
        .se-q-header { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .se-q-num { font-size: 0.75rem; font-weight: 800; color: #3B0B14; background: #F3F4F6; padding: 0.125rem 0.375rem; border-radius: 4px; }
        .se-q-text { font-size: 0.9375rem; font-weight: 700; color: #111827; }
        .se-badge-req { font-size: 0.6875rem; background: #FEF2F2; color: #991B1B; font-weight: 700; padding: 0.125rem 0.375rem; border-radius: 4px; }
        .se-badge-hidden { font-size: 0.6875rem; background: #F3F4F6; color: #6B7280; font-weight: 700; padding: 0.125rem 0.375rem; border-radius: 4px; }
        .se-q-help { font-size: 0.8125rem; color: #6B7280; margin: 0.125rem 0 0; }
        .se-q-meta { display: flex; align-items: center; gap: 0.75rem; font-size: 0.75rem; color: #6B7280; margin-top: 0.25rem; }
        .se-q-type-badge { background: #FAF8F5; border: 1px solid #E5E0D8; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 600; color: #3B0B14; }
        .se-q-opts-count { font-weight: 500; color: #9CA3AF; }

        .se-q-actions { display: flex; align-items: center; gap: 0.375rem; }
        .se-btn-toggle { display: flex; align-items: center; gap: 0.25rem; padding: 0.375rem 0.625rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer; }
        .se-btn-active { background: #ECFDF5; color: #065F46; border: 1px solid #6EE7B7; }
        .se-btn-inactive { background: #F3F4F6; color: #6B7280; border: 1px solid #D1D5DB; }
        .se-btn-icon { padding: 0.375rem; background: #FAF8F5; border: 1px solid #D1D5DB; border-radius: 6px; cursor: pointer; color: #374151; }
        .se-btn-icon:hover { background: #E5E7EB; }
        .se-btn-icon-del { color: #DC2626; border-color: #FCA5A5; background: #FEF2F2; }
        .se-btn-icon-del:hover { background: #FEE2E2; }

        /* Drawer overlay */
        .se-drawer-overlay { position: fixed; inset: 0; z-index: 999; background: rgba(15,23,42,0.6); backdrop-filter: blur(2px); display: flex; justify-content: flex-end; }
        .se-drawer { background: #FFFFFF; width: 100%; max-width: 580px; height: 100%; display: flex; flex-direction: column; overflow-y: auto; box-shadow: -10px 0 25px rgba(0,0,0,0.1); }
        .se-drawer-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; background: #3B0B14; color: #FFFFFF; }
        .se-drawer-header h3 { margin: 0; font-size: 1.125rem; font-weight: 700; font-family: serif; color: #C9A227; }
        .se-close-btn { background: transparent; border: none; color: #FFFFFF; cursor: pointer; }
        .se-drawer-form { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
        .se-field { display: flex; flex-direction: column; gap: 0.375rem; }
        .se-label { font-size: 0.8125rem; font-weight: 700; color: #374151; }
        .se-input, .se-select { width: 100%; padding: 0.625rem; border: 1px solid #D1D5DB; border-radius: 8px; font-size: 0.875rem; outline: none; }
        .se-input:focus, .se-select:focus { border-color: #3B0B14; box-shadow: 0 0 0 2px rgba(59,11,20,0.1); }
        .se-disabled { background: #F9FAFB; cursor: not-allowed; }

        /* Tabs Clicar vs Preencher */
        .se-type-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; background: #F3F4F6; padding: 0.25rem; border-radius: 10px; margin-top: 0.25rem; }
        .se-type-tab { display: flex; align-items: center; justify-content: center; gap: 0.375rem; padding: 0.625rem 0.5rem; border: none; border-radius: 8px; font-size: 0.75rem; font-weight: 700; color: #4B5563; background: transparent; cursor: pointer; transition: all 0.15s; }
        .se-type-tab.active { background: #3B0B14; color: #C9A227; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }

        /* Type Cards Grid */
        .se-type-cards-grid { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.75rem; }
        .se-type-card { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.75rem 1rem; border: 1.5px solid #E5E7EB; border-radius: 10px; background: #FFFFFF; text-align: left; cursor: pointer; transition: all 0.15s; }
        .se-type-card:hover { border-color: #C9A227; background: #FAF8F5; }
        .se-type-card.active { border-color: #3B0B14; background: #FFFBF0; box-shadow: 0 0 0 1px #3B0B14; }
        .se-tc-icon { color: #3B0B14; margin-top: 0.125rem; shrink-0: 0; }
        .se-type-card.active .se-tc-icon { color: #3B0B14; }
        .se-tc-text { display: flex; flex-direction: column; gap: 0.125rem; }
        .se-tc-text strong { font-size: 0.875rem; color: #111827; }
        .se-tc-text span { font-size: 0.75rem; color: #6B7280; line-height: 1.2; }

        /* Alternativas section */
        .se-options-section { border-top: 1px solid #E5E7EB; padding-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
        .se-opt-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem; }
        .se-opt-count-tag { font-size: 0.6875rem; font-weight: 700; background: #FAF8F5; color: #3B0B14; padding: 0.125rem 0.5rem; border-radius: 4px; border: 1px solid #E5E0D8; }
        .se-option-row { display: flex; gap: 0.5rem; align-items: center; }
        .se-opt-bullet { font-size: 0.875rem; color: #6B7280; width: 20px; text-align: center; }
        .se-btn-del-opt { background: #FEF2F2; color: #991B1B; border: 1px solid #FCA5A5; padding: 0.5rem; border-radius: 6px; cursor: pointer; }
        .se-btn-add-opt { display: flex; align-items: center; justify-content: center; gap: 0.375rem; background: #FAF8F5; border: 1px dashed #C9A227; color: #3B0B14; font-weight: 700; font-size: 0.8125rem; padding: 0.625rem; border-radius: 8px; cursor: pointer; margin-top: 0.25rem; }
        .se-btn-add-opt:hover { background: #FFFBF0; }

        /* Live Preview Box */
        .se-live-box { background: #FAF8F5; border: 1px solid #E5E0D8; border-radius: 12px; padding: 1rem; margin-top: 0.25rem; }
        .se-live-tag { display: flex; align-items: center; gap: 0.375rem; font-size: 0.6875rem; font-weight: 800; color: #3B0B14; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
        .se-live-field { background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 0.875rem; display: flex; flex-direction: column; gap: 0.375rem; }
        .se-live-label { font-size: 0.875rem; color: #111827; }
        .se-live-help { font-size: 0.75rem; color: #6B7280; margin: 0 0 0.25rem; }
        .se-live-bool { display: flex; gap: 0.5rem; margin-top: 0.25rem; }
        .se-live-bool-btn { flex: 1; padding: 0.5rem; background: #FFFFFF; border: 1.5px solid #D1D5DB; border-radius: 6px; font-weight: 700; font-size: 0.8125rem; color: #374151; cursor: not-allowed; }
        .se-live-rating { display: flex; gap: 0.25rem; margin-top: 0.25rem; overflow-x: auto; padding-bottom: 0.25rem; }
        .se-live-rate-btn { flex: 1; min-width: 28px; text-align: center; padding: 0.375rem 0; background: #FFFFFF; border: 1px solid #D1D5DB; border-radius: 6px; font-size: 0.75rem; font-weight: 700; color: #374151; }
        .se-live-opts { display: flex; flex-direction: column; gap: 0.375rem; margin-top: 0.25rem; }
        .se-live-opt-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; color: #374151; cursor: not-allowed; }

        .se-config-row { display: flex; gap: 1.5rem; padding-top: 0.5rem; border-top: 1px solid #E5E7EB; }
        .se-checkbox-label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; font-weight: 600; color: #374151; cursor: pointer; }

        .se-drawer-actions { display: flex; justify-content: flex-end; gap: 0.75rem; padding-top: 1rem; border-top: 1px solid #E5E7EB; margin-top: 0.5rem; }
        .se-btn-cancel { padding: 0.625rem 1.25rem; background: #F3F4F6; border: 1px solid #D1D5DB; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.875rem; }
        .se-btn-save { padding: 0.625rem 1.5rem; background: #3B0B14; color: #C9A227; border: 1px solid rgba(201,162,39,0.4); border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 0.875rem; }

        /* Modal Box */
        .se-modal-overlay { position: fixed; inset: 0; z-index: 999; background: rgba(15,23,42,0.6); display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .se-modal-box { background: #FFFFFF; width: 100%; max-width: 480px; border-radius: 16px; padding: 1.5rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
        .se-modal-box h3 { margin-top: 0; font-size: 1.125rem; font-weight: 700; color: #111827; font-family: serif; }
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
        .se-p-header h2 { margin: 0; font-size: 1.25rem; font-weight: 800; font-family: serif; }
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
