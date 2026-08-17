'use client';

import React, { useState } from 'react';
import { Button, Card, Badge, Input, Dialog } from '@saas/ui';
import { updatePlanQuotaAction } from '@/app/actions/admin-audit';

interface QuotaItem {
  id: string;
  tenant_id: string;
  plan_code: string;
  services_limit: number;
  benefits_limit: number;
  gallery_limit: number;
}

export default function AdminPlanQuotasPage() {
  const [quotas, setQuotas] = useState<QuotaItem[]>([
    {
      id: 'ent-bronze-01',
      tenant_id: 'tenant-demo',
      plan_code: 'bronze',
      services_limit: 3,
      benefits_limit: 1,
      gallery_limit: 3,
    },
    {
      id: 'ent-prata-01',
      tenant_id: 'tenant-demo',
      plan_code: 'prata',
      services_limit: 10,
      benefits_limit: 5,
      gallery_limit: 10,
    },
    {
      id: 'ent-ouro-01',
      tenant_id: 'tenant-demo',
      plan_code: 'ouro',
      services_limit: 25,
      benefits_limit: 15,
      gallery_limit: 25,
    },
  ]);

  const [editingQuota, setEditingQuota] = useState<QuotaItem | null>(null);
  const [newServices, setNewServices] = useState<number>(0);
  const [newBenefits, setNewBenefits] = useState<number>(0);
  const [newGallery, setNewGallery] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleOpenEdit = (q: QuotaItem) => {
    setEditingQuota(q);
    setNewServices(q.services_limit);
    setNewBenefits(q.benefits_limit);
    setNewGallery(q.gallery_limit);
    setReason('');
    setShowConfirm(false);
    setMessage(null);
  };

  const handleReviewImpact = () => {
    if (!reason.trim()) {
      setMessage({ type: 'error', text: 'Você precisa fornecer um motivo/justificativa para alterar as cotas.' });
      return;
    }
    setMessage(null);
    setShowConfirm(true);
  };

  const handleSaveQuota = async () => {
    if (!editingQuota) return;
    setLoading(true);
    setMessage(null);

    try {
      const res = await updatePlanQuotaAction({
        tenantId: editingQuota.tenant_id,
        entitlementId: editingQuota.id,
        servicesLimit: newServices,
        benefitsLimit: newBenefits,
        galleryLimit: newGallery,
        reason: reason.trim(),
      });

      if (!res.success) {
        throw new Error(res.error || 'Falha ao atualizar cotas. Verifique suas permissões (Requer platform_admin).');
      }

      setQuotas((prev) =>
        prev.map((item) =>
          item.id === editingQuota.id
            ? {
                ...item,
                services_limit: newServices,
                benefits_limit: newBenefits,
                gallery_limit: newGallery,
              }
            : item
        )
      );

      setMessage({
        type: 'success',
        text: `Cotas do plano ${editingQuota.plan_code.toUpperCase()} atualizadas e registradas no audit log!`,
      });
      setEditingQuota(null);
      setShowConfirm(false);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erro ao atualizar cotas.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Gestão de Cotas & Entitlements dos Planos
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Altere os limites de serviços, benefícios e galeria de fotos por plano. Requer perfil <strong>platform_admin</strong>.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-md text-sm font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {quotas.map((q) => (
          <Card key={q.id} className="p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg capitalize text-slate-900 dark:text-white">
                  Plano {q.plan_code}
                </h3>
                <Badge variant={q.plan_code === 'ouro' ? 'warning' : 'outline'}>
                  {q.plan_code.toUpperCase()}
                </Badge>
              </div>

              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex justify-between border-b pb-1">
                  <span>Limite de Serviços:</span>
                  <strong className="font-semibold text-slate-900 dark:text-white">{q.services_limit}</strong>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>Limite de Benefícios:</span>
                  <strong className="font-semibold text-slate-900 dark:text-white">{q.benefits_limit}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Fotos na Galeria:</span>
                  <strong className="font-semibold text-slate-900 dark:text-white">{q.gallery_limit}</strong>
                </div>
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={() => handleOpenEdit(q)}>
              Editar Cotas & Auditoria
            </Button>
          </Card>
        ))}
      </div>

      {editingQuota && (
        <Dialog
          isOpen={true}
          onClose={() => setEditingQuota(null)}
          title={`Editar Cotas — Plano ${editingQuota.plan_code.toUpperCase()}`}
        >
          <div className="space-y-4 py-2">
            {!showConfirm ? (
              <>
                <p className="text-xs text-slate-500">
                  Qualquer alteração afetará imediatamente todas as empresas associadas a este plano.
                </p>

                <div className="grid gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Limite de Serviços:
                    </label>
                    <Input
                      type="number"
                      value={newServices}
                      onChange={(e) => setNewServices(Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Limite de Benefícios:
                    </label>
                    <Input
                      type="number"
                      value={newBenefits}
                      onChange={(e) => setNewBenefits(Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Fotos na Galeria:
                    </label>
                    <Input
                      type="number"
                      value={newGallery}
                      onChange={(e) => setNewGallery(Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Motivo Obrigatório para Auditoria:
                    </label>
                    <Input
                      placeholder="Ex: Atualização da tabela de preços H2/2026"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setEditingQuota(null)}>
                    Cancelar
                  </Button>
                  <Button variant="default" onClick={handleReviewImpact}>
                    Revisar Impacto (Before → After)
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded text-xs space-y-2">
                  <h4 className="font-bold text-amber-900">Confirmação de Impacto Administrativo</h4>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <div>
                      <strong>Antes (Before):</strong>
                      <ul className="list-disc pl-4 mt-1">
                        <li>Serviços: {editingQuota.services_limit}</li>
                        <li>Benefícios: {editingQuota.benefits_limit}</li>
                        <li>Galeria: {editingQuota.gallery_limit}</li>
                      </ul>
                    </div>
                    <div>
                      <strong>Depois (After):</strong>
                      <ul className="list-disc pl-4 mt-1">
                        <li>Serviços: {newServices}</li>
                        <li>Benefícios: {newBenefits}</li>
                        <li>Galeria: {newGallery}</li>
                      </ul>
                    </div>
                  </div>
                  <div className="pt-1 text-amber-800">
                    <strong>Motivo:</strong> &quot;{reason}&quot;
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setShowConfirm(false)}>
                    Voltar
                  </Button>
                  <Button variant="default" onClick={handleSaveQuota} disabled={loading}>
                    {loading ? 'Gravando Audit Log...' : 'Confirmar e Salvar no Audit Log'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}
