'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Ban, Copy, KeyRound, Loader2, Mail, Pencil, Search, ShieldCheck, UserX } from 'lucide-react';
import { systemConfirm, systemNotify } from '@/components/system/SystemFeedback';
import {
  createMissingProfileAction,
  listAccountsAction,
  listAccountsMissingProfileAction,
  sendAccountPasswordResetAction,
  setAccountBlockedAction,
  setAccountTemporaryPasswordAction,
  updateAccountProfileAction,
} from '@/lib/admin/admin-accounts-service';
import type { AccountListItem, AccountMissingProfile } from '@/types/admin-accounts';

const dateFmt = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const ROLE_LABEL: Record<string, string> = { member: 'Membro', anunciante: 'Anunciante' };

function PasswordChangeBadge({ item }: { item: AccountListItem }) {
  if (item.passwordChange === 'none') return <span className="text-[11px] text-stone-400">—</span>;
  const who = item.passwordChangeKind === 'representante' ? ' (representante)' : '';
  return item.passwordChange === 'pending' ? (
    <span className="inline-flex rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">Troca pendente{who}</span>
  ) : (
    <span className="inline-flex rounded-full border border-rose-300 bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-900">Senha temporária expirada{who}</span>
  );
}

export default function AccountsClient() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AccountListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editing, setEditing] = useState<AccountListItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const [blocking, setBlocking] = useState<AccountListItem | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [blockError, setBlockError] = useState<string | null>(null);

  const [revealed, setRevealed] = useState<{ name: string; email: string; password: string; hours: number } | null>(null);
  const [copied, setCopied] = useState(false);

  // Contas sem perfil (cadastros antigos): verificação sob demanda, para não pesar a cada carregamento da página.
  const [missing, setMissing] = useState<AccountMissingProfile[] | null>(null);
  const [checkingMissing, setCheckingMissing] = useState(false);
  const [missingError, setMissingError] = useState<string | null>(null);

  const requestSeq = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(query); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    const res = await listAccountsAction({ query: debounced, page });
    if (seq !== requestSeq.current) return; // resposta antiga: ignora
    if (res.success) {
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } else {
      setItems([]);
      setError(res.error);
    }
    setLoading(false);
  }, [debounced, page]);

  useEffect(() => { void load(); }, [load]);

  const notify = (ok: boolean, message: string) => systemNotify({ type: ok ? 'success' : 'danger', message });

  const sendReset = async (item: AccountListItem) => {
    if (!(await systemConfirm({ message: `Enviar o e-mail de redefinição de senha para ${item.loginEmail}? A pessoa receberá um link para criar uma nova senha.` }))) return;
    setBusyId(item.id);
    const res = await sendAccountPasswordResetAction(item.id);
    setBusyId(null);
    notify(res.success, res.success ? res.message : res.error);
  };

  const setTempPassword = async (item: AccountListItem) => {
    if (!(await systemConfirm({
      message: `Definir uma NOVA senha temporária para ${item.name || item.loginEmail}? A senha atual deixa de funcionar e a pessoa será obrigada a trocá-la no próximo acesso.`,
      danger: true,
    }))) return;
    setBusyId(item.id);
    const res = await setAccountTemporaryPasswordAction(item.id);
    setBusyId(null);
    if (!res.success) { notify(false, res.error); return; }
    setCopied(false);
    setRevealed({ name: item.name || item.loginEmail, email: item.loginEmail, password: res.temporaryPassword, hours: res.hours });
    void load();
  };

  const openEdit = (item: AccountListItem) => {
    setEditing(item);
    setEditName(item.name);
    setEditPhone(item.phone ?? '');
    setEditError(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setBusyId(editing.id);
    setEditError(null);
    const res = await updateAccountProfileAction(editing.id, { name: editName, phone: editPhone });
    setBusyId(null);
    if (!res.success) { setEditError(res.error); return; }
    setEditing(null);
    notify(true, 'Dados da conta atualizados.');
    void load();
  };

  const toggleBlock = async (item: AccountListItem) => {
    if (item.blocked) {
      if (!(await systemConfirm({ message: `Reativar o acesso de ${item.name || item.loginEmail}?` }))) return;
      setBusyId(item.id);
      const res = await setAccountBlockedAction(item.id, false);
      setBusyId(null);
      notify(res.success, res.success ? 'Acesso reativado.' : res.error);
      if (res.success) void load();
      return;
    }
    setBlocking(item);
    setBlockReason('');
    setBlockError(null);
  };

  const confirmBlock = async () => {
    if (!blocking) return;
    setBusyId(blocking.id);
    setBlockError(null);
    const res = await setAccountBlockedAction(blocking.id, true, blockReason);
    setBusyId(null);
    if (!res.success) { setBlockError(res.error); return; }
    setBlocking(null);
    notify(true, 'Acesso bloqueado.');
    void load();
  };

  const checkMissing = async () => {
    setCheckingMissing(true);
    setMissingError(null);
    const res = await listAccountsMissingProfileAction();
    setCheckingMissing(false);
    if (res.success) setMissing(res.items);
    else setMissingError(res.error);
  };

  const fixMissing = async (account: AccountMissingProfile) => {
    const label = account.name || account.loginEmail || account.userId;
    if (!(await systemConfirm({
      message: `Criar o perfil de ${label}? ${account.relation === 'dono' ? 'Como a conta é dona de empresa, receberá o papel de anunciante e o vínculo com a plataforma.' : 'A conta é equipe de empresa e receberá o perfil de membro.'}`,
    }))) return;
    setBusyId(account.userId);
    const res = await createMissingProfileAction(account.userId);
    setBusyId(null);
    notify(res.success, res.success ? 'Perfil criado. A conta já aparece na lista.' : res.error);
    if (res.success) {
      setMissing((current) => (current ? current.filter((m) => m.userId !== account.userId) : current));
      void load();
    }
  };

  const copyPassword = async () => {
    if (!revealed) return;
    try {
      await navigator.clipboard.writeText(revealed.password);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const btn = 'inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-stone-800 transition hover:border-[#C9A227] disabled:cursor-not-allowed disabled:opacity-50';
  const field = 'mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm';

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6 text-left">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Administração</span>
        <h1 className="mt-1 font-serif text-2xl font-bold text-stone-900 md:text-3xl">Contas de anunciantes e membros</h1>
        <p className="mt-1 max-w-3xl text-xs font-medium leading-relaxed text-stone-600">
          Consulte o acesso das contas, envie a redefinição de senha, defina uma senha temporária, edite nome e telefone ou bloqueie o acesso.
          Contas administrativas não aparecem aqui. Todas as ações ficam registradas na auditoria.
        </p>
      </div>

      <div className="relative">
        <label htmlFor="busca-contas" className="sr-only">Buscar por e-mail, nome ou empresa</label>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
        <input
          id="busca-contas"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={80}
          placeholder="Buscar por e-mail, nome ou empresa"
          className="w-full rounded-xl border border-stone-300 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-[#C9A227] focus:outline-none focus:ring-2 focus:ring-[#C9A227]/30"
        />
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-900">{error}</div>}

      <section aria-labelledby="sem-perfil" className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="sem-perfil" className="text-sm font-bold text-stone-900">Contas sem perfil</h2>
            <p className="text-xs text-stone-500">Cadastros antigos que são donos ou equipe de empresas, mas ficaram sem perfil. Sem perfil a conta não aparece na lista abaixo nem pode ser gerenciada.</p>
          </div>
          <button type="button" className={btn} disabled={checkingMissing} onClick={() => void checkMissing()}>
            {checkingMissing ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Search className="h-3.5 w-3.5" aria-hidden="true" />} Verificar contas sem perfil
          </button>
        </div>
        {missingError && <div role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-sm font-semibold text-rose-900">{missingError}</div>}
        {missing && missing.length === 0 && <p className="mt-3 text-xs font-semibold text-emerald-800">Nenhuma conta sem perfil encontrada.</p>}
        {missing && missing.length > 0 && (
          <ul className="mt-3 divide-y divide-stone-100">
            {missing.map((m) => (
              <li key={m.userId} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-stone-900">{m.name || '(sem nome)'} <span className="font-normal text-stone-500">· {m.loginEmail || 'sem e-mail'}</span></p>
                  <p className="text-xs text-stone-600">
                    {m.relation === 'dono' ? 'Dono de' : 'Equipe de'}: {m.businesses.map((b) => b.name).filter(Boolean).join(', ') || '—'}
                  </p>
                </div>
                <button type="button" className={btn} disabled={busyId === m.userId} onClick={() => void fixMissing(m)}>
                  {busyId === m.userId ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />} Criar perfil
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs font-semibold text-stone-500" role="status" aria-live="polite">
        {loading ? 'Carregando…' : `${total} ${total === 1 ? 'conta' : 'contas'}${debounced ? ' encontradas' : ''}${totalPages > 1 ? ` · página ${page} de ${totalPages}` : ''}`}
      </p>

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-xs">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-[11px] font-bold uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">Conta</th>
              <th className="px-4 py-3">Empresas</th>
              <th className="px-4 py-3">Situação</th>
              <th className="px-4 py-3">Último acesso</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {!loading && items.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-stone-500">Nenhuma conta encontrada.</td></tr>
            )}
            {items.map((item) => {
              const busy = busyId === item.id;
              return (
                <tr key={item.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-bold text-stone-900">{item.name || '(sem nome)'}</p>
                    <p className="text-xs text-stone-600">{item.loginEmail}</p>
                    {item.phone && <p className="text-xs text-stone-500">{item.phone}</p>}
                    <p className="mt-1 text-[11px] text-stone-400">{ROLE_LABEL[item.role] ?? item.role}</p>
                  </td>
                  <td className="px-4 py-3">
                    {item.businesses.length === 0 ? (
                      <span className="text-xs text-stone-400">Sem empresa</span>
                    ) : (
                      <ul className="space-y-1">
                        {item.businesses.map((b) => (
                          <li key={`${b.id}-${b.relation}`} className="text-xs text-stone-800">
                            <span className="font-semibold">{b.name}</span>{' '}
                            <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-stone-600">{b.relation === 'dono' ? 'Dono' : `Equipe${b.teamRole ? ` · ${b.teamRole}` : ''}`}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1.5">
                      {item.blocked ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-900"><Ban className="h-3 w-3" aria-hidden="true" /> Bloqueada</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-900"><ShieldCheck className="h-3 w-3" aria-hidden="true" /> Ativa</span>
                      )}
                      <div><PasswordChangeBadge item={item} /></div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-600">{dateFmt(item.lastSignInAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" className={btn} disabled={busy} onClick={() => void sendReset(item)}><Mail className="h-3.5 w-3.5" aria-hidden="true" /> Enviar redefinição</button>
                      <button type="button" className={btn} disabled={busy} onClick={() => void setTempPassword(item)}><KeyRound className="h-3.5 w-3.5" aria-hidden="true" /> Senha temporária</button>
                      <button type="button" className={btn} disabled={busy} onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Editar</button>
                      <button type="button" className={`${btn} ${item.blocked ? '' : 'text-rose-800'}`} disabled={busy} onClick={() => void toggleBlock(item)}>
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <UserX className="h-3.5 w-3.5" aria-hidden="true" />}
                        {item.blocked ? 'Reativar' : 'Bloquear'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav aria-label="Paginação das contas" className="flex items-center justify-center gap-3">
          <button type="button" className={btn} disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</button>
          <span className="text-xs font-semibold text-stone-600">Página {page} de {totalPages}</span>
          <button type="button" className={btn} disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>Próxima</button>
        </nav>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="editar-conta">
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="editar-conta" className="font-serif text-lg font-bold text-stone-900">Editar conta</h2>
            <p className="text-xs text-stone-500">E-mail de login: <strong>{editing.loginEmail}</strong> (não é alterado por esta tela).</p>
            {editError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-sm font-semibold text-rose-900">{editError}</div>}
            <label className="block text-xs font-bold text-stone-700">Nome completo
              <input className={field} value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={120} />
            </label>
            <label className="block text-xs font-bold text-stone-700">Telefone
              <input className={field} value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="(75) 99999-9999" maxLength={30} />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className={btn} onClick={() => setEditing(null)}>Cancelar</button>
              <button type="button" className="rounded-lg bg-[#3B0B14] px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50" disabled={busyId === editing.id} onClick={() => void saveEdit()}>
                {busyId === editing.id ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {blocking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="bloquear-conta">
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="bloquear-conta" className="font-serif text-lg font-bold text-stone-900">Bloquear acesso</h2>
            <p className="text-sm text-stone-700">{blocking.name || blocking.loginEmail} não conseguirá mais entrar nem renovar a sessão até você reativar o acesso.</p>
            {blockError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-sm font-semibold text-rose-900">{blockError}</div>}
            <label className="block text-xs font-bold text-stone-700">Motivo (fica na auditoria)
              <textarea className={field} rows={3} value={blockReason} onChange={(e) => setBlockReason(e.target.value)} maxLength={300} />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className={btn} onClick={() => setBlocking(null)}>Cancelar</button>
              <button type="button" className="rounded-lg bg-rose-800 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50" disabled={busyId === blocking.id} onClick={() => void confirmBlock()}>
                {busyId === blocking.id ? 'Bloqueando…' : 'Bloquear acesso'}
              </button>
            </div>
          </div>
        </div>
      )}

      {revealed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="senha-temporaria">
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="senha-temporaria" className="font-serif text-lg font-bold text-stone-900">Senha temporária definida</h2>
            <p className="text-sm text-stone-700">Repasse a senha abaixo a <strong>{revealed.name}</strong> ({revealed.email}) por um canal seguro.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 select-all break-all rounded-xl border border-[#C9A227] bg-[#FDFBF7] px-3 py-3 text-center font-mono text-lg font-bold tracking-wider text-[#3B0B14]">{revealed.password}</code>
              <button type="button" className={btn} onClick={() => void copyPassword()}><Copy className="h-3.5 w-3.5" aria-hidden="true" /> {copied ? 'Copiada' : 'Copiar'}</button>
            </div>
            <div role="note" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
              Esta senha aparece <strong>somente agora</strong> e não é guardada em nenhum lugar. Ela vale por {revealed.hours} horas e, no primeiro acesso, a pessoa será obrigada a criar uma nova senha.
              Se perder, defina outra.
            </div>
            <div className="flex justify-end">
              <button type="button" className="rounded-lg bg-[#3B0B14] px-4 py-1.5 text-xs font-bold text-white" onClick={() => { setRevealed(null); setCopied(false); }}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
