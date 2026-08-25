import { describe, it, expect } from 'vitest';
import {
  getAdminLodgesListAction,
  getAdminLodge360DetailsAction,
  toggleLodgePublicationStatusAction,
} from '../src/lib/admin/admin-lodges-service';

describe('EPIC ADMIN — CHECKPOINT 5: GESTÃO 360º DE LOJAS MAÇÔNICAS & ORGANIZAÇÕES', () => {
  const TEST_LODGE_ID = '00000000-0000-0000-0000-000000000020';

  it('1. Busca e filtragem do diretório de Lojas Maçônicas (/admin/lojas) com auditoria de qualidade da base', async () => {
    const res = await getAdminLodgesListAction({
      query: '13 de Maio',
      potency: 'GLESP',
      page: 1,
      pageSize: 10,
    });

    expect(res.items).toBeDefined();
    expect(res.kpis).toBeDefined();
    expect(res.kpis.total).toBeGreaterThanOrEqual(1);
  });

  it('2. Carrega o Prontuário 360º completo da Loja Maçônica (/admin/lojas/[id]) com cálculo de completude %', async () => {
    const dto = await getAdminLodge360DetailsAction(TEST_LODGE_ID);

    expect(dto).not.toBeNull();
    if (dto) {
      expect(dto.lodge.id).toBe(TEST_LODGE_ID);
      expect(dto.lodge.name).toBeDefined();
      expect(dto.lodge.potency).toBeDefined();
      expect(dto.completeness.percent).toBeGreaterThanOrEqual(0);
      expect(dto.meetings.length).toBeGreaterThan(0);
      expect(dto.audit_timeline.length).toBeGreaterThan(0);
    }
  });

  it('3. Governança: altera status de publicação da Loja Maçônica', async () => {
    const res = await toggleLodgePublicationStatusAction(TEST_LODGE_ID, true, 'Homologação Checkpoint 5');
    expect(res.success).toBe(true);
  });
});
