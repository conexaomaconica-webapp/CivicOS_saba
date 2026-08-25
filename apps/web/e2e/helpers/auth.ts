import { Page } from '@playwright/test';

export async function loginE2EUser(page: Page, email: string, password: string = 'password_e2e_123') {
  await page.goto('/login');
  // TODO: Aguardar o ambiente real para preencher seletores corretos do login
  // await page.fill('input[name="email"]', email);
  // await page.fill('input[name="password"]', password);
  // await page.click('button[type="submit"]');
  // await page.waitForURL('/dashboard');
}

export async function logoutE2EUser(page: Page) {
  // TODO: Implementar logout
}
