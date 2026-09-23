import React from 'react';
import { Star, ThumbsUp, MessageSquareQuote, UserRound } from 'lucide-react';
import type { PublicBusinessPresentation } from '@/lib/business/public-business-presentation';
import { BusinessReviewForm } from './BusinessReviewForm';
import { CollapsibleReviewComment } from './CollapsibleReviewComment';

type BusinessCommunityReviewsCardProps = {
  reviews: PublicBusinessPresentation['reviews'];
  owner: PublicBusinessPresentation['owner'];
  businessSlug: string;
  className?: string;
};

export function BusinessCommunityReviewsCard({
  reviews,
  owner,
  businessSlug,
  className = '',
}: BusinessCommunityReviewsCardProps) {
  const count = reviews.count || (reviews.items ? reviews.items.length : 0);
  const average = count > 0 ? (reviews.average ?? 5.0) : 0;
  const endorsedCount = owner?.endorsedByCount || 0;
  const endorserAvatars = owner?.endorserAvatars || [];
  const ratingCounts = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.items.filter((review) => review.rating === stars).length,
  }));
  const distributionTotal = ratingCounts.reduce((total, row) => total + row.count, 0);

  return (
    <div id="comentarios" className={`space-y-6 ${className}`}>
      
      {/* CARD INDICADO POR X MEMBROS (EXIBIDO EXCLUSIVAMENTE QUANDO HOUVER INDICAÇÕES REALIZADAS) */}
      {endorsedCount > 0 && (
        <div className="p-4 rounded-2xl bg-white border border-[#E8E5DF] shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-stone-900 font-semibold text-xs sm:text-sm">
            <ThumbsUp className="w-4 h-4 text-[#C9A227]" />
            <span>
              Indicado por <strong className="text-[#4B161B] font-bold">{endorsedCount} {endorsedCount === 1 ? 'membro' : 'membros'}</strong> da comunidade
            </span>
          </div>

          {/* Pilha de avatares: EXIBE APENAS SE HOUVER DADOS REAIS DE AVATARES DE MEMBROS */}
          {endorserAvatars.length > 0 && (
            <div className="flex items-center -space-x-2 overflow-hidden">
              {endorserAvatars.slice(0, 5).map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt="Membro que recomendou"
                  className="inline-block h-7 w-7 rounded-full ring-2 ring-white object-cover shadow-xs"
                />
              ))}
              {endorsedCount > 5 && (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4B161B] text-[10px] font-bold text-[#F3EEDD] ring-2 ring-white shadow-xs">
                  +{endorsedCount - 5}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SEÇÃO AVALIAÇÕES E DEPOIMENTOS */}
      <div className="flex flex-col gap-4">
        
        {/* LADO ESQUERDO: Pontuação Média e Distribuição de Estrelas */}
        <div className="p-5 rounded-2xl bg-white border border-[#E8E5DF] shadow-xs space-y-4">
          <h3 className="font-serif font-bold text-sm text-[#4B161B]">
            Avaliações
          </h3>

          <div className="flex items-baseline gap-3">
            <span className="font-serif font-black text-4xl text-stone-900">
              {count > 0 ? average.toFixed(1) : '—'}
            </span>
            <div>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      count > 0 && i < Math.round(average)
                        ? 'text-[#C9A227] fill-[#C9A227]'
                        : 'text-stone-300 fill-stone-100'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-stone-600 font-medium mt-0.5">
                {count > 0 ? `${count} ${count === 1 ? 'avaliação' : 'avaliações'}` : 'Sem avaliações ainda'}
              </p>
            </div>
          </div>

          {/* Barras de Progresso por Estrela */}
          <div className="space-y-1.5 text-xs text-stone-600 pt-2 border-t border-stone-100">
            {ratingCounts.map((row) => (
              <div key={row.stars} className="flex items-center gap-2">
                <span className="w-6 text-right text-[11px] font-medium text-stone-700">{row.stars} ★</span>
                <div className="flex-1 h-2 bg-[#FDFBF7] border border-[#E8E5DF] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#C9A227] rounded-full"
                    style={{ width: `${distributionTotal > 0 ? (row.count / distributionTotal) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-6 text-right text-[11px] font-medium text-stone-600">{row.count}</span>
              </div>
            ))}
          </div>
        </div>

        <BusinessReviewForm businessSlug={businessSlug} />

        {/* LADO DIREITO: O que os membros estão dizendo (Depoimentos) */}
        <div className="p-5 rounded-2xl bg-white border border-[#E8E5DF] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <h3 className="font-serif font-bold text-sm text-[#4B161B] flex items-center gap-1.5">
              <MessageSquareQuote className="w-4 h-4 text-[#C9A227]" />
              <span>O que os membros estão dizendo</span>
            </h3>
            {reviews.items && reviews.items.length > 0 && (
              <span className="text-xs font-semibold text-[#4B161B] hover:underline cursor-pointer">
                Ver todas
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {reviews.items && reviews.items.length > 0 ? (
              reviews.items.map((item) => (
                <div key={item.id} className="p-3.5 rounded-xl bg-[#FDFBF7] border border-[#E8E5DF] space-y-2">
                  <div className="flex items-center gap-2.5">
                    {item.authorAvatar?.url ? (
                      <img src={item.authorAvatar.url} alt={item.authorName || 'Membro'} className="w-8 h-8 rounded-full object-cover shadow-xs shrink-0" />
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-200 text-stone-600 shadow-xs" aria-label="Avatar padrão">
                        <UserRound className="h-4 w-4" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs text-stone-900 truncate">
                        {item.authorName || 'Membro da Comunidade'}
                      </h4>
                      <div className="flex items-center gap-0.5 text-[#C9A227]">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-current" />
                        ))}
                      </div>
                    </div>
                  </div>

                  {item.comment && (
                    <CollapsibleReviewComment comment={item.comment} />
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-full p-4 rounded-xl bg-[#FDFBF7] border border-[#E8E5DF] text-center text-xs text-stone-600">
                Esta empresa ainda não possui depoimentos públicos de membros.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

export function BusinessReviews(props: BusinessCommunityReviewsCardProps) {
  return <BusinessCommunityReviewsCard {...props} />;
}
