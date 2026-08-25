import { describe, it, expect } from 'vitest';
import {
  getAdminBusinessesListAction,
  getAdminBusiness360DetailsAction,
} from '../src/lib/admin/admin-businesses-service';

describe('EPIC ADMIN — CHECKPOINT 4: GESTÃO 360º DE ANUNCIANTES & EMPRESAS', () => {
  const TEST_BUSINESS_ID = '00000000-0000-0000-0000-000000000001';

  it('1. Busca e filtragem do diretório de empresas (/admin/empresas)', async () => {
    const res = await getAdminBusinessesListAction({
      query: 'Comandos',
      status: 'published',
      page: 1,
      pageSize: 10,
    });

    expect(res.items).toBeDefined();
    expect(res.kpis).toBeDefined();
    expect(res.kpis.total).toBeGreaterThanOrEqual(1);
    expect(res.kpis.pedra_fundamental_count).toBeGreaterThanOrEqual(1);
  });

  it('2. Carrega o Prontuário 360º completo da empresa (/admin/empresas/[id])', async () => {
    const dto = await getAdminBusiness360DetailsAction(TEST_BUSINESS_ID);

    expect(dto).not.toBeNull();
    if (dto) {
      expect(dto.business.id).toBe(TEST_BUSINESS_ID);
      expect(dto.business.name).toBeDefined();
      expect(dto.owner.email).toBeDefined();
      expect(dto.masonic_link.relation).toBeDefined();
      expect(dto.subscription.plan_code).toBeDefined();
      expect(dto.contract?.sha256_hash).toBeDefined();
      expect(dto.content_summary.services_limit).toBeGreaterThan(0);
      expect(dto.audit_timeline.length).toBeGreaterThan(0);
    }
  });

  it('3. Preserva a separação conceitual entre Plano Comercial e Selos Históricos (Pedra Fundamental 1/10)', async () => {
    const dto = await getAdminBusiness360DetailsAction(TEST_BUSINESS_ID);

    if (dto) {
      expect(dto.subscription.plan_code).not.toBe('pedra_fundamental');
      expect(dto.business.is_pedra_fundamental).toBe(true);
      expect(dto.pedra_fundamental_count).toBeLessThanOrEqual(10);
    }
  });
});
