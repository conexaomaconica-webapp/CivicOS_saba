'use client';

import React from 'react';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <head>
        <title>Erro Inesperado · Conexão Maçônica</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style={{ margin: 0, fontFamily: 'sans-serif', backgroundColor: '#faf7f2', color: '#1f1914' }}>
        <main
          role="alert"
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 16px',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: '#3b0b14',
              border: '2px solid #c59b27',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
              boxShadow: '0 8px 24px rgba(59, 11, 20, 0.2)',
            }}
          >
            <span style={{ fontSize: 32, fontWeight: 'bold', color: '#c59b27' }}>500</span>
          </div>

          <span
            style={{
              fontSize: 11,
              fontWeight: 'bold',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              backgroundColor: '#3b0b14',
              color: '#c59b27',
              padding: '6px 16px',
              borderRadius: 20,
              border: '1px solid rgba(197, 155, 39, 0.4)',
              marginBottom: 16,
            }}
          >
            Conexão Maçônica · Erro Crítico
          </span>

          <h1
            style={{
              fontFamily: 'serif',
              fontSize: 32,
              fontWeight: 'bold',
              color: '#3b0b14',
              margin: '0 0 12px 0',
            }}
          >
            Instabilidade Temporária no Servidor
          </h1>

          <p style={{ fontSize: 14, color: '#6b625b', maxWidth: 440, lineHeight: 1.6, margin: '0 0 28px 0' }}>
            Ocorreu uma falha inesperada durante a renderização do sistema. Tente reiniciar a página ou retornar ao início.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: '12px 24px',
                borderRadius: 12,
                backgroundColor: '#3b0b14',
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: 13,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(59, 11, 20, 0.3)',
              }}
            >
              Tentar Novamente
            </button>

            <a
              href="/guia"
              style={{
                padding: '12px 24px',
                borderRadius: 12,
                backgroundColor: '#ffffff',
                color: '#3b0b14',
                fontWeight: 'bold',
                fontSize: 13,
                border: '1px solid #e8e2d9',
                textDecoration: 'none',
              }}
            >
              Voltar ao Guia Comercial
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}