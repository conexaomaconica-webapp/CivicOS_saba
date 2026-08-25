import { test, expect } from '@playwright/test';
import { getE2EEnv, assertDestructiveOperationsAllowed } from './helpers/e2e-env';
import { fetchCurrentEntitlementLimit } from './helpers/entitlements';
import { loginE2EUser } from './helpers/auth';
import { adminChangeEntitlement } from './helpers/admin';
import { createBusinessResource, expectBusinessResourceBlocked } from './helpers/businesses';

const env = getE2EEnv();
test.use({ baseURL: env.baseUrl });
test.setTimeout(90_000);

const commercialPlans = ['bronze', 'prata', 'ouro', 'ouro_founder'] as const;
const managedResources = ['services_limit', 'gallery_photos_limit', 'benefits_limit', 'events_limit', 'posts_limit'] as const;

test.describe('EPIC: Homologação End-to-End do Anunciante (Staging Sem Mocks)', () => {
  
  test.beforeAll(() => {
    // Garantir que não rodamos suite destrutiva sem intenção
    assertDestructiveOperationsAllowed();
  });

  test.describe('Matriz de Planos e Entitlements', () => {
    for (const plan of commercialPlans) {
      for (const resource of managedResources) {
        test(`Plano ${plan.toUpperCase()} respeita os limites de ${resource.toUpperCase()}`, async ({ page }) => {
          test.skip(!process.env.E2E_RUN_MATRIX, 'Pular matriz E2E quando não explícito');
          
          // 1. Busca o limite atual direto no banco do staging (Zero Hardcode)
          const currentLimit = await fetchCurrentEntitlementLimit(plan, resource);
          const email = `e2e-${plan === 'ouro_founder' ? 'founder' : plan}@conexaomaconica.com.br`;
          const businessSlug = `e2e-${plan}-auto`;

          await loginE2EUser(page, email);
          
          // 2. Preenche até o limite atual (1..N -> permitido)
          for (let i = 0; i < currentLimit; i++) {
            await createBusinessResource(page, businessSlug, resource);
          }
          
          // 3. Tenta passar do limite (N+1 -> bloqueado)
          await expectBusinessResourceBlocked(page, businessSlug, resource);
        });
      }
    }
  });

  test.describe('Cenários de Fogo: Herança e Alteração Dinâmica', () => {
    test('Herança Ouro Fundador -> Ouro funciona no banco de dados e UI', async ({ page }) => {
      test.skip(!process.env.E2E_RUN_MATRIX, 'Pular matriz E2E quando não explícito');
      
      const ouroLimit = await fetchCurrentEntitlementLimit('ouro', 'events_limit');
      const founderLimit = await fetchCurrentEntitlementLimit('ouro_founder', 'events_limit');
      
      // Validação de contrato no backend (Single Source of Truth)
      expect(founderLimit).toBe(ouroLimit);

      // Validação na interface (UI percebida pelo anunciante)
      await loginE2EUser(page, 'e2e-founder@conexaomaconica.com.br');
      // TODO: Checar se a UI do painel exibe "0 de ouroLimit" consumidos 
    });

    test('Alteração Dinâmica: Admin altera limite e empresa é bloqueada em tempo real', async ({ browser }) => {
      test.skip(!process.env.E2E_RUN_MATRIX, 'Pular matriz E2E quando não explícito');
      
      const resource = 'services_limit';
      const initialLimit = await fetchCurrentEntitlementLimit('bronze', resource);
      
      const adminContext = await browser.newContext();
      const userContext = await browser.newContext();
      
      const adminPage = await adminContext.newPage();
      const userPage = await userContext.newPage();

      // 1. Loga anunciante e atinge limite (N)
      await loginE2EUser(userPage, 'e2e-bronze@conexaomaconica.com.br');
      for (let i = 0; i < initialLimit; i++) {
        await createBusinessResource(userPage, 'e2e-bronze-auto', resource);
      }
      await expectBusinessResourceBlocked(userPage, 'e2e-bronze-auto', resource); // N+1 bloqueado

      // 2. Admin loga e altera cota para N+2
      await loginE2EUser(adminPage, env.adminEmail, env.adminPassword);
      await adminChangeEntitlement(adminPage, 'bronze', resource, initialLimit + 2);

      // 3. Anunciante recarrega
      await userPage.reload();
      
      // 4. Anunciante agora consegue criar N+1 e N+2
      await createBusinessResource(userPage, 'e2e-bronze-auto', resource);
      await createBusinessResource(userPage, 'e2e-bronze-auto', resource);
      
      // 5. Mas N+3 bloqueia novamente
      await expectBusinessResourceBlocked(userPage, 'e2e-bronze-auto', resource);
    });
  });

  test.describe('Segurança e Auditoria do Admin', () => {
    test('Usuário Anunciante Comum não pode acessar /admin/planos', async ({ page }) => {
      await loginE2EUser(page, 'e2e-bronze@conexaomaconica.com.br');
      await page.goto('/admin/planos');
      expect(page.url()).not.toContain('/admin/planos');
    });

    test('API Rejeita payload malicioso com permissões/limites inválidos', async ({ request }) => {
      // TODO: Simular requisição HTTP POST direto para a action bypassing the UI
      // await request.post('/alguma-rota-action', { data: { plan: 'ouro', services_limit: -1 } })
    });
  });

});
