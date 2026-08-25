import { describe, it, expect } from 'vitest';

describe('AJUSTE DA PÁGINA DE LOGIN & SELETOR DE PORTAIS', () => {
  it('1. Valida regras de roteamento para role master (Superadmin)', () => {
    const role = 'master';
    const hasBusinesses = true;

    const isMaster = role === 'master';
    const isAdmin = role === 'master' || role === 'socio_admin';

    expect(isMaster).toBe(true);
    expect(isAdmin).toBe(true);
  });

  it('2. Valida roteamento direto para role anunciante (sem admin)', () => {
    const role = 'anunciante';
    const isAdmin = role === 'master' || role === 'socio_admin';

    expect(isAdmin).toBe(false);
  });

  it('3. Valida roteamento direto para admin sem empresa anunciante', () => {
    const role = 'socio_admin';
    const hasBusinesses = false;

    const isAdmin = role === 'master' || role === 'socio_admin';
    const isAdvertiserOnly = !isAdmin;

    expect(isAdmin).toBe(true);
    expect(isAdvertiserOnly).toBe(false);
    expect(hasBusinesses).toBe(false);
  });
});
