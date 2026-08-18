# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: bloco5-full-commercial-lifecycle.spec.ts >> BLOCO 5: Full Commercial Lifecycle, Security & Launch Audit >> 3. Full Commercial Lifecycle: Ouro creation -> Admin Approval -> Public Guia -> Review -> Analytics
- Location: e2e\bloco5-full-commercial-lifecycle.spec.ts:35:7

# Error details

```
Test timeout of 90000ms exceeded.
```

```
Error: page.goto: Test timeout of 90000ms exceeded.
Call log:
  - navigating to "http://127.0.0.1:3000/guia/empresa-ouro", waiting until "load"

```

# Page snapshot

```yaml
- generic [ref=f1e2]:
  - banner [ref=f1e3]:
    - generic [ref=f1e4]:
      - link "Conexão Maçônica — início" [ref=f1e5] [cursor=pointer]:
        - /url: /
        - generic [ref=f1e6]:
          - generic [ref=f1e7]: ◇
          - generic [ref=f1e8]: △
        - generic [ref=f1e9]: Conexão Maçônica
      - navigation "Navegação principal" [ref=f1e10]:
        - link "Início" [ref=f1e11] [cursor=pointer]:
          - /url: /
        - link "Empresas" [ref=f1e12] [cursor=pointer]:
          - /url: /guia
        - link "Benefícios" [ref=f1e13] [cursor=pointer]:
          - /url: /beneficios
        - link "Eventos" [ref=f1e14] [cursor=pointer]:
          - /url: /eventos
        - link "Lojas Maçônicas" [ref=f1e15] [cursor=pointer]:
          - /url: /lojas-maconicas
      - generic [ref=f1e16]:
        - button "Favoritos" [ref=f1e17] [cursor=pointer]
        - button "Notificações" [ref=f1e20] [cursor=pointer]:
          - generic [ref=f1e24]: "3"
        - link "Entrar" [ref=f1e26] [cursor=pointer]:
          - /url: /auth/login
  - main [ref=f1e27]:
    - generic [ref=f1e28]:
      - link "← Voltar para Guia de Empresas" [ref=f1e30] [cursor=pointer]:
        - /url: /guia
      - generic [ref=f1e32]:
        - img "Logotipo da Padaria Estrela" [ref=f1e34]
        - generic [ref=f1e35]:
          - generic [ref=f1e36]:
            - generic [ref=f1e37]: Empresa Verificada
            - generic [ref=f1e41]: 👑 PLANO OURO
          - heading "Padaria & Confeitaria Estrela" [level=1] [ref=f1e42]
          - paragraph [ref=f1e43]: Alimentos e Bebidas
        - generic [ref=f1e44]:
          - generic [ref=f1e45]: Responde em até 1h
          - generic [ref=f1e49]: 5,0 (215 avaliações)
      - generic [ref=f1e53]:
        - generic [ref=f1e54]:
          - link "WhatsApp VIP" [ref=f1e55] [cursor=pointer]:
            - /url: https://wa.me/5511977778888
          - link "Ligar" [ref=f1e58] [cursor=pointer]:
            - /url: tel:1122334455
          - link "E-mail" [ref=f1e61] [cursor=pointer]:
            - /url: mailto:contato@padariaestrela.com.br
          - link "Traçar Rota" [ref=f1e65] [cursor=pointer]:
            - /url: https://www.google.com/maps/search/?api=1&query=-23.6001%2C-46.6668
          - link "Instagram" [ref=f1e69] [cursor=pointer]:
            - /url: https://instagram.com/padariaestrela
          - link "Facebook" [ref=f1e73] [cursor=pointer]:
            - /url: https://facebook.com/padariaestrela
        - link "Orçamento Imediato" [ref=f1e77] [cursor=pointer]:
          - /url: https://wa.me/5511977778888?text=Ol%C3%A1%2C%20gostaria%20de%20solicitar%20um%20or%C3%A7amento%20para%20Padaria%20%26%20Confeitaria%20Estrela.
      - generic [ref=f1e81]:
        - generic [ref=f1e82]:
          - generic [ref=f1e83]:
            - heading "Sobre a Empresa" [level=2] [ref=f1e84]
            - paragraph [ref=f1e85]: Padaria artesanal premiada com tradição de 30 anos. Pães de fermentação natural, confeitaria fina e café colonial.
          - generic [ref=f1e86]:
            - heading "Catálogo de Serviços VIP (4)" [level=2] [ref=f1e87]
            - generic [ref=f1e88]:
              - generic [ref=f1e94]:
                - generic [ref=f1e95]:
                  - heading "Café Colonial Presencial" [level=3] [ref=f1e96]
                  - generic [ref=f1e97]: A partir de R$ 45
                - paragraph [ref=f1e98]: Servido aos finais de semana e feriados com grande variedade de pães e doces artesanais.
              - generic [ref=f1e105]:
                - generic [ref=f1e106]:
                  - heading "Encomendas de Kit Festa & Eventos" [level=3] [ref=f1e107]
                  - generic [ref=f1e108]: Sob consulta
                - paragraph [ref=f1e109]: Atendimento personalizado para eventos corporativos e comemorações familiares.
              - generic [ref=f1e115]:
                - heading "Consultoria de Harmonização de Pães" [level=3] [ref=f1e117]
                - paragraph [ref=f1e118]: Treinamento e harmonização exclusiva de pães de fermentação natural para degustações.
              - generic [ref=f1e127]:
                - heading "Entrega Expressa Fraterna" [level=3] [ref=f1e128]
                - generic [ref=f1e129]: Frete Grátis
          - generic [ref=f1e130]:
            - heading "Avaliações da Comunidade (215)" [level=2] [ref=f1e131]
            - generic [ref=f1e132]:
              - generic [ref=f1e133]:
                - generic [ref=f1e134]: ★★★★★
                - paragraph [ref=f1e135]: O melhor croissant de São Paulo! Atendimento caloroso do irmão Roberto e equipe sensacional.
              - generic [ref=f1e136]:
                - generic [ref=f1e137]: ★★★★★
                - paragraph [ref=f1e138]: Excelente estrutura e produtos de altíssima qualidade. O benefício aos irmãos é muito honrado.
        - generic [ref=f1e139]:
          - generic [ref=f1e140]:
            - generic [ref=f1e141]:
              - generic [ref=f1e142]: 20% OFF VIP
              - heading "Desconto Ouro VIP 20%" [level=3] [ref=f1e146]
              - paragraph [ref=f1e147]: 20% de desconto em todo o cardápio em compras acima de R$ 50 para membros da comunidade.
              - generic [ref=f1e148]:
                - generic [ref=f1e149]:
                  - generic [ref=f1e150]: Código Promocional
                  - code [ref=f1e151]: OURO20
                - button "Copiar Código" [ref=f1e152] [cursor=pointer]
              - paragraph [ref=f1e157]: 💡 Apresente o código promocional no caixa ou informe pelo WhatsApp Direct.
              - paragraph [ref=f1e158]: "📅 Válido até: 31/12/2026"
              - link "Resgatar Benefício Agora" [ref=f1e159] [cursor=pointer]:
                - /url: https://wa.me/5511977778888?text=Ol%C3%A1%2C%20gostaria%20de%20resgatar%20o%20benef%C3%ADcio%20especial%20de%20Padaria%20%26%20Confeitaria%20Estrela.
            - generic [ref=f1e160]:
              - generic [ref=f1e161]: CORTESIA DA CASA
              - heading "Café Colonial Cortesia" [level=3] [ref=f1e165]
              - paragraph [ref=f1e166]: Ganhe um espresso premiado acompanhado de broa de milho em qualquer consumo presencial.
              - link "Resgatar Benefício Agora" [ref=f1e167] [cursor=pointer]:
                - /url: https://wa.me/5511977778888?text=Ol%C3%A1%2C%20gostaria%20de%20resgatar%20o%20benef%C3%ADcio%20especial%20de%20Padaria%20%26%20Confeitaria%20Estrela.
            - generic [ref=f1e168]:
              - generic [ref=f1e169]: R$ 30 OFF
              - heading "Kit Degustação Pães Levain" [level=3] [ref=f1e173]
              - paragraph [ref=f1e174]: Desconto de R$ 30 na compra do kit degustação familiar de pães de fermentação natural.
              - generic [ref=f1e175]:
                - generic [ref=f1e176]:
                  - generic [ref=f1e177]: Código Promocional
                  - code [ref=f1e178]: LEVAIN30
                - button "Copiar Código" [ref=f1e179] [cursor=pointer]
              - paragraph [ref=f1e184]: 💡 Solicite ao atendente antes da emissão da nota.
              - link "Resgatar Benefício Agora" [ref=f1e185] [cursor=pointer]:
                - /url: https://wa.me/5511977778888?text=Ol%C3%A1%2C%20gostaria%20de%20resgatar%20o%20benef%C3%ADcio%20especial%20de%20Padaria%20%26%20Confeitaria%20Estrela.
          - generic [ref=f1e186]:
            - heading "Fotos e Vídeos em Destaque" [level=2] [ref=f1e187]
            - generic [ref=f1e188]:
              - img "Fachada e salão principal da Padaria Estrela" [ref=f1e190]
              - img "Vitrine de doces finos" [ref=f1e192]
              - img "Pães artesanais recém saídos do forno" [ref=f1e194]
        - complementary [ref=f1e195]:
          - generic "Ações da empresa" [ref=f1e196]:
            - button "Favoritar" [disabled] [ref=f1e197] [cursor=pointer]
            - button "Compartilhar" [ref=f1e200] [cursor=pointer]
          - generic [ref=f1e207]:
            - heading "Responsável Verificado" [level=3] [ref=f1e208]
            - paragraph [ref=f1e209]: Roberto Estrela
            - paragraph [ref=f1e210]: Irmão
            - paragraph [ref=f1e211]: Sócio Fundador
          - generic [ref=f1e212]:
            - heading "Informações VIP" [level=3] [ref=f1e213]
            - paragraph [ref=f1e214]: "Domingo: 06:00 - 21:00"
            - paragraph [ref=f1e215]: 8.930 visualizações
          - generic [ref=f1e219]:
            - heading "Localização VIP" [level=3] [ref=f1e220]
            - paragraph [ref=f1e221]: Rua das Flores, 123 — Moema, São Paulo, SP, 04500-000
            - link "Traçar Rota" [ref=f1e222] [cursor=pointer]:
              - /url: https://www.google.com/maps/search/?api=1&query=-23.6001%2C-46.6668
  - contentinfo [ref=f1e225]:
    - generic [ref=f1e226]:
      - generic [ref=f1e227]: Ambiente protegido
      - generic [ref=f1e228]: Privacidade e LGPD
      - generic [ref=f1e229]: Rede verificada
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.use({ baseURL: 'http://127.0.0.1:3000' });
  4  | test.setTimeout(90_000);
  5  | 
  6  | test.describe('BLOCO 5: Full Commercial Lifecycle, Security & Launch Audit', () => {
  7  |   test('1. Security Response Headers Audit (HSTS, X-Frame-Options, nosniff, CSP)', async ({ page }) => {
  8  |     const response = await page.goto('/guia');
  9  |     expect(response).not.toBeNull();
  10 | 
  11 |     if (response) {
  12 |       const headers = response.headers();
  13 |       expect(headers['x-frame-options']).toBe('DENY');
  14 |       expect(headers['x-content-type-options']).toBe('nosniff');
  15 |       expect(headers['strict-transport-security']).toContain('max-age=');
  16 |       expect(headers['content-security-policy-report-only']).toContain("default-src 'self'");
  17 |     }
  18 |   });
  19 | 
  20 |   test('2. Admin & Dashboard private routes contain noindex and block unauthenticated users', async ({ context, page }) => {
  21 |     await context.addCookies([
  22 |       { name: 'e2e-mock-role', value: 'usuario_comum', domain: '127.0.0.1', path: '/' },
  23 |     ]);
  24 | 
  25 |     await page.goto('/admin/aprovacoes');
  26 |     await expect(page).not.toHaveURL(/\/admin\/aprovacoes/);
  27 | 
  28 |     await page.goto('/dashboard');
  29 |     const robotsMeta = page.locator('meta[name="robots"]');
  30 |     if (await robotsMeta.count() > 0) {
  31 |       await expect(robotsMeta).toHaveAttribute('content', /noindex/);
  32 |     }
  33 |   });
  34 | 
  35 |   test('3. Full Commercial Lifecycle: Ouro creation -> Admin Approval -> Public Guia -> Review -> Analytics', async ({ context, page }) => {
  36 |     await context.addCookies([
  37 |       { name: 'e2e-mock-role', value: 'master', domain: '127.0.0.1', path: '/' },
  38 |     ]);
  39 | 
  40 |     // A) Advertiser accesses business dashboard
  41 |     await page.goto('/dashboard/empresas/demo-biz/perfil');
  42 |     await expect(page.locator('h1').last()).toBeVisible();
  43 | 
  44 |     // B) Public Guia page renders Ouro business detail and JSON-LD structured data
> 45 |     await page.goto('/guia/empresa-ouro');
     |                ^ Error: page.goto: Test timeout of 90000ms exceeded.
  46 |     await expect(page.locator('h1').last()).toBeVisible();
  47 | 
  48 |     // Verify JSON-LD script tag is present and properly escaped
  49 |     const jsonLdScript = page.locator('script[type="application/ld+json"]').first();
  50 |     await expect(jsonLdScript).toBeAttached();
  51 |     const scriptContent = await jsonLdScript.textContent();
  52 |     expect(scriptContent).not.toContain('<script>');
  53 | 
  54 |     // C) Submit review on public business detail
  55 |     await page.goto('/guia/empresa-ouro');
  56 |     const ratingStar = page.locator('button:has-text("★")').first();
  57 |     if (await ratingStar.isVisible()) {
  58 |       await ratingStar.click();
  59 |       await page.fill('textarea', 'Excelente atendimento e serviço de alta qualidade!');
  60 |       await page.click('button:has-text("Enviar Avaliação")');
  61 |       await expect(page.locator('text=sucesso').or(page.locator('text=Pendente'))).toBeVisible({ timeout: 5000 });
  62 |     }
  63 |   });
  64 | 
  65 |   test('4. Dynamic sitemap and robots.txt serve valid tenant-aware metadata', async ({ page }) => {
  66 |     const robotsRes = await page.goto('/robots.txt');
  67 |     expect(robotsRes?.status()).toBe(200);
  68 |     const robotsText = await robotsRes?.text();
  69 |     expect(robotsText).toContain('Disallow: /admin/');
  70 |     expect(robotsText).toContain('Disallow: /dashboard/');
  71 | 
  72 |     const sitemapRes = await page.goto('/sitemap.xml');
  73 |     expect(sitemapRes?.status()).toBe(200);
  74 |     const sitemapXml = await sitemapRes?.text();
  75 |     expect(sitemapXml).toContain('/guia');
  76 |     expect(sitemapXml).not.toContain('/admin');
  77 |   });
  78 | });
  79 | 
```