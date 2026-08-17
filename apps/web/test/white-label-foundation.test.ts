import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(process.cwd(), '..', '..');
const sharedComponentsDirectory = resolve(
  repositoryRoot,
  'packages',
  'ui',
  'src',
  'components',
);
const tokensFile = resolve(
  repositoryRoot,
  'packages',
  'ui',
  'src',
  'tokens',
  'tokens.css',
);
const tailwindPresetFile = resolve(
  repositoryRoot,
  'packages',
  'ui',
  'src',
  'tailwind-preset.ts',
);
const webTailwindConfigFile = resolve(
  repositoryRoot,
  'apps',
  'web',
  'tailwind.config.ts',
);

describe('white-label core boundaries', () => {
  it('keeps literal product palettes out of shared components', () => {
    const forbiddenUtility =
      /(?:bg|text|border|ring)-(?:red|yellow|amber|slate|blue|rose|emerald)-\d+/;
    const forbiddenBrandColor = /#(?:7a1f2e|c9a227|e8c767|f3eedd|4a0e1a)/i;

    for (const fileName of readdirSync(sharedComponentsDirectory)) {
      if (!fileName.endsWith('.tsx')) continue;
      const source = readFileSync(
        resolve(sharedComponentsDirectory, fileName),
        'utf8',
      );
      expect(source, fileName).not.toMatch(forbiddenUtility);
      expect(source, fileName).not.toMatch(forbiddenBrandColor);
      expect(source, fileName).not.toContain('conexao-maconica');
    }
  });

  it('defines one canonical semantic token vocabulary plus protected states', () => {
    const source = readFileSync(tokensFile, 'utf8');
    const requiredTokens = [
      '--color-primary',
      '--color-primary-foreground',
      '--color-secondary',
      '--color-accent',
      '--color-background',
      '--color-surface',
      '--color-surface-elevated',
      '--color-foreground',
      '--color-muted',
      '--color-muted-foreground',
      '--color-border',
      '--color-ring',
      '--color-success',
      '--color-warning',
      '--color-destructive',
      '--font-heading',
      '--font-body',
      '--font-interface',
      '--plan-bronze',
      '--plan-silver',
      '--plan-gold',
      '--trust-verified',
      '--trust-founder',
    ];

    for (const token of requiredTokens) {
      expect(source, token).toContain(`${token}:`);
    }
  });

  it('shares the Tailwind mapping instead of duplicating it per product', () => {
    const preset = readFileSync(tailwindPresetFile, 'utf8');
    const webConfig = readFileSync(webTailwindConfigFile, 'utf8');

    expect(preset).toContain("background: 'var(--color-background)'");
    expect(preset).toContain("foreground: 'var(--color-primary-foreground)'");
    expect(webConfig).toContain("from '@saas/ui/tailwind-preset'");
    expect(webConfig).not.toContain("'var(--color-primary)'");
  });
});
