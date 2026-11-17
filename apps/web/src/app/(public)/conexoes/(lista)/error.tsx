'use client';

import React from 'react';
import { ConnectionsErrorState } from '@/components/public/connections/ConnectionsStates';

/** Falha inesperada ao montar a página: mostra o mesmo estado de erro simples, sem expor detalhes técnicos. */
export default function ConexoesError() {
  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <main className="dh-container py-16">
        <ConnectionsErrorState />
      </main>
    </div>
  );
}
