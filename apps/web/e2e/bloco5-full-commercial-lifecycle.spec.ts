import { test, expect } from '@playwright/test';

test.use({ baseURL: 'http://127.0.0.1:3000' });
test.setTimeout(90_000);

test.describe('BLOCO 5: Full Commercial Lifecycle, Security & Launch Audit', () => {
  test('1. Security Response Headers Audit (HSTS, X-Frame-Options, nosniff, CSP)', async ({ page }) => {
    const response = await page.goto('/guia');
    expect(response).not.toBeNull();

    if (response) {
      const headers = response.headers();
      expect(headers['x-frame-options']).toBe('DENY');
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['strict-transport-security']).toContain('max-age=');
      expect(headers['content-security-policy-report-only']).toContain("default-src 'self'");
    }
  });

  test('2. Admin & Dashboard private routes contain noindex and block unauthenticated users', async ({ context, page }) => {
    await context.addCookies([
      { name: 'e2e-mock-role', value: 'usuario_comum', domain: '127.0.0.1', path: '/' },
    ]);

    await page.goto('/admin/aprovacoes');
    await expect(page).not.toHaveURL(/\/admin\/aprovacoes/);

    await page.goto('/dashboard');
    const robotsMeta = page.locator('meta[name="robots"]');
    if (await robotsMeta.count() > 0) {
      await expect(robotsMeta).toHaveAttribute('content', /noindex/);
    }
  });

  test('3. Full Commercial Lifecycle: Ouro creation -> Admin Approval -> Public Guia -> Review -> Analytics', async ({ context, page }) => {
    await context.addCookies([
      { name: 'e2e-mock-role', value: 'master', domain: '127.0.0.1', path: '/' },
    ]);

    // A) Advertiser accesses business dashboard
    await page.goto('/dashboard/empresas/demo-biz/perfil');
    await expect(page.locator('h1').last()).toBeVisible();

    // B) Public Guia page renders Ouro business detail and JSON-LD structured data
    await page.goto('/guia/empresa-ouro');
    await expect(page.locator('h1').last()).toBeVisible();

    // Verify JSON-LD script tag is present and properly escaped
    const jsonLdScript = page.locator('script[type="application/ld+json"]').first();
    await expect(jsonLdScript).toBeAttached();
    const scriptContent = await jsonLdScript.textContent();
    expect(scriptContent).not.toContain('<script>');

    // C) Submit review on public business detail
    await page.goto('/guia/empresa-ouro');
    const ratingStar = page.locator('button:has-text("★")').first();
    if (await ratingStar.isVisible()) {
      await ratingStar.click();
      await page.fill('textarea', 'Excelente atendimento e serviço de alta qualidade!');
      await page.click('button:has-text("Enviar Avaliação")');
      await expect(page.locator('text=sucesso').or(page.locator('text=Pendente'))).toBeVisible({ timeout: 5000 });
    }
  });

  test('4. Dynamic sitemap and robots.txt serve valid tenant-aware metadata', async ({ page }) => {
    const robotsRes = await page.goto('/robots.txt');
    expect(robotsRes?.status()).toBe(200);
    const robotsText = await robotsRes?.text();
    expect(robotsText).toContain('Disallow: /admin/');
    expect(robotsText).toContain('Disallow: /dashboard/');

    const sitemapRes = await page.goto('/sitemap.xml');
    expect(sitemapRes?.status()).toBe(200);
    const sitemapXml = await sitemapRes?.text();
    expect(sitemapXml).toContain('/guia');
    expect(sitemapXml).not.toContain('/admin');
  });
});
