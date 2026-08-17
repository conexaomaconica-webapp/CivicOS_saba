import type { TenantThemeColors, TenantThemeConfig } from '@saas/core';

// ============================================================================
// Brand Tokens — white-label engine
// ============================================================================
// Pure helpers that map both the versioned TenantThemeConfig and the legacy
// branding projection into the semantic token system in @saas/ui/tokens.css.
//
// Color contract:
//   - primaryColor  → primary interaction and focus tokens only.
//   - accentColor   → semantic accent/highlight tokens only.
//   - TenantThemeConfig → the complete validated semantic palette.
//
// The legacy adapter never touches protected commercial/trust states or page
// surfaces. The versioned contract may configure status colors only after the
// complete theme passes its publication policy.
// ============================================================================

export const BRAND_RADIUS_PRESETS = {
  sm: {
    '--radius-sm': '0.25rem',
    '--radius-md': '0.375rem',
    '--radius-lg': '0.5rem',
    '--radius-xl': '0.75rem',
  },
  md: {
    '--radius-sm': '0.375rem',
    '--radius-md': '0.5rem',
    '--radius-lg': '0.75rem',
    '--radius-xl': '1rem',
  },
  lg: {
    '--radius-sm': '0.5rem',
    '--radius-md': '0.75rem',
    '--radius-lg': '1rem',
    '--radius-xl': '1.5rem',
  },
  xl: {
    '--radius-sm': '0.75rem',
    '--radius-md': '1rem',
    '--radius-lg': '1.5rem',
    '--radius-xl': '2rem',
  },
} as const satisfies Record<string, Record<string, string>>;

export type BrandRadiusPreset = keyof typeof BRAND_RADIUS_PRESETS;

export const BRAND_DENSITY_VARS = {
  compact: {
    '--space-2': '0.375rem',
    '--space-3': '0.5rem',
    '--space-4': '0.75rem',
    '--space-5': '1rem',
    '--space-6': '1.25rem',
    '--space-8': '1.5rem',
    '--space-10': '2rem',
    '--space-12': '2.25rem',
  },
} as const satisfies Record<string, Record<string, string>>;

export interface BrandVisualInput {
  primaryColor?: string;
  accentColor?: string;
  fontToken?: ApprovedFontToken;
  radius?: BrandRadiusPreset;
  density?: 'comfortable' | 'compact';
}

export const APPROVED_FONT_STACKS = {
  'platform-sans':
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'editorial-serif':
    'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  'humanist-sans':
    '"Trebuchet MS", Frutiger, "Frutiger Linotype", ui-sans-serif, sans-serif',
} as const;

export type ApprovedFontToken = keyof typeof APPROVED_FONT_STACKS;

export interface BrandCssOutput {
  /** Overrides for light mode (and the shared primitive scale). */
  root: Record<string, string>;
  /** Overrides that only apply under `[data-theme='dark']`. */
  dark: Record<string, string>;
}

// ---------------------------------------------------------------------------
// hex → OKLCH (Björn Ottosson's OKLab, D65)
// ---------------------------------------------------------------------------

const HEX_RE = /^#(?:[0-9a-f]{6}|[0-9a-f]{3})$/i;

export interface OklchColor {
  readonly l: number;
  readonly c: number;
  readonly h: number;
}

function cbrt(v: number): number {
  return Math.cbrt(v);
}

export function hexToOklch(hex: string): OklchColor | null {
  const match = HEX_RE.exec(hex.trim());
  if (!match) return null;

  let raw = match[0].slice(1);
  if (raw.length === 3) {
    raw = raw
      .split('')
      .map((ch) => ch + ch)
      .join('');
  }

  const int = parseInt(raw, 16);
  const r = ((int >> 16) & 0xff) / 255;
  const g = ((int >> 8) & 0xff) / 255;
  const b = (int & 0xff) / 255;

  const lin = (c: number): number => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const rr = lin(r);
  const gg = lin(g);
  const bb = lin(b);

  // LMS in OKLab space directly from linear sRGB (Ottosson's constants).
  const lmsL = 0.4122214708 * rr + 0.5363325363 * gg + 0.0514459929 * bb;
  const lmsM = 0.2119034982 * rr + 0.6806995451 * gg + 0.1073969566 * bb;
  const lmsS = 0.0883024619 * rr + 0.2817188376 * gg + 0.6299787005 * bb;

  const l_ = cbrt(lmsL);
  const m_ = cbrt(lmsM);
  const s_ = cbrt(lmsS);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const b_ = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const c = Math.hypot(a, b_);
  const h = (Math.atan2(b_, a) * 180) / Math.PI;

  return {
    l: L,
    c,
    h: h < 0 ? h + 360 : h,
  };
}

function toOklchCss(l: number, c: number, h: number): string {
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`;
}

// ---------------------------------------------------------------------------
// OKLCH → sRGB + WCAG contrast
// ---------------------------------------------------------------------------

export interface RgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/**
 * Inverse of hexToOklch (Ottosson's OKLab path). Returns gamma-encoded 0-255
 * sRGB. Out-of-gamut channels are clamped.
 */
export function oklchToRgb(l: number, c: number, h: number): RgbColor {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const lmsL = l_ * l_ * l_;
  const lmsM = m_ * m_ * m_;
  const lmsS = s_ * s_ * s_;

  const rLin =
    4.0767416621 * lmsL - 3.3077115913 * lmsM + 0.2309699292 * lmsS;
  const gLin =
    -1.2684380046 * lmsL + 2.6097574011 * lmsM - 0.3413193965 * lmsS;
  const bLin =
    -0.0041960863 * lmsL - 0.7034186147 * lmsM + 1.707614701 * lmsS;

  const encode = (linear: number): number => {
    const v = Math.max(linear, 0);
    const srgb = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
    return Math.min(255, Math.max(0, Math.round(srgb * 255)));
  };

  return {
    r: encode(rLin),
    g: encode(gLin),
    b: encode(bLin),
  };
}

export function hexToRgb(hex: string): RgbColor | null {
  const match = HEX_RE.exec(hex.trim());
  if (!match) return null;
  let raw = match[0].slice(1);
  if (raw.length === 3) {
    raw = raw
      .split('')
      .map((ch) => ch + ch)
      .join('');
  }
  const int = parseInt(raw, 16);
  return {
    r: (int >> 16) & 0xff,
    g: (int >> 8) & 0xff,
    b: int & 0xff,
  };
}

function channelLuminance(channel: number): number {
  const v = channel / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return (
    0.2126 * channelLuminance(rgb.r) +
    0.7152 * channelLuminance(rgb.g) +
    0.0722 * channelLuminance(rgb.b)
  );
}

/** WCAG 2.1 contrast ratio between two hex colors (1.0–21.0). */
export function contrastRatio(hexA: string, hexB: string): number | null {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  if (lumA === null || lumB === null) return null;
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

export function oklchToHex(l: number, c: number, h: number): string {
  const { r, g, b } = oklchToRgb(l, c, h);
  const toHex = (v: number): string => v.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toLowerCase();
}

/**
 * Contrast of the brand accent (step 500) against white text — the pair used
 * for primary buttons ([4.5] minimum for AA).
 */
export function brandAccentContrast(primaryColor: string): number | null {
  const scale = generatePrimaryScale(primaryColor);
  if (!scale) return null;
  const accent = scale['500'] ?? '';
  const match = /oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/.exec(accent);
  if (!match) return null;
  const hex = oklchToHex(Number(match[1]), Number(match[2]), Number(match[3]));
  return contrastRatio(hex, '#FFFFFF');
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ---------------------------------------------------------------------------
// Scale generation
// ---------------------------------------------------------------------------

const SCALE_STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] as const;
const SCALE_500_INDEX = 5;
const NEUTRAL_FALLBACK_HUE = 250;
const MIN_BRAND_L = 0.42;
const MAX_BRAND_L = 0.82;
const MAX_BRAND_C = 0.24;

export function generatePrimaryScale(primaryColor: string): Record<string, string> | null {
  const oklch = hexToOklch(primaryColor);
  if (!oklch) return null;

  const brandL = Math.min(Math.max(oklch.l, MIN_BRAND_L), MAX_BRAND_L);
  const brandC = Math.min(Math.max(oklch.c, 0.03), MAX_BRAND_C);
  const brandH = Number.isFinite(oklch.h) ? oklch.h : NEUTRAL_FALLBACK_HUE;

  const scale: Record<string, string> = {};

  SCALE_STEPS.forEach((step, index) => {
    let l: number;
    let c: number;
    let h = brandH;

    if (index === SCALE_500_INDEX) {
      l = brandL;
      c = brandC;
    } else if (index < SCALE_500_INDEX) {
      const t = (SCALE_500_INDEX - index) / SCALE_500_INDEX; // 1 at step 50
      l = lerp(brandL, 0.985, Math.pow(t, 1.2));
      c = lerp(brandC, 0.004, Math.pow(t, 1.7));
    } else {
      const t = (index - SCALE_500_INDEX) / (SCALE_STEPS.length - 1 - SCALE_500_INDEX); // 1 at 900
      l = lerp(brandL, 0.155, Math.pow(t, 1.15));
      c = lerp(brandC, 0.006, Math.pow(t, 1.5));
    }

    if (c < 0.003) {
      h = NEUTRAL_FALLBACK_HUE;
    }

    scale[step] = toOklchCss(l, c, h);
  });

  return scale;
}

const BRAND_RADIUS_KEYS = Object.keys(
  BRAND_RADIUS_PRESETS.md,
) as (keyof (typeof BRAND_RADIUS_PRESETS)['md'])[];

const THEME_RADIUS_PRESETS: Record<
  TenantThemeConfig['appearance']['radius'],
  BrandRadiusPreset
> = {
  compact: 'sm',
  standard: 'md',
  rounded: 'xl',
};

const THEME_SHADOW_PRESETS: Record<
  TenantThemeConfig['appearance']['shadow'],
  Record<'--shadow-sm' | '--shadow-md', string>
> = {
  none: { '--shadow-sm': 'none', '--shadow-md': 'none' },
  subtle: {
    '--shadow-sm': '0 1px 3px oklch(0 0 0 / 0.10), 0 1px 2px oklch(0 0 0 / 0.06)',
    '--shadow-md': '0 4px 6px oklch(0 0 0 / 0.10), 0 2px 4px oklch(0 0 0 / 0.06)',
  },
  elevated: {
    '--shadow-sm': '0 4px 10px oklch(0 0 0 / 0.14)',
    '--shadow-md': '0 12px 28px oklch(0 0 0 / 0.18)',
  },
};

function accessibleForeground(background: string): '#000000' | '#ffffff' {
  const whiteContrast = contrastRatio(background, '#ffffff') ?? 0;
  const blackContrast = contrastRatio(background, '#000000') ?? 0;
  return whiteContrast >= blackContrast ? '#ffffff' : '#000000';
}

function assignThemeColors(
  target: Record<string, string>,
  colors: TenantThemeColors,
): void {
  target['--color-primary'] = colors.primary;
  target['--color-primary-foreground'] = colors.primaryForeground;
  target['--color-secondary'] = colors.secondary;
  target['--color-secondary-foreground'] = colors.secondaryForeground;
  target['--color-accent'] = colors.accent;
  target['--color-accent-foreground'] = colors.accentForeground;
  target['--color-accent-subtle'] = colors.accentSubtle;
  target['--color-accent-subtle-foreground'] = colors.accentSubtleForeground;
  target['--color-background'] = colors.background;
  target['--color-surface'] = colors.surface;
  target['--color-surface-elevated'] = colors.surfaceElevated;
  target['--color-foreground'] = colors.foreground;
  target['--color-muted'] = colors.muted;
  target['--color-muted-foreground'] = colors.mutedForeground;
  target['--color-border'] = colors.border;
  target['--color-ring'] = colors.ring;
  target['--color-success'] = colors.success;
  target['--color-warning'] = colors.warning;
  target['--color-destructive'] = colors.destructive;
  target['--color-info'] = colors.info;
}

/** Map a validated v1 tenant theme to the shared semantic token vocabulary. */
export function tenantThemeToCssVars(theme: TenantThemeConfig): BrandCssOutput {
  const root: Record<string, string> = {};
  const dark: Record<string, string> = {};

  assignThemeColors(root, theme.colors);
  if (theme.darkColors) assignThemeColors(dark, theme.darkColors);

  root['--font-heading'] = APPROVED_FONT_STACKS[theme.typography.heading];
  root['--font-body'] = APPROVED_FONT_STACKS[theme.typography.body];
  root['--font-interface'] = APPROVED_FONT_STACKS[theme.typography.interface];
  root['--font-sans'] = 'var(--font-body)';

  const radius = BRAND_RADIUS_PRESETS[THEME_RADIUS_PRESETS[theme.appearance.radius]];
  BRAND_RADIUS_KEYS.forEach((key) => {
    root[key] = radius[key] ?? '';
  });
  Object.assign(root, THEME_SHADOW_PRESETS[theme.appearance.shadow]);

  if (theme.appearance.density === 'compact') {
    Object.assign(root, BRAND_DENSITY_VARS.compact);
  }

  return { root, dark };
}

// ---------------------------------------------------------------------------
// Brand → CSS vars
// ---------------------------------------------------------------------------

export function brandToCssVars(brand: BrandVisualInput): BrandCssOutput {
  const root: Record<string, string> = {};
  const dark: Record<string, string> = {};

  const primaryScale = brand.primaryColor
    ? generatePrimaryScale(brand.primaryColor)
    : null;

  if (primaryScale) {
    SCALE_STEPS.forEach((step) => {
      root[`--color-primary-${step}`] = primaryScale[step] ?? '';
    });

    // Semantic primitives derived from the brand scale (light mode).
    root['--color-primary'] = brand.primaryColor ?? '';
    root['--color-primary-foreground'] = accessibleForeground(
      brand.primaryColor ?? '',
    );
    root['--color-ring'] = primaryScale['500'] ?? '';

    // Dark mode re-derives semantic tokens from the scale (tokens.css maps
    // them to the lighter end) — only the fixed accent-subtle needs a manual
    // tint so it stays within the tenant's hue family.
    const brandChroma = hexToOklch(brand.primaryColor ?? '');
    const hue =
      brandChroma && Number.isFinite(brandChroma.h) && brandChroma.c >= 0.003
        ? brandChroma.h
        : NEUTRAL_FALLBACK_HUE;
    dark['--color-primary'] = primaryScale['400'] ?? '';
    dark['--color-primary-foreground'] = '#000000';
    dark['--color-ring'] = primaryScale['400'] ?? '';
    dark['--color-accent-subtle'] = toOklchCss(0.26, 0.065, hue);
  }

  // Legacy accent is mapped to the canonical tenant accent. Commercial plan
  // and trust tokens remain independent in @saas/ui/tokens.css.
  if (brand.accentColor) {
    const accentScale = generatePrimaryScale(brand.accentColor);
    if (accentScale) {
      root['--color-accent'] = brand.accentColor;
      root['--color-accent-foreground'] = accessibleForeground(brand.accentColor);
      root['--color-accent-subtle'] = accentScale['100'] ?? '';
      const accentChroma = hexToOklch(brand.accentColor);
      const accentHue =
        accentChroma && Number.isFinite(accentChroma.h) && accentChroma.c >= 0.003
          ? accentChroma.h
          : NEUTRAL_FALLBACK_HUE;
      dark['--color-accent'] = accentScale['400'] ?? '';
      dark['--color-accent-foreground'] = '#000000';
      dark['--color-accent-subtle'] = toOklchCss(0.26, 0.065, accentHue);
    }
  }

  if (brand.fontToken) {
    const stack = APPROVED_FONT_STACKS[brand.fontToken];
    root['--font-heading'] = stack;
    root['--font-body'] = stack;
    root['--font-interface'] = stack;
    root['--font-sans'] = 'var(--font-body)';
  }

  if (brand.radius) {
    const preset = BRAND_RADIUS_PRESETS[brand.radius];
    BRAND_RADIUS_KEYS.forEach((key) => {
      root[key] = preset[key] ?? '';
    });
  }

  if (brand.density === 'compact') {
    Object.entries(BRAND_DENSITY_VARS.compact).forEach(([key, value]) => {
      root[key] = value;
    });
  }

  return { root, dark };
}

export function brandCssVarsToStyle(output: BrandCssOutput): string {
  const safeEntries = (record: Record<string, string>) =>
    Object.entries(record).filter(
      ([key, value]) => /^--[a-z0-9-]+$/.test(key) && !/[;{}]/.test(value),
    );

  const rootBody = safeEntries(output.root)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n  ');
  const darkBody = safeEntries(output.dark)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n  ');

  const parts: string[] = [];
  if (rootBody) parts.push(`:root {\n  ${rootBody}\n}`);
  if (darkBody) parts.push(`[data-theme='dark'] {\n  ${darkBody}\n}`);
  return parts.join('\n');
}
