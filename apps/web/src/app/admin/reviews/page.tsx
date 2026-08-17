'use client';

import React, { useState } from 'react';
import { Button, Card, Badge, Input, Dialog } from '@saas/ui';
import { moderateReviewAction } from '@/app/actions/admin-audit';

interface PendingReview {
  id: string;
  business_name: string;
  author_name: string;
  rating: number;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<PendingReview[]>([
    {
      id: 'rev-01',
      business_name: 'Oficina Mecânica Precision',
      author_name: 'Irmão Carlos Eduardo',
      rating: 5,
      comment: 'Atendimento excepcional e transparência nos orçamentos.',
      status: 'pending',
      created_at: new Date().toISOString(),
    },
    {
      id: 'rev-02',
      business_name: 'Advocacia Silva & Irmãos',
      author_name: 'Irmão Roberto',
      rating: 4,
      comment: 'Excelente consultoria jurídica prestada.',
      status: 'pending',
      created_at: new Date().toISOString(),
    },
  ]);

  const [selectedReview, setSelectedReview] = useState<PendingReview | null>(null);
  const [targetStatus, setTargetStatus] = useState<'approved' | 'rejected' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleOpenDialog = (rev: PendingReview, status: 'approved' | 'rejected') => {
    setSelectedReview(rev);
    setTargetStatus(status);
    setRejectionReason('');
    setMessage(null);
  };

  const handleModerate = async () => {
    if (!selectedReview || !targetStatus) return;
    setLoading(true);
    setMessage(null);

    try {
      const res = await moderateReviewAction({
        reviewId: selectedReview.id,
        status: targetStatus,
        rejectionReason: rejectionReason || undefined,
      });

      if (!res.success) throw new Error(res.error || 'Falha ao moderar avaliação.');

      setReviews((prev) =>
        prev.map((r) => (r.id === selectedReview.id ? { ...r, status: targetStatus } : r))
      );

      setMessage({
        type: 'success',
        text: `Avaliação ${targetStatus === 'approved' ? 'aprovada' : 'rejeitada'} com sucesso! (Histórico preservado)`,
      });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erro ao processar moderação.' });
    } finally {
      setLoading(false);
      setSelectedReview(null);
      setTargetStatus(null);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Painel de Moderação de Avaliações
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Aprove ou rejeite avaliações enviadas por usuários. Todas as avaliações nascem como <strong>pending</strong> e preservam histórico sem exclusão física.
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
        {reviews.map((rev) => (
          <Card key={rev.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <Badge variant={rev.status === 'approved' ? 'success' : rev.status === 'pending' ? 'warning' : 'destructive'}>
                  {rev.status}
                </Badge>
                <span className="text-sm font-bold text-amber-500">
                  {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)} ({rev.rating}/5)
                </span>
                <span className="text-xs text-slate-400">por {rev.author_name}</span>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Empresa: {rev.business_name}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 italic">
                &quot;{rev.comment}&quot;
              </p>
            </div>

            {rev.status === 'pending' && (
              <div className="flex items-center gap-2">
                <Button variant="default" size="sm" onClick={() => handleOpenDialog(rev, 'approved')}>
                  Aprovar Review
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleOpenDialog(rev, 'rejected')}>
                  Rejeitar
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      {selectedReview && targetStatus && (
        <Dialog
          isOpen={true}
          onClose={() => setSelectedReview(null)}
          title={`Confirmar Moderação: ${targetStatus === 'approved' ? 'Aprovar' : 'Rejeitar'}`}
        >
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Você está modenrando a avaliação de <strong className="font-semibold">{selectedReview.author_name}</strong> para a empresa <strong>{selectedReview.business_name}</strong>.
            </p>

            {targetStatus === 'rejected' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Motivo da Rejeição (para registro no BD):
                </label>
                <Input
                  placeholder="Ex: Conteúdo impróprio ou fora das diretrizes"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSelectedReview(null)}>
                Cancelar
              </Button>
              <Button
                variant={targetStatus === 'approved' ? 'default' : 'destructive'}
                onClick={handleModerate}
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Confirmar e Salvar'}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
