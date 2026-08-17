import { expect, test } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const artifact = (name: string) => path.resolve(__dirname, '../../../artifacts/visual', name);

test.describe('Figma Ouro/Fundador Responsive Visual Lab Checkpoint 3', () => {
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
    test(`Captura Responsiva Ouro/Fundador — ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const response = await page.goto('/visual-lab/figma/ouro-fundadora', { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);

      await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
      await page.evaluate(async () => document.fonts.ready);

      // Verify no horizontal overflow in FigmaOuroView component
      const overflow = await page.evaluate(() => {
        const container = document.querySelector('[data-visual-lab="figma-ouro"]');
        return container ? container.scrollWidth > container.clientWidth + 2 : false;
      });
      expect(overflow).toBe(false);

      // Structural assertions for Ouro / Fundador specific flagship identity
      await expect(page.locator('[data-testid="ouro-hero-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="ouro-logo-box"]')).toBeVisible();
      await expect(page.locator('[data-testid="ouro-badges-row"]')).toBeVisible();
      await expect(page.locator('[data-testid="ouro-sticky-bar"]')).toBeVisible();
      await expect(page.locator('[data-testid="ouro-col-institutional"]')).toBeVisible();
      await expect(page.locator('[data-testid="ouro-services-2x2"]')).toBeVisible();
      await expect(page.locator('[data-testid="ouro-indicated-block"]')).toBeVisible();
      await expect(page.locator('[data-testid="ouro-col-media-conversion"]')).toBeVisible();
      await expect(page.locator('[data-testid="ouro-benefit-premium-box"]')).toBeVisible();
      await expect(page.locator('[data-testid="ouro-benefit-redeem-btn"]')).toBeVisible();
      await expect(page.locator('[data-testid="ouro-photos-videos-grid"]')).toBeVisible();
      await expect(page.locator('[data-testid="ouro-events-block"]')).toBeVisible();
      await expect(page.locator('[data-testid="ouro-sidebar"]')).toBeVisible();

      // Viewport Screenshot
      await page.screenshot({
        path: artifact(`figma-ouro-${vp.name}.png`),
        fullPage: false,
        animations: 'disabled',
      });

      // Full Page Screenshots
      if (vp.name === 'mobile-390') {
        await page.screenshot({
          path: artifact('figma-ouro-mobile-390-fullpage.png'),
          fullPage: true,
          animations: 'disabled',
        });
      }

      if (vp.name === 'desktop-1440') {
        await page.screenshot({
          path: artifact('figma-ouro-desktop-1440-fullpage.png'),
          fullPage: true,
          animations: 'disabled',
        });
      }
    });
  }
});
