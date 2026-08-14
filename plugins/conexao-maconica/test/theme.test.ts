import { describe, expect, it } from 'vitest';
import {
  canPublishTenantTheme,
  tenantModuleSelectionSchema,
  tenantThemeConfigSchema,
} from '@saas/core';
import {
  CONEXAO_MACONICA_DEFAULT_MODULES,
  CONEXAO_MACONICA_MODULE_CATALOG,
  CONEXAO_MACONICA_THEME,
} from '../src/domain/theme';

describe('Conexão Maçônica white-label preset', () => {
  it('is a valid, publishable product configuration', () => {
    expect(tenantThemeConfigSchema.parse(CONEXAO_MACONICA_THEME)).toEqual(
      CONEXAO_MACONICA_THEME,
    );
    expect(CONEXAO_MACONICA_THEME.colors.primary).toBe('#7A1F2E');
    expect(CONEXAO_MACONICA_THEME.colors.accent).toBe('#C9A227');
    expect(CONEXAO_MACONICA_THEME.colors.accentSubtle).toBe('#E8C767');
    expect(CONEXAO_MACONICA_THEME.colors.background).toBe('#F3EEDD');
    expect(canPublishTenantTheme(CONEXAO_MACONICA_THEME)).toBe(true);
  });

  it('keeps masonic meaning in the product catalog, not in the core theme', () => {
    const moduleIds = CONEXAO_MACONICA_MODULE_CATALOG.map((module) => module.id);
    expect(new Set(moduleIds).size).toBe(moduleIds.length);
    expect(moduleIds).toContain('masonic.organizations');
    expect(CONEXAO_MACONICA_DEFAULT_MODULES.enabledModules).toEqual(moduleIds);
  });

  it('allows a second product configuration with no masonic modules', () => {
    const genericProduct = tenantModuleSelectionSchema.parse({
      schemaVersion: 1,
      productId: 'generic-catalog',
      enabledModules: ['directory.businesses'],
    });

    expect(genericProduct.enabledModules).toEqual(['directory.businesses']);
    expect(genericProduct.enabledModules.some((id) => id.startsWith('masonic.'))).toBe(
      false,
    );
  });
});
