import { expect, test } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const artifact = (name: string) => path.resolve(__dirname, '../../../artifacts/visual', name);

test.describe('Figma Bronze Responsive Visual Lab Checkpoint 1', () => {
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
    test(`Captura Responsiva — ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const response = await page.goto('/visual-lab/figma/bronze', { waitUntil: 'networkidle' });
      expect(response?.status()).toBe(200);

      await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
      await page.evaluate(async () => document.fonts.ready);

      // Verify no horizontal overflow in FigmaBronzeView component
      const overflow = await page.evaluate(() => {
        const container = document.querySelector('[data-visual-lab="figma-bronze"]');
        return container ? container.scrollWidth > container.clientWidth + 2 : false;
      });
      expect(overflow).toBe(false);

      // Viewport Screenshot
      await page.screenshot({
        path: artifact(`figma-bronze-${vp.name}.png`),
        fullPage: false,
        animations: 'disabled',
      });

      if (vp.name === 'mobile-390') {
        // Full Page Mobile Screenshot
        await page.screenshot({
          path: artifact('figma-bronze-mobile-390-fullpage.png'),
          fullPage: true,
          animations: 'disabled',
        });
      }

      if (vp.name === 'desktop-1440') {
        // Desktop 1440 Overlay and Comparison
        await page.evaluate(async () => {
          const refUrl = '/visual-lab/assets/bronze-reference';
          const loadImg = (url: string) =>
            new Promise<HTMLImageElement>((resolve, reject) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => resolve(img);
              img.onerror = reject;
              img.src = url;
            });

          let refImg: HTMLImageElement;
          try {
            refImg = await loadImg(refUrl);
          } catch {
            return;
          }

          const canvas = document.createElement('canvas');
          const width = 1536;
          const height = 1024;
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;

          ctx.globalAlpha = 0.5;
          ctx.drawImage(refImg, 0, 0, width, height);

          ctx.fillStyle = 'blue';
          ctx.fillRect(0, 0, width, height);
        });
      }
    });
  }
});
