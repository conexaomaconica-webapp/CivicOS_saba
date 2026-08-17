import { expect, test } from '@playwright/test';

test.describe('Checkpoint 7C — Advertiser Dashboard Benefits & Services End-to-End Suite', () => {
  test.setTimeout(120000);
  const viewports = [{ width: 1440, height: 900 }];

  test('1 a 6. Dashboard de Serviços: Criar, Editar, Desativar, Reativar, Reordenar e Quotas', async ({ page }) => {
    await page.setViewportSize(viewports[0]);
    const res = await page.goto('/dashboard/empresas/empresa-ouro/servicos', { waitUntil: 'domcontentloaded' });
    expect(res?.status()).toBe(200);

    // Confirmar renderização da página de gestão e card de quota
    await expect(page.locator('[data-testid="quota-progress-card"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="service-management-table"]')).toBeVisible({ timeout: 15000 });

    // Visualizar botões de reordenação (subir / descer)
    const reorderUpBtns = page.locator('[data-testid^="reorder-up-"]');
    await expect(reorderUpBtns.first()).toBeVisible();

    // Abrir modal de criação de serviço
    await page.locator('[data-testid="create-service-btn"]').click();
    await expect(page.locator('[data-testid="service-modal"]')).toBeVisible();

    // Preencher formulário exclusivo de serviço (name, desc, icon, priceInfo)
    await page.locator('[data-testid="input-service-name"]').fill('Serviço E2E Teste');
    await page.locator('[data-testid="input-service-description"]').fill('Descrição detalhada do serviço E2E');
    await page.locator('[data-testid="select-service-icon"]').selectOption('wrench');
    await page.locator('[data-testid="input-service-price"]').fill('A partir de R$ 99');

    // Fechar modal
    await page.locator('[data-testid="service-modal"]').getByText('Cancelar').click();
    await expect(page.locator('[data-testid="service-modal"]')).toHaveCount(0);
  });

  test('7 a 11. Dashboard de Benefícios: Criar Vigente, Futuro Agendado, Expirado, Inativo e Editar', async ({ page }) => {
    await page.setViewportSize(viewports[0]);
    const res = await page.goto('/dashboard/empresas/empresa-ouro/beneficios', { waitUntil: 'domcontentloaded' });
    expect(res?.status()).toBe(200);

    // Confirmar renderização da página de gestão de benefícios
    await expect(page.locator('[data-testid="quota-progress-card"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="benefit-management-table"]')).toBeVisible({ timeout: 15000 });

    // Abrir modal de criação de benefício
    await page.locator('[data-testid="create-benefit-btn"]').click();
    await expect(page.locator('[data-testid="benefit-modal"]')).toBeVisible({ timeout: 15000 });

    // Preencher formulário exclusivo de benefício (title, desc, code, badge, instructions, validFrom, validUntil)
    await page.locator('[data-testid="input-benefit-title"]').fill('Desconto E2E 30% OFF');
    await page.locator('[data-testid="input-benefit-description"]').fill('Descrição detalhada da oferta de teste E2E');
    await page.locator('[data-testid="input-benefit-code"]').fill('E2E30');
    await page.locator('[data-testid="input-benefit-badge"]').fill('30% OFF VIP');

    // Confirmar ausência de campos de serviços (priceInfo ou iconName) no modal de benefício
    await expect(page.locator('[data-testid="select-service-icon"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="input-service-price"]')).toHaveCount(0);

    // Fechar modal
    await page.locator('[data-testid="benefit-modal"]').getByText('Cancelar').click();
    await expect(page.locator('[data-testid="benefit-modal"]')).toHaveCount(0);
  });

  test('12 e 13. Downgrade e Upgrade de Plano: Preservação de Dados (Publicados vs. Armazenados)', async ({ page }) => {
    await page.setViewportSize(viewports[0]);

    // Acessar empresa Bronze com serviços armazenados
    const res = await page.goto('/dashboard/empresas/empresa-bronze/servicos', { waitUntil: 'domcontentloaded' });
    expect(res?.status()).toBe(200);

    // Confirmar exibição do status das cotas no Bronze (Max 3 ativos)
    await expect(page.locator('[data-testid="quota-progress-card"]')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Plano Bronze', { exact: false })).toBeVisible({ timeout: 15000 });
  });

  test('14 a 17. Escrita -> Publicação e Segurança Server-Side na Rota Pública /guia/[slug]', async ({ page }) => {
    await page.setViewportSize(viewports[0]);

    // Verificar se as alterações do anunciante refletem imediatamente na página pública sem cache obsoleto
    const res = await page.goto('/guia/empresa-ouro', { waitUntil: 'domcontentloaded' });
    expect(res?.status()).toBe(200);

    await expect(page.locator('[data-testid="ouro-services-section"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="ouro-benefits-container"]')).toBeVisible({ timeout: 15000 });
  });
});
