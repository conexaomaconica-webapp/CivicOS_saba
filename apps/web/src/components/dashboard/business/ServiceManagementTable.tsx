'use client';

import { useState } from 'react';
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Briefcase,
} from 'lucide-react';
import {
  createBusinessServiceAction,
  updateBusinessServiceAction,
  toggleBusinessServiceActiveAction,
  reorderBusinessServiceAction,
  deleteBusinessServiceAction,
} from '@/app/actions/business-management';

export interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  iconName: string | null;
  priceInfo: string | null;
  isActive: boolean;
  displayOrder: number;
}

interface Props {
  businessId: string;
  services: ServiceItem[];
  maxLimit: number | null;
  planName: string;
}

export function ServiceManagementTable({ businessId, services, maxLimit, planName }: Props) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  // Form modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formIcon, setFormIcon] = useState('briefcase');
  const [formPrice, setFormPrice] = useState('');

  // Delete modal state
  const [deleteCandidate, setDeleteCandidate] = useState<ServiceItem | null>(null);

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormName('');
    setFormDesc('');
    setFormIcon('briefcase');
    setFormPrice('');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (item: ServiceItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormDesc(item.description || '');
    setFormIcon(item.iconName || 'briefcase');
    setFormPrice(item.priceInfo || '');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  // Submit Form (Create or Edit)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setIsPending(true);
    setErrorMsg(null);

    let res;
    if (editingItem) {
      res = await updateBusinessServiceAction(businessId, editingItem.id, {
        name: formName,
        description: formDesc || null,
        iconName: formIcon || null,
        priceInfo: formPrice || null,
      });
    } else {
      res = await createBusinessServiceAction(businessId, {
        name: formName,
        description: formDesc || null,
        iconName: formIcon || null,
        priceInfo: formPrice || null,
      });
    }

    setIsPending(false);

    if (res.success) {
      setIsModalOpen(false);
    } else {
      setErrorMsg(res.error || 'Erro ao salvar serviço.');
    }
  };

  // Toggle Active
  const handleToggleActive = async (item: ServiceItem) => {
    setIsPending(true);
    setErrorMsg(null);
    const res = await toggleBusinessServiceActiveAction(businessId, item.id, !item.isActive);
    setIsPending(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Erro ao alterar status do serviço.');
    }
  };

  // Reorder (Up / Down)
  const handleReorder = async (item: ServiceItem, direction: 'up' | 'down') => {
    setIsPending(true);
    setErrorMsg(null);
    const res = await reorderBusinessServiceAction(businessId, item.id, direction);
    setIsPending(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Erro ao reordenar serviço.');
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;

    setIsPending(true);
    setErrorMsg(null);
    const res = await deleteBusinessServiceAction(businessId, deleteCandidate.id);
    setIsPending(false);

    if (res.success) {
      setDeleteCandidate(null);
    } else {
      setErrorMsg(res.error || 'Erro ao excluir serviço.');
    }
  };

  // Compute publication status for each service based on display order and active flag
  let activeCounter = 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm" data-testid="service-management-table">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Catálogo de Serviços</h2>
          <p className="text-xs text-slate-500">Gerencie a lista de serviços apresentados na sua página do Guia.</p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shrink-0"
          data-testid="create-service-btn"
        >
          <Plus className="w-4 h-4" /> Adicionar Serviço
        </button>
      </div>

      {/* Global Error Banner */}
      {errorMsg && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2" data-testid="service-error-banner">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMsg}</div>
        </div>
      )}

      {/* Services List / Table */}
      {services.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-500 text-sm">
          Nenhum serviço cadastrado até o momento. Clique em &quot;Adicionar Serviço&quot; para começar.
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((item, idx) => {
            activeCounter++;
            const isWithinQuota = maxLimit === null || activeCounter <= maxLimit;

            const statusBadge = !item.isActive ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-full" data-testid="status-inactive">
                <XCircle className="w-3.5 h-3.5" /> Inativo
              </span>
            ) : isWithinQuota ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 bg-emerald-100 rounded-full" data-testid="status-published">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Publicado no Guia
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold text-amber-900 bg-amber-100 rounded-full" data-testid="status-stored">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700" /> Armazenado ({planName})
              </span>
            );

            return (
              <div
                key={item.id}
                className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                data-testid={`service-row-${item.id}`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="p-2.5 bg-slate-100 rounded-lg text-slate-700 shrink-0">
                    <Briefcase className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-sm truncate">{item.name}</h3>
                      {statusBadge}
                      {item.priceInfo && (
                        <span className="px-2 py-0.5 text-[11px] font-semibold text-amber-900 bg-amber-100 rounded">
                          {item.priceInfo}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                </div>

                {/* Actions Toolbar */}
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  {/* Reorder Buttons */}
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
                    disabled={isPending || idx === services.length - 1}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30"
                    title="Descer Posição"
                    data-testid={`reorder-down-${item.id}`}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>

                  {/* Toggle Active Button */}
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

                  {/* Edit Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(item)}
                    disabled={isPending}
                    className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                    title="Editar Serviço"
                    data-testid={`edit-service-${item.id}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => setDeleteCandidate(item)}
                    disabled={isPending}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir Definitivamente"
                    data-testid={`delete-service-${item.id}`}
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" data-testid="service-modal">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              {editingItem ? 'Editar Serviço' : 'Novo Serviço'}
            </h3>

            <form onSubmit={(e) => { void handleSubmitForm(e); }} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome do Serviço *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Consultoria de Injeção Eletrônica"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  data-testid="input-service-name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição</label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Descreva brevemente os diferenciais do serviço..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  data-testid="input-service-description"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ícone</label>
                  <select
                    value={formIcon}
                    onChange={(e) => setFormIcon(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    data-testid="select-service-icon"
                  >
                    <option value="briefcase">Briefcase</option>
                    <option value="clock">Clock</option>
                    <option value="shield">Shield</option>
                    <option value="gift">Gift</option>
                    <option value="wrench">Wrench</option>
                    <option value="star">Star</option>
                    <option value="truck">Truck</option>
                    <option value="building">Building</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Informação de Preço</label>
                  <input
                    type="text"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="Ex: Sob consulta ou A partir de R$ 50"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    data-testid="input-service-price"
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
                  data-testid="save-service-btn"
                >
                  {isPending ? 'Salvando...' : 'Salvar Serviço'}
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
            <h3 className="text-base font-bold text-red-700 mb-2">Excluir Serviço Definitivamente?</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Você está prestes a excluir <strong>&quot;{deleteCandidate.name}&quot;</strong>. Esta ação removerá o registro e seu histórico permanentemente do banco de dados.
              <span className="block mt-1 font-semibold text-amber-800">
                💡 Dica: Se quiser apenas pausar a publicação no Guia, utilize o botão &quot;Desativar&quot;.
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
                data-testid="confirm-delete-service-btn"
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
