import { describe, it, expect, vi } from 'vitest';
import {
  getApprovalDirectoryListAction,
  getApprovalDossierAction,
  requestBusinessCorrectionAction,
  finalizeApprovalDecisionAction,
} from '../src/lib/admin/admin-approval-service';

vi.mock('../src/lib/supabase/server', () => ({
  createServerSideClient: vi.fn().mockImplementation(() => {
    return Promise.resolve({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'businesses') {
          return {
            select: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: '00000000-0000-0000-0000-000000000001',
                tenant_id: '00000000-0000-0000-0000-000000000010',
                name: 'Comandos - Terceirização e Segurança Eletrônica',
                category: 'Segurança Eletrônica & Terceirização',
                publication_status: 'pending_review',
                owner_id: 'owner-1',
                plan_code: 'ouro',
                logo_url: '/logo.png',
                banner_url: '/banner.jpg',
                description: 'Empresa pioneira em segurança eletrônica.',
              },
              error: null,
            }),
          };
        }
        if (table === 'admin_audit_logs') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
      rpc: vi.fn().mockImplementation((fnName: string) => {
        if (fnName === 'get_admin_approval_directory_list') {
          return Promise.resolve({
            data: [
              {
                id: '00000000-0000-0000-0000-000000000001',
                tenant_id: '00000000-0000-0000-0000-000000000010',
                name: 'Comandos - Terceirização e Segurança Eletrônica',
                category: 'Segurança Eletrônica & Terceirização',
                publication_status: 'pending_review',
                owner_email: 'contato@comandosseguranca.com.br',
                owner_name: 'Eduardo Comandos',
                plan_code: 'ouro',
                created_at: new Date().toISOString(),
                is_founder: true,
                is_pedra_fundamental: true,
                is_coluna_honra: true,
                has_responsible: true,
                has_business_data: true,
                has_masonic_link: true,
                has_signed_contract: true,
                has_valid_payment: true,
                is_ready_for_approval: true,
                completeness_percent: 92,
              },
            ],
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      }),
    });
  }),
}));

vi.mock('../src/lib/notifications/notification-service', () => ({
  dispatchNotificationAction: vi.fn().mockResolvedValue({ success: true, notificationId: 'notif-1' }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Central de Aprovações Refinamento (/admin/aprovacoes)', () => {
  it('1. Fila de Aprovações com contadores de chips e KPIs superiores', async () => {
    const res = await getApprovalDirectoryListAction('todos');
    expect(res.success).toBe(true);
    expect(res.counts).toBeDefined();
    expect(res.counts?.ready).toBe(1);
    expect(res.counts?.pendingReview).toBe(1);
  });

  it('2. Dossiê 360º com Resumo Executivo e Dual Checklist', async () => {
    const res = await getApprovalDossierAction('00000000-0000-0000-0000-000000000001');
    expect(res.success).toBe(true);
    expect(res.dossier?.completeness.mandatory.signed_contract).toBe(true);
    expect(res.dossier?.completeness.recommended_quality.logo).toBe(true);
  });

  it('3. Fluxo de Solicitação de Correção com categoria de motivo rápido', async () => {
    const res = await requestBusinessCorrectionAction(
      '00000000-0000-0000-0000-000000000001',
      'Por favor envie logomarca com fundo transparente.',
      'Logo inadequada'
    );
    expect(res.success).toBe(true);
  });

  it('4. Confirmação Final de Aprovação e Publicação', async () => {
    const res = await finalizeApprovalDecisionAction('00000000-0000-0000-0000-000000000001', 'publish');
    expect(res.success).toBe(true);
  });
});
