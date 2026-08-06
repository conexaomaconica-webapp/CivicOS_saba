import React from 'react';
import { Badge } from '@saas/ui';

export interface StatusTimelineStep {
  label: string;
  timestamp: string;
  status: 'completed' | 'current' | 'pending' | 'error';
}

export interface StatusTimelineProps {
  steps: StatusTimelineStep[];
  orientation?: 'vertical' | 'horizontal';
  compact?: boolean;
}

export function StatusTimeline({
  steps,
  orientation = 'vertical',
  compact = false
}: StatusTimelineProps) {
  const isHorizontal = orientation === 'horizontal';

  const toneMap = {
    completed: 'success' as const,
    current: 'info' as const,
    pending: 'neutral' as const,
    error: 'danger' as const
  };

  return (
    <div className={`p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-4 ${compact ? 'text-xs' : ''}`}>
      <div className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider">
        Linha do Tempo de Estados Operacionais & Jurídicos
      </div>

      <div
        className={
          isHorizontal
            ? 'flex items-start gap-4 overflow-x-auto pb-2'
            : 'space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800'
        }
      >
        {steps.map((step, idx) => {
          const isCompleted = step.status === 'completed';
          const isCurrent = step.status === 'current';
          const isError = step.status === 'error';

          return (
            <div key={idx} className="flex items-start gap-3 relative z-10 min-w-[160px]">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono shrink-0 border ${
                  isCompleted
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : isCurrent
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 animate-pulse'
                    : isError
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                    : 'bg-slate-950 text-slate-500 border-slate-800'
                }`}
              >
                {isCompleted ? '✓' : isError ? '!' : idx + 1}
              </span>

              <div className="flex-1 space-y-0.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-white truncate">{step.label}</span>
                  <Badge variant={toneMap[step.status]} size="sm">
                    {step.status}
                  </Badge>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">{step.timestamp}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
