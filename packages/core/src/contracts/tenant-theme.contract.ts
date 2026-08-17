import { z } from 'zod';

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;
const PUBLIC_ID_RE = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const CAPABILITY_ID_RE = /^[a-z0-9]+(?:[.:-][a-z0-9_]+)*$/;

export const themeHexColorSchema = z
  .string()
  .regex(HEX_COLOR_RE, 'Expected a six-digit hexadecimal color');

export const publicThemeAssetUrlSchema = z
  .string()
  .max(2048)
  .refine((value) => {
    if (value.startsWith('/') && !value.startsWith('//')) return true;
    try {
      const parsed = new URL(value);
      return (
        parsed.protocol === 'https:' &&
        parsed.hostname.length > 0 &&
        parsed.username.length === 0 &&
        parsed.password.length === 0
      );
    } catch {
      return false;
    }
  }, 'Theme assets must use HTTPS or a same-origin absolute path');

export const approvedFontTokenSchema = z.enum([
  'platform-sans',
  'editorial-serif',
  'humanist-sans',
]);

export const tenantThemeColorsSchema = z
  .object({
    primary: themeHexColorSchema,
    primaryForeground: themeHexColorSchema,
    secondary: themeHexColorSchema,
    secondaryForeground: themeHexColorSchema,
    accent: themeHexColorSchema,
    accentForeground: themeHexColorSchema,
    accentSubtle: themeHexColorSchema,
    accentSubtleForeground: themeHexColorSchema,
    background: themeHexColorSchema,
    surface: themeHexColorSchema,
    surfaceElevated: themeHexColorSchema,
    foreground: themeHexColorSchema,
    muted: themeHexColorSchema,
    mutedForeground: themeHexColorSchema,
    border: themeHexColorSchema,
    ring: themeHexColorSchema,
    success: themeHexColorSchema,
    warning: themeHexColorSchema,
    destructive: themeHexColorSchema,
    info: themeHexColorSchema,
  })
  .strict();

export const tenantThemeConfigSchema = z
  .object({
    schemaVersion: z.literal(1),
    productName: z.string().trim().min(1).max(64),
    productDescription: z.string().trim().max(240).optional(),
    logos: z
      .object({
        primary: publicThemeAssetUrlSchema.optional(),
        compact: publicThemeAssetUrlSchema.optional(),
        inverse: publicThemeAssetUrlSchema.optional(),
        favicon: publicThemeAssetUrlSchema.optional(),
      })
      .strict(),
    institutionalImages: z
      .object({
        hero: publicThemeAssetUrlSchema.optional(),
        login: publicThemeAssetUrlSchema.optional(),
        emailHeader: publicThemeAssetUrlSchema.optional(),
      })
      .strict(),
    colors: tenantThemeColorsSchema,
    darkColors: tenantThemeColorsSchema.optional(),
    typography: z
      .object({
        heading: approvedFontTokenSchema,
        body: approvedFontTokenSchema,
        interface: approvedFontTokenSchema,
      })
      .strict(),
    appearance: z
      .object({
        radius: z.enum(['compact', 'standard', 'rounded']),
        shadow: z.enum(['none', 'subtle', 'elevated']),
        colorMode: z.enum(['light', 'dark', 'system']),
        density: z.enum(['comfortable', 'compact']),
        buttonStyle: z.enum(['solid', 'soft', 'outline']),
      })
      .strict(),
  })
  .strict();

export const publicTenantThemeSchema = tenantThemeConfigSchema
  .extend({
    tenantSlug: z.string().regex(PUBLIC_ID_RE).max(63),
  })
  .strict();

export const legacyTenantBrandingSchema = z
  .object({
    appName: z.string().trim().min(1).max(64).optional(),
    logoUrl: z.string().max(512).optional(),
    faviconUrl: z.string().max(512).optional(),
    primaryColor: themeHexColorSchema.optional(),
    accentColor: themeHexColorSchema.optional(),
    fontFamily: z.string().max(256).optional(),
    radius: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
    density: z.enum(['comfortable', 'compact']).optional(),
    colorMode: z.enum(['light', 'dark', 'auto']).optional(),
  })
  .strip();

export const productModuleDefinitionSchema = z
  .object({
    id: z.string().regex(PUBLIC_ID_RE).max(96),
    pluginId: z.string().regex(PUBLIC_ID_RE).max(96),
    capabilities: z.array(z.string().regex(CAPABILITY_ID_RE).max(128)).max(64),
    dependencies: z.array(z.string().regex(PUBLIC_ID_RE).max(96)).max(32),
    public: z.boolean(),
  })
  .strict();

export const tenantModuleSelectionSchema = z
  .object({
    schemaVersion: z.literal(1),
    productId: z.string().regex(PUBLIC_ID_RE).max(96),
    enabledModules: z.array(z.string().regex(PUBLIC_ID_RE).max(96)).max(64),
  })
  .strict()
  .superRefine((value, context) => {
    const unique = new Set(value.enabledModules);
    if (unique.size !== value.enabledModules.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['enabledModules'],
        message: 'Module identifiers must be unique',
      });
    }
  });

export type TenantThemeColors = z.infer<typeof tenantThemeColorsSchema>;
export type TenantThemeConfig = z.infer<typeof tenantThemeConfigSchema>;
export type PublicTenantTheme = z.infer<typeof publicTenantThemeSchema>;
export type LegacyTenantBranding = z.infer<typeof legacyTenantBrandingSchema>;
export type ProductModuleDefinition = z.infer<typeof productModuleDefinitionSchema>;
export type TenantModuleSelection = z.infer<typeof tenantModuleSelectionSchema>;

export interface TenantModuleAuthority {
  readonly installedPluginIds: readonly string[];
  readonly grantedCapabilities: readonly string[];
  /** A feature flag may refine or disable authority, but never create it. */
  readonly featureOverrides?: Readonly<Record<string, boolean>>;
}

/**
 * Resolves modules fail-closed. A selected module is effective only when its
 * plugin is installed, every required capability is granted, its dependencies
 * are effective and no feature refinement explicitly disables it.
 */
export function resolveEffectiveTenantModules(
  rawCatalog: readonly ProductModuleDefinition[],
  rawSelection: TenantModuleSelection,
  authority: TenantModuleAuthority,
): readonly ProductModuleDefinition[] {
  const selection = tenantModuleSelectionSchema.parse(rawSelection);
  const catalog = rawCatalog.map((item) => productModuleDefinitionSchema.parse(item));
  const definitions = new Map<string, ProductModuleDefinition>();

  for (const definition of catalog) {
    if (definitions.has(definition.id)) {
      throw new Error(`Duplicate product module definition: ${definition.id}`);
    }
    definitions.set(definition.id, definition);
  }

  const selected = new Set(selection.enabledModules);
  for (const moduleId of selected) {
    if (!definitions.has(moduleId)) {
      throw new Error(`Unknown product module: ${moduleId}`);
    }
  }

  const installed = new Set(authority.installedPluginIds);
  const capabilities = new Set(authority.grantedCapabilities);
  const effective = new Map<string, ProductModuleDefinition>();
  let changed = true;

  while (changed) {
    changed = false;
    for (const moduleId of selection.enabledModules) {
      if (effective.has(moduleId)) continue;
      const definition = definitions.get(moduleId);
      if (!definition) continue;
      if (!installed.has(definition.pluginId)) continue;
      if (authority.featureOverrides?.[moduleId] === false) continue;
      if (!definition.capabilities.every((capability) => capabilities.has(capability))) {
        continue;
      }
      if (!definition.dependencies.every((dependency) => effective.has(dependency))) {
        continue;
      }
      effective.set(moduleId, definition);
      changed = true;
    }
  }

  return selection.enabledModules.flatMap((moduleId) => {
    const definition = effective.get(moduleId);
    return definition ? [definition] : [];
  });
}

export const WHITE_LABEL_DEFAULT_THEME: TenantThemeConfig = tenantThemeConfigSchema.parse({
  schemaVersion: 1,
  productName: 'Plataforma',
  productDescription: 'Experiência digital configurável por tenant.',
  logos: {},
  institutionalImages: {},
  colors: {
    primary: '#334155',
    primaryForeground: '#ffffff',
    secondary: '#e2e8f0',
    secondaryForeground: '#0f172a',
    accent: '#2563eb',
    accentForeground: '#ffffff',
    accentSubtle: '#dbeafe',
    accentSubtleForeground: '#1e3a8a',
    background: '#f8fafc',
    surface: '#ffffff',
    surfaceElevated: '#ffffff',
    foreground: '#0f172a',
    muted: '#e2e8f0',
    mutedForeground: '#475569',
    border: '#cbd5e1',
    ring: '#2563eb',
    success: '#15803d',
    warning: '#a16207',
    destructive: '#b91c1c',
    info: '#0369a1',
  },
  typography: {
    heading: 'platform-sans',
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

function keepSafeAsset(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const result = publicThemeAssetUrlSchema.safeParse(value);
  return result.success ? result.data : undefined;
}

/**
 * Compatibility adapter for the unversioned `tenants.settings.branding`
 * object currently present in the repository. Raw font stacks are deliberately
 * not migrated: an administrator must select an approved font token.
 */
export function migrateLegacyTenantBranding(
  raw: unknown,
  defaults: TenantThemeConfig = WHITE_LABEL_DEFAULT_THEME,
): TenantThemeConfig {
  const parsed = legacyTenantBrandingSchema.safeParse(raw);
  if (!parsed.success) return tenantThemeConfigSchema.parse(defaults);

  const legacy = parsed.data;
  const radius =
    legacy.radius === 'sm'
      ? 'compact'
      : legacy.radius === 'xl'
        ? 'rounded'
        : defaults.appearance.radius;

  const next: TenantThemeConfig = {
    ...defaults,
    productName: legacy.appName ?? defaults.productName,
    logos: {
      ...defaults.logos,
      primary: keepSafeAsset(legacy.logoUrl) ?? defaults.logos.primary,
      favicon: keepSafeAsset(legacy.faviconUrl) ?? defaults.logos.favicon,
    },
    colors: {
      ...defaults.colors,
      primary: legacy.primaryColor ?? defaults.colors.primary,
      accent: legacy.accentColor ?? defaults.colors.accent,
    },
    appearance: {
      ...defaults.appearance,
      radius,
      density: legacy.density ?? defaults.appearance.density,
      colorMode:
        legacy.colorMode === 'auto'
          ? 'system'
          : legacy.colorMode ?? defaults.appearance.colorMode,
    },
  };

  return tenantThemeConfigSchema.parse(next);
}

function channelToLinear(value: number): number {
  const channel = value / 255;
  return channel <= 0.04045
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
}

function hexLuminance(hex: string): number {
  const raw = hex.slice(1);
  const red = parseInt(raw.slice(0, 2), 16);
  const green = parseInt(raw.slice(2, 4), 16);
  const blue = parseInt(raw.slice(4, 6), 16);
  return (
    0.2126 * channelToLinear(red) +
    0.7152 * channelToLinear(green) +
    0.0722 * channelToLinear(blue)
  );
}

export function themeContrastRatio(foreground: string, background: string): number {
  themeHexColorSchema.parse(foreground);
  themeHexColorSchema.parse(background);
  const first = hexLuminance(foreground);
  const second = hexLuminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

export interface ThemeContrastCheck {
  readonly pair: string;
  readonly ratio: number;
  readonly minimum: number;
  readonly passes: boolean;
}

export function evaluateTenantThemeContrast(theme: TenantThemeConfig): ThemeContrastCheck[] {
  const evaluatePalette = (
    colors: TenantThemeColors,
    prefix: string,
  ): ThemeContrastCheck[] => {
    const pairs = [
      ['primary', colors.primaryForeground, colors.primary, 4.5],
      ['secondary', colors.secondaryForeground, colors.secondary, 4.5],
      ['accent', colors.accentForeground, colors.accent, 4.5],
      ['accent-subtle', colors.accentSubtleForeground, colors.accentSubtle, 4.5],
      ['page', colors.foreground, colors.background, 4.5],
      ['surface', colors.foreground, colors.surface, 4.5],
      ['muted', colors.mutedForeground, colors.muted, 4.5],
      ['muted-on-page', colors.mutedForeground, colors.background, 4.5],
      ['muted-on-surface', colors.mutedForeground, colors.surface, 4.5],
      ['focus-ring', colors.ring, colors.background, 3],
      ['success-indicator', colors.success, colors.surface, 3],
      ['warning-indicator', colors.warning, colors.surface, 3],
      ['destructive-indicator', colors.destructive, colors.surface, 3],
      ['info-indicator', colors.info, colors.surface, 3],
    ] as const;

    return pairs.map(([pair, foreground, background, minimum]) => {
      const ratio = themeContrastRatio(foreground, background);
      return {
        pair: `${prefix}${pair}`,
        ratio,
        minimum,
        passes: ratio >= minimum,
      };
    });
  };

  return [
    ...evaluatePalette(theme.colors, ''),
    ...(theme.darkColors ? evaluatePalette(theme.darkColors, 'dark.') : []),
  ];
}

export function canPublishTenantTheme(theme: TenantThemeConfig): boolean {
  return evaluateTenantThemeContrast(theme).every((check) => check.passes);
}
