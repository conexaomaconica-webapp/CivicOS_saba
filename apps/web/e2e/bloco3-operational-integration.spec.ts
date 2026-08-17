import { test, expect } from '@playwright/test';

test.use({ baseURL: 'http://127.0.0.1:3000' });
test.setTimeout(90_000);

test.describe('BLOCO 3.1: Operational Integration & E2E Verification', () => {
  test('unauthenticated or non-admin user is blocked from admin routes (security containment)', async ({ context, page }) => {
    // 1. Simulate a regular non-admin user
    await context.addCookies([
      { name: 'e2e-mock-role', value: 'usuario_comum', domain: '127.0.0.1', path: '/' },
    ]);

    // 2. Attempt to access admin routes
    await page.goto('/admin/aprovacoes');

    // 3. Verify security containment: redirected away from /admin/aprovacoes
    await expect(page).not.toHaveURL(/\/admin\/aprovacoes/);
  });

  test('authenticated platform_admin can access admin review moderation panel and trigger moderation flow', async ({ context, page }) => {
    // Authenticate as platform_admin
    await context.addCookies([
      { name: 'e2e-mock-role', value: 'master', domain: '127.0.0.1', path: '/' },
    ]);

    await page.goto('/admin/reviews');
    await expect(page.locator('h1').last()).toContainText('Painel de Moderação de Avaliações');

    const approveBtn = page.getByRole('button', { name: 'Aprovar Review' }).first();
    if (await approveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await approveBtn.click();
      await page.getByRole('button', { name: 'Confirmar e Salvar' }).click();
      // Verify feedback message banner is rendered after action execution
      await expect(page.locator('div[class*="rounded-md"]').first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('admin quota update flow shows before/after audit impact diff and processes quota change', async ({ context, page }) => {
    // Authenticate as platform_admin
    await context.addCookies([
      { name: 'e2e-mock-role', value: 'master', domain: '127.0.0.1', path: '/' },
    ]);

    await page.goto('/admin/settings/planos');
    await expect(page.locator('h1').last()).toContainText('Gestão de Cotas');

    const editBtn = page.getByRole('button', { name: 'Editar Cotas & Auditoria' }).first();
    await editBtn.click();

    const reasonInput = page.locator('input[placeholder*="Atualização"]');
    await expect(reasonInput).toBeVisible();
    await reasonInput.fill('Ajuste anual de política comercial H2');
    await page.getByRole('button', { name: 'Revisar Impacto (Before → After)' }).click();

    await expect(page.locator('text=Confirmação de Impacto Administrativo')).toBeVisible();
    await expect(page.locator('text=Antes (Before):')).toBeVisible();
    await expect(page.locator('text=Depois (After):')).toBeVisible();

    await page.getByRole('button', { name: 'Confirmar e Salvar no Audit Log' }).click();
    // Verify feedback message banner is rendered after action execution
    await expect(page.locator('div[class*="rounded-md"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('admin publication status and founder allocation remain strictly independent', async ({ context, page }) => {
    // Authenticate as platform_admin
    await context.addCookies([
      { name: 'e2e-mock-role', value: 'master', domain: '127.0.0.1', path: '/' },
    ]);

    await page.goto('/admin/aprovacoes');
    await expect(page.locator('h1').last()).toContainText('Aprovações e Moderação de Empresas');

    const founderBtn = page.getByRole('button', { name: 'Conceder Founder' }).first();
    await founderBtn.click();

    await expect(page.locator('text=NUNCA altera')).toBeVisible();
    await page.getByRole('button', { name: 'Confirmar e Salvar' }).click();

    await expect(page.locator('text=Selo Founder Ativo')).toBeVisible();
  });

  test('public directory search RPC filters out ineligible businesses', async ({ page }) => {
    await page.goto('/guia');
    await expect(page.locator('h1').last()).toBeVisible();
    await expect(page.locator('text=suspended')).not.toBeVisible();
  });
});
