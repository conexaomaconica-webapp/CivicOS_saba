import { expect, test } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const artifact = (name: string) => path.resolve(__dirname, '../../../artifacts/visual', name);

test.describe('Figma Prata Responsive Visual Lab Checkpoint 2', () => {
  test.beforeEach(async () => {
    const targetDir = path.resolve(__dirname, '../../../artifacts/visual');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  });

  const viewports = [
    { width: 390, height: 844, name: 'mobile-390' },
    { width: 768, height: 1024, name: 'tablet-768' },
    { width: 1440, height: 900, name: 'desktop-1440' },
    { width: 1920, height: 1080, name: 'desktop-1920' },
  ];

  for (const vp of viewports) {
    test(`Captura Responsiva Prata — ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const response = await page.goto('/visual-lab/figma/prata', { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);

      await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
      await page.evaluate(async () => document.fonts.ready);

      // Verify no horizontal overflow in FigmaPrataView component
      const overflow = await page.evaluate(() => {
        const container = document.querySelector('[data-visual-lab="figma-prata"]');
        return container ? container.scrollWidth > container.clientWidth + 2 : false;
      });
      expect(overflow).toBe(false);

      // Structural assertions for Prata specific identity
      await expect(page.locator('[data-testid="prata-hero-grid"]')).toBeVisible();
      await expect(page.locator('[data-testid="prata-info-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="prata-gallery-grid"]')).toBeVisible();
      await expect(page.locator('[data-testid="prata-action-bar"]')).toBeVisible();
      await expect(page.locator('[data-testid="prata-sticky-tabs"]')).toBeVisible();
      await expect(page.locator('[data-testid="prata-benefit-banner"]')).toBeVisible();
      await expect(page.locator('[data-testid="prata-services-grid"]')).toBeVisible();
      await expect(page.locator('[data-testid="prata-photos-strip"]')).toBeVisible();
      await expect(page.locator('[data-testid="prata-sidebar"]')).toBeVisible();

      // Viewport Screenshot
      await page.screenshot({
        path: artifact(`figma-prata-${vp.name}.png`),
        fullPage: false,
        animations: 'disabled',
      });

      // Full Page Screenshots
      if (vp.name === 'mobile-390') {
        await page.screenshot({
          path: artifact('figma-prata-mobile-390-fullpage.png'),
          fullPage: true,
          animations: 'disabled',
        });
      }

      if (vp.name === 'desktop-1440') {
        await page.screenshot({
          path: artifact('figma-prata-desktop-1440-fullpage.png'),
          fullPage: true,
          animations: 'disabled',
        });
      }
    });
  }
});
