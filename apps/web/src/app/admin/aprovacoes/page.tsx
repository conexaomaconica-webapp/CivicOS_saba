'use client';

import React, { useState } from 'react';
import { Button, Card, Badge, Input, Dialog } from '@saas/ui';
import {
  moderatePublicationStatusAction,
  allocateFounderStatusAction,
} from '@/app/actions/admin-audit';

interface BusinessItem {
  id: string;
  tenant_id: string;
  name: string;
  category: string;
  publication_status: 'draft' | 'pending_review' | 'published' | 'rejected' | 'suspended';
  is_founder: boolean;
  owner_email?: string;
}

export default function AdminAprovacoesPage() {
  const [businesses, setBusinesses] = useState<BusinessItem[]>([
    {
      id: 'biz-101',
      tenant_id: 'tenant-demo',
      name: 'Oficina Mecânica Precision',
      category: 'Serviços Automotivos',
      publication_status: 'pending_review',
      is_founder: false,
      owner_email: 'contato@precision.com',
    },
    {
      id: 'biz-102',
      tenant_id: 'tenant-demo',
      name: 'Advocacia Silva & Irmãos',
      category: 'Serviços Jurídicos',
      publication_status: 'published',
      is_founder: true,
      owner_email: 'silva@advocacia.com',
    },
  ]);

  const [selectedBiz, setSelectedBiz] = useState<BusinessItem | null>(null);
  const [actionType, setActionType] = useState<'publish' | 'reject' | 'suspend' | 'toggle_founder' | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleOpenDialog = (biz: BusinessItem, type: 'publish' | 'reject' | 'suspend' | 'toggle_founder') => {
    setSelectedBiz(biz);
    setActionType(type);
    setReason('');
    setMessage(null);
  };

  const handleConfirmAction = async () => {
    if (!selectedBiz || !actionType) return;
    setLoading(true);
    setMessage(null);

    try {
      if (actionType === 'toggle_founder') {
        const newFounderState = !selectedBiz.is_founder;
        const res = await allocateFounderStatusAction({
          tenantId: selectedBiz.tenant_id,
          businessId: selectedBiz.id,
          isFounder: newFounderState,
          reason: reason || `Alteração do selo Founder para ${newFounderState}`,
        });

        if (!res.success) throw new Error(res.error || 'Falha ao alterar Founder');

        setBusinesses((prev) =>
          prev.map((b) => (b.id === selectedBiz.id ? { ...b, is_founder: newFounderState } : b))
        );
        setMessage({ type: 'success', text: `Status Founder atualizado com sucesso! (Publicação inalterada: ${selectedBiz.publication_status})` });
      } else {
        const newStatus =
          actionType === 'publish'
            ? 'published'
            : actionType === 'reject'
            ? 'rejected'
            : 'suspended';

        const res = await moderatePublicationStatusAction({
          tenantId: selectedBiz.tenant_id,
          businessId: selectedBiz.id,
          newStatus,
          reason: reason || `Moderação administrativa: ${newStatus}`,
        });

        if (!res.success) throw new Error(res.error || 'Falha ao moderar publicação');

        setBusinesses((prev) =>
          prev.map((b) => (b.id === selectedBiz.id ? { ...b, publication_status: newStatus } : b))
        );
        setMessage({ type: 'success', text: `Status de publicação alterado para ${newStatus}!` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erro ao processar ação.' });
    } finally {
      setLoading(false);
      setSelectedBiz(null);
      setActionType(null);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Aprovações e Moderação de Empresas
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Gerencie o status de publicação das empresas e a concessão do selo Founder de forma totalmente independente.
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

      <div className="grid gap-4">
        {businesses.map((biz) => (
          <Card key={biz.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-lg text-slate-900 dark:text-white">{biz.name}</h3>
                <Badge
                  variant={
                    biz.publication_status === 'published'
                      ? 'success'
                      : biz.publication_status === 'pending_review'
                      ? 'warning'
                      : 'danger'
                  }
                >
                  {biz.publication_status}
                </Badge>
                {biz.is_founder && (
                  <Badge variant="info" className="bg-amber-100 text-amber-900 border-amber-300">
                    Selo Founder Ativo
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-500">{biz.category} • ID: {biz.id}</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenDialog(biz, 'toggle_founder')}
              >
                {biz.is_founder ? 'Revogar Founder' : 'Conceder Founder'}
              </Button>
              {biz.publication_status !== 'published' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenDialog(biz, 'publish')}
                >
                  Aprovar & Publicar
                </Button>
              )}
              {biz.publication_status === 'published' && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleOpenDialog(biz, 'suspend')}
                >
                  Suspender
                </Button>
              )}
              {biz.publication_status === 'pending_review' && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleOpenDialog(biz, 'reject')}
                >
                  Rejeitar
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {selectedBiz && actionType && (
        <Dialog
          isOpen={true}
          onClose={() => setSelectedBiz(null)}
          title={`Confirmar Ação: ${
            actionType === 'publish'
              ? 'Aprovar e Publicar'
              : actionType === 'reject'
              ? 'Rejeitar Anúncio'
              : actionType === 'suspend'
              ? 'Suspender Anúncio'
              : 'Alterar Status Founder'
          }`}
        >
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Você está prestes a modificar o perfil da empresa <strong className="font-semibold">{selectedBiz.name}</strong>.
            </p>

            {actionType === 'toggle_founder' ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 text-amber-900 dark:text-amber-200 rounded text-xs">
                ⚠️ Conceder ou revogar o selo Founder NUNCA altera o <strong>publication_status</strong> ({selectedBiz.publication_status}) da empresa.
              </div>
            ) : (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 text-blue-900 dark:text-blue-200 rounded text-xs">
                ℹ️ Esta ação alterará o status de publicação da empresa para <strong>{actionType === 'publish' ? 'published' : actionType === 'reject' ? 'rejected' : 'suspended'}</strong> e registrará um audit log administrativo.
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Motivo / Justificativa Administrativa:
              </label>
              <Input
                placeholder="Ex: Documentação verificada e homologada"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSelectedBiz(null)}>
                Cancelar
              </Button>

              <Button
                variant={actionType === 'publish' ? 'primary' : 'danger'}
                onClick={handleConfirmAction}
                disabled={loading}
              >
                {loading ? 'Processando...' : 'Confirmar e Salvar Audit Log'}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
