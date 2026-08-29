import { describe, it, expect } from 'vitest';
import {
  saveAdvertiserServiceAction,
  saveAdvertiserBenefitAction,
  saveAdvertiserEventAction,
  saveAdvertiserPostAction,
} from '@/lib/advertiser/advertiser-content-service';

describe('ETAPA 3 — Resiliência, Limpeza de Mocks e Eliminação de Falsos Positivos', () => {
  it('Server Action saveAdvertiserServiceAction deve retornar success: false se empresa for inválida', async () => {
    const res = await saveAdvertiserServiceAction({
      business_id: '00000000-0000-0000-0000-000000000000',
      title: 'Serviço Teste Inexistente',
      description: 'Descrição de teste',
    });
    expect(res.success).toBe(false);
    expect(res.message).toBeDefined();
  });

  it('Server Action saveAdvertiserBenefitAction deve retornar success: false se empresa for inválida', async () => {
    const res = await saveAdvertiserBenefitAction({
      business_id: '00000000-0000-0000-0000-000000000000',
      title: 'Benefício Teste Inexistente',
      description: 'Descrição de teste',
    });
    expect(res.success).toBe(false);
    expect(res.message).toBeDefined();
  });

  it('Server Action saveAdvertiserEventAction deve retornar success: false se empresa for inválida', async () => {
    const res = await saveAdvertiserEventAction({
      business_id: '00000000-0000-0000-0000-000000000000',
      title: 'Evento Teste Inexistente',
      description: 'Descrição de teste',
    });
    expect(res.success).toBe(false);
    expect(res.message).toBeDefined();
  });

  it('Server Action saveAdvertiserPostAction deve retornar success: false se empresa for inválida', async () => {
    const res = await saveAdvertiserPostAction({
      business_id: '00000000-0000-0000-0000-000000000000',
      title: 'Post Teste Inexistente',
      content: 'Conteúdo de teste',
    });
    expect(res.success).toBe(false);
    expect(res.message).toBeDefined();
  });
});
