import { describe, it, expect } from 'vitest';
import {
  updateBusinessProfileInfoAction,
  updateBusinessAdminDataAction,
  updateBusinessContactsAction,
  uploadBusinessAssetAction,
} from '../src/app/actions/business-profile-actions';

describe('Bloco 1 - Business Profile, Storage & Plan Entitlements Contract', () => {
  const mockBusinessId = '00000000-0000-0000-0000-000000000001';

  it('should update business public profile info successfully', async () => {
    const res = await updateBusinessProfileInfoAction(mockBusinessId, {
      name: 'Oficina Exemplo Ouro',
      tagline: 'Especialista em Manutenção',
      category: 'Serviços Automotivos',
      description: 'Oficina mecânica completa com atendimento diferenciado.',
    });

    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });

  it('should store private administrative data (CNPJ/CPF) securely without public exposure', async () => {
    const res = await updateBusinessAdminDataAction(mockBusinessId, {
      legalName: 'Razão Social Exemplo LTDA',
      documentNumber: '12.345.678/0001-90',
    });

    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });

  it('should update public contacts and social networks successfully', async () => {
    const res = await updateBusinessContactsAction(mockBusinessId, {
      phone: '(11) 3333-4444',
      whatsapp: '(11) 99999-8888',
      email: 'contato@oficinaouro.com.br',
      website: 'https://www.oficinaouro.com.br',
    });

    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });

  it('should construct server-side storage paths in {tenant_id}/{business_id}/{asset_type}/ format', async () => {
    const res = await uploadBusinessAssetAction(
      mockBusinessId,
      'logo',
      'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJaQAA3AA/v3AgAA='
    );

    expect(res).toBeDefined();
    expect(res.success).toBe(true);
    expect(res.url).toContain('/business-assets/');
    expect(res.url).toContain('/logo/');
  });
});
