'use client';

import React, { useCallback, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { Scroll, ArrowLeft, Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import {
  clearPotenciesAction,
  deleteCatalogPotenciesAction,
  getPotencyOverviewAction,
  mergePotenciesAction,
  saveCatalogPotencyAction,
  type CatalogPotency,
  type PotencyUsage,
} from '@/lib/admin/admin-potencies-service';

type Feedback = { tone: 'ok' | 'error'; text: string } | null;

export default function AdminPotenciasPage() {
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [usage, setUsage] = useState<PotencyUsage[]>([]);
  const [catalog, setCatalog] = useState<CatalogPotency[]>([]);
  const [totalLodges, setTotalLodges] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [filter, setFilter] = useState('');
  const [selUsage, setSelUsage] = useState<Set<string>>(new Set());
  const [selCatalog, setSelCatalog] = useState<Set<string>>(new Set());
  const [mergeTo, setMergeTo] = useState('');
  const [mergeName, setMergeName] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogPotency | null>(null);
  const [name, setName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');

  const load = useCallback(async () => {
    const res = await getPotencyOverviewAction();
    if (res.success) {
      setUsage(res.usage);
      setCatalog(res.catalog);
      setTotalLodges(res.totalLodges);
    } else {
      setFeedback({ tone: 'error', text: res.error || 'Não foi possível carregar.' });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const run = (fn: () => Promise<{ success: boolean; error?: string }>, okText: (r: any) => string, after?: () => void) => {
    setFeedback(null);
    startTransition(async () => {
      const res: any = await fn();
      if (res.success) {
        setFeedback({ tone: 'ok', text: okText(res) });
        after?.();
        await load();
      } else {
        setFeedback({ tone: 'error', text: res.error || 'Operação não concluída.' });
      }
    });
  };

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, key: string) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setter(next);
  };

  const visibleUsage = usage.filter((u) => !filter.trim() || u.label.toLowerCase().includes(filter.trim().toLowerCase()));
  const allUsageSelected = visibleUsage.length > 0 && visibleUsage.every((u) => selUsage.has(u.value));
  const selectedLodges = usage.filter((u) => selUsage.has(u.value)).reduce((sum, u) => sum + u.count, 0);
  const selectedForClear = [...selUsage].filter((v) => v !== '__empty__');

  const doMerge = () =>
    run(
      () => mergePotenciesAction({ from: [...selUsage], to: mergeTo, name: mergeName }),
      (r) =>
        `${r.moved} loja(s) movida(s) para ${mergeTo.trim().toUpperCase()}.` +
        (r.skipped ? ` ${r.skipped} não foram movidas por já existir loja com o mesmo número nessa potência.` : ''),
      () => {
        setSelUsage(new Set());
        setMergeTo('');
        setMergeName('');
      },
    );

  const doClear = () =>
    run(
      () => clearPotenciesAction({ values: selectedForClear }),
      (r) => `Potência removida de ${r.cleared} loja(s).`,
      () => {
        setSelUsage(new Set());
        setConfirmClear(false);
      },
    );

  const openModal = (item?: CatalogPotency) => {
    setEditing(item || null);
    setName(item?.name || '');
    setAbbreviation(item?.abbreviation || '');
    setModalOpen(true);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    run(
      () => saveCatalogPotencyAction({ id: editing?.id, name, abbreviation }),
      () => 'Potência salva no catálogo.',
      () => setModalOpen(false),
    );
  };

  const field = 'rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-900';

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando potências...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/lojas" className="flex items-center gap-1 text-xs font-bold text-stone-600 hover:text-amber-900">
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar para Lojas Maçônicas</span>
      </Link>

      <div className="bg-white p-6 rounded-2xl border shadow-2xs">
        <h1 className="text-2xl font-serif font-bold text-gray-900 flex items-center gap-2">
          <Scroll className="w-6 h-6 text-amber-900" />
          <span>Potências Maçônicas (Obediências)</span>
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Mostra o que está realmente gravado nas {totalLodges.toLocaleString('pt-BR')} lojas. Selecione variações (ex.: CMSB/BA, CMSB/RJ) para unificar
          numa só, ou remover a potência das lojas. Nenhuma loja é excluída por aqui.
        </p>
      </div>

      {feedback && (
        <div
          role={feedback.tone === 'error' ? 'alert' : 'status'}
          className={`rounded-lg border px-3 py-2 text-sm ${feedback.tone === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}
        >
          {feedback.text}
        </div>
      )}

      {/* Potências em uso nas lojas */}
      <section className="bg-white border rounded-2xl p-5 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif font-bold text-lg text-gray-900">Em uso nas lojas ({usage.length})</h2>
          <input className={`${field} w-56`} placeholder="Filtrar potências…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>

        {selUsage.size > 0 && (
          <div className="rounded-xl border border-[#C9A227]/50 bg-[#3B0B14] p-3 text-white space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <strong>{selUsage.size} potência(s) · {selectedLodges.toLocaleString('pt-BR')} loja(s)</strong>
              <button type="button" onClick={() => setSelUsage(new Set())} className="ml-auto text-xs underline text-white/80">Limpar seleção</button>
            </div>
            <div className="flex flex-wrap items-end gap-2 rounded-lg bg-white p-3 text-stone-800">
              <label className="text-xs font-semibold">
                Unificar em (sigla)
                <input className={`${field} mt-1 block uppercase`} value={mergeTo} onChange={(e) => setMergeTo(e.target.value)} placeholder="ex.: CMSB" maxLength={40} />
              </label>
              <label className="text-xs font-semibold">
                Nome completo (se for nova)
                <input className={`${field} mt-1 block w-64`} value={mergeName} onChange={(e) => setMergeName(e.target.value)} placeholder="ex.: Grande Loja Maçônica - CMSB" maxLength={80} />
              </label>
              <button
                type="button"
                disabled={pending || !mergeTo.trim()}
                onClick={doMerge}
                className="rounded-lg bg-[#4B161B] px-4 py-1.5 text-sm font-bold text-white hover:bg-[#3B0B14] disabled:opacity-40"
              >
                Unificar / renomear
              </button>
              {selectedForClear.length > 0 && !confirmClear && (
                <button type="button" onClick={() => setConfirmClear(true)} className="rounded-lg bg-rose-700 px-4 py-1.5 text-sm font-bold text-white hover:bg-rose-600">
                  Remover potência das lojas…
                </button>
              )}
              {confirmClear && (
                <span className="flex items-center gap-2 text-xs text-rose-700">
                  Deixar {selectedLodges.toLocaleString('pt-BR')} loja(s) sem potência?
                  <button type="button" disabled={pending} onClick={doClear} className="rounded-lg bg-rose-700 px-3 py-1 font-bold text-white disabled:opacity-50">Confirmar</button>
                  <button type="button" onClick={() => setConfirmClear(false)} className="underline">Cancelar</button>
                </span>
              )}
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            <p className="text-[11px] text-white/80">
              Lojas que já têm o mesmo número na potência de destino não são movidas (a base não aceita duplicar potência + número); elas são contadas no aviso.
            </p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-[560px] w-full text-left text-xs">
            <thead>
              <tr className="bg-stone-50 border-b text-stone-700 font-bold uppercase">
                <th className="w-10 p-3">
                  <input
                    type="checkbox"
                    aria-label="Selecionar todas"
                    checked={allUsageSelected}
                    onChange={() => setSelUsage(allUsageSelected ? new Set() : new Set(visibleUsage.map((u) => u.value)))}
                  />
                </th>
                <th className="p-3">Valor gravado</th>
                <th className="p-3">Interpretado como</th>
                <th className="p-3 text-right">Lojas</th>
                <th className="p-3">No catálogo</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibleUsage.map((u) => (
                <tr key={u.value} className={selUsage.has(u.value) ? 'bg-amber-50/60' : 'hover:bg-stone-50'}>
                  <td className="p-3"><input type="checkbox" aria-label={`Selecionar ${u.label}`} checked={selUsage.has(u.value)} onChange={() => toggle(selUsage, setSelUsage, u.value)} /></td>
                  <td className="p-3 font-bold text-amber-900">{u.label}</td>
                  <td className="p-3 text-stone-600">{u.canonical && u.canonical !== u.value ? u.canonical : '—'}</td>
                  <td className="p-3 text-right font-semibold">{u.count.toLocaleString('pt-BR')}</td>
                  <td className="p-3">{u.in_catalog ? <span className="text-emerald-700">Sim</span> : <span className="text-stone-400">Não</span>}</td>
                </tr>
              ))}
              {visibleUsage.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-stone-500">Nenhuma potência encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Catálogo */}
      <section className="bg-white border rounded-2xl p-5 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif font-bold text-lg text-gray-900">Catálogo de potências ({catalog.length})</h2>
          <div className="flex gap-2">
            {selCatalog.size > 0 && (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (!confirm(`Excluir ${selCatalog.size} potência(s) do catálogo? As lojas mantêm o texto da potência.`)) return;
                  run(() => deleteCatalogPotenciesAction({ ids: [...selCatalog] }), (r) => `${r.deleted} potência(s) excluída(s) do catálogo.`, () => setSelCatalog(new Set()));
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-700 px-4 py-2 text-xs font-bold text-white hover:bg-rose-600 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" /> Excluir {selCatalog.size} selecionada(s)
              </button>
            )}
            <button onClick={() => openModal()} className="flex items-center gap-1.5 bg-[#3b0b14] text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-[#5d1523]">
              <Plus className="w-4 h-4" /> Nova Potência
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[640px] w-full text-left text-xs">
            <thead>
              <tr className="bg-stone-50 border-b text-stone-700 font-bold uppercase">
                <th className="w-10 p-3">
                  <input
                    type="checkbox"
                    aria-label="Selecionar todas do catálogo"
                    checked={catalog.length > 0 && catalog.every((c) => selCatalog.has(c.id))}
                    onChange={() => setSelCatalog(catalog.every((c) => selCatalog.has(c.id)) ? new Set() : new Set(catalog.map((c) => c.id)))}
                  />
                </th>
                <th className="p-3">Sigla</th>
                <th className="p-3">Nome completo</th>
                <th className="p-3 text-right">Lojas</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {catalog.map((p) => (
                <tr key={p.id} className={selCatalog.has(p.id) ? 'bg-amber-50/60' : 'hover:bg-stone-50'}>
                  <td className="p-3"><input type="checkbox" aria-label={`Selecionar ${p.abbreviation}`} checked={selCatalog.has(p.id)} onChange={() => toggle(selCatalog, setSelCatalog, p.id)} /></td>
                  <td className="p-3 font-bold text-amber-900">{p.abbreviation}</td>
                  <td className="p-3 font-semibold text-gray-900">{p.name}</td>
                  <td className="p-3 text-right">{p.lodges.toLocaleString('pt-BR')}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => openModal(p)} className="p-1.5 text-stone-600 hover:text-amber-900 hover:bg-stone-100 rounded-lg" aria-label={`Editar ${p.abbreviation}`}>
                      <Edit className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {catalog.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-stone-500">Catálogo vazio. As potências em uso nas lojas aparecem na tabela acima.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="font-serif font-bold text-lg text-gray-900">{editing ? 'Editar Potência' : 'Nova Potência Maçônica'}</h3>
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">Sigla / Abreviação *</label>
                <input value={abbreviation} onChange={(e) => setAbbreviation(e.target.value)} placeholder="Ex: GOB, CMSB, COMAB" className="w-full px-3 py-2 border rounded-xl text-xs text-gray-900 bg-stone-50 uppercase font-bold" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">Nome Completo *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Grande Oriente do Brasil" className="w-full px-3 py-2 border rounded-xl text-xs text-gray-900 bg-stone-50 font-semibold" required />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl">Cancelar</button>
                <button type="submit" disabled={pending} className="bg-[#3b0b14] text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-[#5d1523] disabled:opacity-50">
                  {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
