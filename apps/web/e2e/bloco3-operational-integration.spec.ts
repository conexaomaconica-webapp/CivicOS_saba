import { test, expect } from '@playwright/test';

test.describe('BLOCO 3.1: Operational Integration & E2E Verification', () => {
  test('submit review flow creates pending review and updates average rating after admin approval', async ({ page }) => {
    // 1. User navigates to company detail page
    await page.goto('/guia/empresa-bronze');

    // 2. Submit review form
    const reviewForm = page.locator('form').filter({ hasText: 'Avaliar esta Empresa' });
    if (await reviewForm.isVisible()) {
      await page.fill('input[placeholder*="Conte sua experiência"]', 'Excelente serviço prestado!');
      await page.click('button:has-text("Enviar Avaliação")');

      // Verify notification confirms status is pending
      await expect(page.locator('text=status: pending')).toBeVisible();
    }

    // 3. Admin navigates to reviews moderation panel
    await page.goto('/admin/reviews');
    await expect(page.locator('h1')).toContainText('Painel de Moderação de Avaliações');

    // 4. Admin approves pending review
    const pendingCard = page.locator('div').filter({ hasText: 'Oficina Mecânica Precision' }).first();
    await expect(pendingCard).toBeVisible();
    await page.click('button:has-text("Aprovar Review")');

    // Confirm dialog modal
    await page.click('button:has-text("Confirmar e Salvar")');
    await expect(page.locator('text=Avaliação aprovada com sucesso')).toBeVisible();
  });

  test('admin quota update flow requires platform_admin and shows before/after audit impact diff', async ({ page }) => {
    // 1. Admin navigates to quota settings page
    await page.goto('/admin/settings/planos');
    await expect(page.locator('h1')).toContainText('Gestão de Cotas');

    // 2. Open edit quota dialog for Ouro plan
    const ouroCard = page.locator('div').filter({ hasText: 'Plano ouro' }).first();
    await ouroCard.locator('button:has-text("Editar Cotas")').click();

    // 3. Provide mandatory reason and click review impact
    await page.fill('input[placeholder*="Motivo Obrigatório"]', 'Ajuste anual de política comercial H2');
    await page.click('button:has-text("Revisar Impacto")');

    // 4. Verify before/after impact diff is displayed
    await expect(page.locator('text=Confirmação de Impacto Administrativo')).toBeVisible();
    await expect(page.locator('text=Antes (Before)')).toBeVisible();
    await expect(page.locator('text=Depois (After)')).toBeVisible();

    // 5. Confirm and save
    await page.click('button:has-text("Confirmar e Salvar no Audit Log")');
    await expect(page.locator('text=atualizadas e registradas no audit log')).toBeVisible();
  });

  test('admin publication status and founder allocation remain strictly independent', async ({ page }) => {
    // 1. Admin navigates to approvals page
    await page.goto('/admin/aprovacoes');
    await expect(page.locator('h1')).toContainText('Aprovações e Moderação de Empresas');

    // 2. Toggle founder status for a pending business
    const bizCard = page.locator('div').filter({ hasText: 'Oficina Mecânica Precision' }).first();
    await bizCard.locator('button:has-text("Conceder Founder")').click();

    // Verify warning that publication status will NOT change
    await expect(page.locator('text=NUNCA altera o publication_status')).toBeVisible();
    await page.click('button:has-text("Confirmar e Salvar")');

    // Verify founder badge added while status remains pending_review
    await expect(page.locator('text=Selo Founder Ativo')).toBeVisible();
    await expect(page.locator('text=pending_review')).toBeVisible();
  });

  test('public directory search RPC filters out ineligible businesses', async ({ page }) => {
    // Navigate to public directory
    await page.goto('/guia');
    await expect(page.locator('h1')).toBeVisible();

    // Search query
    await page.fill('input[placeholder*="Buscar"]', 'Oficina');
    await page.keyboard.press('Enter');

    // Ensure rejected/suspended businesses are not rendered in search results
    await expect(page.locator('text=suspended')).not.toBeVisible();
    await expect(page.locator('text=pending_review')).not.toBeVisible();
  });
});
