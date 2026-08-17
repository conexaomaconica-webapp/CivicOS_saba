'use client';

import { useState } from 'react';
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Tag,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import {
  createBusinessBenefitAction,
  updateBusinessBenefitAction,
  toggleBusinessBenefitActiveAction,
  reorderBusinessBenefitAction,
  deleteBusinessBenefitAction,
} from '@/app/actions/business-management';

export interface BenefitItem {
  id: string;
  title: string;
  description: string;
  benefitType: string | null;
  discountPercentage: number | null;
  discountAmount: number | null;
  discountCode: string | null;
  badgeText: string | null;
  redeemInstructions: string | null;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
  displayOrder: number;
}

interface Props {
  businessId: string;
  benefits: BenefitItem[];
  maxLimit: number | null;
  planName: string;
}

export function BenefitManagementTable({ businessId, benefits }: Props) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  // Form modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BenefitItem | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDiscountCode, setFormDiscountCode] = useState('');
  const [formBadgeText, setFormBadgeText] = useState('');
  const [formRedeemInstructions, setFormRedeemInstructions] = useState('');
  const [formValidFrom, setFormValidFrom] = useState('');
  const [formValidUntil, setFormValidUntil] = useState('');

  // Delete modal state
  const [deleteCandidate, setDeleteCandidate] = useState<BenefitItem | null>(null);

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormTitle('');
    setFormDesc('');
    setFormDiscountCode('');
    setFormBadgeText('');
    setFormRedeemInstructions('');
    setFormValidFrom(new Date().toISOString().slice(0, 16));
    setFormValidUntil('');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (item: BenefitItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormDesc(item.description);
    setFormDiscountCode(item.discountCode || '');
    setFormBadgeText(item.badgeText || '');
    setFormRedeemInstructions(item.redeemInstructions || '');
    setFormValidFrom(item.validFrom ? new Date(item.validFrom).toISOString().slice(0, 16) : '');
    setFormValidUntil(item.validUntil ? new Date(item.validUntil).toISOString().slice(0, 16) : '');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  // Submit Form (Create or Edit)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDesc.trim()) return;

    setIsPending(true);
    setErrorMsg(null);

    const payload = {
      title: formTitle,
      description: formDesc,
      discountCode: formDiscountCode || null,
      badgeText: formBadgeText || null,
      redeemInstructions: formRedeemInstructions || null,
      validFrom: formValidFrom ? new Date(formValidFrom).toISOString() : null,
      validUntil: formValidUntil ? new Date(formValidUntil).toISOString() : null,
    };

    let res;
    if (editingItem) {
      res = await updateBusinessBenefitAction(businessId, editingItem.id, payload);
    } else {
      res = await createBusinessBenefitAction(businessId, payload);
    }

    setIsPending(false);

    if (res.success) {
      setIsModalOpen(false);
    } else {
      setErrorMsg(res.error || 'Erro ao salvar benefício.');
    }
  };

  // Toggle Active
  const handleToggleActive = async (item: BenefitItem) => {
    setIsPending(true);
    setErrorMsg(null);
    const res = await toggleBusinessBenefitActiveAction(businessId, item.id, !item.isActive);
    setIsPending(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Erro ao alterar status do benefício.');
    }
  };

  // Reorder (Up / Down)
  const handleReorder = async (item: BenefitItem, direction: 'up' | 'down') => {
    setIsPending(true);
    setErrorMsg(null);
    const res = await reorderBusinessBenefitAction(businessId, item.id, direction);
    setIsPending(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Erro ao reordenar benefício.');
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;

    setIsPending(true);
    setErrorMsg(null);
    const res = await deleteBusinessBenefitAction(businessId, deleteCandidate.id);
    setIsPending(false);

    if (res.success) {
      setDeleteCandidate(null);
    } else {
      setErrorMsg(res.error || 'Erro ao excluir benefício.');
    }
  };

  const now = new Date();

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm" data-testid="benefit-management-table">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Benefícios e Ofertas Fraternas</h2>
          <p className="text-xs text-slate-500">Gerencie os descontos e vantagens especiais concedidas aos membros da comunidade.</p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shrink-0"
          data-testid="create-benefit-btn"
        >
          <Plus className="w-4 h-4" /> Criar Novo Benefício
        </button>
      </div>

      {/* Global Error Banner */}
      {errorMsg && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2" data-testid="benefit-error-banner">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMsg}</div>
        </div>
      )}

      {/* Benefits List / Table */}
      {benefits.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-500 text-sm">
          Nenhum benefício cadastrado até o momento. Clique em &quot;Criar Novo Benefício&quot; para publicar uma oferta fraterna.
        </div>
      ) : (
        <div className="space-y-3">
          {benefits.map((item, idx) => {
            const validFromDate = item.validFrom ? new Date(item.validFrom) : null;
            const validUntilDate = item.validUntil ? new Date(item.validUntil) : null;

            const temporalBadge = !item.isActive ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-full" data-testid="status-inactive">
                <XCircle className="w-3.5 h-3.5" /> Inativo
              </span>
            ) : validUntilDate && validUntilDate <= now ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold text-red-800 bg-red-100 rounded-full" data-testid="status-expired">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Expirado
              </span>
            ) : validFromDate && validFromDate > now ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold text-amber-900 bg-amber-100 rounded-full" data-testid="status-scheduled">
                <Clock className="w-3.5 h-3.5 text-amber-700" /> Agendado (Futuro)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 bg-emerald-100 rounded-full" data-testid="status-active">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Vigente no Guia
              </span>
            );

            return (
              <div
                key={item.id}
                className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                data-testid={`benefit-row-${item.id}`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="p-2.5 bg-amber-50 rounded-lg text-amber-800 shrink-0 border border-amber-200/60">
                    <Tag className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-sm truncate">{item.title}</h3>
                      {temporalBadge}
                      {item.badgeText && (
                        <span className="px-2 py-0.5 text-[11px] font-semibold text-amber-900 bg-amber-200/70 rounded">
                          {item.badgeText}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.description}</p>

                    <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500 flex-wrap">
                      {item.discountCode && (
                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-bold">
                          Código: {item.discountCode}
                        </span>
                      )}
                      {validFromDate && validFromDate > now && (
                        <span className="text-amber-800 font-medium">
                          📅 Entrará no ar em: {new Intl.DateTimeFormat('pt-BR').format(validFromDate)}
                        </span>
                      )}
                      {validUntilDate && (
                        <span>
                          📅 Válido até: {new Intl.DateTimeFormat('pt-BR').format(validUntilDate)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions Toolbar */}
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => { void handleReorder(item, 'up'); }}
                    disabled={isPending || idx === 0}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30"
                    title="Subir Posição"
                    data-testid={`reorder-up-${item.id}`}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => { void handleReorder(item, 'down'); }}
                    disabled={isPending || idx === benefits.length - 1}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30"
                    title="Descer Posição"
                    data-testid={`reorder-down-${item.id}`}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => { void handleToggleActive(item); }}
                    disabled={isPending}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                      item.isActive
                        ? 'text-slate-700 bg-slate-50 border-slate-200 hover:bg-slate-100'
                        : 'text-emerald-800 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                    }`}
                    data-testid={`toggle-active-${item.id}`}
                  >
                    {item.isActive ? 'Desativar' : 'Ativar'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(item)}
                    disabled={isPending}
                    className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                    title="Editar Benefício"
                    data-testid={`edit-benefit-${item.id}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteCandidate(item)}
                    disabled={isPending}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir Definitivamente"
                    data-testid={`delete-benefit-${item.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" data-testid="benefit-modal">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              {editingItem ? 'Editar Benefício VIP' : 'Novo Benefício VIP'}
            </h3>

            <form onSubmit={(e) => { void handleSubmitForm(e); }} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Título da Oferta *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: 20% OFF no Cardápio de Almoço"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  data-testid="input-benefit-title"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição Detalhada *</label>
                <textarea
                  rows={3}
                  required
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Explique os termos e como o membro pode aproveitar..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  data-testid="input-benefit-description"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Código Promocional</label>
                  <input
                    type="text"
                    value={formDiscountCode}
                    onChange={(e) => setFormDiscountCode(e.target.value)}
                    placeholder="Ex: OURO20"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                    data-testid="input-benefit-code"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Texto do Selo (Badge)</label>
                  <input
                    type="text"
                    value={formBadgeText}
                    onChange={(e) => setFormBadgeText(e.target.value)}
                    placeholder="Ex: 20% OFF VIP"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    data-testid="input-benefit-badge"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Instruções de Resgate</label>
                <input
                  type="text"
                  value={formRedeemInstructions}
                  onChange={(e) => setFormRedeemInstructions(e.target.value)}
                  placeholder="Ex: Apresente o código promocional no balcão ou WhatsApp"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  data-testid="input-benefit-instructions"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Válido A Partir De</label>
                  <input
                    type="datetime-local"
                    value={formValidFrom}
                    onChange={(e) => setFormValidFrom(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    data-testid="input-benefit-valid-from"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Válido Até</label>
                  <input
                    type="datetime-local"
                    value={formValidUntil}
                    onChange={(e) => setFormValidUntil(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    data-testid="input-benefit-valid-until"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
                  data-testid="save-benefit-btn"
                >
                  {isPending ? 'Salvando...' : 'Salvar Benefício'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" data-testid="delete-confirm-modal">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-red-700 mb-2">Excluir Benefício Definitivamente?</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Você está prestes a excluir <strong>&quot;{deleteCandidate.title}&quot;</strong>. Esta ação removerá o registro e seu histórico permanentemente do banco de dados.
              <span className="block mt-1 font-semibold text-amber-800">
                💡 Dica: Se quiser apenas pausar a oferta, utilize o botão &quot;Desativar&quot;.
              </span>
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                disabled={isPending}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { void handleConfirmDelete(); }}
                disabled={isPending}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                data-testid="confirm-delete-benefit-btn"
              >
                {isPending ? 'Excluindo...' : 'Excluir Definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
