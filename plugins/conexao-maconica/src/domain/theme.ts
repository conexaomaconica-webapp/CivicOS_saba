import {
  productModuleDefinitionSchema,
  tenantModuleSelectionSchema,
  tenantThemeConfigSchema,
  type ProductModuleDefinition,
  type TenantModuleSelection,
  type TenantThemeConfig,
} from '@saas/sdk';

/**
 * Product preset only. Shared components must consume semantic tokens and must
 * never import this object directly.
 */
export const CONEXAO_MACONICA_THEME: TenantThemeConfig = tenantThemeConfigSchema.parse({
  schemaVersion: 1,
  productName: 'Conexão Maçônica',
  productDescription:
    'Descoberta, negócios e relacionamento para a comunidade maçônica.',
  logos: {},
  institutionalImages: {},
  colors: {
    primary: '#7A1F2E',
    primaryForeground: '#FFFFFF',
    secondary: '#4A0E1A',
    secondaryForeground: '#FFFFFF',
    accent: '#C9A227',
    accentForeground: '#2B2110',
    accentSubtle: '#E8C767',
    accentSubtleForeground: '#2B2110',
    background: '#F3EEDD',
    surface: '#FFFDF7',
    surfaceElevated: '#FFFFFF',
    foreground: '#2B171B',
    muted: '#E8E0CF',
    mutedForeground: '#5C5053',
    border: '#D8CDB7',
    ring: '#7A1F2E',
    success: '#24723A',
    warning: '#8A5A00',
    destructive: '#B42318',
    info: '#1D4ED8',
  },
  typography: {
    heading: 'editorial-serif',
    body: 'platform-sans',
    interface: 'platform-sans',
  },
  appearance: {
    radius: 'standard',
    shadow: 'subtle',
    colorMode: 'light',
    density: 'comfortable',
    buttonStyle: 'solid',
  },
});

function defineModule(
  input: ProductModuleDefinition,
): ProductModuleDefinition {
  return productModuleDefinitionSchema.parse(input);
}

/**
 * The catalog carries product meaning. `tenant_plugins`, effective licensing
 * and `tenant_features` decide, respectively, installation, commercial
 * authority and refinements for a tenant.
 */
export const CONEXAO_MACONICA_MODULE_CATALOG = [
  defineModule({
    id: 'directory.businesses',
    pluginId: 'business-directory',
    capabilities: ['business-directory'],
    dependencies: [],
    public: true,
  }),
  defineModule({
    id: 'masonic.organizations',
    pluginId: 'conexao-maconica',
    capabilities: ['masonic-organization'],
    dependencies: [],
    public: true,
  }),
  defineModule({
    id: 'masonic.verification',
    pluginId: 'conexao-maconica',
    capabilities: ['masonic-verification'],
    dependencies: ['masonic.organizations'],
    public: true,
  }),
  defineModule({
    id: 'commercial.plans',
    pluginId: 'billing-subscriptions',
    capabilities: ['billing-subscriptions'],
    dependencies: ['directory.businesses'],
    public: true,
  }),
  defineModule({
    id: 'founder.program',
    pluginId: 'conexao-maconica',
    capabilities: ['founder-program'],
    dependencies: ['directory.businesses', 'commercial.plans'],
    public: true,
  }),
  defineModule({
    id: 'masonic.search',
    pluginId: 'conexao-maconica',
    capabilities: ['masonic-search'],
    dependencies: ['masonic.organizations'],
    public: true,
  }),
] as const satisfies readonly ProductModuleDefinition[];

export const CONEXAO_MACONICA_DEFAULT_MODULES: TenantModuleSelection =
  tenantModuleSelectionSchema.parse({
    schemaVersion: 1,
    productId: 'conexao-maconica',
    enabledModules: CONEXAO_MACONICA_MODULE_CATALOG.map((module) => module.id),
  });
