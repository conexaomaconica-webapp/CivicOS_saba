import React from 'react';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className = '',
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={`p-8 text-center flex flex-col items-center justify-center space-y-4 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl ${className}`}
      {...props}
    >
      {icon && (
        <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-400 flex items-center justify-center text-2xl shrink-0">
          {icon}
        </div>
      )}

      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-base font-semibold text-white tracking-tight">{title}</h3>
        {description && (
          <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
        )}
      </div>

      {(primaryAction || secondaryAction) && (
        <div className="flex items-center gap-3 pt-2">
          {secondaryAction}
          {primaryAction}
        </div>
      )}
    </div>
  );
}
