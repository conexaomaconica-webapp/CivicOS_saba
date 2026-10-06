import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashInviteToken } from '../src/lib/onboarding/signup-invite-core';

const TOKEN = 'a'.repeat(64);
let invite: any;
const updateSpy = vi.fn();
const deleteSpy = vi.fn();

vi.mock('../src/lib/payment/asaas-secrets', () => ({
  encryptSecret: (text: string) => `enc:${text}`,
  decryptSecret: (cipher: string) => (cipher?.startsWith('enc:') ? cipher.slice(4) : ''),
}));
vi.mock('../src/lib/tenant/tenant-brand', () => ({ resolveTenantBrandContext: vi.fn().mockResolvedValue({ appName: 'Conexão', primaryColor: '#5d1523' }) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ host: 'localhost:3000' }) }));
vi.mock('../src/lib/admin/admin-tenant-context', () => ({ resolveCanonicalAdminTenant: vi.fn() }));
vi.mock('../src/lib/admin/admin-advertiser-create-service', () => ({ createAdminAdvertiserAction: vi.fn() }));
vi.mock('../src/lib/admin/admin-businesses-service', () => ({ upsertAdminMasonicLinkAction: vi.fn() }));
vi.mock('../src/lib/supabase/service-role', () => ({
  createServiceRoleClient: () => ({
    from: () => {
      const builder: any = {
        select: () => builder,
        eq: (col: string, value: unknown) => {
          if (col === 'token_hash') builder._hashMatches = value === hashInviteToken(TOKEN);
          return builder;
        },
        or: () => builder,
        order: () => builder,
        limit: async () => ({ data: [], error: null }),
        delete: () => { deleteSpy(); return builder; },
        insert: async () => ({ data: null, error: null }),
        update: (payload: unknown) => { updateSpy(payload); builder._updating = true; return builder; },
        maybeSingle: async () => {
          if (builder._updating) return { data: invite?.status === 'sent' ? { id: invite.id } : null, error: null };
          // consulta por token (hash errado = não achou) ou por id (admin)
          return { data: builder._hashMatches === false ? null : invite, error: null };
        },
      };
      return builder;
    },
  }),
}));

import { resolveCanonicalAdminTenant } from '../src/lib/admin/admin-tenant-context';
import { deleteSignupInviteAction, getSignupInviteByTokenAction, getSignupInviteLinkAction, submitSignupInviteAction } from '../src/lib/onboarding/signup-invite-service';

const form = {
  responsibleName: 'Maria da Silva', responsibleEmail: 'maria@exemplo.com', tradingName: 'Padaria Pão Nosso',
  legalName: 'Pão Nosso Ltda', document: '11222333000181', categoryId: 'c1', city: 'Feira de Santana', state: 'BA',
  masonicRelation: 'mason', referenceMasonName: 'João', lodgeName: 'Loja X', potency: 'GOB', consent: true,
};
const future = () => new Date(Date.now() + 86_400_000).toISOString();

describe('convite de cadastro — ações públicas', () => {
  beforeEach(() => {
    updateSpy.mockClear();
    deleteSpy.mockClear();
    invite = { id: 'inv-1', tenant_id: 't1', status: 'sent', expires_at: future(), invited_name: null, invited_email: null };
  });

  it('token malformado ou desconhecido é inválido', async () => {
    expect((await getSignupInviteByTokenAction('abc')).state).toBe('invalid');
    expect((await getSignupInviteByTokenAction('b'.repeat(64))).state).toBe('invalid');
  });

  it('convite válido abre; expirado, enviado e revogado não', async () => {
    expect((await getSignupInviteByTokenAction(TOKEN)).state).toBe('valid');
    invite.expires_at = new Date(Date.now() - 1000).toISOString();
    expect((await getSignupInviteByTokenAction(TOKEN)).state).toBe('expired');
    invite = { ...invite, status: 'submitted', expires_at: future() };
    expect((await getSignupInviteByTokenAction(TOKEN)).state).toBe('submitted');
    invite.status = 'revoked';
    expect((await getSignupInviteByTokenAction(TOKEN)).state).toBe('invalid');
  });

  it('envio válido grava só os dados cadastrais e muda para "submitted"', async () => {
    const res = await submitSignupInviteAction(TOKEN, { ...form, planCode: 'acacia', commercial_status: 'publicado', status: 'converted' });
    expect(res.success).toBe(true);
    const payload: any = updateSpy.mock.calls[0]![0];
    expect(payload.status).toBe('submitted');
    expect(payload.submitted_data).not.toHaveProperty('planCode');
    expect(payload.submitted_data).not.toHaveProperty('commercial_status');
  });

  it('segundo envio com o mesmo link é recusado (uso único)', async () => {
    invite.status = 'submitted';
    const res = await submitSignupInviteAction(TOKEN, form);
    expect(res.success).toBe(false);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('link expirado ou dados inválidos não gravam nada', async () => {
    invite.expires_at = new Date(Date.now() - 1000).toISOString();
    expect((await submitSignupInviteAction(TOKEN, form)).success).toBe(false);
    invite.expires_at = future();
    expect((await submitSignupInviteAction(TOKEN, { ...form, consent: false })).success).toBe(false);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('campo-isca preenchido finge sucesso e não grava', async () => {
    const res = await submitSignupInviteAction(TOKEN, { ...form, website2: 'http://spam' });
    expect(res.success).toBe(true);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('admin reabre o MESMO link de um convite ativo (código guardado cifrado)', async () => {
    (resolveCanonicalAdminTenant as any).mockResolvedValue({ user: { id: 'admin-1' }, tenantId: 't1' });
    invite = { ...invite, id: 'inv-1', invited_name: 'Maria', encrypted_code: 'enc:ABCDEFGH2345' };
    const res = await getSignupInviteLinkAction('inv-1');
    expect(res.success).toBe(true);
    expect(res.url).toMatch(/\/c\/ABCDEFGH2345$/);
    expect(res.message).toContain('Olá, Maria!');
    expect(res.message).toContain(res.url!);
  });

  it('convite antigo (sem código guardado), usado ou expirado não devolve link', async () => {
    (resolveCanonicalAdminTenant as any).mockResolvedValue({ user: { id: 'admin-1' }, tenantId: 't1' });
    invite = { ...invite, id: 'inv-1', encrypted_code: null };
    expect((await getSignupInviteLinkAction('inv-1')).error).toMatch(/Gerar novo link/);
    invite = { ...invite, encrypted_code: 'enc:ABCDEFGH2345', status: 'submitted' };
    expect((await getSignupInviteLinkAction('inv-1')).success).toBe(false);
    invite = { ...invite, status: 'sent', expires_at: new Date(Date.now() - 1000).toISOString() };
    expect((await getSignupInviteLinkAction('inv-1')).success).toBe(false);
  });

  it('admin exclui o convite de vez, em qualquer situação', async () => {
    (resolveCanonicalAdminTenant as any).mockResolvedValue({ user: { id: 'admin-1' }, tenantId: 't1' });
    for (const status of ['sent', 'submitted', 'revoked', 'converted']) {
      deleteSpy.mockClear();
      invite = { ...invite, id: 'inv-1', status, invited_email: 'a@b.com', business_id: null };
      const res = await deleteSignupInviteAction('inv-1');
      expect(res.success).toBe(true);
      expect(deleteSpy).toHaveBeenCalledTimes(1);
    }
  });
});
