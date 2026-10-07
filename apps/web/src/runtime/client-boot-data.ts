import type { BootData } from './types';

/**
 * O que do boot do kernel pode ir para o navegador. O layout raiz serializa isto no HTML de TODAS as páginas, então
 * não pode levar o diagnóstico interno (versão, linha do tempo de boot, plugins) nem a mensagem crua de erro.
 * O diagnóstico completo só é lido no servidor, na rota protegida /diagnostics.
 */
export function toClientBootData(boot: BootData, production = process.env.NODE_ENV === 'production'): BootData {
  return {
    diagnostics: null,
    defaultSnapshot: boot.defaultSnapshot,
    error: boot.error ? (production ? 'Serviço temporariamente indisponível.' : boot.error) : null,
  };
}
