import React from 'react';
import { ConnectionsSkeleton } from '@/components/public/connections/ConnectionsStates';

export default function ConexoesLoading() {
  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <div className="h-40 bg-gradient-to-b from-[#4b161b] to-[#3b0b14]" aria-hidden="true" />
      <main className="dh-container space-y-6 py-8">
        <div className="h-11 animate-pulse rounded-xl bg-white" aria-hidden="true" />
        <ConnectionsSkeleton />
      </main>
    </div>
  );
}
