import { MockContract } from '../_types/design-lab';

export const MOCK_CONTRACTS: MockContract[] = [
  {
    id: 'ctr_2026_001',
    businessId: 'bus_001',
    planName: 'Plano Profissional Destaque Anual',
    status: 'signed',
    signedAt: '2026-01-15T10:30:00Z',
    signerName: 'Ir. Carlos Alberto da Silva',
    signerCpf: '***.456.789-**',
    documentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  },
  {
    id: 'ctr_2026_002',
    businessId: 'bus_002',
    planName: 'Plano Essencial Anual',
    status: 'signed',
    signedAt: '2026-02-01T14:45:00Z',
    signerName: 'Dra. Mariana Souza Santos',
    signerCpf: '***.123.456-**',
    documentHash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4'
  },
  {
    id: 'ctr_2026_003_pending',
    businessId: 'bus_003_edge_case_no_photo',
    planName: 'Plano Essencial Anual',
    status: 'pending_signature'
  },
  {
    id: 'ctr_2026_004_annulled',
    businessId: 'bus_005_edge_case_suspended',
    planName: 'Plano Patrocinador Fundador Anual',
    status: 'annulled',
    signedAt: '2025-11-10T16:20:00Z',
    signerName: 'Roberto Mendes',
    signerCpf: '***.789.012-**',
    documentHash: 'c53a8015c9bd04746f3...annulled'
  }
];
