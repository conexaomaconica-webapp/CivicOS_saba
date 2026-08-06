import { MockPayment } from '../_types/design-lab';

export const MOCK_PAYMENTS: MockPayment[] = [
  {
    id: 'pay_1001',
    invoiceId: 'inv_1001',
    businessName: 'Oficina Irmãos Unidos',
    amount: 1188.00,
    status: 'paid',
    method: 'pix',
    paidAt: '2026-01-15T10:32:00Z'
  },
  {
    id: 'pay_1002',
    invoiceId: 'inv_1002',
    businessName: 'Advocacia Fraterna',
    amount: 588.00,
    status: 'paid',
    method: 'credit_card',
    paidAt: '2026-02-01T14:48:00Z'
  },
  {
    id: 'pay_1003_pending',
    invoiceId: 'inv_1003',
    businessName: 'Padaria Pão da Cidade',
    amount: 588.00,
    status: 'pending',
    method: 'pix'
  },
  {
    id: 'pay_1004_failed',
    invoiceId: 'inv_1004',
    businessName: 'Esquadro & Compasso Construtora',
    amount: 2388.00,
    status: 'failed',
    method: 'bank_slip'
  }
];
