'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * Estado da virada da página inicial, decidido no SERVIDOR (lib/site/home-switch.ts) a cada requisição e entregue aos componentes de
 * navegação. Eles decidem o layout pelo caminho no navegador ("/" é a landing ou o Guia?), então precisam saber em qual lado da
 * virada estamos, sem recalcular o horário no cliente (o que causaria diferença entre servidor e navegador).
 */
const HomeSwitchContext = createContext<boolean>(false);

export function HomeSwitchProvider({ active, children }: { active: boolean; children: ReactNode }) {
  return <HomeSwitchContext.Provider value={active}>{children}</HomeSwitchContext.Provider>;
}

/** true depois da virada ("/" é o Guia e a landing está em /institucional). */
export function useHomeSwitchActive(): boolean {
  return useContext(HomeSwitchContext);
}
