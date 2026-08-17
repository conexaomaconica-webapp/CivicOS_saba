import { expect, test } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const artifact = (name: string) => path.resolve(__dirname, '../../../artifacts/visual', name);

test.describe('Checkpoint 6.1 — Production Presets E2E Integration on /guia/[slug]', () => {
  test.beforeEach(async () => {
    const targetDir = path.resolve(__dirname, '../../../artifacts/visual');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  });

  const states = [
    { slug: 'empresa-bronze', name: 'bronze', planText: 'PLANO BRONZE', founderExpected: false },
    { slug: 'empresa-prata', name: 'prata', planText: 'PLANO PRATA', founderExpected: false },
    { slug: 'empresa-ouro', name: 'ouro', planText: 'PLANO OURO', founderExpected: false },
    { slug: 'empresa-ouro-founder', name: 'ouro-founder', planText: 'PLANO OURO', founderExpected: true },
  ];

  const viewports = [
    { width: 390, height: 844, name: '390' },
    { width: 1440, height: 900, name: '1440' },
  ];

  for (const st of states) {
    for (const vp of viewports) {
      test(`Renderização Produtiva /guia/${st.slug} em ${vp.name}px`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        const response = await page.goto(`/guia/${st.slug}`, { waitUntil: 'networkidle' });
        expect(response?.status()).toBe(200);

        await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
        await page.evaluate(async () => document.fonts.ready);

        // Verify tier plan text
        await expect(page.getByText(st.planText, { exact: false })).toBeVisible();

        // Verify Founder status badge behavior
        if (st.founderExpected) {
          await expect(page.locator('[data-testid="ouro-badges-row"]').getByText('EMPRESA FUNDADORA')).toBeVisible();
          await expect(page.getByRole('heading', { name: 'Grupo Construtor Alfa' })).toBeVisible();
        } else if (st.name === 'ouro') {
          await expect(page.locator('[data-testid="ouro-badges-row"]').getByText('EMPRESA FUNDADORA')).toHaveCount(0);
          await expect(page.getByRole('heading', { name: 'Padaria & Confeitaria Estrela' })).toBeVisible();
        } else {
          await expect(page.locator('[data-testid="ouro-badges-row"]').getByText('EMPRESA FUNDADORA')).toHaveCount(0);
        }

        // Take product screenshot
        await page.screenshot({
          path: artifact(`prod-${st.name}-${vp.name}.png`),
          fullPage: false,
          animations: 'disabled',
        });
      });
    }
  }

  test('Fail-Closed: Rota /guia com empresa inválida não concede preset comercial', async ({ page }) => {
    const response = await page.goto('/guia/empresa-inexistente-sem-plano', { waitUntil: 'domcontentloaded' });
    expect([404, 200]).toContain(response?.status());
    await expect(page.getByText('PLANO BRONZE', { exact: false })).toHaveCount(0);
    await expect(page.getByText('PLANO PRATA', { exact: false })).toHaveCount(0);
    await expect(page.getByText('PLANO OURO', { exact: false })).toHaveCount(0);
  });

  test('Segurança contra manipulação: ?plan=ouro na URL de empresa Bronze não altera o DOM', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const response = await page.goto('/guia/empresa-bronze?plan=ouro', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);

    // Remains Bronze and does NOT elevate to Ouro
    await expect(page.getByText('PLANO BRONZE', { exact: false })).toBeVisible();
    await expect(page.getByText('PLANO OURO', { exact: false })).toHaveCount(0);
  });
});
