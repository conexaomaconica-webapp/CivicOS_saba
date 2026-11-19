import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---- Banco simulado: contratos e snapshots por id; o envio de e-mail é interceptado ----
const BIZ = 'b0000000-0000-4000-8000-000000000001';
const TENANT = 't0000000-0000-4000-8000-000000000001';

type Contract = { id: string; status: string; tenant_id: string; created_at: string };
let contracts: Contract[] = [];
let snapshots: Record<string, { id: string; sha256_hash: string; template_title: string }> = {};
const inserted: Array<{ table: string; row: any }> = [];
const sendMock = vi.fn();

vi.mock('../src/lib/email/send-email', async () => {
  const actual = await vi.importActual<typeof import('../src/lib/email/send-email')>('../src/lib/email/send-email');
  return { ...actual, getEmailProvider: () => ({ name: 'hostinger', isConfigured: () => true, send: (...a: any[]) => sendMock(...a) }) };
});
vi.mock('../src/lib/admin/admin-auth-helper', () => ({ assertPlatformAdminAccess: async () => ({ supabase: {}, user: { id: 'admin-1' } }) }));
vi.mock('../src/lib/member/profile-access-service', () => ({ getInternalProfileDTO: async () => null }));

function db() {
  return {
    from(table: string) {
      const state: any = { filters: {}, op: 'select' };
      const api: any = {
        select: () => api,
        eq: (k: string, v: unknown) => { state.filters[k] = v; return api; },
        in: (k: string, v: unknown) => { state.filters[`in:${k}`] = v; return api; },
        gt: () => api,
        order: () => api,
        limit: () => api,
        insert: (row: any) => { inserted.push({ table, row }); state.op = 'insert'; state.row = row; return api; },
        update: () => api,
        single: async () => run(true),
        maybeSingle: async () => run(true),
        then: (resolve: (v: unknown) => unknown) => resolve(run(false)),
      };
      const run = (single: boolean) => {
        let data: any = [];
        if (table === 'businesses') data = { id: BIZ, tenant_id: TENANT, name: 'Empresa X', legal_name: 'Empresa X Ltda', cnpj: '1', email: 'x@x.com', owner_id: null, commercial_status: 'contrato_gerado' };
        else if (table === 'contracts') {
          // a mais recente primeiro (como a consulta real); lista completa ou apenas a primeira
          data = single ? contracts[0] ?? null : contracts;
        } else if (table === 'contract_snapshots') data = snapshots[String(state.filters.contract_id)] ?? null;
        else if (table === 'contract_email_dispatches') data = state.op === 'insert' ? { id: 'disp-1', ...state.row } : null;
        else if (table === 'business_onboarding_tokens') data = state.op === 'insert' ? { id: 'tok-1' } : null;
        else if (table === 'business_responsibles') data = { name: 'Maria Souza', email: 'maria@x.com' };
        return { data, error: null };
      };
      return api;
    },
  };
}

import { dispatchContractEmail } from '../src/lib/contracts/contract-email-service';

const contract = (id: string, status: string, created_at: string): Contract => ({ id, status, tenant_id: TENANT, created_at });
const snapshot = (id: string) => ({ id, sha256_hash: 'abc', template_title: 'Minuta' });

beforeEach(() => {
  inserted.length = 0;
  sendMock.mockReset().mockResolvedValue({ sent: true, status: 'accepted', provider: 'hostinger', providerMessageId: 'm1' });
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

const run = () => dispatchContractEmail({ businessId: BIZ, adminUserId: 'admin-1', dbClient: db() as any });

describe('envio do contrato por e-mail: escolha do contrato com snapshot', () => {
  it('contrato mais recente SEM snapshot, mas existe outro em aberto COM snapshot: usa o que tem snapshot', async () => {
    contracts = [contract('c-novo-orfao', 'draft', '2026-11-19T10:00:00Z'), contract('c-antigo', 'awaiting_signature', '2026-11-10T10:00:00Z')];
    snapshots = { 'c-antigo': snapshot('s-antigo') };
    const result = await run();
    expect(result.success).toBe(true);
    const token = inserted.find((i) => i.table === 'business_onboarding_tokens')!.row;
    expect(token).toMatchObject({ contract_id: 'c-antigo', snapshot_id: 's-antigo' });
  });

  it('entre os que têm snapshot, prefere o aguardando assinatura', async () => {
    contracts = [contract('c-orfao', 'draft', '2026-11-19T10:00:00Z'), contract('c-rascunho', 'draft', '2026-11-18T10:00:00Z'), contract('c-aguardando', 'awaiting_signature', '2026-11-10T10:00:00Z')];
    snapshots = { 'c-rascunho': snapshot('s-r'), 'c-aguardando': snapshot('s-a') };
    await run();
    expect(inserted.find((i) => i.table === 'business_onboarding_tokens')!.row.contract_id).toBe('c-aguardando');
  });

  it('o contrato mais recente TEM snapshot: continua usando ele (comportamento de sempre)', async () => {
    contracts = [contract('c-novo', 'draft', '2026-11-19T10:00:00Z'), contract('c-antigo', 'awaiting_signature', '2026-11-10T10:00:00Z')];
    snapshots = { 'c-novo': snapshot('s-novo'), 'c-antigo': snapshot('s-antigo') };
    await run();
    expect(inserted.find((i) => i.table === 'business_onboarding_tokens')!.row.contract_id).toBe('c-novo');
  });

  it('nenhum contrato em aberto tem snapshot: erro claro e nada é enviado nem gravado', async () => {
    contracts = [contract('c-1', 'draft', '2026-11-19T10:00:00Z'), contract('c-2', 'awaiting_signature', '2026-11-10T10:00:00Z')];
    snapshots = {};
    const result = await run();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Snapshot imutável do contrato não localizado/);
    expect(sendMock).not.toHaveBeenCalled();
    expect(inserted.filter((i) => i.table === 'business_onboarding_tokens')).toHaveLength(0);
  });

  it('empresa sem nenhum contrato em aberto: mantém a mensagem de antes', async () => {
    contracts = [];
    const result = await run();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Nenhum contrato aguardando assinatura/);
  });
});
