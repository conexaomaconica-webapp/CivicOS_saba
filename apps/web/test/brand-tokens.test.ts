import { describe, expect, it } from 'vitest';
import {
  brandAccentContrast,
  brandCssVarsToStyle,
  brandToCssVars,
  contrastRatio,
  generatePrimaryScale,
  hexToOklch,
  oklchToHex,
  oklchToRgb,
  relativeLuminance,
} from '@/lib/tenant/brand-tokens';

describe('hexToOklch', () => {
  it('converts a known hex to OKLCH (BK Blue #1E3A8A)', () => {
    const oklch = hexToOklch('#1E3A8A');
    expect(oklch).not.toBeNull();
    expect(oklch!.l).toBeGreaterThan(0.2);
    expect(oklch!.l).toBeLessThan(0.5);
    expect(oklch!.c).toBeGreaterThan(0.1);
    expect(oklch!.h).toBeGreaterThan(200);
    expect(oklch!.h).toBeLessThan(320);
  });

  it('accepts shorthand hex (#0af)', () => {
    expect(hexToOklch('#0af')).not.toBeNull();
  });

  it('rejects invalid input', () => {
    expect(hexToOklch('blue')).toBeNull();
    expect(hexToOklch('#12345')).toBeNull();
    expect(hexToOklch('#gggggg')).toBeNull();
    expect(hexToOklch('')).toBeNull();
  });

  it('returns finite hue even for near-neutral colors', () => {
    const oklch = hexToOklch('#FFFFFF');
    expect(oklch).not.toBeNull();
    expect(Number.isFinite(oklch!.h)).toBe(true);
  });
});

describe('generatePrimaryScale', () => {
  it('generates the ten OKLCH steps', () => {
    const scale = generatePrimaryScale('#1E3A8A');
    expect(scale).not.toBeNull();
    expect(Object.keys(scale!)).toEqual([
      '50',
      '100',
      '200',
      '300',
      '400',
      '500',
      '600',
      '700',
      '800',
      '900',
    ]);
  });
  it('anchors step 500 on the brand color itself', () => {
    const scale = generatePrimaryScale('#1E3A8A')!;
    expect(scale['500']).toContain('oklch(');
  });
  it('monotonically decreases lightness from 50 to 900', () => {
    const scale = generatePrimaryScale('#C2410C')!;
    const steps = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'];
    const lightness = steps.map((step) => {
      const match = /oklch\((\d+\.\d+)/.exec(scale[step]!);
      return match ? Number(match[1]) : NaN;
    });
    for (let i = 1; i < lightness.length; i += 1) {
      expect(lightness[i]!).toBeLessThan(lightness[i - 1]!);
    }
  });

  it('clamps degenerate inputs so the scale stays usable', () => {
    const white = generatePrimaryScale('#FFFFFF')!;
    const black = generatePrimaryScale('#000000')!;
    expect(white['500']).toBeDefined();
    expect(black['500']).toBeDefined();
    expect(parseFloat((/oklch\((\d+\.\d+)/.exec(white['500']!) || [])[1] || '0')).toBeGreaterThan(
      0.4,
    );
    expect(parseFloat((/oklch\((\d+\.\d+)/.exec(black['500']!) || [])[1] || '0')).toBeGreaterThan(
      0.4,
    );
  });

  it('returns null for invalid hex', () => {
    expect(generatePrimaryScale('nope')).toBeNull();
  });
});

describe('brandToCssVars', () => {
  it('produces nothing for an empty brand', () => {
    const output = brandToCssVars({});
    expect(output.root).toEqual({});
    expect(output.dark).toEqual({});
  });

  it('maps primary scale + semantic primitives', () => {
    const output = brandToCssVars({ primaryColor: '#1E3A8A' });
    expect(output.root['--color-primary-500']).toBeDefined();
    expect(output.root['--accent']).toBe(output.root['--color-primary-500']);
    expect(output.root['--accent-hover']).toBe(output.root['--color-primary-600']);
    expect(output.root['--accent-active']).toBe(output.root['--color-primary-700']);
    expect(output.root['--accent-subtle']).toBe(output.root['--color-primary-100']);
    expect(output.root['--border-focus']).toBe(output.root['--color-primary-500']);
    expect(output.root['--text-link']).toBe(output.root['--color-primary-600']);
    expect(output.dark['--accent-subtle']).toContain('oklch(');
  });

  it('applies warm institutional surfaces in both modes', () => {
    const output = brandToCssVars({ primaryColor: '#1E3A8A' });
    expect(output.root['--bg-primary']).toContain('oklch(');
    expect(output.root['--bg-secondary']).toContain('oklch(');
    expect(output.root['--bg-tertiary']).toContain('oklch(');
    expect(output.dark['--bg-primary']).toContain('oklch(');
    expect(output.dark['--bg-secondary']).toContain('oklch(');
    expect(output.dark['--bg-tertiary']).toContain('oklch(');
  });

  it('accent color feeds the highlight family, never the interaction accent', () => {
    const output = brandToCssVars({
      primaryColor: '#1E3A8A',
      accentColor: '#C2410C',
    });
    expect(output.root['--accent']).toBe(output.root['--color-primary-500']);
    expect(output.root['--accent-hover']).toBe(output.root['--color-primary-600']);
    expect(output.root['--highlight']).not.toBe(output.root['--color-primary-500']);
    expect(output.root['--highlight']).toContain('oklch(');
    expect(output.root['--highlight-hover']).toContain('oklch(');
    expect(output.root['--highlight-active']).toContain('oklch(');
    expect(output.root['--highlight-subtle']).toContain('oklch(');
    expect(output.dark['--highlight-subtle']).toContain('oklch(');
  });

  it('overrides the font stack', () => {
    const output = brandToCssVars({ fontFamily: "'Playfair Display', serif" });
    expect(output.root['--font-sans']).toBe("'Playfair Display', serif");
  });

  it('applies radius presets to all four radius tokens', () => {
    const output = brandToCssVars({ radius: 'xl' });
    expect(output.root['--radius-sm']).toBe('0.75rem');
    expect(output.root['--radius-md']).toBe('1rem');
    expect(output.root['--radius-lg']).toBe('1.5rem');
    expect(output.root['--radius-xl']).toBe('2rem');
  });

  it('applies compact density spacing', () => {
    const output = brandToCssVars({ density: 'compact' });
    expect(output.root['--space-4']).toBe('0.75rem');
    expect(output.root['--space-10']).toBe('2rem');
  });

  it('never touches protected tokens', () => {
    const output = brandToCssVars({ primaryColor: '#1E3A8A', radius: 'xl' });
    const keys = Object.keys(output.root);
    expect(keys.some((key) => key.includes('success'))).toBe(false);
    expect(keys.some((key) => key.includes('warning'))).toBe(false);
    expect(keys.some((key) => key.includes('danger'))).toBe(false);
  });
});

describe('brandCssVarsToStyle', () => {
  it('emits a :root block and a dark-mode block', () => {
    const style = brandCssVarsToStyle(
      brandToCssVars({ primaryColor: '#1E3A8A', density: 'compact' }),
    );
    expect(style).toContain(':root {');
    expect(style).toContain('--accent:');
    expect(style).toContain("[data-theme='dark'] {");
  });

  it('emits nothing for an empty output', () => {
    expect(brandCssVarsToStyle({ root: {}, dark: {} })).toBe('');
  });
});

describe('contrast helpers', () => {
  it('round-trips a known color hex → oklch → rgb', () => {
    const oklch = hexToOklch('#1E3A8A')!;
    const rgb = oklchToRgb(oklch.l, oklch.c, oklch.h);
    expect(Math.abs(rgb.r - 30)).toBeLessThanOrEqual(4);
    expect(Math.abs(rgb.g - 58)).toBeLessThanOrEqual(4);
    expect(Math.abs(rgb.b - 138)).toBeLessThanOrEqual(4);
  });

  it('computes WCAG contrast for black/white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 0);
  });

  it('rejects invalid hex in contrast helpers', () => {
    expect(relativeLuminance('nope')).toBeNull();
    expect(contrastRatio('#000000', 'nope')).toBeNull();
  });

  it('flags weak brand accents below the 4.5:1 AA floor', () => {
    const weak = brandAccentContrast('#FACC15');
    expect(weak).not.toBeNull();
    expect(weak!).toBeLessThan(4.5);
  });

  it('accepts strong brand accents above the 4.5:1 AA floor', () => {
    const strong = brandAccentContrast('#14284B');
    expect(strong).not.toBeNull();
    expect(strong!).toBeGreaterThanOrEqual(4.5);
  });
});