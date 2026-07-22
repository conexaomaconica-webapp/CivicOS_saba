import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Architectural Boundary Test
 * Web Shell (apps/web) should NEVER import specific domain plugins.
 * It is only allowed to depend on @saas/sdk, @saas/app-sdk, and @saas/ui.
 */
describe('Web Shell Boundary', () => {
  it('should not import any domain plugin', () => {
    const packageJsonPath = path.resolve(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    const dependencies = {
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {})
    };

    const pluginDeps = Object.keys(dependencies).filter(dep => 
      dep.startsWith('@saas/plugin-') || 
      dep === '@saas/business-directory' ||
      dep === '@saas/masonic-agenda'
    );

    expect(pluginDeps.length).toBe(0);
  });

  it('should not contain import statements for plugins in source files', () => {
    // A simplified regex-based check for source files
    function checkDirForImports(dir: string) {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
          checkDirForImports(fullPath);
        } else if (file.isFile() && /\.(ts|tsx)$/.test(file.name)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          // Check for any forbidden import e.g. import { ... } from '@saas/plugin-...'
          const hasForbiddenImport = /from\s+['"]@saas\/plugin-/.test(content);
          expect(hasForbiddenImport).toBe(false);
        }
      }
    }

    checkDirForImports(path.resolve(__dirname, '../src'));
  });
});
