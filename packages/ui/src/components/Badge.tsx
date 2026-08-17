import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

export function Badge({
  variant = 'neutral',
  size = 'md',
  icon,
  style,
  className = '',
  children,
  ...props
}: BadgeProps) {
  const baseClasses =
    'inline-flex items-center font-medium rounded-full border transition-colors select-none';

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5'
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    neutral: {
      backgroundColor: 'var(--status-neutral-bg)',
      color: 'var(--status-neutral-text)',
      borderColor: 'var(--status-neutral-border)'
    },
    info: {
      backgroundColor: 'var(--status-info-bg)',
      color: 'var(--status-info-text)',
      borderColor: 'var(--status-info-border)'
    },
    success: {
      backgroundColor: 'var(--status-success-bg)',
      color: 'var(--status-success-text)',
      borderColor: 'var(--status-success-border)'
    },
    warning: {
      backgroundColor: 'var(--status-warning-bg)',
      color: 'var(--status-warning-text)',
      borderColor: 'var(--status-warning-border)'
    },
    danger: {
      backgroundColor: 'var(--status-danger-bg)',
      color: 'var(--status-danger-text)',
      borderColor: 'var(--status-danger-border)'
    },
    accent: {
      backgroundColor: 'var(--color-accent-subtle)',
      color: 'var(--color-accent-subtle-foreground)',
      borderColor: 'var(--color-accent)'
    }
  };

  return (
    <span
      className={`${baseClasses} ${sizeClasses[size]} ${className}`}
      style={{ ...variantStyles[variant], ...style }}
      {...props}
    >
      {icon && <span className="shrink-0" aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}
