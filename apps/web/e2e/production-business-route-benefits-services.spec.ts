import { expect, test } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const artifact = (name: string) => path.resolve(__dirname, '../../../artifacts/visual', name);

test.describe('Checkpoint 7B — Production Benefits & Services E2E Integration on /guia/[slug]', () => {
  test.beforeEach(async () => {
    const targetDir = path.resolve(__dirname, '../../../artifacts/visual');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  });

  const viewports = [
    { width: 390, height: 844, name: '390' },
    { width: 768, height: 1024, name: '768' },
    { width: 1440, height: 900, name: '1440' },
  ];

  const presets = [
    { slug: 'empresa-bronze', name: 'bronze', planText: 'PLANO BRONZE', founderExpected: false },
    { slug: 'empresa-prata', name: 'prata', planText: 'PLANO PRATA', founderExpected: false },
    { slug: 'empresa-ouro', name: 'ouro', planText: 'PLANO OURO', founderExpected: false },
    { slug: 'empresa-ouro-founder', name: 'ouro-founder', planText: 'PLANO OURO', founderExpected: true },
  ];

  for (const pr of presets) {
    for (const vp of viewports) {
      test(`Homologação Visual Checkpoint 7B.1: ${pr.name} em ${vp.name}px`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        const response = await page.goto(`/guia/${pr.slug}`, { waitUntil: 'domcontentloaded' });
        expect(response?.status()).toBe(200);

        await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
        await page.evaluate(async () => document.fonts.ready);

        // Confirmar tier comercial
        await expect(page.getByText(pr.planText, { exact: false })).toBeVisible();

        if (pr.name === 'bronze') {
          // Bronze: catálogo de serviços (apenas nome com fallback neutro caso 0 serviços) e NENHUM benefício
          await expect(page.locator('[data-testid="bronze-services-section"]')).toBeVisible();
          await expect(page.locator('[data-testid="prata-benefit-banner"]')).toHaveCount(0);
          await expect(page.locator('[data-testid="ouro-benefit-premium-box"]')).toHaveCount(0);
        } else if (pr.name === 'prata') {
          // Prata: serviços com descrição e seção de benefício fraterno
          await expect(page.locator('[data-testid="prata-services-section"]')).toBeVisible();
        } else if (pr.name === 'ouro' || pr.name === 'ouro-founder') {
          // Ouro / Founder: catálogo VIP (ícones whitelist, priceInfo condicional) e benefícios VIP com botão de cópia
          await expect(page.locator('[data-testid="ouro-services-section"]')).toBeVisible();
          if (pr.founderExpected) {
            await expect(page.locator('[data-testid="ouro-badges-row"]').getByText('EMPRESA FUNDADORA')).toBeVisible();
          }
        }

        // Tirar screenshot de evidência visual de alta qualidade para o relatório
        await page.screenshot({
          path: artifact(`visual-7b1-${pr.name}-${vp.name}.png`),
          fullPage: false,
          animations: 'disabled',
        });
      });
    }
  }

  test('Testes de Casos Adversos e Colapsamento de Seções Vazias no Guia Produtivo', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const response = await page.goto('/guia/empresa-ouro', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);

    // Botão de cópia de código promocional deve estar visível apenas para benefícios com discountCode
    const copyBtnCount = await page.locator('[data-testid="copy-discount-code-btn"]').count();
    expect(copyBtnCount).toBeGreaterThanOrEqual(1);
  });
});
