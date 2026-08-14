'use client';

import React from 'react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessName: string;
}

/**
 * Containment state for Fase 1.
 *
 * A plan change must only happen after the authoritative checkout/payment
 * workflow has established an active subscription and its entitlements. This
 * component deliberately performs no database writes and reports no payment
 * success while that integration is unavailable.
 */
export default function UpgradeModal({
  isOpen,
  onClose,
  businessName,
}: UpgradeModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--bg-overlay)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 400,
        padding: 'var(--space-4)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-title"
        aria-describedby="upgrade-description"
        style={{
          width: '100%',
          maxWidth: '28rem',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        <div>
          <h2
            id="upgrade-title"
            style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)' }}
          >
            Upgrade temporariamente indisponível
          </h2>
          <p
            id="upgrade-description"
            style={{
              color: 'var(--text-secondary)',
              fontSize: 'var(--text-sm)',
              lineHeight: 'var(--leading-relaxed)',
              marginTop: 'var(--space-2)',
            }}
          >
            A contratação de um novo plano para {businessName} será liberada
            quando o checkout e a confirmação de pagamento estiverem integrados
            ao fluxo oficial. Nenhuma alteração foi realizada.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          autoFocus
          style={{
            padding: 'var(--space-3)',
            backgroundColor: 'var(--accent)',
            color: 'var(--text-inverse)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 'var(--font-weight-bold)',
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
          }}
        >
          Entendi
        </button>
      </section>
    </div>
  );
}
