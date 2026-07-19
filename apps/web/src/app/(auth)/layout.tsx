import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: 'var(--bg-primary)',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        padding: 'var(--space-4)',
      }}
    >
      {/* Background soft glowing ambient shapes */}
      <div
        style={{
          position: 'absolute',
          width: '40vw',
          height: '40vw',
          borderRadius: 'var(--radius-full)',
          background: 'radial-gradient(circle, var(--color-primary-200) 0%, transparent 70%)',
          top: '-10%',
          left: '-10%',
          opacity: 0.3,
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '50vw',
          height: '50vw',
          borderRadius: 'var(--radius-full)',
          background: 'radial-gradient(circle, var(--color-primary-300) 0%, transparent 80%)',
          bottom: '-15%',
          right: '-15%',
          opacity: 0.25,
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />

      {/* Main glassmorphism card container */}
      <div
        style={{
          width: '100%',
          maxWidth: '28rem',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          padding: 'var(--space-8) var(--space-6)',
          zIndex: 10,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-6)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* White-label Logo header placeholder */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-2)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '3.5rem',
              height: '3.5rem',
              background: 'linear-gradient(135deg, var(--color-primary-500), var(--color-primary-700))',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-inverse)',
              fontWeight: 'var(--font-weight-bold)',
              fontSize: 'var(--text-2xl)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            C
          </div>
          <h2
            style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--text-primary)',
              letterSpacing: 'var(--tracking-tight)',
              marginTop: 'var(--space-2)',
            }}
          >
            CivicOS
          </h2>
          <p
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--text-secondary)',
            }}
          >
            Sua comunidade, seu ecossistema.
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}
