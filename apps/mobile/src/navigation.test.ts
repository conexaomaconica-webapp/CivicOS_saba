import { describe, expect, it } from 'vitest';
import { routeFromHash, routeHref } from './navigation';

describe('navegação local', () => {
  it('resolve rotas conhecidas', () => {
    expect(routeFromHash('#/empresas')).toBe('empresas');
    expect(routeFromHash('#/lojas/detalhe')).toBe('lojas');
  });

  it('usa início para rota vazia ou desconhecida', () => {
    expect(routeFromHash('')).toBe('inicio');
    expect(routeFromHash('#/privado')).toBe('inicio');
  });

  it('gera URLs compatíveis com arquivos locais do Capacitor', () => {
    expect(routeHref('beneficios')).toBe('#/beneficios');
  });
});
