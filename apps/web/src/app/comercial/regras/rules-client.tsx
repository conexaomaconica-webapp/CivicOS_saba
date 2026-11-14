'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  approveRuleAction,
  createCategoryAction,
  createRuleDraftAction,
  deleteRuleDraftAction,
  retireRuleAction,
  setCategoryActiveAction,
  type CategoryItem,
  type CreateRuleInput,
  type RuleItem,
} from '@/lib/commercial/rules-service';
import { formatCentsBRL } from '@/lib/commercial/access-rules';

type Message = { type: 'success' | 'error'; text: string } | null;

const PLAN_LABEL: Record<string, string> = { esquadro: 'Esquadro', compasso: 'Compasso', acacia: 'Acácia' };
const STATUS_LABEL: Record<string, string> = { draft: 'Rascunho', active: 'Ativa', retired: 'Encerrada' };
const TYPE_LABEL: Record<string, string> = { initial: 'Inicial (1ª venda)', recurring: 'Recorrente (vendas seguintes)', renewal: 'Renovação' };

export default function RulesClient({
  categories,
  rules,
  representatives,
  loadError,
  canApprove,
}: {
  categories: CategoryItem[];
  rules: RuleItem[];
  representatives: Array<{ id: string; name: string }>;
  loadError: string | null;
  canApprove: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [cat, setCat] = useState({ code: '', name: '' });
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    ruleKind: 'plan_default' as CreateRuleInput['ruleKind'], categoryId: '', representativeId: '', planCode: '', commissionType: 'initial' as 'initial' | 'recurring',
    priority: '0', ratePercent: '', holdDays: '30', minBaseReais: '', maxCommissionReais: '', effectiveFrom: today, effectiveUntil: '', notes: '',
  });

  const run = async (fn: () => Promise<{ success: boolean; error?: string }>, okText: string, after?: () => void) => {
    setBusy(true);
    setMessage(null);
    const res = await fn();
    setMessage(res.success ? { type: 'success', text: okText } : { type: 'error', text: (res as { error: string }).error });
    if (res.success) { after?.(); router.refresh(); }
    setBusy(false);
  };

  const input = 'mt-1 w-full border border-stone-300 rounded-xl px-3 py-2 text-sm bg-white';
  const btn = 'px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer disabled:opacity-50';

  return (
    <div className="space-y-8">
      <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs p-3 space-y-1">
        <p><strong>Nenhuma regra vem pré-cadastrada.</strong> Sem regra ativa e aprovada, nenhuma comissão é gerada (o evento fica aguardando e pode ser reprocessado depois).</p>
        <p>Regras ativas não podem ser editadas: para mudar condições, encerre a regra e crie outra. Quem aprova precisa ser outra pessoa, diferente de quem criou. Precedência: regra do representante, depois da categoria, depois do plano; plano específico antes de &quot;qualquer plano&quot;; maior prioridade primeiro.</p>
      </div>

      {loadError && <p className="text-sm text-rose-700">{loadError}</p>}
      {message && (
        <div role="status" className={`p-3 rounded-xl text-sm font-semibold border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'}`}>{message.text}</div>
      )}

      <section aria-labelledby="cat-titulo" className="rounded-2xl border border-[#E8E5DF] bg-white p-6 space-y-4">
        <h2 id="cat-titulo" className="text-xl font-serif font-bold text-[#3B0B14]">Categorias de representante</h2>
        <form
          onSubmit={(e) => { e.preventDefault(); void run(() => createCategoryAction(cat), 'Categoria criada.', () => setCat({ code: '', name: '' })); }}
          className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end text-xs font-bold text-stone-700"
        >
          <label>Código (ex.: regional)<input className={input} value={cat.code} onChange={(e) => setCat((c) => ({ ...c, code: e.target.value }))} required /></label>
          <label>Nome<input className={input} value={cat.name} onChange={(e) => setCat((c) => ({ ...c, name: e.target.value }))} required /></label>
          <button type="submit" disabled={busy} className="px-4 py-2.5 bg-[#3B0B14] text-white rounded-xl text-sm cursor-pointer disabled:opacity-50">Criar categoria</button>
        </form>
        <ul className="divide-y divide-stone-100 text-sm">
          {categories.length === 0 && <li className="py-3 text-stone-500">Nenhuma categoria criada.</li>}
          {categories.map((c) => (
            <li key={c.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
              <span><strong>{c.name}</strong> <span className="font-mono text-xs text-stone-500">({c.code})</span> · {c.representatives} representante(s){!c.active && ' · inativa'}</span>
              <button disabled={busy} className={`${btn} bg-stone-100 border-stone-300`} onClick={() => run(() => setCategoryActiveAction({ categoryId: c.id, active: !c.active }), 'Categoria atualizada.')}>{c.active ? 'Desativar' : 'Ativar'}</button>
            </li>
          ))}
        </ul>
        <p className="text-xs text-stone-500">A categoria de cada representante é definida na tela de Representantes e vale apenas para comissões de vendas futuras.</p>
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(
            () => createRuleDraftAction({
              ruleKind: form.ruleKind, categoryId: form.categoryId || undefined, representativeId: form.representativeId || undefined, planCode: form.planCode || undefined,
              commissionType: form.commissionType, priority: Number(form.priority), ratePercent: Number(form.ratePercent), holdDays: Number(form.holdDays),
              minBaseReais: form.minBaseReais === '' ? undefined : Number(form.minBaseReais), maxCommissionReais: form.maxCommissionReais === '' ? undefined : Number(form.maxCommissionReais),
              effectiveFrom: form.effectiveFrom, effectiveUntil: form.effectiveUntil || undefined, notes: form.notes,
            }),
            'Rascunho criado. Peça a aprovação de outra pessoa para que a regra passe a valer.',
            () => setForm((f) => ({ ...f, ratePercent: '', notes: '' })),
          );
        }}
        className="rounded-2xl border border-[#E8E5DF] bg-white p-6 space-y-4"
      >
        <h2 className="text-xl font-serif font-bold text-[#3B0B14]">Nova regra de comissão (rascunho)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold text-stone-700">
          <label>Vale para
            <select className={input} value={form.ruleKind} onChange={(e) => setForm((f) => ({ ...f, ruleKind: e.target.value as CreateRuleInput['ruleKind'] }))}>
              <option value="plan_default">Padrão do plano (todos)</option>
              <option value="category_default">Uma categoria</option>
              <option value="representative_override">Um representante</option>
            </select>
          </label>
          {form.ruleKind === 'category_default' && (
            <label>Categoria
              <select className={input} value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} required>
                <option value="">Selecione</option>{categories.filter((c) => c.active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          )}
          {form.ruleKind === 'representative_override' && (
            <label>Representante
              <select className={input} value={form.representativeId} onChange={(e) => setForm((f) => ({ ...f, representativeId: e.target.value }))} required>
                <option value="">Selecione</option>{representatives.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </label>
          )}
          <label>Plano
            <select className={input} value={form.planCode} onChange={(e) => setForm((f) => ({ ...f, planCode: e.target.value }))}>
              <option value="">Qualquer plano</option>{Object.entries(PLAN_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label>Quando se aplica
            <select className={input} value={form.commissionType} onChange={(e) => setForm((f) => ({ ...f, commissionType: e.target.value as 'initial' | 'recurring' }))}>
              <option value="initial">Primeira venda do anunciante</option><option value="recurring">Pagamentos seguintes</option>
            </select>
          </label>
          <label>Taxa (%)<input type="number" step="0.01" min={0} max={100} className={input} value={form.ratePercent} onChange={(e) => setForm((f) => ({ ...f, ratePercent: e.target.value }))} required /></label>
          <label>Carência (dias)<input type="number" min={0} max={365} className={input} value={form.holdDays} onChange={(e) => setForm((f) => ({ ...f, holdDays: e.target.value }))} required /></label>
          <label>Prioridade<input type="number" min={0} className={input} value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} required /></label>
          <label>Valor mínimo do pagamento (R$, opcional)<input type="number" step="0.01" min={0} className={input} value={form.minBaseReais} onChange={(e) => setForm((f) => ({ ...f, minBaseReais: e.target.value }))} /></label>
          <label>Teto de comissão (R$, opcional)<input type="number" step="0.01" min={0} className={input} value={form.maxCommissionReais} onChange={(e) => setForm((f) => ({ ...f, maxCommissionReais: e.target.value }))} /></label>
          <label>Vigência: início<input type="date" className={input} value={form.effectiveFrom} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} required /></label>
          <label>Vigência: fim (opcional)<input type="date" className={input} value={form.effectiveUntil} onChange={(e) => setForm((f) => ({ ...f, effectiveUntil: e.target.value }))} /></label>
          <label className="md:col-span-3">Observações (opcional)<input className={input} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></label>
        </div>
        <button type="submit" disabled={busy} className="px-5 py-2.5 bg-[#3B0B14] text-white font-bold text-sm rounded-xl disabled:opacity-50 cursor-pointer">Criar rascunho</button>
      </form>

      <section aria-labelledby="regras-titulo" className="space-y-3">
        <h2 id="regras-titulo" className="text-xl font-serif font-bold text-[#3B0B14]">Regras ({rules.length})</h2>
        <div className="overflow-x-auto rounded-2xl border border-[#E8E5DF] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr><th className="px-4 py-3">Escopo</th><th className="px-4 py-3">Plano / tipo</th><th className="px-4 py-3">Condições</th><th className="px-4 py-3">Vigência</th><th className="px-4 py-3">Situação</th><th className="px-4 py-3">Ações</th></tr>
            </thead>
            <tbody>
              {rules.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-stone-500">Nenhuma regra cadastrada: ninguém recebe comissão até existir uma regra ativa.</td></tr>}
              {rules.map((r) => (
                <tr key={r.id} className="border-t border-stone-100 align-top">
                  <td className="px-4 py-3 font-semibold">{r.scope_label}</td>
                  <td className="px-4 py-3">{r.plan_code ? PLAN_LABEL[r.plan_code] : 'Qualquer plano'}<span className="block text-xs text-stone-500">{TYPE_LABEL[r.commission_type]}</span></td>
                  <td className="px-4 py-3 text-xs">
                    <strong className="text-sm">{(r.rate_bps / 100).toLocaleString('pt-BR')}%</strong> · carência {r.hold_days} d · prioridade {r.priority}
                    {r.min_base_cents > 0 && <span className="block">mínimo {formatCentsBRL(r.min_base_cents)}</span>}
                    {r.max_commission_cents && <span className="block">teto {formatCentsBRL(r.max_commission_cents)}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">{new Date(r.effective_from).toLocaleDateString('pt-BR')} → {r.effective_until ? new Date(r.effective_until).toLocaleDateString('pt-BR') : 'sem fim'}</td>
                  <td className="px-4 py-3 font-bold">{STATUS_LABEL[r.status]}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {r.status === 'draft' && canApprove && (
                        <button disabled={busy} className={`${btn} bg-emerald-700 text-white border-emerald-800`} onClick={() => { const reason = window.prompt('Justificativa da aprovação (mín. 10 caracteres):') ?? ''; if (reason.trim()) void run(() => approveRuleAction({ ruleId: r.id, reason }), 'Regra aprovada e ativa.'); }}>Aprovar</button>
                      )}
                      {r.status === 'draft' && (
                        <button disabled={busy} className={`${btn} bg-rose-50 text-rose-800 border-rose-200`} onClick={() => { if (window.confirm('Excluir este rascunho?')) void run(() => deleteRuleDraftAction(r.id), 'Rascunho excluído.'); }}>Excluir</button>
                      )}
                      {r.status === 'active' && (
                        <button disabled={busy} className={`${btn} bg-amber-100 text-amber-900 border-amber-300`} onClick={() => { const reason = window.prompt('Justificativa do encerramento (mín. 10 caracteres). O que já foi creditado não muda:') ?? ''; if (reason.trim()) void run(() => retireRuleAction({ ruleId: r.id, reason }), 'Regra encerrada.'); }}>Encerrar</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
