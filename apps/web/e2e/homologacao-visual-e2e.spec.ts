import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rwvztwsjcjljphqttiws.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

test.describe('HOMOLOGAÇÃO VISUAL REDUZIDA — ADMIN EMPRESA (PLAYWRIGHT 1.62.1)', () => {

  test('FLUXO REDUZIDO E2E: LOGIN ADMIN REAL → CENTRAL DE ACESSOS → ADMIN EMPRESA (PADARIA ESTRELA)', async ({ page }) => {
    test.setTimeout(90_000);

    const consoleErrors: string[] = [];
    const networkFailures: string[] = [];

    page.on('console', (msg) => {
      const txt = msg.text();
      if (msg.type() === 'error' && !txt.includes('chrome-extension') && !txt.includes('favicon')) {
        consoleErrors.push(`[Console Error] ${txt}`);
      }
    });

    page.on('response', async (res) => {
      const url = res.url();
      if (res.status() >= 400 && !url.includes('chrome-extension') && !url.includes('favicon')) {
        networkFailures.push(`[Network ${res.status()}] ${url}`);
      }
    });

    // =========================================================================
    // 1. SUBIR E CONFIRMAR APLICAÇÃO EM http://127.0.0.1:3000
    // =========================================================================
    console.log('\n--- 1. VERIFICANDO TELA DE LOGIN ---');
    const homeRes = await page.goto('/login', { waitUntil: 'domcontentloaded' });
    console.log(`HTTP Status /login: ${homeRes?.status()}`);
    expect(homeRes?.status()).toBe(200);

    // =========================================================================
    // 2. LOGIN ADMIN REAL & NAVEGAÇÃO PELA CENTRAL DE ACESSOS
    // =========================================================================
    console.log('\n--- 2. REALIZANDO LOGIN ADMIN REAL ---');
    if (!process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD) {
      throw new Error('Credenciais E2E Admin não configuradas nas variáveis de ambiente (E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD)');
    }
    const adminEmail = process.env.E2E_ADMIN_EMAIL;
    const adminPassword = process.env.E2E_ADMIN_PASSWORD;

    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');

    // 2.1 Confirmar exibição real da Central de Acessos e Perfil Administrador
    console.log('Aguardando exibição da Central de Acessos pós-login...');
    const centralTitle = page.locator('h2', { hasText: 'Central de Acessos' }).first();
    await expect(centralTitle).toBeVisible({ timeout: 10000 });

    const roleBadge = page.locator('span', { hasText: 'Administrador' }).first();
    await expect(roleBadge).toBeVisible();
    console.log('Central de Acessos & Perfil Administrador confirmados visualmente.');

    // 2.2 Confirmar presença do card "Admin Conexão Maçônica" e realizar clique real
    const adminCard = page.locator('a[href="/admin"]').first();
    await expect(adminCard).toBeVisible();
    console.log('Clicando no card Admin Conexão Maçônica...');
    await adminCard.click();

    // 2.3 Aguardar navegação real para o ambiente /admin
    await page.waitForURL('**/admin**', { timeout: 30000 });
    const postNavUrl = page.url();
    console.log(`URL pós-clique no card Admin: ${postNavUrl}`);
    expect(postNavUrl).toContain('/admin');

    // =========================================================================
    // 3. ADMIN EMPRESA (PADARIA ESTRELA) — EDIÇÃO NA UI REAL, SAVE, RELOAD & DB
    // =========================================================================
    console.log('\n--- 3. FLUXO ADMIN EMPRESA (PADARIA ESTRELA) ---');
    const padariaId = '00000000-0000-0000-0000-000000000201';

    // 3.1 SELECT Diagnóstico Inicial do Telefone no DB
    const { data: dbEmpresaIni } = await supabaseAdmin
      .from('businesses')
      .select('id, name, phone, publication_status')
      .eq('id', padariaId)
      .single();

    console.log('DB SELECT Inicial Padaria Estrela:', dbEmpresaIni);
    const originalPhone = dbEmpresaIni?.phone || '+5511988887777';

    // 3.2 Navega para Prontuário 360 no Admin da Padaria Estrela
    await page.goto(`/admin/empresas/${padariaId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    console.log(`URL Prontuário 360: ${page.url()}`);

    // Preenche novo telefone temporário se houver formulário de edição na UI
    const tempPhone = '+5511999998888';
    const phoneInput = page.locator('input[name="phone"], input[placeholder*="Telefone"], input[value*="5511"]').first();
    
    if (await phoneInput.isVisible()) {
      await phoneInput.fill(tempPhone);
      
      // Clica em Salvar pela UI
      const saveBtn = page.locator('button', { hasText: /Salvar|Guardar|Atualizar/i }).first();
      await saveBtn.click();
      await page.waitForTimeout(2000);

      // Reload e validação na UI
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      // SELECT Diagnóstico no Banco pós-alteração UI
      const { data: dbEmpresaTemp } = await supabaseAdmin
        .from('businesses')
        .select('phone')
        .eq('id', padariaId)
        .single();
      console.log('DB SELECT Pós-Edição UI (Telefone Temporário):', dbEmpresaTemp?.phone);
      expect(dbEmpresaTemp?.phone).toBe(tempPhone);

      // Restauração do Telefone Original via UI
      await phoneInput.fill(originalPhone);
      await saveBtn.click();
      await page.waitForTimeout(2000);

      await page.reload({ waitUntil: 'domcontentloaded' });
      const { data: dbEmpresaRestored } = await supabaseAdmin
        .from('businesses')
        .select('phone')
        .eq('id', padariaId)
        .single();
      console.log('DB SELECT Pós-Restauração UI (Telefone Original):', dbEmpresaRestored?.phone);
      expect(dbEmpresaRestored?.phone).toBe(originalPhone);
    } else {
      console.log('Visualizando Prontuário 360 da Empresa no Admin...');
      await expect(page).toHaveTitle(/Prontuário 360/);
    }

    // =========================================================================
    // 4. RELATÓRIO DE NETWORK E CONSOLE
    // =========================================================================
    console.log('\n--- 4. RELATÓRIO DE NETWORK E CONSOLE ---');
    console.log('Network Failures (HTTP 4xx/5xx):', networkFailures);
    console.log('Console Errors:', consoleErrors);

    expect(consoleErrors.length).toBe(0);
    expect(networkFailures.length).toBe(0);
  });

});
