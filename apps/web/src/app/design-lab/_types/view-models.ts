import { MockBusiness, MockPlan, MockContract, MockModerationItem } from './design-lab';

export interface BusinessCardViewModel {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  status: 'draft' | 'approved' | 'pending_review' | 'correction_requested' | 'rejected' | 'suspended';
  statusLabel: string;
  statusTone: 'success' | 'warning' | 'danger' | 'neutral';
  badges: Array<{
    label: string;
    category: 'connection' | 'verification' | 'recognition' | 'commercial';
    tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';
    icon?: string;
  }>;
  locationMasked: string;
  contactMasked: string;
  ratingFormatted: string;
  reviewCount: number;
  isInteractable: boolean;
}

export interface BillingSummaryViewModel {
  planName: string;
  planCode: string;
  billingModel: 'anniversary' | 'fixed_date_prorated' | 'restart_cycle' | 'next_renewal';
  billingModelLabel: string;
  priceFormatted: string;
  features: string[];
}

export interface ContractViewerViewModel {
  id: string;
  planName: string;
  status: 'draft' | 'pending_signature' | 'signed' | 'annulled';
  statusLabel: string;
  statusTone: 'success' | 'warning' | 'neutral' | 'danger';
  documentTitle: string;
  termsContent: string[];
}

export interface ModerationQueueItemViewModel {
  id: string;
  businessName: string;
  requestType: string;
  submittedAt: string;
  submittedBy: string;
  evidenceUrl?: string;
  notes?: string;
  status: 'pending_review' | 'correction_requested' | 'approved' | 'rejected';
}

// Adapters
export function toBusinessCardViewModel(mock: MockBusiness): BusinessCardViewModel {
  const isApproved = mock.status === 'approved';
  const isPending = mock.status === 'pending_review';

  return {
    id: mock.id,
    title: mock.name,
    subtitle: mock.tradeName,
    category: mock.category,
    status: mock.status,
    statusLabel: isApproved ? 'Aprovada' : isPending ? 'Em Análise' : 'Suspensa',
    statusTone: isApproved ? 'success' : isPending ? 'warning' : 'danger',
    badges: mock.verificationBadge
      ? [
          {
            label: 'Membro Verificado',
            category: 'verification',
            tone: 'success',
            icon: '🛡️'
          }
        ]
      : [],
    locationMasked: `${mock.address.city} / ${mock.address.state}`,
    contactMasked: `WhatsApp: ${mock.contact.whatsapp}`,
    ratingFormatted: `★ ${mock.rating}`,
    reviewCount: mock.reviewCount,
    isInteractable: isApproved
  };
}

export function toBillingSummaryViewModel(mock: MockPlan): BillingSummaryViewModel {
  return {
    planName: mock.name,
    planCode: mock.code,
    billingModel: 'anniversary',
    billingModelLabel: 'Aniversário Anual (-20%)',
    priceFormatted: `R$ ${mock.priceAnnual},00/ano`,
    features: mock.features
  };
}

export function toContractViewerViewModel(mock: MockContract): ContractViewerViewModel {
  return {
    id: mock.id,
    planName: mock.planName,
    status: mock.status,
    statusLabel: mock.status === 'signed' ? 'Assinado' : 'Pendente de Aceite',
    statusTone: mock.status === 'signed' ? 'success' : 'warning',
    documentTitle: `Termo de Adesão ao Guia Comercial Fraterno (#${mock.id})`,
    termsContent: [
      '1. Objeto: O presente termo disciplina as condições de anúncio e veiculação da empresa na plataforma.',
      '2. Vínculo e Conduta: O anunciante declara responsabilidade integral pelas informações, produtos e serviços oferecidos.',
      '3. Renovação e Faturamento: A renovação observará os termos da BillingPolicy aplicável.',
      '[Fim da minuta simulada para demonstração no Design Lab]'
    ]
  };
}

export function toModerationQueueItemViewModel(mock: MockModerationItem): ModerationQueueItemViewModel {
  return {
    id: mock.id,
    businessName: mock.businessName,
    requestType: mock.type === 'new_business' ? 'Novo Cadastro de Empresa' : 'Verificação de Credenciais',
    submittedAt: mock.submittedAt,
    submittedBy: mock.submittedBy,
    evidenceUrl: mock.evidenceUrl,
    notes: mock.notes,
    status: mock.status
  };
}
