import { expect, test } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const artifact = (name: string) => path.resolve(__dirname, '../../../artifacts/visual', name);

test('Homologação Produtiva Canônica — Rota /guia/[slug] com Supabase Real sem Mocks', async ({ page }) => {
  const targetDir = path.resolve(__dirname, '../../../artifacts/visual');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Access canonical public route without any HTTP mocks or fixtures
  const response = await page.goto('/guia/saba-advocacia-bronze', { waitUntil: 'networkidle' });
  expect(response?.status()).toBe(200);

  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  await page.evaluate(async () => document.fonts.ready);

  // Validate header & profile elements
  await expect(page.locator('.cm-public-header')).toBeVisible();
  await expect(page.getByText('CivicOS')).toHaveCount(0);
  await expect(page.locator('.cm-bronze-hero-grid')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Saba Advocacia' })).toBeVisible();
  await expect(page.getByText('PLANO BRONZE')).toBeVisible();

  // Desktop capture 1536x1024
  await page.screenshot({
    path: artifact('production-bronze-canonical.png'),
    fullPage: false,
    animations: 'disabled',
  });

  const metadata = {
    capturedUrl: '/guia/saba-advocacia-bronze',
    viewport: '1536x1024',
    environment: 'production-canonical-supabase-rpc',
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(artifact('production-bronze-canonical.json'), JSON.stringify(metadata, null, 2));
});

test('Homologação Produtiva Canônica Mobile — Rota /guia/[slug] em 390x844', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  const response = await page.goto('/guia/saba-advocacia-bronze', { waitUntil: 'networkidle' });
  expect(response?.status()).toBe(200);

  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  await page.evaluate(async () => document.fonts.ready);

  await expect(page.locator('.cm-public-header')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Saba Advocacia' })).toBeVisible();

  await page.screenshot({
    path: artifact('production-bronze-canonical-mobile.png'),
    fullPage: false,
    animations: 'disabled',
  });
});
