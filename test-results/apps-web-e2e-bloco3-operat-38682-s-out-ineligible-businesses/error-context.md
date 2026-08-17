# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: apps\web\e2e\bloco3-operational-integration.spec.ts >> BLOCO 3.1: Operational Integration & E2E Verification >> public directory search RPC filters out ineligible businesses
- Location: apps\web\e2e\bloco3-operational-integration.spec.ts:73:7

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/guia", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('BLOCO 3.1: Operational Integration & E2E Verification', () => {
  4  |   test('submit review flow creates pending review and updates average rating after admin approval', async ({ page }) => {
  5  |     // 1. User navigates to company detail page
  6  |     await page.goto('/guia/empresa-bronze');
  7  | 
  8  |     // 2. Submit review form
  9  |     const reviewForm = page.locator('form').filter({ hasText: 'Avaliar esta Empresa' });
  10 |     if (await reviewForm.isVisible()) {
  11 |       await page.fill('input[placeholder*="Conte sua experiência"]', 'Excelente serviço prestado!');
  12 |       await page.click('button:has-text("Enviar Avaliação")');
  13 | 
  14 |       // Verify notification confirms status is pending
  15 |       await expect(page.locator('text=status: pending')).toBeVisible();
  16 |     }
  17 | 
  18 |     // 3. Admin navigates to reviews moderation panel
  19 |     await page.goto('/admin/reviews');
  20 |     await expect(page.locator('h1')).toContainText('Painel de Moderação de Avaliações');
  21 | 
  22 |     // 4. Admin approves pending review
  23 |     const pendingCard = page.locator('div').filter({ hasText: 'Oficina Mecânica Precision' }).first();
  24 |     await expect(pendingCard).toBeVisible();
  25 |     await page.click('button:has-text("Aprovar Review")');
  26 | 
  27 |     // Confirm dialog modal
  28 |     await page.click('button:has-text("Confirmar e Salvar")');
  29 |     await expect(page.locator('text=Avaliação aprovada com sucesso')).toBeVisible();
  30 |   });
  31 | 
  32 |   test('admin quota update flow requires platform_admin and shows before/after audit impact diff', async ({ page }) => {
  33 |     // 1. Admin navigates to quota settings page
  34 |     await page.goto('/admin/settings/planos');
  35 |     await expect(page.locator('h1')).toContainText('Gestão de Cotas');
  36 | 
  37 |     // 2. Open edit quota dialog for Ouro plan
  38 |     const ouroCard = page.locator('div').filter({ hasText: 'Plano ouro' }).first();
  39 |     await ouroCard.locator('button:has-text("Editar Cotas")').click();
  40 | 
  41 |     // 3. Provide mandatory reason and click review impact
  42 |     await page.fill('input[placeholder*="Motivo Obrigatório"]', 'Ajuste anual de política comercial H2');
  43 |     await page.click('button:has-text("Revisar Impacto")');
  44 | 
  45 |     // 4. Verify before/after impact diff is displayed
  46 |     await expect(page.locator('text=Confirmação de Impacto Administrativo')).toBeVisible();
  47 |     await expect(page.locator('text=Antes (Before)')).toBeVisible();
  48 |     await expect(page.locator('text=Depois (After)')).toBeVisible();
  49 | 
  50 |     // 5. Confirm and save
  51 |     await page.click('button:has-text("Confirmar e Salvar no Audit Log")');
  52 |     await expect(page.locator('text=atualizadas e registradas no audit log')).toBeVisible();
  53 |   });
  54 | 
  55 |   test('admin publication status and founder allocation remain strictly independent', async ({ page }) => {
  56 |     // 1. Admin navigates to approvals page
  57 |     await page.goto('/admin/aprovacoes');
  58 |     await expect(page.locator('h1')).toContainText('Aprovações e Moderação de Empresas');
  59 | 
  60 |     // 2. Toggle founder status for a pending business
  61 |     const bizCard = page.locator('div').filter({ hasText: 'Oficina Mecânica Precision' }).first();
  62 |     await bizCard.locator('button:has-text("Conceder Founder")').click();
  63 | 
  64 |     // Verify warning that publication status will NOT change
  65 |     await expect(page.locator('text=NUNCA altera o publication_status')).toBeVisible();
  66 |     await page.click('button:has-text("Confirmar e Salvar")');
  67 | 
  68 |     // Verify founder badge added while status remains pending_review
  69 |     await expect(page.locator('text=Selo Founder Ativo')).toBeVisible();
  70 |     await expect(page.locator('text=pending_review')).toBeVisible();
  71 |   });
  72 | 
  73 |   test('public directory search RPC filters out ineligible businesses', async ({ page }) => {
  74 |     // Navigate to public directory
> 75 |     await page.goto('/guia');
     |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  76 |     await expect(page.locator('h1')).toBeVisible();
  77 | 
  78 |     // Search query
  79 |     await page.fill('input[placeholder*="Buscar"]', 'Oficina');
  80 |     await page.keyboard.press('Enter');
  81 | 
  82 |     // Ensure rejected/suspended businesses are not rendered in search results
  83 |     await expect(page.locator('text=suspended')).not.toBeVisible();
  84 |     await expect(page.locator('text=pending_review')).not.toBeVisible();
  85 |   });
  86 | });
  87 | 
```