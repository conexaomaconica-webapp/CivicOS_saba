import React from 'react';

// ---------------------------------------------------------------------------
// AUX-002 (CRIT-TRN-022) — empty-state for lists/search without results.
// ---------------------------------------------------------------------------

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-8) var(--space-4)',
        textAlign: 'center',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px dashed var(--border-default)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      {icon && (
        <div
          aria-hidden="true"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--bg-tertiary)',
            fontSize: 'var(--text-xl)',
            color: 'var(--text-secondary)',
          }}
        >
          {icon}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <h3
          style={{
            fontSize: 'var(--text-md)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </h3>
        {description && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', maxWidth: 420 }}>
            {description}
          </p>
        )}
      </div>

      {actionLabel && actionHref && (
        <a
          href={actionHref}
          style={{
            marginTop: 'var(--space-1)',
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--accent)',
            color: 'var(--text-inverse)',
            fontWeight: 'var(--font-weight-semibold)',
            fontSize: 'var(--text-sm)',
          }}
        >
          {actionLabel}
        </a>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          style={{
            marginTop: 'var(--space-1)',
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--accent)',
            color: 'var(--text-inverse)',
            fontWeight: 'var(--font-weight-semibold)',
            fontSize: 'var(--text-sm)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}