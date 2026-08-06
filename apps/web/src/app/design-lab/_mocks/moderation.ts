import { MockModerationItem } from '../_types/design-lab';

export const MOCK_MODERATION_ITEMS: MockModerationItem[] = [
  {
    id: 'mod_001',
    businessId: 'bus_003_edge_case_no_photo',
    businessName: 'Padaria e Confeitaria Pão da Cidade Ltda',
    cnpj: '45.678.901/0001-23',
    type: 'new_business',
    status: 'pending_review',
    submittedAt: '2026-08-04T09:15:00Z',
    submittedBy: 'Ir. Fernando Oliveira (CIM 12345)',
    evidenceUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
    notes: 'Solicitada verificação do comprovante de afiliação e certidão da Loja Esperança nº 45.'
  },
  {
    id: 'mod_002',
    businessId: 'bus_004_edge_case_correction',
    businessName: 'Clínica Odontológica Sorriso Perfeito',
    cnpj: '33.444.555/0001-88',
    type: 'credential_verification',
    status: 'correction_requested',
    submittedAt: '2026-07-20T11:00:00Z',
    submittedBy: 'Dra. Patricia Lima',
    notes: 'Parecer do Moderador: Enviar foto em alta resolução da fachada da clínica contendo o número do endereço.'
  },
  {
    id: 'mod_003',
    businessId: 'bus_001',
    businessName: 'Oficina Irmãos Unidos',
    cnpj: '12.345.678/0001-90',
    type: 'new_business',
    status: 'approved',
    submittedAt: '2026-01-15T10:00:00Z',
    submittedBy: 'Ir. Carlos Alberto da Silva',
    notes: 'Aprovado com louvor após verificação dos documentos e adimplência da anuidade.'
  }
];
