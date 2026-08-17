import { expect, test } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const artifact = (name: string) => path.resolve(__dirname, '../../../artifacts/visual', name);
const referenceSource = path.resolve(__dirname, '../../../docs/ui-references/conexao-maconica/empresa-bronze.png');

test('Homologação Visual Determinística — Visual Lab /visual-lab/bronze', async ({ page }) => {
  const targetDir = path.resolve(__dirname, '../../../artifacts/visual');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  if (fs.existsSync(referenceSource)) {
    fs.copyFileSync(referenceSource, artifact('bronze-reference.png'));
  }

  await page.goto('/visual-lab/bronze', { waitUntil: 'networkidle' });
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  await page.evaluate(async () => document.fonts.ready);

  await expect(page.locator('.cm-public-header')).toBeVisible();
  await expect(page.locator('.cm-bronze-hero-grid')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Saba Advocacia' })).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions).toEqual({ width: 1536, height: 1024, scrollWidth: 1536 });

  const actualBuffer = await page.screenshot({
    path: artifact('bronze-visual-actual.png'),
    fullPage: false,
    animations: 'disabled',
  });

  const actualBase64 = `data:image/png;base64,${actualBuffer.toString('base64')}`;

  const result = await page.evaluate(async (actDataUrl) => {
    const width = 1536;
    const height = 1024;

    const loadImg = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(new Error('Failed to load image: ' + src));
        img.src = src;
      });

    try {
      const refImg = await loadImg('/visual-lab/assets/bronze-reference');
      const actImg = await loadImg(actDataUrl);

      // 1. Overlay Canvas (50% opacity ref + 50% opacity actual)
      const overlayCanvas = document.createElement('canvas');
      overlayCanvas.width = width;
      overlayCanvas.height = height;
      const oCtx = overlayCanvas.getContext('2d');
      if (!oCtx) return null;

      oCtx.globalAlpha = 1.0;
      oCtx.drawImage(refImg, 0, 0, width, height);
      oCtx.globalAlpha = 0.5;
      oCtx.drawImage(actImg, 0, 0, width, height);
      const overlayDataUrl = overlayCanvas.toDataURL('image/png');

      // 2. Pixel-by-pixel diff canvas
      const refCanvas = document.createElement('canvas');
      refCanvas.width = width;
      refCanvas.height = height;
      const rCtx = refCanvas.getContext('2d')!;
      rCtx.drawImage(refImg, 0, 0, width, height);
      const refData = rCtx.getImageData(0, 0, width, height).data;

      const actCanvas = document.createElement('canvas');
      actCanvas.width = width;
      actCanvas.height = height;
      const aCtx = actCanvas.getContext('2d')!;
      aCtx.drawImage(actImg, 0, 0, width, height);
      const actData = aCtx.getImageData(0, 0, width, height).data;

      const diffCanvas = document.createElement('canvas');
      diffCanvas.width = width;
      diffCanvas.height = height;
      const dCtx = diffCanvas.getContext('2d')!;
      const diffImageData = dCtx.createImageData(width, height);
      const diffData = diffImageData.data;

      let diffCount = 0;
      const totalPixels = width * height;
      const threshold = 25;

      for (let i = 0; i < refData.length; i += 4) {
        const rDiff = Math.abs(refData[i] - actData[i]);
        const gDiff = Math.abs(refData[i + 1] - actData[i + 1]);
        const bDiff = Math.abs(refData[i + 2] - actData[i + 2]);
        const isDifferent = rDiff > threshold || gDiff > threshold || bDiff > threshold;

        if (isDifferent) {
          diffCount++;
          diffData[i] = 255;
          diffData[i + 1] = 0;
          diffData[i + 2] = 128;
          diffData[i + 3] = 255;
        } else {
          const gray = Math.floor((refData[i] + refData[i + 1] + refData[i + 2]) / 3);
          diffData[i] = gray;
          diffData[i + 1] = gray;
          diffData[i + 2] = gray;
          diffData[i + 3] = 180;
        }
      }

      dCtx.putImageData(diffImageData, 0, 0);
      const diffDataUrl = diffCanvas.toDataURL('image/png');

      return {
        overlayDataUrl,
        diffDataUrl,
        metrics: {
          width,
          height,
          totalPixels,
          differentPixels: diffCount,
          divergencePercentage: parseFloat(((diffCount / totalPixels) * 100).toFixed(2)),
          threshold,
          capturedUrl: '/visual-lab/bronze',
          viewport: '1536x1024',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (err: any) {
      return { error: String(err?.stack || err?.message || err) };
    }
  }, actualBase64);

  if (result && 'metrics' in result) {
    const overlayBase64 = result.overlayDataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(artifact('bronze-visual-overlay.png'), Buffer.from(overlayBase64, 'base64'));

    const diffBase64 = result.diffDataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(artifact('bronze-visual-diff.png'), Buffer.from(diffBase64, 'base64'));

    fs.writeFileSync(artifact('bronze-visual-diff.json'), JSON.stringify(result.metrics, null, 2));
  } else if (result && 'error' in result) {
    console.error('Visual diff evaluation error:', (result as any).error);
  }
});

test('Homologação Visual Determinística Mobile — 390x844 no Visual Lab', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/visual-lab/bronze', { waitUntil: 'networkidle' });
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  await page.evaluate(async () => document.fonts.ready);

  await expect(page.locator('.cm-public-header')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Saba Advocacia' })).toBeVisible();

  await page.screenshot({
    path: artifact('bronze-visual-mobile-actual.png'),
    fullPage: false,
    animations: 'disabled',
  });
});
