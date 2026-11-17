import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---- Simulações: sessão do administrador, perfil, banco (cliente de serviço) e Auth ----
const ACTOR = '11111111-1111-4111-8111-111111111111';
const TARGET = '22222222-2222-4222-8222-222222222222';
const TENANT = '33333333-3333-4333-8333-333333333333';

let actorRole = 'master';
const tables: Record<string, any> = {};
const inserts: Array<{ table: string; row: any }> = [];
const updates: Array<{ table: string; values: any; filters: any }> = [];
const authCalls = { updateUserById: vi.fn(), resetPasswordForEmail: vi.fn(), getUserById: vi.fn() };
const rpcMock = vi.fn();
const deletes: Array<{ table: string; filters: any }> = [];
let insertError: { message: string } | null = null;

vi.mock('next/headers', () => ({ headers: async () => new Headers({ host: 'www.conexaomaconica.com.br' }) }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/lib/admin/admin-tenant-context', () => ({
  resolveCanonicalAdminTenant: async () => {
    if (actorRole === 'anonimo') throw new Error('UNAUTHORIZED: Sessão expirada.');
    return { user: { id: ACTOR }, tenantId: TENANT, supabase: {}, host: 'x' };
  },
}));
vi.mock('@/lib/member/profile-access-service', () => ({
  getProfileAuthorization: async () => ({ id: ACTOR, role: actorRole, tenant_id: TENANT, status: 'active' }),
}));

function query(table: string) {
  const state: any = { filters: {} };
  const api: any = {
    select: () => api,
    in: (k: string, v: unknown) => { state.filters[k] = v; return api; },
    not: () => api,
    delete: () => ({ eq: (k: string, v: unknown) => { deletes.push({ table, filters: { [k]: v } }); return Promise.resolve({ error: null }); } }),
    eq: (k: string, v: unknown) => { state.filters[k] = v; return api; },
    ilike: (k: string, v: unknown) => { state.filters[`ilike:${k}`] = v; return api; },
    order: () => api,
    range: () => api,
    limit: () => api,
    maybeSingle: async () => {
      const spec = tables[table];
      const data = typeof spec === 'function' ? spec(state.filters) : spec;
      return { data: Array.isArray(data) ? data[0] ?? null : data ?? null, error: null };
    },
    insert: async (row: any) => { inserts.push({ table, row }); return { error: table === 'profiles' ? insertError : null }; },
    update: (values: any) => { updates.push({ table, values, filters: state.filters }); return { eq: (k: string, v: unknown) => { state.filters[k] = v; return Promise.resolve({ error: null }); } }; },
    then: (resolve: (v: unknown) => unknown) => {
      const spec = tables[table];
      const data = typeof spec === 'function' ? spec(state.filters) : spec;
      return resolve({ data: data ?? [], error: null, count: Array.isArray(data) ? data.length : 0 });
    },
  };
  return api;
}

vi.mock('@/lib/auth/account-temp-password-admin', () => ({
  getAccountAdminClient: () => ({
    from: (t: string) => query(t),
    rpc: (...a: unknown[]) => rpcMock(...a),
    auth: { resetPasswordForEmail: authCalls.resetPasswordForEmail, admin: { updateUserById: authCalls.updateUserById, getUserById: authCalls.getUserById } },
  }),
}));

import {
  createMissingProfileAction,
  listAccountsAction,
  listAccountsMissingProfileAction,
  sendAccountPasswordResetAction,
  setAccountBlockedAction,
  setAccountTemporaryPasswordAction,
  updateAccountProfileAction,
} from '../src/lib/admin/admin-accounts-service';

const authUser = (o: Record<string, unknown> = {}) => ({
  id: TARGET, email: 'dono@optica.com.br', last_sign_in_at: '2026-11-18T10:00:00Z', banned_until: null,
  app_metadata: { provider: 'email' }, user_metadata: { name: 'Maria' }, ...o,
});

beforeEach(() => {
  actorRole = 'master';
  inserts.length = 0; updates.length = 0; deletes.length = 0; insertError = null;
  rpcMock.mockReset().mockResolvedValue({ error: null });
  for (const k of Object.keys(tables)) delete tables[k];
  tables.profiles = (f: any) => (f.id === TARGET ? [{ id: TARGET, name: 'Maria Souza', email: 'dono@optica.com.br', phone: '75999990000', role: 'member', created_at: '2026-10-01T00:00:00Z' }] : []);
  tables.commercial_representatives = null;
  authCalls.updateUserById.mockReset().mockResolvedValue({ error: null });
  authCalls.resetPasswordForEmail.mockReset().mockResolvedValue({ error: null });
  authCalls.getUserById.mockReset().mockResolvedValue({ data: { user: authUser() } });
});

const audits = () => inserts.filter((i) => i.table === 'admin_audit_logs').map((i) => i.row);

describe('quem pode usar a tela (autorização no servidor)', () => {
  it('somente master e admin; os demais perfis, inclusive administrativos, são recusados em TODAS as ações', async () => {
    for (const role of ['member', 'anunciante', 'finance', 'moderator', 'editor', 'socio_admin', '']) {
      actorRole = role;
      const results = await Promise.all([
        listAccountsAction(),
        sendAccountPasswordResetAction(TARGET),
        setAccountTemporaryPasswordAction(TARGET),
        updateAccountProfileAction(TARGET, { name: 'Nome Novo' }),
        setAccountBlockedAction(TARGET, true, 'motivo'),
      ]);
      for (const r of results) expect(r.success, `${role}`).toBe(false);
    }
    expect(authCalls.updateUserById).not.toHaveBeenCalled();
    expect(authCalls.resetPasswordForEmail).not.toHaveBeenCalled();
    expect(audits()).toHaveLength(0);
  });

  it('sem sessão: recusado', async () => {
    actorRole = 'anonimo';
    expect((await listAccountsAction()).success).toBe(false);
  });

  it('master e admin passam', async () => {
    for (const role of ['master', 'admin']) {
      actorRole = role;
      expect((await listAccountsAction()).success, role).toBe(true);
    }
  });
});

describe('quais contas podem ser gerenciadas', () => {
  it('contas administrativas (master, admin, etc.) não podem ser alvo, nem por master', async () => {
    for (const role of ['master', 'admin', 'superadmin', 'finance', 'socio_admin']) {
      tables.profiles = [{ id: TARGET, name: 'Admin', email: 'a@x.com', role }];
      const r = await setAccountTemporaryPasswordAction(TARGET);
      expect(r.success, role).toBe(false);
    }
    expect(authCalls.updateUserById).not.toHaveBeenCalled();
  });

  it('ninguém altera a própria conta por esta tela', async () => {
    tables.profiles = [{ id: ACTOR, role: 'member' }];
    for (const r of await Promise.all([setAccountTemporaryPasswordAction(ACTOR), setAccountBlockedAction(ACTOR, true, 'abc'), sendAccountPasswordResetAction(ACTOR)])) {
      expect(r.success).toBe(false);
    }
    expect(authCalls.updateUserById).not.toHaveBeenCalled();
  });

  it('conta inexistente ou identificador inválido: erro sem efeito', async () => {
    tables.profiles = [];
    expect((await sendAccountPasswordResetAction(TARGET)).success).toBe(false);
    expect((await sendAccountPasswordResetAction('')).success).toBe(false);
  });
});

describe('senha temporária', () => {
  it('gera a senha no servidor, marca a troca obrigatória com validade e devolve a senha UMA vez', async () => {
    const r = await setAccountTemporaryPasswordAction(TARGET);
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.temporaryPassword.length).toBeGreaterThanOrEqual(12);
    expect(r.hours).toBe(72);
    const [id, payload] = authCalls.updateUserById.mock.calls[0]!;
    expect(id).toBe(TARGET);
    expect(payload.password).toBe(r.temporaryPassword);
    expect(payload.app_metadata.account_must_change_password).toBe(true);
    expect(typeof payload.app_metadata.account_temp_password_expires_at).toBe('string');
    expect(payload.app_metadata.provider).toBe('email'); // preserva o restante do app_metadata
  });

  it('a senha NUNCA aparece na auditoria', async () => {
    const r = await setAccountTemporaryPasswordAction(TARGET);
    if (!r.success) throw new Error('falhou');
    const log = audits();
    expect(log).toHaveLength(1);
    expect(log[0].action).toBe('ACCOUNT_TEMP_PASSWORD_SET');
    expect(log[0].entity_id).toBe(TARGET);
    expect(log[0].actor_id).toBe(ACTOR);
    expect(JSON.stringify(log[0])).not.toContain(r.temporaryPassword);
    expect(JSON.stringify(log[0])).not.toMatch(/password"\s*:\s*"[^"]/i);
  });

  it('cada chamada gera uma senha diferente', async () => {
    const a = await setAccountTemporaryPasswordAction(TARGET);
    const b = await setAccountTemporaryPasswordAction(TARGET);
    if (!a.success || !b.success) throw new Error('falhou');
    expect(a.temporaryPassword).not.toBe(b.temporaryPassword);
  });

  it('conta de representante comercial é recusada (o módulo comercial gerencia essa senha)', async () => {
    tables.commercial_representatives = [{ id: 'rep-1' }];
    const r = await setAccountTemporaryPasswordAction(TARGET);
    expect(r.success).toBe(false);
    expect(authCalls.updateUserById).not.toHaveBeenCalled();
  });

  it('falha do Auth não vaza senha nem registra auditoria de sucesso', async () => {
    authCalls.updateUserById.mockResolvedValue({ error: { message: 'boom' } });
    const r = await setAccountTemporaryPasswordAction(TARGET);
    expect(r.success).toBe(false);
    expect(JSON.stringify(r)).not.toMatch(/temporaryPassword/);
    expect(audits()).toHaveLength(0);
  });
});

describe('e-mail de redefinição', () => {
  it('envia para o e-mail de LOGIN da conta e não devolve link algum ao administrador', async () => {
    const r = await sendAccountPasswordResetAction(TARGET);
    expect(r.success).toBe(true);
    expect(authCalls.resetPasswordForEmail).toHaveBeenCalledWith('dono@optica.com.br', { redirectTo: 'https://www.conexaomaconica.com.br/auth/callback?next=/update-password' });
    expect(JSON.stringify(r)).not.toMatch(/token|link|http/i);
    expect(audits()[0].action).toBe('ACCOUNT_RESET_EMAIL_SENT');
  });

  it('falha de envio (SMTP) devolve mensagem útil e não audita sucesso', async () => {
    authCalls.resetPasswordForEmail.mockResolvedValue({ error: { message: 'smtp' } });
    const r = await sendAccountPasswordResetAction(TARGET);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/SMTP/i);
    expect(audits()).toHaveLength(0);
  });
});

describe('editar nome e telefone', () => {
  it('valida os campos, não mexe em e-mail/perfil/papel e audita só os NOMES dos campos', async () => {
    expect((await updateAccountProfileAction(TARGET, { name: 'ab' })).success).toBe(false);
    expect((await updateAccountProfileAction(TARGET, { name: 'Maria Souza', phone: '123' })).success).toBe(false);
    expect(updates).toHaveLength(0);

    const r = await updateAccountProfileAction(TARGET, { name: 'Maria S. Souza', phone: '(75) 98888-7777' });
    expect(r.success).toBe(true);
    expect(updates).toHaveLength(1);
    expect(Object.keys(updates[0]!.values).sort()).toEqual(['name', 'phone']);
    const log = audits();
    expect(log[0].action).toBe('ACCOUNT_PROFILE_UPDATED');
    expect(log[0].after_value).toEqual({ fields: ['name', 'phone'] });
    expect(JSON.stringify(log[0])).not.toContain('Maria S. Souza');
  });

  it('sem mudança: não grava nem audita', async () => {
    const r = await updateAccountProfileAction(TARGET, { name: 'Maria Souza', phone: '75999990000' });
    expect(r.success).toBe(true);
    expect(updates).toHaveLength(0);
    expect(audits()).toHaveLength(0);
  });
});

describe('bloquear e reativar', () => {
  it('bloquear exige motivo e usa o bloqueio real do Auth; reativar remove o bloqueio', async () => {
    expect((await setAccountBlockedAction(TARGET, true, '')).success).toBe(false);
    expect((await setAccountBlockedAction(TARGET, true, 'ab')).success).toBe(false);
    expect(authCalls.updateUserById).not.toHaveBeenCalled();

    expect((await setAccountBlockedAction(TARGET, true, 'Uso indevido da conta')).success).toBe(true);
    expect(authCalls.updateUserById).toHaveBeenLastCalledWith(TARGET, { ban_duration: '876000h' });
    expect(audits()[0]).toMatchObject({ action: 'ACCOUNT_BLOCKED', reason: 'Uso indevido da conta' });

    expect((await setAccountBlockedAction(TARGET, false)).success).toBe(true);
    expect(authCalls.updateUserById).toHaveBeenLastCalledWith(TARGET, { ban_duration: 'none' });
    expect(audits()[1]).toMatchObject({ action: 'ACCOUNT_UNBLOCKED', reason: null });
  });
});

describe('listagem', () => {
  const rows = [{ id: TARGET, name: 'Maria Souza', email: 'perfil@x.com', phone: '75999990000', role: 'member', created_at: '2026-10-01T00:00:00Z' }];

  it('mostra login, empresas (dono e equipe), bloqueio e troca de senha pendente', async () => {
    tables.profiles = rows;
    tables.businesses = (f: any) => (f.owner_id ? [{ id: 'b1', name: 'Óptica Circulô', slug: 'optica', owner_id: TARGET }] : [{ id: 'b2', name: 'Padaria', slug: 'padaria' }]);
    tables.business_members = [{ business_id: 'b2', user_id: TARGET, role: 'manager' }];
    authCalls.getUserById.mockResolvedValue({
      data: { user: authUser({ banned_until: new Date(Date.now() + 86_400_000).toISOString(), app_metadata: { account_must_change_password: true, account_temp_password_expires_at: new Date(Date.now() + 3_600_000).toISOString() } }) },
    });
    const r = await listAccountsAction();
    expect(r.success).toBe(true);
    if (!r.success) return;
    const item = r.items[0]!;
    expect(item.loginEmail).toBe('dono@optica.com.br'); // e-mail do ACESSO, não o do perfil
    expect(item.blocked).toBe(true);
    expect(item.passwordChange).toBe('pending');
    expect(item.passwordChangeKind).toBe('conta');
    expect(item.businesses.map((b) => `${b.name}:${b.relation}`).sort()).toEqual(['Padaria:equipe', 'Óptica Circulô:dono']);
  });

  it('a lista nunca traz contas administrativas (filtro por perfil member/anunciante na consulta)', async () => {
    let usedRoles: unknown;
    tables.profiles = (f: any) => { usedRoles = f.role; return rows; };
    await listAccountsAction();
    expect(usedRoles).toEqual(['member', 'anunciante']);
  });

  it('busca sem resultado devolve lista vazia; busca saneia coringas', async () => {
    const seen: string[] = [];
    tables.profiles = (f: any) => { for (const k of Object.keys(f)) if (k.startsWith('ilike:')) seen.push(String(f[k])); return []; };
    tables.businesses = [];
    const r = await listAccountsAction({ query: '  50%_off,(x)  ' });
    expect(r.success && r.items).toEqual([]);
    expect(seen.every((v) => !/[_,()]/.test(v.replace(/^%|%$/g, '')))).toBe(true);
  });
});

describe('contas sem perfil (cadastros antigos)', () => {
  const OWNER = '44444444-4444-4444-8444-444444444444';
  const TEAM = '55555555-5555-4555-8555-555555555555';
  const HAS_PROFILE = '66666666-6666-4666-8666-666666666666';

  const seed = () => {
    tables.businesses = (f: any) => {
      if (f.owner_id === OWNER) return [{ id: 'b1' }];
      if (f.id) return [{ id: 'b2', name: 'Padaria' }];
      return [{ id: 'b1', name: 'Óptica', owner_id: OWNER }, { id: 'b3', name: 'Clínica', owner_id: HAS_PROFILE }];
    };
    tables.business_members = (f: any) => (f.user_id === TEAM ? [{ id: 'm1' }] : [{ business_id: 'b2', user_id: TEAM }]);
    tables.profiles = (f: any) => {
      if (f.id === HAS_PROFILE || (Array.isArray(f.id) && f.id.includes(HAS_PROFILE))) return [{ id: HAS_PROFILE }];
      return [];
    };
    authCalls.getUserById.mockImplementation(async (id: string) => ({ data: { user: { id, email: id === OWNER ? 'dono@x.com' : 'equipe@x.com', user_metadata: { name: id === OWNER ? 'Dono Antigo' : 'Equipe' } } } }));
  };

  it('lista só quem é dono ou equipe de empresa e NÃO tem perfil (quem tem perfil fica de fora)', async () => {
    seed();
    const r = await listAccountsMissingProfileAction();
    expect(r.success).toBe(true);
    if (!r.success) return;
    const byId = Object.fromEntries(r.items.map((i) => [i.userId, i]));
    expect(Object.keys(byId).sort()).toEqual([OWNER, TEAM].sort());
    expect(byId[OWNER]).toMatchObject({ loginEmail: 'dono@x.com', name: 'Dono Antigo', relation: 'dono' });
    expect(byId[OWNER]!.businesses.map((b) => b.name)).toEqual(['Óptica']);
    expect(byId[TEAM]).toMatchObject({ relation: 'equipe' });
  });

  it('é protegida: só master e admin verificam ou corrigem', async () => {
    seed();
    for (const role of ['member', 'finance', 'editor']) {
      actorRole = role;
      expect((await listAccountsMissingProfileAction()).success, role).toBe(false);
      expect((await createMissingProfileAction(OWNER)).success, role).toBe(false);
    }
    expect(inserts.filter((i) => i.table === 'profiles')).toHaveLength(0);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('dono: cria o perfil como member (como o cadastro) e concede anunciante + vínculo com o tenant pela função do banco, com auditoria', async () => {
    seed();
    tables.profiles = [];
    const r = await createMissingProfileAction(OWNER);
    expect(r).toEqual({ success: true, role: 'anunciante' });
    const created = inserts.find((i) => i.table === 'profiles')!.row;
    expect(created).toMatchObject({ id: OWNER, email: 'dono@x.com', name: 'Dono Antigo', role: 'member', tenant_id: null });
    expect(rpcMock).toHaveBeenCalledWith('provision_authorized_tenant_membership', {
      p_user_id: OWNER, p_tenant_id: TENANT, p_profile_role: 'anunciante', p_membership_role: 'member',
      p_source: 'admin_advertiser_creation', p_created_by: ACTOR,
    });
    expect(audits()[0]).toMatchObject({ action: 'ACCOUNT_PROFILE_CREATED', entity_id: OWNER });
  });

  it('equipe (não dona): recebe perfil de membro', async () => {
    seed();
    tables.profiles = [];
    tables.businesses = (f: any) => (f.owner_id ? [] : [{ id: 'b2', name: 'Padaria' }]);
    expect(await createMissingProfileAction(TEAM)).toEqual({ success: true, role: 'member' });
    expect(rpcMock.mock.calls[0]![1].p_profile_role).toBe('member');
  });

  it('recusa quem não é dono nem equipe de empresa do tenant (não cria perfil para qualquer pessoa)', async () => {
    tables.profiles = [];
    tables.businesses = [];
    tables.business_members = [];
    const r = await createMissingProfileAction('77777777-7777-4777-8777-777777777777');
    expect(r.success).toBe(false);
    expect(inserts.filter((i) => i.table === 'profiles')).toHaveLength(0);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('recusa quem já tem perfil e a própria conta do administrador', async () => {
    seed();
    tables.profiles = [{ id: OWNER }];
    expect((await createMissingProfileAction(OWNER)).success).toBe(false);
    expect((await createMissingProfileAction(ACTOR)).success).toBe(false);
    expect(inserts.filter((i) => i.table === 'profiles')).toHaveLength(0);
  });

  it('se o vínculo com o tenant falhar, desfaz o perfil criado (nada fica pela metade) e não audita sucesso', async () => {
    seed();
    tables.profiles = [];
    rpcMock.mockResolvedValue({ error: { message: 'Perfil já associado a outro tenant' } });
    const r = await createMissingProfileAction(OWNER);
    expect(r.success).toBe(false);
    expect(deletes).toEqual([{ table: 'profiles', filters: { id: OWNER } }]);
    expect(audits()).toHaveLength(0);
  });

  it('falha ao inserir o perfil: não chama o provisionamento', async () => {
    seed();
    tables.profiles = [];
    insertError = { message: 'boom' };
    expect((await createMissingProfileAction(OWNER)).success).toBe(false);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
