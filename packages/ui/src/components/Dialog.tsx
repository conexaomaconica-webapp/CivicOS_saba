'use client';

import React, { useEffect, useRef } from 'react';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md'
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Handle Escape key and focus trap
  useEffect(() => {
    if (!isOpen) return;

    // Save previous active element to restore focus on close
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Prevent body scroll when dialog is open
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Focus initial dialog container
    setTimeout(() => {
      dialogRef.current?.focus();
    }, 50);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-xl'
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'dialog-title' : undefined}
      aria-describedby={description ? 'dialog-desc' : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`w-full bg-surface-elevated text-foreground border border-border rounded-2xl shadow-semanticMd overflow-hidden focus:outline-none ${sizeClasses[size]} animate-in zoom-in-95 duration-200 motion-reduce:animate-none`}
      >
        {/* Header */}
        {(title || description) && (
          <div className="p-6 pb-4 border-b border-border flex items-start justify-between gap-4">
            <div className="space-y-1">
              {title && (
                <h2 id="dialog-title" className="text-lg font-bold font-heading text-foreground tracking-tight">
                  {title}
                </h2>
              )}
              {description && (
                <p id="dialog-desc" className="text-xs text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Fechar Modal"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 text-sm text-foreground space-y-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="p-4 bg-muted border-t border-border flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
