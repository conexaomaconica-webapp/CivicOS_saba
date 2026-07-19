// @ts-nocheck
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Monorepo Dependency Boundaries (Architecture Linter)', () => {
  const rootDir = path.resolve(__dirname, '../../../../');

  function scanFiles(dir: string, fileCallback: (filePath: string, content: string) => void) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        if (file === 'node_modules' || file === 'dist' || file === '.turbo' || file === '.next') {
          continue;
        }
        scanFiles(fullPath, fileCallback);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        fileCallback(fullPath, content);
      }
    }
  }

  it('Core Kernel should not import from Plugins', () => {
    const coreSrcDir = path.join(rootDir, 'packages/core/src');
    const violations: string[] = [];

    scanFiles(coreSrcDir, (filePath, content) => {
      // Look for import pattern matching plugins
      const pluginImportRegex = /from\s+['"]@saas\/plugin-[^'"]+['"]/g;
      const matches = content.match(pluginImportRegex);
      if (matches) {
        violations.push(`${path.relative(rootDir, filePath)} imports plugins: ${matches.join(', ')}`);
      }
    });

    expect(violations).toEqual([]);
  });

  it('Plugins should not import from other Plugins', () => {
    const pluginsDir = path.join(rootDir, 'plugins');
    const violations: string[] = [];

    if (fs.existsSync(pluginsDir)) {
      const pluginFolders = fs.readdirSync(pluginsDir);
      for (const folder of pluginFolders) {
        const fullPath = path.join(pluginsDir, folder);
        if (!fs.statSync(fullPath).isDirectory()) continue;

        const pluginSrc = path.join(fullPath, 'src');
        scanFiles(pluginSrc, (filePath, content) => {
          // Look for import pattern matching other plugins
          // Avoid matching the current plugin import itself (which shouldn't happen unless imported by alias)
          const pluginImportRegex = /from\s+['"]@saas\/plugin-([^'"]+)['"]/g;
          let match;
          while ((match = pluginImportRegex.exec(content)) !== null) {
            const importedPlugin = match[1];
            if (importedPlugin !== folder) {
              violations.push(
                `${path.relative(rootDir, filePath)} imports other plugin: "${importedPlugin}"`
              );
            }
          }
        });
      }
    }

    expect(violations).toEqual([]);
  });

  it('Plugins should only import from public Core entrypoint @saas/core', () => {
    const pluginsDir = path.join(rootDir, 'plugins');
    const violations: string[] = [];

    if (fs.existsSync(pluginsDir)) {
      const pluginFolders = fs.readdirSync(pluginsDir);
      for (const folder of pluginFolders) {
        const fullPath = path.join(pluginsDir, folder);
        if (!fs.statSync(fullPath).isDirectory()) continue;

        const pluginSrc = path.join(fullPath, 'src');
        scanFiles(pluginSrc, (filePath, content) => {
          // Search for imports from packages/core/src internal files
          const coreInternalImportRegex = /from\s+['"]@saas\/core\/src\/[^'"]+['"]/g;
          const matches = content.match(coreInternalImportRegex);
          if (matches) {
            violations.push(
              `${path.relative(rootDir, filePath)} imports core internals: ${matches.join(', ')}`
            );
          }
        });
      }
    }

    expect(violations).toEqual([]);
  });
});
