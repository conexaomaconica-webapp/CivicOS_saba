'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { Check, Handshake, ImageIcon, Loader2, Pencil, RotateCcw, Search, Trash2, X } from 'lucide-react';
import { systemConfirm } from '@/components/system/SystemFeedback';
import {
  deleteAdminConnectionAction,
  listAdminConnectionsAction,
  removeBusinessConnectionsAction,
  setAdminConnectionStatusAction,
  updateAdminConnectionAction,
} from '@/lib/admin/admin-connections-service';
import type { AdminConnectionList, AdminConnectionListItem, AdminConnectionStatus, AdminConnectionType } from '@/types/admin-connections';

const TYPE_LABEL: Record<AdminConnectionType, string> = { compra: 'Compra', servico: 'Serviço', parceria: 'Parceria', visita: 'Visita' };
const STATUS_LABEL: Record<AdminConnectionStatus, string> = { pendente: 'Pendente', confirmada: 'Confirmada', recusada: 'Recusada', removida: 'Removida' };
const STATUS_STYLE: Record<AdminConnectionStatus, string> = {
  pendente: 'bg-amber-100 text-amber-900',
  confirmada: 'bg-emerald-100 text-emerald-900',
  recusada: 'bg-stone-200 text-stone-700',
  removida: 'bg-rose-100 text-rose-900',
};
const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

type Edit = { id: string; connectionType: AdminConnectionType; itemDescription: string; message: string };

export function AllConnectionsClient({ initial, loadError }: { initial: AdminConnectionList | null; loadError: string | null }) {
  const [data, setData] = useState<AdminConnectionList | null>(initial);
  const [error, setError] = useState<string | null>(loadError);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState<AdminConnectionStatus | 'todas'>('todas');
  const [type, setType] = useState<AdminConnectionType | 'todos'>('todos');
  const [search, setSearch] = useState('');
  const [edit, setEdit] = useState<Edit | null>(null);

  const load = useCallback(async (page: number, next?: { status?: typeof status; type?: typeof type; search?: string }) => {
    setLoading(true);
    const res = await listAdminConnectionsAction({
      page,
      status: next?.status ?? status,
      type: next?.type ?? type,
      search: next?.search ?? search,
    });
    if (res.success) { setData(res); setError(null); } else setError(res.error);
    setLoading(false);
  }, [status, type, search]);

  const reloadCurrent = () => load(data?.page ?? 1);
  const report = (ok: boolean, text: string) => setMessage({ type: ok ? 'success' : 'error', text });

  const saveEdit = async () => {
    if (!edit) return;
    setBusyId(edit.id);
    const res = await updateAdminConnectionAction(edit.id, {
      connectionType: edit.connectionType,
      itemDescription: edit.itemDescription,
      message: edit.message,
    });
    setBusyId(null);
    if (res.success) { report(true, 'Conexão atualizada.'); setEdit(null); await reloadCurrent(); }
    else report(false, res.error);
  };

  const remove = async (item: AdminConnectionListItem) => {
    if (!(await systemConfirm({ message: `Remover do mural a conexão de ${item.business.name}? Ela deixa de aparecer para o público e de contar nos números. Dá para restaurar depois.`, danger: true, confirmLabel: 'Remover' }))) return;
    setBusyId(item.id);
    const res = await setAdminConnectionStatusAction(item.id, 'remover');
    setBusyId(null);
    if (res.success) { report(true, 'Conexão removida do mural.'); await reloadCurrent(); } else report(false, res.error);
  };

  const restore = async (item: AdminConnectionListItem) => {
    setBusyId(item.id);
    const res = await setAdminConnectionStatusAction(item.id, 'restaurar');
    setBusyId(null);
    if (res.success) { report(true, 'Conexão restaurada: voltou a aparecer no mural.'); await reloadCurrent(); } else report(false, res.error);
  };

  const approve = async (item: AdminConnectionListItem) => {
    if (!(await systemConfirm({ message: `Autorizar e publicar no mural a conexão de ${item.business.name} sem aguardar confirmação da empresa?`, confirmLabel: 'Autorizar e publicar' }))) return;
    setBusyId(item.id);
    const res = await setAdminConnectionStatusAction(item.id, 'aprovar');
    setBusyId(null);
    if (res.success) { report(true, 'Conexão autorizada e publicada no mural.'); await reloadCurrent(); } else report(false, res.error);
  };

  const destroy = async (item: AdminConnectionListItem) => {
    if (!(await systemConfirm({ message: `Excluir DEFINITIVAMENTE a conexão de ${item.business.name}? Isso não pode ser desfeito (curtidas e denúncias ligadas a ela também são apagadas). Se só quer esconder, use "Remover".`, danger: true, confirmLabel: 'Excluir definitivamente' }))) return;
    setBusyId(item.id);
    const res = await deleteAdminConnectionAction(item.id);
    setBusyId(null);
    if (res.success) { report(true, 'Conexão excluída.'); await reloadCurrent(); } else report(false, res.error);
  };

  const removeAllOfBusiness = async (item: AdminConnectionListItem) => {
    if (!(await systemConfirm({ message: `Remover do mural TODAS as conexões de ${item.business.name}? Use quando a empresa deixou de fazer parte. Cada uma pode ser restaurada depois, individualmente.`, danger: true, confirmLabel: 'Remover todas da empresa' }))) return;
    setBusyId(item.id);
    const res = await removeBusinessConnectionsAction(item.business.id);
    setBusyId(null);
    if (res.success) { report(true, `${res.removed} conexão(ões) de ${item.business.name} removida(s) do mural.`); await reloadCurrent(); } else report(false, res.error);
  };

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-serif text-2xl font-bold text-[#3B0B14]">
          <Handshake className="h-6 w-6 text-[#C9A227]" />
          Mural de Conexões · Todas as conexões
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Corrija textos, remova do mural conexões erradas ou de empresas que saíram, restaure ou exclua definitivamente. Toda alteração fica registrada na auditoria.
        </p>
        <nav className="mt-3 flex gap-2 text-sm font-semibold" aria-label="Seções do Mural de Conexões">
          <Link href="/admin/conexoes" className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-stone-700 hover:bg-stone-50">Moderação</Link>
          <span aria-current="page" className="rounded-lg bg-[#3B0B14] px-3 py-1.5 text-white">Todas as conexões</span>
        </nav>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
      {message && (
        <div role="status" className={`rounded-xl border p-3 text-sm ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {message.text}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); void load(1); }}
        className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-end"
      >
        <label className="flex-1 text-xs font-semibold text-stone-600">
          Buscar por empresa, membro (nome ou e-mail) ou produto
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ex.: Óptica Circulô" className="w-full rounded-xl border border-stone-300 py-2 pl-9 pr-3 text-sm font-normal text-stone-900" />
          </div>
        </label>
        <label className="text-xs font-semibold text-stone-600">
          Situação
          <select value={status} onChange={(e) => { const v = e.target.value as typeof status; setStatus(v); void load(1, { status: v }); }} className="mt-1 block rounded-xl border border-stone-300 px-3 py-2 text-sm font-normal text-stone-900">
            <option value="todas">Todas</option>
            {(Object.keys(STATUS_LABEL) as AdminConnectionStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-stone-600">
          Tipo
          <select value={type} onChange={(e) => { const v = e.target.value as typeof type; setType(v); void load(1, { type: v }); }} className="mt-1 block rounded-xl border border-stone-300 px-3 py-2 text-sm font-normal text-stone-900">
            <option value="todos">Todos</option>
            {(Object.keys(TYPE_LABEL) as AdminConnectionType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </select>
        </label>
        <button type="submit" className="rounded-xl bg-[#3B0B14] px-4 py-2 text-sm font-bold text-white hover:bg-[#4b161b]">Buscar</button>
      </form>

      <div className="flex items-center justify-between text-xs text-stone-500">
        <span>{data ? `${data.total} conexão(ões)` : ''}</span>
        {loading && <span className="flex items-center gap-1"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando…</span>}
      </div>

      {items.length === 0 && !loading ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">Nenhuma conexão encontrada com esses filtros.</div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const editing = edit?.id === item.id;
            const busy = busyId === item.id;
            return (
              <li key={item.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-stone-900">{item.business.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLE[item.status]}`}>{STATUS_LABEL[item.status]}</span>
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-700">{TYPE_LABEL[item.connectionType]}</span>
                      {(!item.business.active || !item.business.published) && (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-900">Empresa fora do ar</span>
                      )}
                      {item.hasPhoto && <span className="flex items-center gap-1 text-[11px] text-stone-500"><ImageIcon className="h-3.5 w-3.5" /> com foto</span>}
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                      Registrada por <strong className="text-stone-700">{item.member.name || 'Membro'}</strong>{item.member.email ? ` (${item.member.email})` : ''} em {dateFmt.format(new Date(item.createdAt))}
                      {item.confirmedAt ? ` · confirmada em ${dateFmt.format(new Date(item.confirmedAt))}` : ''}
                    </p>
                    {!editing && (item.itemDescription || item.message) && (
                      <p className="mt-2 text-sm text-stone-700">
                        {item.itemDescription && <strong>{item.itemDescription}</strong>}
                        {item.itemDescription && item.message ? ' — ' : ''}
                        {item.message}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" disabled={busy} onClick={() => setEdit({ id: item.id, connectionType: item.connectionType, itemDescription: item.itemDescription ?? '', message: item.message ?? '' })} className="flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"><Pencil className="h-3.5 w-3.5" /> Editar</button>
                    {item.status === 'pendente' && (
                      <button type="button" disabled={busy} onClick={() => void approve(item)} className="flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"><Check className="h-3.5 w-3.5" /> Autorizar e publicar no mural</button>
                    )}
                    {item.status === 'removida' ? (
                      <button type="button" disabled={busy || !item.confirmedAt} title={item.confirmedAt ? undefined : 'Nunca foi confirmada pela empresa'} onClick={() => void restore(item)} className="flex items-center gap-1 rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"><RotateCcw className="h-3.5 w-3.5" /> Restaurar</button>
                    ) : (
                      <button type="button" disabled={busy} onClick={() => void remove(item)} className="flex items-center gap-1 rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-50 disabled:opacity-50"><X className="h-3.5 w-3.5" /> Remover do mural</button>
                    )}
                    <button type="button" disabled={busy} onClick={() => void removeAllOfBusiness(item)} className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-50">Remover todas da empresa</button>
                    <button type="button" disabled={busy} onClick={() => void destroy(item)} className="flex items-center gap-1 rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-800 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /> Excluir</button>
                    {busy && <Loader2 className="h-4 w-4 animate-spin text-stone-500" />}
                  </div>
                </div>

                {editing && edit && (
                  <div className="mt-4 grid gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-stone-600">
                      Tipo
                      <select value={edit.connectionType} onChange={(e) => setEdit({ ...edit, connectionType: e.target.value as AdminConnectionType })} className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-normal text-stone-900">
                        {(Object.keys(TYPE_LABEL) as AdminConnectionType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-stone-600">
                      Produto ou serviço (até 160)
                      <input maxLength={160} value={edit.itemDescription} onChange={(e) => setEdit({ ...edit, itemDescription: e.target.value })} className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-normal text-stone-900" />
                    </label>
                    <label className="text-xs font-semibold text-stone-600 sm:col-span-2">
                      Comentário (até 400)
                      <textarea maxLength={400} rows={3} value={edit.message} onChange={(e) => setEdit({ ...edit, message: e.target.value })} className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-normal text-stone-900" />
                    </label>
                    <div className="flex gap-2 sm:col-span-2">
                      <button type="button" disabled={busy} onClick={() => void saveEdit()} className="rounded-lg bg-[#3B0B14] px-4 py-2 text-xs font-bold text-white hover:bg-[#4b161b] disabled:opacity-50">Salvar alterações</button>
                      <button type="button" onClick={() => setEdit(null)} className="rounded-lg border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-white">Cancelar</button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button type="button" disabled={loading || data.page <= 1} onClick={() => void load(data.page - 1)} className="rounded-lg border border-stone-300 px-3 py-1.5 disabled:opacity-40">Anterior</button>
          <span className="text-stone-600">Página {data.page} de {data.totalPages}</span>
          <button type="button" disabled={loading || data.page >= data.totalPages} onClick={() => void load(data.page + 1)} className="rounded-lg border border-stone-300 px-3 py-1.5 disabled:opacity-40">Próxima</button>
        </div>
      )}
    </div>
  );
}
