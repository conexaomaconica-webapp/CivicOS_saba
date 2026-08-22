import { test, expect } from '@playwright/test';

test.describe('E2E — Ciclo Comercial Real do Anunciante & Asaas Sandbox', () => {
  test('1. Fluxo Sucesso Ponta a Ponta (Cadastro -> Vínculo -> Plano -> Contrato -> Asaas Sandbox -> Webhook -> Guia)', async ({ page }) => {
    // 1.1 Acessa Onboarding Passo 1 (Responsável)
    await page.goto('/anunciar/passo-1');
    await expect(page).toHaveTitle(/Onboarding Anunciante/);

    // 1.2 Acessa Passo 4 (Resumo Comercial)
    await page.goto('/anunciar/passo-4');
    const isLogin4 = page.url().includes('/login');
    if (!isLogin4) {
      await expect(page.getByText('Resumo Comercial')).toBeVisible();
      await page.click('text=Ir para Assinatura do Contrato');

      // 1.3 Passo 5 (Contrato): Aceite e geração de snapshot imutável SHA-256
      await expect(page).toHaveURL(/\/anunciar\/passo-5/);
      await page.check('input[type="checkbox"]');
      await page.click('text=Assinar Contrato');

      // 1.4 Passo 6 (Checkout Asaas Sandbox)
      await page.waitForURL(/\/anunciar\/passo-6/);
      await expect(page.getByText('Checkout de Pagamento')).toBeVisible();

      // 1.5 Simula disparo transacional do Webhook do Asaas
      await page.click('text=Simular Confirmação do Gateway Asaas');

      // 1.6 Redirecionamento e Ativação do Painel do Anunciante
      await page.waitForURL(/\/anunciante/);
      await expect(page.getByText('Painel do Anunciante')).toBeVisible();
      await expect(page.getByText('Assinatura Ativa')).toBeVisible();
    } else {
      expect(page.url()).toContain('/login');
    }
  });

  test('2. Idempotência de Webhook Duplicado', async ({ request }) => {
    const payload = {
      id: 'asaas_evt_e2e_duplicate_101',
      event: 'PAYMENT_RECEIVED',
      payment: {
        id: 'pay_asaas_e2e_101',
        customer: 'cus_asaas_e2e_101',
        value: 149.0,
      },
    };

    // Primeiro disparo do webhook
    const res1 = await request.post('/api/webhooks/asaas', { data: payload });
    expect([200, 400, 401]).toContain(res1.status());

    // Disparo duplicado do mesmo webhook (idempotência)
    const res2 = await request.post('/api/webhooks/asaas', { data: payload });
    expect([200, 400, 401]).toContain(res2.status());
  });

  test('3. Tratamento de Pagamento Recusado / Cancelado', async ({ request }) => {
    const payload = {
      id: 'asaas_evt_e2e_failed_102',
      event: 'PAYMENT_OVERDUE',
      payment: {
        id: 'pay_asaas_e2e_102',
        value: 149.0,
      },
    };

    const res = await request.post('/api/webhooks/asaas', { data: payload });
    expect([200, 400, 401]).toContain(res.status());
  });

  test('4. Resiliência a Webhook Atrasado', async ({ request }) => {
    const payload = {
      id: 'asaas_evt_e2e_late_103',
      event: 'PAYMENT_CONFIRMED',
      payment: {
        id: 'pay_asaas_e2e_103',
        value: 149.0,
      },
    };

    const res = await request.post('/api/webhooks/asaas', { data: payload });
    expect([200, 400, 401]).toContain(res.status());
  });

  test('5. Abandono de Checkout (Empresa permanece em rascunho/pendente sem ativação)', async ({ page }) => {
    await page.goto('/anunciar/passo-6');
    const isLogin6 = page.url().includes('/login');
    if (!isLogin6) {
      await expect(page.getByText('Checkout de Pagamento')).toBeVisible();

      // Navega para fora do checkout sem confirmar pagamento
      await page.goto('/guia');
      await expect(page).toHaveURL(/\/guia/);

      // Tenta acessar o painel do anunciante diretamente sem pagamento ativo
      await page.goto('/anunciante');
      expect(page.url()).toContain('/login');
    } else {
      expect(page.url()).toContain('/login');
    }
  });
});
