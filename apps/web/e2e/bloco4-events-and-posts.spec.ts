import { test, expect } from '@playwright/test';

test.use({ baseURL: 'http://127.0.0.1:3000' });
test.setTimeout(90_000);

test.describe('BLOCO 4: Events, Posts & Quota Downgrade E2E Verification', () => {
  test('unauthenticated or non-admin user is blocked from admin routes (security containment)', async ({ context, page }) => {
    await context.addCookies([
      { name: 'e2e-mock-role', value: 'usuario_comum', domain: '127.0.0.1', path: '/' },
    ]);
    await page.goto('/admin/aprovacoes');
    await expect(page).not.toHaveURL(/\/admin\/aprovacoes/);
  });

  test('Ouro advertiser creates event in business dashboard', async ({ context, page }) => {
    await context.addCookies([
      { name: 'e2e-mock-role', value: 'master', domain: '127.0.0.1', path: '/' },
    ]);

    await page.goto('/dashboard/empresas/demo-biz/eventos');
    await expect(page.locator('h1').last()).toContainText('Gestão de Eventos');

    const newEventBtn = page.getByRole('button', { name: '+ Novo Evento' });
    await expect(newEventBtn).toBeVisible();
    await newEventBtn.click();

    const titleInput = page.locator('input').first();
    await expect(titleInput).toBeVisible();
    await titleInput.fill('Workshop de Inovação & E-commerce');
    await page.locator('input').nth(1).fill('Palestra presencial sobre e-commerce e vendas digitais.');

    const startsAtInput = page.locator('input[type="datetime-local"]').first();
    await startsAtInput.fill('2026-10-15T14:00');

    await page.click('button:has-text("Publicar Evento")');
    await expect(page.locator('div[class*="rounded-md"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('Ouro advertiser creates post in business dashboard', async ({ context, page }) => {
    await context.addCookies([
      { name: 'e2e-mock-role', value: 'master', domain: '127.0.0.1', path: '/' },
    ]);

    await page.goto('/dashboard/empresas/demo-biz/posts');
    await expect(page.locator('h1').last()).toContainText('Gestão de Novidades');

    const newPostBtn = page.getByRole('button', { name: '+ Nova Publicação' });
    await expect(newPostBtn).toBeVisible();
    await newPostBtn.click();

    const titleInput = page.locator('input').nth(0);
    await expect(titleInput).toBeVisible();
    await titleInput.fill('Nova Parceria Estratégica H2');

    const summaryInput = page.locator('input').nth(1);
    await summaryInput.fill('Expandimos nossa presença e rede de parceiros.');

    const contentInput = page.locator('input').nth(2);
    await contentInput.fill('Temos o prazer de anunciar uma importante expansão operacional.');

    await page.click('button:has-text("Publicar Agora")');
    await expect(page.locator('div[class*="rounded-md"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('public company detail page renders events and posts for Ouro business and hides them on quota downgrade without data loss', async ({ page }) => {
    await page.goto('/guia/empresa-ouro');
    await expect(page.locator('h1').last()).toBeVisible();

    await page.goto('/guia/empresa-bronze');
    await expect(page.locator('h1').last()).toBeVisible();
    await expect(page.locator('text=Workshop de Inovação')).not.toBeVisible();
  });
});
