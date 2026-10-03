'use client';

import React, { createContext, useContext } from 'react';

export type PedraCardDisplay = 'circular_seal' | 'horizontal_seal' | 'badge_text';

const PedraCardDisplayContext = createContext<PedraCardDisplay>('circular_seal');
const PedraHorizontalSealContext = createContext('/selos/pedra-fundamental.svg');

export function PedraCardDisplayProvider({
  value = 'circular_seal',
  horizontalSealUrl = '/selos/pedra-fundamental.svg',
  children,
}: {
  value?: PedraCardDisplay;
  horizontalSealUrl?: string;
  children: React.ReactNode;
}) {
  return (
    <PedraCardDisplayContext.Provider value={value}>
      <PedraHorizontalSealContext.Provider value={horizontalSealUrl}>
        {children}
      </PedraHorizontalSealContext.Provider>
    </PedraCardDisplayContext.Provider>
  );
}

export function usePedraCardDisplay(): PedraCardDisplay {
  return useContext(PedraCardDisplayContext);
}

export function usePedraHorizontalSeal(): string {
  return useContext(PedraHorizontalSealContext);
}
