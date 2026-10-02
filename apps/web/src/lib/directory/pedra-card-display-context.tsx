'use client';

import React, { createContext, useContext } from 'react';

export type PedraCardDisplay = 'circular_seal' | 'horizontal_seal' | 'badge_text';

const PedraCardDisplayContext = createContext<PedraCardDisplay>('circular_seal');

export function PedraCardDisplayProvider({
  value = 'circular_seal',
  children,
}: {
  value?: PedraCardDisplay;
  children: React.ReactNode;
}) {
  return (
    <PedraCardDisplayContext.Provider value={value}>
      {children}
    </PedraCardDisplayContext.Provider>
  );
}

export function usePedraCardDisplay(): PedraCardDisplay {
  return useContext(PedraCardDisplayContext);
}
