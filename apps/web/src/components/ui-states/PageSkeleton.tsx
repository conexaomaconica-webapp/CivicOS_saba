import React from 'react';

// ---------------------------------------------------------------------------
// AUX-001 (CRIT-TRN-022) — skeleton loading building blocks.
// Pure design tokens + CSS shimmer; no Tailwind dependency.
// ---------------------------------------------------------------------------

export interface SkeletonBlockProps {
  width?: string | number;
  height?: string | number;
  radius?: string;
}

export function SkeletonBlock({
  width = '100%',
  height = 'var(--space-4)',
  radius = 'var(--radius-sm)',
}: SkeletonBlockProps) {
  return (
    <div
      aria-hidden="true"
      className="aux-shimmer"
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: 'var(--bg-tertiary)',
      }}
    />
  );
}

export interface PageSkeletonProps {
  title?: boolean;
  sections?: number;
  rows?: number;
}

/**
 * Placeholder page structure shown while async content loads. Asserts an
 * accessible loading announcement via `role="status"`.
 */
export function PageSkeleton({
  title = true,
  sections = 1,
  rows = 3,
}: PageSkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Carregando conteúdo"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}
    >
      {title && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <SkeletonBlock width="min(320px, 70%)" height="var(--space-6)" radius="var(--radius-md)" />
          <SkeletonBlock width="min(240px, 50%)" height="var(--space-3)" />
        </div>
      )}

      {Array.from({ length: sections }).map((_, sectionIndex) => (
        <div
          key={sectionIndex}
          role="presentation"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            padding: 'var(--space-5)',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
          }}
        >
          <SkeletonBlock width="min(200px, 40%)" height="var(--space-4)" />
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <SkeletonBlock key={rowIndex} />
          ))}
        </div>
      ))}

      <span className="sr-only">Carregando...</span>
    </div>
  );
}