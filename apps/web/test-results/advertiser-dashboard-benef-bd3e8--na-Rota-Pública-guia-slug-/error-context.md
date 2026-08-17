# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: advertiser-dashboard-benefits-services.spec.ts >> Checkpoint 7C — Advertiser Dashboard Benefits & Services End-to-End Suite >> 14 a 17. Escrita -> Publicação e Segurança Server-Side na Rota Pública /guia/[slug]
- Location: e2e\advertiser-dashboard-benefits-services.spec.ts:75:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 500
```

# Page snapshot

```yaml
- generic:
  - generic [active]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - navigation [ref=e6]:
          - button [disabled] [ref=e7]:
            - img "previous" [ref=e8]
          - generic [ref=e10]:
            - generic [ref=e11]: 1/
            - text: "1"
          - button [disabled] [ref=e12]:
            - img "next" [ref=e13]
        - link "Next.js 15.5.20 (outdated) Webpack" [ref=e16] [cursor=pointer]:
          - /url: https://nextjs.org/docs/messages/version-staleness
          - generic "An outdated version detected (latest is 16.3.1), upgrade is highly recommended!" [ref=e19]: Next.js 15.5.20 (outdated)
          - generic [ref=e20]: Webpack
      - dialog "Build Error" [ref=e22]:
        - generic [ref=e25]:
          - generic [ref=e26]:
            - generic [ref=e27]:
              - generic [ref=e28]: Build Error
              - generic [ref=e30]:
                - button "Copy Error Info" [ref=e31] [cursor=pointer]
                - button "No related documentation found" [disabled] [ref=e34]
                - link "Learn more about enabling Node.js inspector for server code with Chrome DevTools" [ref=e37] [cursor=pointer]:
                  - /url: https://nextjs.org/docs/app/building-your-application/configuring/debugging#server-side-code
            - paragraph [ref=e47]: x Return statement is not allowed here
          - generic [ref=e49]:
            - generic [ref=e51]:
              - generic [ref=e56]: ./src/app/dashboard/empresas/[id]/beneficios/page.tsx
              - button "Open in editor" [ref=e57] [cursor=pointer]
            - generic [ref=e62]:
              - generic [ref=e63]: "Error:"
              - text: x
              - generic [ref=e64]: Return statement is not allowed here ,-[
              - text: F:\projetos\saas-platform\apps\web\src\app\dashboard\empresas\[id]\beneficios\page.tsx
              - generic [ref=e65]: :144:1]
              - text: "141"
              - generic [ref=e66]: "|"
              - text: "142"
              - generic [ref=e67]: "| const activeCount = benefits.filter((b) => b.isActive).length;"
              - text: "143"
              - generic [ref=e68]: "|"
              - text: "144"
              - generic [ref=e69]: "|"
              - text: ",->"
              - generic [ref=e70]: return (
              - text: "145"
              - generic [ref=e71]: "|"
              - text: "|"
              - generic [ref=e72]: <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
              - text: "146"
              - generic [ref=e73]: "|"
              - text: "|"
              - generic [ref=e74]: <QuotaProgressCard
              - text: "147"
              - generic [ref=e75]: "|"
              - text: "|"
              - generic [ref=e76]: title="Capacidade Comercial de Benefícios"
              - text: "148"
              - generic [ref=e77]: "|"
              - text: "|"
              - generic [ref=e78]: "planName={planName}"
              - text: "149"
              - generic [ref=e79]: "|"
              - text: "|"
              - generic [ref=e80]: "activeCount={activeCount}"
              - text: "150"
              - generic [ref=e81]: "|"
              - text: "|"
              - generic [ref=e82]: "maxLimit={maxLimit}"
              - text: "151"
              - generic [ref=e83]: "|"
              - text: "|"
              - generic [ref=e84]: "storedCount={benefits.length}"
              - text: "152"
              - generic [ref=e85]: "|"
              - text: "|"
              - generic [ref=e86]: />
              - text: "153"
              - generic [ref=e87]: "|"
              - text: "|"
              - generic [ref=e88]: <BenefitManagementTable
              - text: "154"
              - generic [ref=e89]: "|"
              - text: "|"
              - generic [ref=e90]: "businessId={id}"
              - text: "155"
              - generic [ref=e91]: "|"
              - text: "|"
              - generic [ref=e92]: "benefits={benefits}"
              - text: "156"
              - generic [ref=e93]: "|"
              - text: "|"
              - generic [ref=e94]: "maxLimit={maxLimit}"
              - text: "157"
              - generic [ref=e95]: "|"
              - text: "|"
              - generic [ref=e96]: "planName={planName.toUpperCase()}"
              - text: "158"
              - generic [ref=e97]: "|"
              - text: "|"
              - generic [ref=e98]: />
              - text: "159"
              - generic [ref=e99]: "|"
              - text: "|"
              - generic [ref=e100]: </div>
              - text: "160"
              - generic [ref=e101]: "|"
              - text: "`->"
              - generic [ref=e102]: );
              - text: "161"
              - generic [ref=e103]: "| } catch (err) {"
              - text: "162"
              - generic [ref=e104]: "| // Fallback defensivo para dev/teste quando Supabase não estiver conectado"
              - text: "163"
              - generic [ref=e105]: "| const mockFixture = id.includes('bronze') ? bronzeBusinessFixture : id.includes('prata') ? prataBusinessFixture : ouroBusinessFixture; `----"
              - text: x
              - generic [ref=e106]: Return statement is not allowed here ,-[
              - text: F:\projetos\saas-platform\apps\web\src\app\dashboard\empresas\[id]\beneficios\page.tsx
              - generic [ref=e107]: :184:1]
              - text: "181"
              - generic [ref=e108]: "| }));"
              - text: "182"
              - generic [ref=e109]: "| const activeCount = benefits.filter((b) => b.isActive).length;"
              - text: "183"
              - generic [ref=e110]: "|"
              - text: "184"
              - generic [ref=e111]: "|"
              - text: ",->"
              - generic [ref=e112]: return (
              - text: "185"
              - generic [ref=e113]: "|"
              - text: "|"
              - generic [ref=e114]: <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
              - text: "186"
              - generic [ref=e115]: "|"
              - text: "|"
              - generic [ref=e116]: <QuotaProgressCard
              - text: "187"
              - generic [ref=e117]: "|"
              - text: "|"
              - generic [ref=e118]: title="Capacidade Comercial de Benefícios"
              - text: "188"
              - generic [ref=e119]: "|"
              - text: "|"
              - generic [ref=e120]: "planName={planName}"
              - text: "189"
              - generic [ref=e121]: "|"
              - text: "|"
              - generic [ref=e122]: "activeCount={activeCount}"
              - text: "190"
              - generic [ref=e123]: "|"
              - text: "|"
              - generic [ref=e124]: "maxLimit={maxLimit}"
              - text: "191"
              - generic [ref=e125]: "|"
              - text: "|"
              - generic [ref=e126]: "storedCount={benefits.length}"
              - text: "192"
              - generic [ref=e127]: "|"
              - text: "|"
              - generic [ref=e128]: />
              - text: "193"
              - generic [ref=e129]: "|"
              - text: "|"
              - generic [ref=e130]: <BenefitManagementTable
              - text: "194"
              - generic [ref=e131]: "|"
              - text: "|"
              - generic [ref=e132]: "businessId={id}"
              - text: "195"
              - generic [ref=e133]: "|"
              - text: "|"
              - generic [ref=e134]: "benefits={benefits}"
              - text: "196"
              - generic [ref=e135]: "|"
              - text: "|"
              - generic [ref=e136]: "maxLimit={maxLimit}"
              - text: "197"
              - generic [ref=e137]: "|"
              - text: "|"
              - generic [ref=e138]: "planName={planName.toUpperCase()}"
              - text: "198"
              - generic [ref=e139]: "|"
              - text: "|"
              - generic [ref=e140]: />
              - text: "199"
              - generic [ref=e141]: "|"
              - text: "|"
              - generic [ref=e142]: </div>
              - text: "200"
              - generic [ref=e143]: "|"
              - text: "`->"
              - generic [ref=e144]: );
              - text: "201"
              - generic [ref=e145]: "| }"
              - text: "202"
              - generic [ref=e146]: "| } `----"
              - text: x
              - generic [ref=e147]: Expression expected ,-[
              - text: F:\projetos\saas-platform\apps\web\src\app\dashboard\empresas\[id]\beneficios\page.tsx
              - generic [ref=e148]: :202:1]
              - text: "199"
              - generic [ref=e149]: "| </div>"
              - text: "200"
              - generic [ref=e150]: "| );"
              - text: "201"
              - generic [ref=e151]: "| }"
              - text: "202"
              - generic [ref=e152]: "| } :"
              - text: ^
              - generic [ref=e153]: "`---- Caused by: Syntax Error"
        - generic [ref=e154]:
          - generic [ref=e155]: "1"
          - generic [ref=e156]: "2"
    - generic [ref=e161] [cursor=pointer]:
      - button "Open Next.js Dev Tools" [ref=e162]
      - button "Open issues overlay" [ref=e167]:
        - generic [ref=e168]:
          - generic [ref=e169]: "0"
          - generic [ref=e170]: "1"
        - generic [ref=e171]: Issue
  - alert [ref=e172]
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | 
  3  | test.describe('Checkpoint 7C — Advertiser Dashboard Benefits & Services End-to-End Suite', () => {
  4  |   test.setTimeout(120000);
  5  |   const viewports = [{ width: 1440, height: 900 }];
  6  | 
  7  |   test('1 a 6. Dashboard de Serviços: Criar, Editar, Desativar, Reativar, Reordenar e Quotas', async ({ page }) => {
  8  |     await page.setViewportSize(viewports[0]);
  9  |     const res = await page.goto('/dashboard/empresas/empresa-ouro/servicos', { waitUntil: 'domcontentloaded' });
  10 |     expect(res?.status()).toBe(200);
  11 | 
  12 |     // Confirmar renderização da página de gestão e card de quota
  13 |     await expect(page.locator('[data-testid="quota-progress-card"]')).toBeVisible({ timeout: 15000 });
  14 |     await expect(page.locator('[data-testid="service-management-table"]')).toBeVisible({ timeout: 15000 });
  15 | 
  16 |     // Visualizar botões de reordenação (subir / descer)
  17 |     const reorderUpBtns = page.locator('[data-testid^="reorder-up-"]');
  18 |     await expect(reorderUpBtns.first()).toBeVisible();
  19 | 
  20 |     // Abrir modal de criação de serviço
  21 |     await page.locator('[data-testid="create-service-btn"]').click();
  22 |     await expect(page.locator('[data-testid="service-modal"]')).toBeVisible();
  23 | 
  24 |     // Preencher formulário exclusivo de serviço (name, desc, icon, priceInfo)
  25 |     await page.locator('[data-testid="input-service-name"]').fill('Serviço E2E Teste');
  26 |     await page.locator('[data-testid="input-service-description"]').fill('Descrição detalhada do serviço E2E');
  27 |     await page.locator('[data-testid="select-service-icon"]').selectOption('wrench');
  28 |     await page.locator('[data-testid="input-service-price"]').fill('A partir de R$ 99');
  29 | 
  30 |     // Fechar modal
  31 |     await page.locator('[data-testid="service-modal"]').getByText('Cancelar').click();
  32 |     await expect(page.locator('[data-testid="service-modal"]')).toHaveCount(0);
  33 |   });
  34 | 
  35 |   test('7 a 11. Dashboard de Benefícios: Criar Vigente, Futuro Agendado, Expirado, Inativo e Editar', async ({ page }) => {
  36 |     await page.setViewportSize(viewports[0]);
  37 |     const res = await page.goto('/dashboard/empresas/empresa-ouro/beneficios', { waitUntil: 'domcontentloaded' });
  38 |     expect(res?.status()).toBe(200);
  39 | 
  40 |     // Confirmar renderização da página de gestão de benefícios
  41 |     await expect(page.locator('[data-testid="quota-progress-card"]')).toBeVisible({ timeout: 15000 });
  42 |     await expect(page.locator('[data-testid="benefit-management-table"]')).toBeVisible({ timeout: 15000 });
  43 | 
  44 |     // Abrir modal de criação de benefício
  45 |     await page.locator('[data-testid="create-benefit-btn"]').click();
  46 |     await expect(page.locator('[data-testid="benefit-modal"]')).toBeVisible({ timeout: 15000 });
  47 | 
  48 |     // Preencher formulário exclusivo de benefício (title, desc, code, badge, instructions, validFrom, validUntil)
  49 |     await page.locator('[data-testid="input-benefit-title"]').fill('Desconto E2E 30% OFF');
  50 |     await page.locator('[data-testid="input-benefit-description"]').fill('Descrição detalhada da oferta de teste E2E');
  51 |     await page.locator('[data-testid="input-benefit-code"]').fill('E2E30');
  52 |     await page.locator('[data-testid="input-benefit-badge"]').fill('30% OFF VIP');
  53 | 
  54 |     // Confirmar ausência de campos de serviços (priceInfo ou iconName) no modal de benefício
  55 |     await expect(page.locator('[data-testid="select-service-icon"]')).toHaveCount(0);
  56 |     await expect(page.locator('[data-testid="input-service-price"]')).toHaveCount(0);
  57 | 
  58 |     // Fechar modal
  59 |     await page.locator('[data-testid="benefit-modal"]').getByText('Cancelar').click();
  60 |     await expect(page.locator('[data-testid="benefit-modal"]')).toHaveCount(0);
  61 |   });
  62 | 
  63 |   test('12 e 13. Downgrade e Upgrade de Plano: Preservação de Dados (Publicados vs. Armazenados)', async ({ page }) => {
  64 |     await page.setViewportSize(viewports[0]);
  65 | 
  66 |     // Acessar empresa Bronze com serviços armazenados
  67 |     const res = await page.goto('/dashboard/empresas/empresa-bronze/servicos', { waitUntil: 'domcontentloaded' });
  68 |     expect(res?.status()).toBe(200);
  69 | 
  70 |     // Confirmar exibição do status das cotas no Bronze (Max 3 ativos)
  71 |     await expect(page.locator('[data-testid="quota-progress-card"]')).toBeVisible({ timeout: 15000 });
  72 |     await expect(page.getByText('Plano Bronze', { exact: false })).toBeVisible({ timeout: 15000 });
  73 |   });
  74 | 
  75 |   test('14 a 17. Escrita -> Publicação e Segurança Server-Side na Rota Pública /guia/[slug]', async ({ page }) => {
  76 |     await page.setViewportSize(viewports[0]);
  77 | 
  78 |     // Verificar se as alterações do anunciante refletem imediatamente na página pública sem cache obsoleto
  79 |     const res = await page.goto('/guia/empresa-ouro', { waitUntil: 'domcontentloaded' });
> 80 |     expect(res?.status()).toBe(200);
     |                           ^ Error: expect(received).toBe(expected) // Object.is equality
  81 | 
  82 |     await expect(page.locator('[data-testid="ouro-services-section"]')).toBeVisible({ timeout: 15000 });
  83 |     await expect(page.locator('[data-testid="ouro-benefits-container"]')).toBeVisible({ timeout: 15000 });
  84 |   });
  85 | });
  86 | 
```