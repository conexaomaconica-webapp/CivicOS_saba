// @ts-nocheck
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

function walkDir(dir: string, callback: (filePath: string) => void) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f === 'tests') return;
      walkDir(dirPath, callback);
    } else {
      if (dirPath.endsWith('.ts')) {
        callback(dirPath);
      }
    }
  });
}

describe('CivicOS Core Constraints (AC-7F)', () => {
  it('Core should not contain any persistence-specific imports', () => {
    const srcDir = path.resolve(__dirname, '..');
    const forbiddenImports = [
      'supabase',
      'prisma',
      'drizzle',
      'typeorm',
      'pg',
      'redis',
      'mysql',
      'mongoose',
      'mongodb'
    ];

    walkDir(srcDir, (filePath) => {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      for (const forbidden of forbiddenImports) {
        const regex = new RegExp(`from\\s+['"][^'"]*${forbidden}[^'"]*['"]`, 'i');
        const match = content.match(regex);
        if (match) {
          throw new Error(`Architecture violation: found persistence import "${match[0]}" in ${filePath}. The Kernel must remain DB-agnostic.`);
        }
      }
    });

    expect(true).toBe(true);
  });
});
