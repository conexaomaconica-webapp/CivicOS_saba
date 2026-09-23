'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

type CollapsibleReviewCommentProps = {
  comment: string;
  tone?: 'light' | 'dark';
};

export function CollapsibleReviewComment({ comment, tone = 'light' }: CollapsibleReviewCommentProps) {
  const [expanded, setExpanded] = useState(false);
  const canCollapse = comment.trim().length > 160;
  const textColor = tone === 'dark' ? 'text-stone-300' : 'text-stone-700';
  const buttonColor = tone === 'dark' ? 'text-[#D9BD64] hover:text-[#F3EEDD]' : 'text-[#4B161B] hover:text-[#6A2028]';

  return (
    <div className="space-y-1.5">
      <p className={`text-xs leading-relaxed italic whitespace-pre-line break-words ${textColor} ${canCollapse && !expanded ? 'line-clamp-3' : ''}`}>
        &ldquo;{comment}&rdquo;
      </p>
      {canCollapse && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
          className={`inline-flex items-center gap-1 text-[11px] font-bold underline-offset-2 hover:underline ${buttonColor}`}
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expanded ? 'Recolher avaliação' : 'Ver avaliação completa'}
        </button>
      )}
    </div>
  );
}
