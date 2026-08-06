import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Badge } from '@saas/ui';
import { BusinessCardViewModel } from '../../_types/view-models';
import { CommunityBadge } from './CommunityBadge';

export interface BusinessCardViewProps {
  viewModel: BusinessCardViewModel;
  onContactClick?: (id: string) => void;
  compact?: boolean;
}

export function BusinessCardView({ viewModel, onContactClick, compact = false }: BusinessCardViewProps) {
  return (
    <Card variant="elevated" className="h-full flex flex-col justify-between hover:border-slate-700 transition-all">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="truncate">{viewModel.title}</CardTitle>
              {viewModel.badges.map((b, idx) => (
                <CommunityBadge
                  key={idx}
                  label={b.label}
                  category={b.category}
                  tone={b.tone}
                  icon={b.icon}
                  size="sm"
                />
              ))}
            </div>
            <CardDescription className="truncate">{viewModel.category}</CardDescription>
          </div>

          <Badge variant={viewModel.statusTone} size="sm">
            {viewModel.statusLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 flex-1">
        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
          {viewModel.subtitle}
        </p>

        {!compact && (
          <div className="text-xs text-slate-400 space-y-1 font-mono pt-1">
            <div>📍 {viewModel.locationMasked}</div>
            <div>📞 {viewModel.contactMasked}</div>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <span className="text-xs font-mono text-slate-400">
          Reputação: <strong className="text-amber-400">{viewModel.ratingFormatted}</strong> ({viewModel.reviewCount})
        </span>
        <Button
          size="sm"
          variant={!viewModel.isInteractable ? 'outline' : 'primary'}
          disabled={!viewModel.isInteractable}
          onClick={() => onContactClick?.(viewModel.id)}
        >
          {!viewModel.isInteractable ? 'Indisponível' : 'Contactar'}
        </Button>
      </CardFooter>
    </Card>
  );
}

export { BusinessCardView as BusinessCard };
