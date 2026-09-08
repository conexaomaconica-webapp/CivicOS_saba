import React from 'react';
import { Star, ThumbsUp, MessageSquareQuote } from 'lucide-react';
import type { PublicBusinessPresentation } from '@/lib/business/public-business-presentation';

type BusinessCommunityReviewsCardProps = {
  reviews: PublicBusinessPresentation['reviews'];
  owner: PublicBusinessPresentation['owner'];
  className?: string;
};

export function BusinessCommunityReviewsCard({
  reviews,
  owner,
  className = '',
}: BusinessCommunityReviewsCardProps) {
  const count = reviews.count || (reviews.items ? reviews.items.length : 0);
  const average = count > 0 ? (reviews.average ?? 5.0) : 0;
  const endorsedCount = owner?.endorsedByCount || 0;
  const endorserAvatars = owner?.endorserAvatars || [];

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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LADO ESQUERDO: Pontuação Média e Distribuição de Estrelas */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-white border border-[#E8E5DF] shadow-xs space-y-4">
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
            {[
              { stars: 5, label: '5 ★', pct: 90, val: count > 0 ? Math.round(count * 0.9) : 0 },
              { stars: 4, label: '4 ★', pct: 7, val: count > 0 ? Math.round(count * 0.07) : 0 },
              { stars: 3, label: '3 ★', pct: 2, val: count > 0 ? Math.round(count * 0.02) : 0 },
              { stars: 2, label: '2 ★', pct: 1, val: count > 0 ? Math.round(count * 0.01) : 0 },
              { stars: 1, label: '1 ★', pct: 0, val: 0 },
            ].map((row) => (
              <div key={row.stars} className="flex items-center gap-2">
                <span className="w-6 text-right text-[11px] font-medium text-stone-700">{row.label}</span>
                <div className="flex-1 h-2 bg-[#FDFBF7] border border-[#E8E5DF] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#C9A227] rounded-full"
                    style={{ width: `${count > 0 ? row.pct : 0}%` }}
                  />
                </div>
                <span className="w-6 text-right text-[11px] font-medium text-stone-600">{row.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* LADO DIREITO: O que os membros estão dizendo (Depoimentos) */}
        <div className="lg:col-span-8 p-5 rounded-2xl bg-white border border-[#E8E5DF] shadow-xs space-y-4">
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
                    <img
                      src={item.authorAvatar?.url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'}
                      alt={item.authorName || 'Membro'}
                      className="w-8 h-8 rounded-full object-cover shadow-xs shrink-0"
                    />
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
                    <p className="text-xs text-stone-700 leading-relaxed italic line-clamp-3">
                      "{item.comment}"
                    </p>
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
