'use client';

import React, { useEffect, useRef } from 'react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  position?: 'left' | 'right' | 'bottom';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  position = 'right',
  children,
  footer
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    setTimeout(() => drawerRef.current?.focus(), 50);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const positionClasses = {
    right: 'inset-y-0 right-0 h-full w-full max-w-md border-l border-border animate-in slide-in-from-right duration-300 motion-reduce:animate-none',
    left: 'inset-y-0 left-0 h-full w-full max-w-md border-r border-border animate-in slide-in-from-left duration-300 motion-reduce:animate-none',
    bottom: 'inset-x-0 bottom-0 max-h-[85vh] w-full border-t border-border rounded-t-2xl animate-in slide-in-from-bottom duration-300 motion-reduce:animate-none'
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'drawer-title' : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={drawerRef}
        tabIndex={-1}
        className={`absolute bg-surface-elevated text-foreground shadow-semanticMd flex flex-col focus:outline-none ${positionClasses[position]}`}
      >
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between gap-4 shrink-0">
          {title ? (
            <h2 id="drawer-title" className="text-base font-bold font-heading text-foreground tracking-tight">
              {title}
            </h2>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Fechar Gaveta"
          >
            ✕
          </button>
        </div>

        {/* Content Scrollable Area */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4 text-sm text-foreground">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-4 bg-muted border-t border-border shrink-0 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
