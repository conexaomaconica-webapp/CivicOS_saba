import React from 'react';
import { Star } from 'lucide-react';
import type { PublicBusinessPresentation } from '@/lib/business/public-business-presentation';

type BusinessReviewsProps = {
  reviews: PublicBusinessPresentation['reviews'];
  variant?: 'bronze' | 'prata' | 'ouro';
  className?: string;
};

export function BusinessReviews({
  reviews,
  className = '',
}: BusinessReviewsProps) {
  const average = reviews.average ?? 5.0;
  const count = reviews.count;

  return (
    <section className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between border-b border-stone-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-[#C9A227] fill-current" />
          <h2 className="text-lg font-serif font-bold text-stone-100 tracking-tight">
            Avaliações da Comunidade
          </h2>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-stone-900 border border-stone-800">
          <Star className="w-4 h-4 text-[#C9A227] fill-current" />
          <span className="font-bold text-stone-100 text-sm">{average.toFixed(1)}</span>
          <span className="text-xs text-stone-400">({count} avaliações)</span>
        </div>
      </div>

      {reviews.items && reviews.items.length > 0 ? (
        <div className="space-y-3">
          {reviews.items.map((review) => (
            <div
              key={review.id}
              className="p-3.5 rounded-xl bg-stone-900/60 border border-stone-800 space-y-1.5 shadow-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < review.rating
                          ? 'text-[#C9A227] fill-current'
                          : 'text-stone-700'
                      }`}
                    />
                  ))}
                </div>
                {review.publishedAt && (
                  <span className="text-[11px] text-stone-500 font-mono">
                    {review.publishedAt}
                  </span>
                )}
              </div>

              {review.comment && (
                <p className="text-xs text-stone-300 leading-relaxed italic">
                  "{review.comment}"
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-stone-900/40 border border-stone-800 text-center text-xs text-stone-400">
          Esta empresa ainda não possui comentários adicionais, mas possui avaliação fraterna recomendada.
        </div>
      )}
    </section>
  );
}
