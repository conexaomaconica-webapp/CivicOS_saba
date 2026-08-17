'use client';

import React, { useState } from 'react';
import { Button, Input } from '@saas/ui';
import { submitBusinessReviewAction } from '@/app/actions/reviews';

interface PublicReviewFormProps {
  tenantId: string;
  businessId: string;
}

export function PublicReviewForm({ tenantId, businessId }: PublicReviewFormProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await submitBusinessReviewAction({
        tenantId,
        businessId,
        rating,
        comment,
      });

      if (res.success) {
        setResult({
          success: true,
          message:
            'Sua avaliação foi enviada com sucesso! Ela passará por moderação administrativa (status: pending) antes de aparecer publicamente.',
        });
        setComment('');
      } else {
        setResult({
          success: false,
          message: res.error || 'Não foi possível enviar a avaliação.',
        });
      }
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : 'Erro ao processar envio.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">
        Avaliar esta Empresa
      </h3>
      <p className="text-xs text-slate-500">
        Sua nota e comentários ajudam a comunidade. Avaliações passam por moderação antes da publicação.
      </p>

      {result?.message && (
        <div
          className={`p-3 rounded text-xs font-medium ${
            result.success
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {result.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Nota da Avaliação:
          </label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={`text-2xl transition-transform hover:scale-110 ${
                  star <= rating ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'
                }`}
                onClick={() => setRating(star)}
              >
                ★
              </button>
            ))}
            <span className="ml-2 text-xs font-bold text-slate-600 dark:text-slate-400">
              ({rating} de 5 estrelas)
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Comentário (opcional):
          </label>
          <Input
            placeholder="Conte sua experiência com este estabelecimento..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        <Button type="submit" variant="default" size="sm" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar Avaliação (Pendente de Moderação)'}
        </Button>
      </form>
    </div>
  );
}
