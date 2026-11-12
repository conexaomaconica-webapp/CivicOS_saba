import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  COMMERCIAL_PERMISSIONS,
  formatCentsBRL,
  representativeScopeAllows,
  type RepresentativeStatus,
} from '@/lib/commercial/access-rules';
import { isCommercialModuleEnvEnabled, isRepresentativePath } from '@/lib/commercial/feature-flag';
import { isNoIndexFollowPath } from '@/lib/seo/noindex-paths';

const ROOT = path.resolve(__dirname, '../../..');

describe('Módulo comercial · regras de acesso (espelho da migration 234)', () => {
  it('escopos do representante por status', () => {
    const statuses: RepresentativeStatus[] = ['invited', 'pending_review', 'active', 'suspended', 'terminated'];
    const matrix = Object.fromEntries(
      statuses.map((s) => [
        s,
        {
          self: representativeScopeAllows(s, 'self'),
          operational: representativeScopeAllows(s, 'operational'),
          financial: representativeScopeAllows(s, 'financial'),
        },
      ]),
    );
    expect(matrix).toEqual({
      invited: { self: true, operational: false, financial: false },
      pending_review: { self: true, operational: false, financial: false },
      active: { self: true, operational: true, financial: true },
      suspended: { self: true, operational: false, financial: true },
      terminated: { self: true, operational: false, financial: true },
    });
  });

  it('lista de permissões do TypeScript = CHECK de commercial_access_grants no banco', () => {
    const sql = fs.readFileSync(path.join(ROOT, 'supabase/migrations/228_commercial_foundation.sql'), 'utf8');
    const block = sql.match(/permission TEXT NOT NULL CHECK \(permission IN \(([\s\S]*?)\)\)/)![1]!;
    const inSql = [...block.matchAll(/'([a-z.]+)'/g)].map((m) => m[1]).sort();
    expect([...COMMERCIAL_PERMISSIONS].sort()).toEqual(inSql);
  });

  it('formatCentsBRL formata centavos inteiros sem ponto flutuante', () => {
    expect(formatCentsBRL(0)).toBe('R$ 0,00');
    expect(formatCentsBRL(6000)).toBe('R$ 60,00');
    expect(formatCentsBRL(123456789)).toBe('R$ 1.234.567,89');
    expect(formatCentsBRL(-5)).toBe('-R$ 0,05');
    expect(formatCentsBRL('40000')).toBe('R$ 400,00');
    expect(formatCentsBRL(null)).toBe('R$ 0,00');
  });
});

describe('Módulo comercial · feature flag e rotas', () => {
  it('chave de aplicação desligada por padrão e só liga com "true"', () => {
    const original = process.env.FEATURE_COMMERCIAL_MODULE_ENABLED;
    try {
      delete process.env.FEATURE_COMMERCIAL_MODULE_ENABLED;
      expect(isCommercialModuleEnvEnabled()).toBe(false);
      process.env.FEATURE_COMMERCIAL_MODULE_ENABLED = '1';
      expect(isCommercialModuleEnvEnabled()).toBe(false);
      process.env.FEATURE_COMMERCIAL_MODULE_ENABLED = 'true';
      expect(isCommercialModuleEnvEnabled()).toBe(true);
    } finally {
      if (original === undefined) delete process.env.FEATURE_COMMERCIAL_MODULE_ENABLED;
      else process.env.FEATURE_COMMERCIAL_MODULE_ENABLED = original;
    }
  });

  it('reconhece apenas /representante e subrotas; ficam noindex', () => {
    expect(isRepresentativePath('/representante')).toBe(true);
    expect(isRepresentativePath('/representante/comissoes')).toBe(true);
    expect(isRepresentativePath('/representantes')).toBe(false);
    expect(isRepresentativePath('/admin/representante')).toBe(false);
    expect(isNoIndexFollowPath('/representante')).toBe(true);
    expect(isNoIndexFollowPath('/representante/comissoes')).toBe(true);
  });
});
