import { describe, it, expect, vi } from 'vitest';
import {
  getApprovalDirectoryListAction,
  getApprovalDossierAction,
  updateBusinessDataBeforeApprovalAction,
  updateBusinessMediaBeforeApprovalAction,
  validateMasonicLinkAction,
  requestBusinessCorrectionAction,
  finalizeApprovalDecisionAction,
} from '../src/lib/admin/admin-approval-service';

vi.mock('../src/lib/supabase/server', () => ({
  createServerSideClient: vi.fn().mockImplementation(() => {
    return Promise.resolve({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-user-id' } }, error: null }),
      },
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
        if (fnName === 'get_admin_approval_dossier_360') {
          return Promise.resolve({
            data: {
              business: { id: '00000000-0000-0000-0000-000000000001', tenant_id: '00000000-0000-0000-0000-000000000010', name: 'Comandos', category: 'Segurança', owner_id: 'owner-1', plan_code: 'ouro', logo_url: '/logo.png' },
              responsible: { full_name: 'Eduardo Comandos', email: 'contato@comandos.com.br' },
              masonic_affiliation: { verification_status: 'verified' },
              contract_snapshot: { id: 'contract-1', status: 'signed', sha256_hash: 'hash', plan_code: 'ouro' },
              subscription: { status: 'paid', plan_code: 'ouro' },
              recognitions: [], audit_logs: [], plan_entitlements: [],
              completeness: { percent: 100, is_ready_for_approval: true, requirements: [
                { id: 'req_responsible', label: 'Responsável Designado', satisfied: true, blocking: true },
                { id: 'req_business_data', label: 'Dados Cadastrais Mínimos', satisfied: true, blocking: true },
                { id: 'req_masonic_link', label: 'Vínculo Maçônico Verificado', satisfied: true, blocking: true },
                { id: 'req_contract', label: 'Assinatura Eletrônica (Contrato)', satisfied: true, blocking: true },
                { id: 'req_payment', label: 'Pagamento / Assinatura', satisfied: true, blocking: true },
              ] },
            }, error: null,
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

describe('Dossiê de Aprovação 360º (/admin/aprovacoes)', () => {
  it('1. Listagem de todas as solicitações com filtros de status e badge Pronto p/ Aprovação', async () => {
    const resAll = await getApprovalDirectoryListAction('todos');
    expect(resAll.success).toBe(true);
    expect(resAll.items.length).toBeGreaterThan(0);

    const item = resAll.items[0]!;
    expect(item.name).toContain('Comandos');
    expect(item.is_ready_for_approval).toBe(true);
    expect(item.completeness_percent).toBe(92);

    const resReady = await getApprovalDirectoryListAction('pronto_para_aprovacao');
    expect(resReady.items.length).toBe(1);
  });

  it('2. Busca de Dossiê 360º completo com Resumo Executivo, Mídias, Contrato e Pagamento', async () => {
    const res = await getApprovalDossierAction('00000000-0000-0000-0000-000000000001');
    expect(res.success).toBe(true);
    expect(res.dossier).toBeDefined();

    const d = res.dossier!;
    expect(d.company.name).toContain('Comandos');
    expect(d.responsible.full_name).toBeDefined();
    expect(d.contract.sha256_hash).toBeDefined();
    expect(d.payment.status).toBe('paid');
    expect(d.masonic_link.verification_status).toBe('verified');
  });

  it('3. Edição cadastral da empresa pré-aprovação com gravação de auditoria before/after', async () => {
    const res = await updateBusinessDataBeforeApprovalAction('00000000-0000-0000-0000-000000000001', {
      name: 'Comandos - Terceirização e Segurança Eletrônica Oficial',
      category: 'Segurança & Monitoramento 24h',
      description: 'Descrição padronizada pelo administrador pré-aprovação',
    });
    expect(res.success).toBe(true);
  });

  it('4. Atualização de mídias (Logo/Capa) pré-aprovação com gravação de auditoria', async () => {
    const res = await updateBusinessMediaBeforeApprovalAction('00000000-0000-0000-0000-000000000001', {
      logo_url: '/logo-oficial-comandos.png',
      banner_url: '/capa-oficial-comandos.jpg',
    });
    expect(res.success).toBe(true);
  });

  it('5. Validação de vínculo maçônico de forma independente da aprovação comercial', async () => {
    const res = await validateMasonicLinkAction('00000000-0000-0000-0000-000000000001', 'verified', 'Vínculo fraterno conferido');
    expect(res.success).toBe(true);
  });

  it('6. Solicitar Correção ao Anunciante gerando notificação transacional correction_requested', async () => {
    const res = await requestBusinessCorrectionAction(
      '00000000-0000-0000-0000-000000000001',
      'Por favor, envie o comprovante de endereço atualizado.'
    );
    expect(res.success).toBe(true);
  });

  it('7. Decisão final de Aprovação e Publicação', async () => {
    const res = await finalizeApprovalDecisionAction('00000000-0000-0000-0000-000000000001', 'publish', 'Aprovado após conferência completa');
    expect(res.success).toBe(true);
  });
});
