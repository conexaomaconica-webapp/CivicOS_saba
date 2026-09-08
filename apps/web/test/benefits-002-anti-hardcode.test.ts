import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('BENEFITS-002 Anti-Hardcode Regression Tests', () => {
  const libDir = path.resolve(__dirname, '../src/lib');

  function getTsFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        // Exclude fixture directories from production code check as approved
        if (!filePath.endsWith('fixtures')) {
          getTsFiles(filePath, fileList);
        }
      } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        fileList.push(filePath);
      }
    }
    return fileList;
  }

  it('prohibits hardcoded plan limits (benefitsLimit = N, servicesLimit = N, galleryLimit = N) in production services', () => {
    const files = getTsFiles(libDir);
    const prohibitedPatterns = [
      /benefitsLimit\s*=\s*(2|3|5|10)/,
      /servicesLimit\s*=\s*(2|3|5|10|25)/,
      /galleryLimit\s*=\s*(2|3|5|6|10)/,
      /benefits_limit:\s*(2|3|5|10),/,
      /services_limit:\s*(2|3|5|10|25),/,
      /gallery_photos_limit:\s*(2|3|5|6|10),/,
    ];

    const violations: string[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      for (const pattern of prohibitedPatterns) {
        if (pattern.test(content)) {
          const relativePath = path.relative(libDir, file);
          violations.push(`${relativePath} matches ${pattern.toString()}`);
        }
      }
    }

    expect(violations, `Found hardcoded plan limits in production services:\n${violations.join('\n')}`).toEqual([]);
  });

  it('verifies canonical plan_entitlements integration in core services', () => {
    const adminBizService = fs.readFileSync(path.join(libDir, 'admin/admin-businesses-service.ts'), 'utf8');
    const advertiserPortalService = fs.readFileSync(path.join(libDir, 'advertiser/advertiser-portal-service.ts'), 'utf8');
    const advertiserContentService = fs.readFileSync(path.join(libDir, 'advertiser/advertiser-content-service.ts'), 'utf8');
    const adminApprovalService = fs.readFileSync(path.join(libDir, 'admin/admin-approval-service.ts'), 'utf8');

    expect(adminBizService).toContain("from('plan_entitlements')");
    expect(advertiserPortalService).toContain("from('plan_entitlements')");
    expect(advertiserContentService).toContain("from('plan_entitlements')");
    expect(adminApprovalService).toContain("from('plan_entitlements')");
  });
});
