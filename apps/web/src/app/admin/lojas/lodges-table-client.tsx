'use client';

import React, { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, Trash2, Loader2, X } from 'lucide-react';
import {
  bulkDeleteLodgesAction,
  bulkUpdateLodgesAction,
  type AdminLodgeRow,
  type BulkPatch,
  type LodgeListFilters,
} from '@/lib/admin/admin-lodges-list-service';

type Props = {
  items: AdminLodgeRow[];
  total: number;
  filters: LodgeListFilters;
};

type Feedback = { tone: 'ok' | 'error'; text: string } | null;

export function LodgesTableClient({ items, total, filters }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [allMatching, setAllMatching] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [patch, setPatch] = useState({
    visibility: '',
    featured: '',
    showAddress: '',
    showMaster: '',
    potency: '',
    rite: '',
    state: '',
    city: '',
    logo: '',
    clearLogo: false,
  });

  // A seleção vale só para a página atual; trocar de página/filtro (novos itens) a reinicia.
  const pageKey = useMemo(() => items.map((i) => i.id).join(','), [items]);
  React.useEffect(() => {
    setSelected(new Set());
    setAllMatching(false);
  }, [pageKey]);

  const allOnPage = items.length > 0 && items.every((i) => selected.has(i.id));
  const count = allMatching ? total : selected.size;
  const scope = allMatching
    ? { allMatching: true, filters, expectedCount: total }
    : { ids: Array.from(selected) };

  const toggleAll = () => {
    setAllMatching(false);
    setSelected(allOnPage ? new Set() : new Set(items.map((i) => i.id)));
  };
  const toggleOne = (id: string) => {
    setAllMatching(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const run = (fn: () => Promise<{ success: boolean; error?: string }>, okText: string, after?: () => void) => {
    setFeedback(null);
    startTransition(async () => {
      const result = await fn();
      if (result.success) {
        setFeedback({ tone: 'ok', text: okText });
        setSelected(new Set());
        setAllMatching(false);
        after?.();
        router.refresh();
      } else {
        setFeedback({ tone: 'error', text: result.error || 'Operação não concluída.' });
      }
    });
  };

  const quick = (p: BulkPatch, label: string) =>
    run(() => bulkUpdateLodgesAction({ scope, patch: p }), `${label}: ${count} loja(s) atualizada(s).`);

  const tri = (v: string) => (v === 'true' ? true : v === 'false' ? false : undefined);

  const applyEdit = () => {
    const p: BulkPatch = {
      published: tri(patch.visibility),
      is_featured: tri(patch.featured),
      show_address: tri(patch.showAddress),
      show_worshipful_master: tri(patch.showMaster),
      potency: patch.potency.trim() || undefined,
      rite: patch.rite.trim() || undefined,
      state: patch.state.trim() || undefined,
      city: patch.city.trim() || undefined,
      logo_url: patch.clearLogo ? '' : patch.logo.trim() || undefined,
    };
    run(() => bulkUpdateLodgesAction({ scope, patch: p }), `Edição aplicada a ${count} loja(s).`, () => setEditOpen(false));
  };

  const applyDelete = () =>
    run(
      () => bulkDeleteLodgesAction({ scope, confirmation: confirmText }),
      `${count} loja(s) excluída(s).`,
      () => {
        setDeleteOpen(false);
        setConfirmText('');
      },
    );

  const expectedConfirm = allMatching ? `EXCLUIR ${total}` : 'EXCLUIR';
  const field = 'w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-800';
  const triSelect = (key: 'visibility' | 'featured' | 'showAddress' | 'showMaster', label: string, yes: string, no: string) => (
    <label className="text-xs font-semibold text-stone-600">
      {label}
      <select className={`${field} mt-1`} value={patch[key]} onChange={(e) => setPatch({ ...patch, [key]: e.target.value })}>
        <option value="">Não alterar</option>
        <option value="true">{yes}</option>
        <option value="false">{no}</option>
      </select>
    </label>
  );

  return (
    <div className="space-y-3">
      {feedback && (
        <div
          role={feedback.tone === 'error' ? 'alert' : 'status'}
          className={`rounded-lg border px-3 py-2 text-sm ${feedback.tone === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}
        >
          {feedback.text}
        </div>
      )}

      {count > 0 && (
        <div className="sticky top-2 z-20 rounded-xl border border-[#C9A227]/50 bg-[#3B0B14] p-3 text-white shadow-lg">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold">{count.toLocaleString('pt-BR')} selecionada(s)</span>
            {allOnPage && !allMatching && total > items.length && (
              <button type="button" onClick={() => setAllMatching(true)} className="text-xs underline text-[#E8D48A]">
                Selecionar as {total.toLocaleString('pt-BR')} lojas do filtro
              </button>
            )}
            {allMatching && (
              <button type="button" onClick={() => setAllMatching(false)} className="text-xs underline text-[#E8D48A]">
                Limitar à página
              </button>
            )}
            <span className="mx-1 hidden h-4 w-px bg-white/30 sm:block" />
            <button type="button" disabled={pending} onClick={() => quick({ published: true }, 'Publicadas')} className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold hover:bg-emerald-500 disabled:opacity-50">
              Publicar
            </button>
            <button type="button" disabled={pending} onClick={() => quick({ published: false }, 'Inativadas')} className="rounded-md bg-stone-600 px-2.5 py-1 text-xs font-semibold hover:bg-stone-500 disabled:opacity-50">
              Inativar
            </button>
            <button type="button" disabled={pending} onClick={() => { setEditOpen((v) => !v); setDeleteOpen(false); }} className="rounded-md bg-[#C9A227] px-2.5 py-1 text-xs font-bold text-[#1f1914] hover:bg-[#d8b33a] disabled:opacity-50">
              Editar em massa…
            </button>
            <button type="button" disabled={pending} onClick={() => { setDeleteOpen((v) => !v); setEditOpen(false); }} className="inline-flex items-center gap-1 rounded-md bg-rose-700 px-2.5 py-1 text-xs font-semibold hover:bg-rose-600 disabled:opacity-50">
              <Trash2 className="h-3.5 w-3.5" /> Excluir…
            </button>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            <button type="button" onClick={() => { setSelected(new Set()); setAllMatching(false); }} className="ml-auto inline-flex items-center gap-1 text-xs text-white/80 hover:text-white">
              <X className="h-3.5 w-3.5" /> Limpar seleção
            </button>
          </div>

          {editOpen && (
            <div className="mt-3 rounded-lg bg-white p-3 text-stone-800">
              <p className="mb-2 text-xs text-stone-500">Só os campos preenchidos serão alterados nas {count.toLocaleString('pt-BR')} loja(s).</p>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {triSelect('visibility', 'Publicação', 'Publicar no guia', 'Inativar')}
                {triSelect('featured', 'Destaque', 'Destacar', 'Remover destaque')}
                {triSelect('showAddress', 'Endereço público', 'Exibir', 'Ocultar')}
                {triSelect('showMaster', 'Venerável público', 'Exibir', 'Ocultar')}
                <label className="text-xs font-semibold text-stone-600">
                  Potência (sigla)
                  <input className={`${field} mt-1`} value={patch.potency} onChange={(e) => setPatch({ ...patch, potency: e.target.value })} placeholder="ex.: GOB" maxLength={40} />
                </label>
                <label className="text-xs font-semibold text-stone-600">
                  Rito
                  <input className={`${field} mt-1`} value={patch.rite} onChange={(e) => setPatch({ ...patch, rite: e.target.value })} placeholder="ex.: REAA" maxLength={60} />
                </label>
                <label className="text-xs font-semibold text-stone-600">
                  UF
                  <input className={`${field} mt-1 uppercase`} value={patch.state} onChange={(e) => setPatch({ ...patch, state: e.target.value })} placeholder="BA" maxLength={2} />
                </label>
                <label className="text-xs font-semibold text-stone-600">
                  Cidade
                  <input className={`${field} mt-1`} value={patch.city} onChange={(e) => setPatch({ ...patch, city: e.target.value })} maxLength={80} />
                </label>
                <label className="col-span-2 text-xs font-semibold text-stone-600 md:col-span-3">
                  URL do brasão/logo (https)
                  <input className={`${field} mt-1`} value={patch.logo} disabled={patch.clearLogo} onChange={(e) => setPatch({ ...patch, logo: e.target.value })} placeholder="https://..." />
                </label>
                <label className="flex items-end gap-2 pb-1.5 text-xs font-semibold text-stone-600">
                  <input type="checkbox" checked={patch.clearLogo} onChange={(e) => setPatch({ ...patch, clearLogo: e.target.checked })} /> Remover brasão
                </label>
              </div>
              <div className="mt-3 flex gap-2">
                <button type="button" disabled={pending} onClick={applyEdit} className="rounded-lg bg-[#4B161B] px-4 py-1.5 text-sm font-bold text-white hover:bg-[#3B0B14] disabled:opacity-50">
                  Aplicar a {count.toLocaleString('pt-BR')} loja(s)
                </button>
                <button type="button" onClick={() => setEditOpen(false)} className="rounded-lg border border-stone-300 px-4 py-1.5 text-sm">Cancelar</button>
              </div>
            </div>
          )}

          {deleteOpen && (
            <div className="mt-3 rounded-lg bg-white p-3 text-stone-800">
              <p className="text-sm font-semibold text-rose-700">
                Exclusão definitiva de {count.toLocaleString('pt-BR')} loja(s), com reuniões, contatos e mídias. Não há como desfazer.
              </p>
              <p className="mt-1 text-xs text-stone-500">
                Para confirmar, digite <strong>{expectedConfirm}</strong>.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <input className={`${field} max-w-xs`} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={expectedConfirm} />
                <button type="button" disabled={pending || confirmText.trim().toUpperCase() !== expectedConfirm} onClick={applyDelete} className="rounded-lg bg-rose-700 px-4 py-1.5 text-sm font-bold text-white hover:bg-rose-600 disabled:opacity-40">
                  Excluir definitivamente
                </button>
                <button type="button" onClick={() => { setDeleteOpen(false); setConfirmText(''); }} className="rounded-lg border border-stone-300 px-4 py-1.5 text-sm">Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="w-10 px-3 py-2">
                <input type="checkbox" aria-label="Selecionar todas da página" checked={allOnPage} onChange={toggleAll} />
              </th>
              <th className="px-3 py-2">Loja</th>
              <th className="px-3 py-2">Oriente/UF</th>
              <th className="px-3 py-2">Potência & Rito</th>
              <th className="px-3 py-2">Reunião</th>
              <th className="px-3 py-2">Brasão</th>
              <th className="px-3 py-2">Completude</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {items.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-stone-500">Nenhuma loja encontrada para os filtros atuais.</td>
              </tr>
            )}
            {items.map((l) => {
              const live = l.is_active && l.is_published;
              return (
                <tr key={l.id} className={selected.has(l.id) || allMatching ? 'bg-amber-50/60' : 'hover:bg-stone-50'}>
                  <td className="px-3 py-2">
                    <input type="checkbox" aria-label={`Selecionar ${l.name}`} checked={allMatching || selected.has(l.id)} onChange={() => toggleOne(l.id)} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-semibold text-stone-900">{l.name}</div>
                    <div className="text-xs text-stone-500">{l.code_number ? `Nº ${l.code_number}` : 'Sem número'}</div>
                  </td>
                  <td className="px-3 py-2">{l.city || '—'}{l.state ? `/${l.state}` : ''}</td>
                  <td className="px-3 py-2">
                    <div>{l.potency || '—'}</div>
                    <div className="text-xs text-stone-500">{l.rite || '—'}</div>
                  </td>
                  <td className="px-3 py-2 text-xs">{l.meeting || '—'}</td>
                  <td className="px-3 py-2 text-xs">
                    {l.has_logo ? <span className="text-emerald-700">Com brasão</span> : <span className="text-amber-700">Sem brasão</span>}
                    {!l.has_coords && <div className="text-rose-700">Sem coordenadas</div>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="h-1.5 w-20 rounded-full bg-stone-200">
                      <div className="h-1.5 rounded-full bg-[#C9A227]" style={{ width: `${l.completeness_percent}%` }} />
                    </div>
                    <span className="text-[11px] text-stone-500">{l.completeness_percent}%</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${live ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'}`}>
                      {live ? 'Publicada' : 'Inativa'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link href={`/admin/lojas/${l.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[#4B161B] hover:underline">
                      <Eye className="h-3.5 w-3.5" /> Abrir
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
