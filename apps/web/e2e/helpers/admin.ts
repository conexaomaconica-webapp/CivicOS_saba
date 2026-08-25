import { Page, expect } from '@playwright/test';

export async function adminChangeEntitlement(page: Page, plan: string, featureCode: string, newLimit: number) {
  // TODO: Implementar a navegação e salvamento na interface real de /admin/planos
  // await page.goto('/admin/planos');
  // Localiza a linha do recurso e a coluna do plano
  // Edita o valor
  // Clica no botão de salvar e aguarda o toast de sucesso
}
