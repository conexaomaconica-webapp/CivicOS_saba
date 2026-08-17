import { describe, expect, it } from 'vitest';
import {
  canPublishTenantTheme,
  evaluateTenantThemeContrast,
  migrateLegacyTenantBranding,
  publicTenantThemeSchema,
  resolveEffectiveTenantModules,
  tenantModuleSelectionSchema,
  tenantThemeConfigSchema,
  WHITE_LABEL_DEFAULT_THEME,
} from '../contracts/tenant-theme.contract';

describe('white-label tenant theme contract', () => {
  it('accepts the safe neutral default', () => {
    expect(tenantThemeConfigSchema.parse(WHITE_LABEL_DEFAULT_THEME)).toEqual(
      WHITE_LABEL_DEFAULT_THEME,
    );
    expect(canPublishTenantTheme(WHITE_LABEL_DEFAULT_THEME)).toBe(true);
  });

  it('rejects arbitrary CSS and unsafe public assets', () => {
    expect(
      tenantThemeConfigSchema.safeParse({
        ...WHITE_LABEL_DEFAULT_THEME,
        customCss: 'body { display: none }',
      }).success,
    ).toBe(false);

    expect(
      tenantThemeConfigSchema.safeParse({
        ...WHITE_LABEL_DEFAULT_THEME,
        logos: { primary: 'http://untrusted.example/logo.svg' },
      }).success,
    ).toBe(false);

    expect(
      tenantThemeConfigSchema.safeParse({
        ...WHITE_LABEL_DEFAULT_THEME,
        logos: { primary: 'https://' },
      }).success,
    ).toBe(false);
  });

  it('migrates the real legacy branding shape without trusting raw fonts or URLs', () => {
    const migrated = migrateLegacyTenantBranding({
      appName: 'Tenant legado',
      primaryColor: '#123456',
      accentColor: '#abcdef',
      logoUrl: 'javascript:alert(1)',
      faviconUrl: '/tenant/favicon.svg',
      fontFamily: 'url(https://untrusted.example/font.woff2)',
      radius: 'xl',
      density: 'compact',
      colorMode: 'auto',
    });

    expect(migrated.productName).toBe('Tenant legado');
    expect(migrated.colors.primary).toBe('#123456');
    expect(migrated.logos.primary).toBeUndefined();
    expect(migrated.logos.favicon).toBe('/tenant/favicon.svg');
    expect(migrated.typography).toEqual(WHITE_LABEL_DEFAULT_THEME.typography);
    expect(migrated.appearance).toMatchObject({
      radius: 'rounded',
      density: 'compact',
      colorMode: 'system',
    });
  });

  it('blocks publication when a semantic foreground has insufficient contrast', () => {
    const unsafe = tenantThemeConfigSchema.parse({
      ...WHITE_LABEL_DEFAULT_THEME,
      colors: {
        ...WHITE_LABEL_DEFAULT_THEME.colors,
        primary: '#ffffff',
        primaryForeground: '#fefefe',
      },
    });

    expect(canPublishTenantTheme(unsafe)).toBe(false);
  });

  it('checks focus and status indicators as non-text UI at 3:1', () => {
    const unsafe = tenantThemeConfigSchema.parse({
      ...WHITE_LABEL_DEFAULT_THEME,
      colors: {
        ...WHITE_LABEL_DEFAULT_THEME.colors,
        ring: '#f8fafc',
        warning: '#ffffff',
      },
    });
    const checks = evaluateTenantThemeContrast(unsafe);

    expect(checks.find((check) => check.pair === 'focus-ring')).toMatchObject({
      minimum: 3,
      passes: false,
    });
    expect(
      checks.find((check) => check.pair === 'warning-indicator'),
    ).toMatchObject({ minimum: 3, passes: false });
    expect(canPublishTenantTheme(unsafe)).toBe(false);
  });

  it('rejects duplicate modules and validates the public projection', () => {
    expect(
      tenantModuleSelectionSchema.safeParse({
        schemaVersion: 1,
        productId: 'generic-catalog',
        enabledModules: ['directory.businesses', 'directory.businesses'],
      }).success,
    ).toBe(false);

    expect(
      publicTenantThemeSchema.safeParse({
        ...WHITE_LABEL_DEFAULT_THEME,
        tenantSlug: 'tenant-neutro',
      }).success,
    ).toBe(true);

    expect(
      publicTenantThemeSchema.safeParse({
        ...WHITE_LABEL_DEFAULT_THEME,
        tenantSlug: 'tenant-neutro',
        tenantId: 'private-id',
        settings: { secret: true },
      }).success,
    ).toBe(false);
  });

  it('keeps independently parsed tenant themes isolated', () => {
    const first = publicTenantThemeSchema.parse({
      ...WHITE_LABEL_DEFAULT_THEME,
      tenantSlug: 'tenant-a',
    });
    const second = publicTenantThemeSchema.parse({
      ...WHITE_LABEL_DEFAULT_THEME,
      tenantSlug: 'tenant-b',
      colors: {
        ...WHITE_LABEL_DEFAULT_THEME.colors,
        primary: '#166534',
      },
    });

    expect(first.tenantSlug).toBe('tenant-a');
    expect(second.tenantSlug).toBe('tenant-b');
    expect(first.colors.primary).not.toBe(second.colors.primary);
    expect(WHITE_LABEL_DEFAULT_THEME.colors.primary).toBe('#334155');
  });

  it('resolves modules only from installation, capabilities and dependencies', () => {
    const catalog = [
      {
        id: 'directory.businesses',
        pluginId: 'business-directory',
        capabilities: ['business-directory'],
        dependencies: [],
        public: true,
      },
      {
        id: 'masonic.organizations',
        pluginId: 'conexao-maconica',
        capabilities: ['masonic-organization'],
        dependencies: ['directory.businesses'],
        public: true,
      },
    ];
    const selection = tenantModuleSelectionSchema.parse({
      schemaVersion: 1,
      productId: 'community-product',
      enabledModules: ['directory.businesses', 'masonic.organizations'],
    });

    const effective = resolveEffectiveTenantModules(catalog, selection, {
      installedPluginIds: ['business-directory', 'conexao-maconica'],
      grantedCapabilities: ['business-directory'],
      featureOverrides: { 'masonic.organizations': true },
    });

    expect(effective.map((module) => module.id)).toEqual(['directory.businesses']);
  });

  it('fails closed for an unknown selected module', () => {
    const selection = tenantModuleSelectionSchema.parse({
      schemaVersion: 1,
      productId: 'generic-product',
      enabledModules: ['unknown.module'],
    });

    expect(() =>
      resolveEffectiveTenantModules([], selection, {
        installedPluginIds: [],
        grantedCapabilities: [],
      }),
    ).toThrow('Unknown product module');
  });
});
