import { Page, expect } from '@playwright/test';

export async function createBusinessResource(page: Page, businessSlug: string, resource: string) {
  // TODO: Acessar a tela correta baseada no recurso e adicionar um item
  // await page.goto(`/dashboard/empresas/${businessSlug}/${resource}`);
  // await page.click('text=Adicionar');
  // await page.fill('input[name="title"]', `Teste ${Date.now()}`);
  // await page.click('button[type="submit"]');
  // await page.waitForSelector('text=Sucesso');
}

export async function expectBusinessResourceBlocked(page: Page, businessSlug: string, resource: string) {
  // TODO: Tentar abrir modal ou preencher e verificar que está desabilitado ou exibe bloqueio
  // await page.goto(`/dashboard/empresas/${businessSlug}/${resource}`);
  // await expect(page.locator('text=Limite atingido')).toBeVisible();
}
