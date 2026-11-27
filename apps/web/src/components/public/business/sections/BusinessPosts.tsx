import React from 'react';
import { FileText, Clock } from 'lucide-react';
import type { PublicBusinessPost } from '@/lib/business/public-business-presentation';

function formatPostDateBR(isoOrText: string | null): string | null {
  if (!isoOrText) return null;
  const d = new Date(isoOrText);
  if (Number.isNaN(d.getTime())) return isoOrText;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

type BusinessPostsProps = {
  posts: PublicBusinessPost[];
  className?: string;
};

export function BusinessPosts({
  posts,
  className = '',
}: BusinessPostsProps) {
  if (!posts || posts.length === 0) return null;

  return (
    <section id="publicacoes" className={`p-5 rounded-2xl bg-white border border-[#E8E5DF] shadow-xs space-y-4 ${className}`}>
      <div className="flex items-center gap-2 border-b border-stone-100 pb-2.5">
        <FileText className="w-5 h-5 text-[#C9A227]" />
        <h2 className="text-base font-serif font-bold text-[#4B161B] tracking-tight">
          Publicações &amp; Novidades
        </h2>
      </div>

      <div className="space-y-3">
        {posts.map((post) => {
          const dateLabel = formatPostDateBR(post.publishedAt);
          return (
            <article
              key={post.id}
              className="p-4 rounded-xl bg-[#FDFBF7] border border-[#E8E5DF] hover:border-[#C9A227]/60 transition-all space-y-2 shadow-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-serif font-bold text-stone-900 text-sm">
                  {post.title}
                </h3>
                {dateLabel && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-stone-500 font-medium shrink-0" suppressHydrationWarning>
                    <Clock className="w-3 h-3 text-[#C9A227]" />
                    {dateLabel}
                  </span>
                )}
              </div>

              {post.summary && (
                <p className="text-xs font-semibold text-stone-800 leading-relaxed">
                  {post.summary}
                </p>
              )}

              {post.content && (
                <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-line">
                  {post.content}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
