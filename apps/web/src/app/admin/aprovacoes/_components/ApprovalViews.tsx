import React from 'react';
import { Sparkles, ArrowRight, Building2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { ApprovalDirectoryItem } from '@/lib/admin/admin-approval-service';
import { displayOptionalText } from '@/lib/utils/display';

export const PLAN_LABELS: Record<string, string> = {
  bronze: 'Esquadro',
  prata: 'Compasso',
  silver: 'Compasso',
  ouro: 'Acácia',
  gold: 'Acácia',
};

// --- Shared Components ---

export function ApprovalPlanBadge({ planCode }: { planCode?: string | null }) {
  if (!planCode) {
    return (
      <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-900 font-extrabold text-[10px] uppercase border border-stone-300">
        Plano não definido
      </span>
    );
  }
  const planLabel = PLAN_LABELS[planCode] || planCode;
  return (
    <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-900 font-extrabold text-[10px] uppercase border border-stone-300">
      Plano {planLabel}
    </span>
  );
}

export function ApprovalCompleteness({ percent }: { percent: number }) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <div className="w-12 bg-stone-200 h-2 rounded-full overflow-hidden">
        <div
          className={`h-full ${percent >= 90
            ? 'bg-emerald-600'
            : percent >= 70
              ? 'bg-amber-500'
              : 'bg-rose-600'
            }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="font-mono font-bold text-stone-800">{percent}%</span>
    </div>
  );
}

export function ApprovalStatusBadge({
  isReadyForApproval,
  publicationStatus,
}: {
  isReadyForApproval: boolean;
  publicationStatus: string;
}) {
  if (isReadyForApproval) {
    return (
      <span className="px-2.5 py-1 rounded-full bg-[#C9A227] text-[#3B0B14] font-extrabold text-[10px] tracking-wider uppercase shadow-xs flex items-center justify-center gap-1 w-fit">
        <Sparkles className="w-3 h-3" /> Pronto p/ Aprovar
      </span>
    );
  }
  if (publicationStatus === 'correction_requested') {
    return (
      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px] uppercase w-fit">
        Correção Solicitada
      </span>
    );
  }
  if (publicationStatus === 'rejected') {
    return (
      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300 font-bold text-[10px] uppercase w-fit">
        Rejeitado
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-300 font-bold text-[10px] uppercase w-fit">
      {publicationStatus}
    </span>
  );
}

export function ApprovalChecklist({
  hasMasonicLink,
  hasSignedContract,
  hasValidPayment,
}: {
  hasMasonicLink: boolean;
  hasSignedContract: boolean;
  hasValidPayment: boolean;
}) {
  return (
    <div className="text-[11px] space-y-1 mt-3">
      <div className="flex items-center justify-between">
        <span className="text-stone-500 font-semibold">Vínculo:</span>
        {hasMasonicLink ? (
          <span className="text-emerald-700 font-bold">✓ Validado</span>
        ) : (
          <span className="text-amber-600 font-bold">Pendente</span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-stone-500 font-semibold">Contrato:</span>
        {hasSignedContract ? (
          <span className="text-emerald-700 font-bold">✓ Assinado</span>
        ) : (
          <span className="text-rose-600 font-bold">Ausente</span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-stone-500 font-semibold">Pagamento:</span>
        {hasValidPayment ? (
          <span className="text-emerald-700 font-bold">✓ Confirmado</span>
        ) : (
          <span className="text-amber-600 font-bold">Pendente</span>
        )}
      </div>
    </div>
  );
}

// --- List View Component ---
export function ApprovalTable({ items, onDelete }: { items: ApprovalDirectoryItem[], onDelete?: (id: string) => void }) {
  if (items.length === 0) {
    return (
      <div className="bg-white border border-stone-300 rounded-2xl shadow-xs p-12 text-center space-y-2">
        <Building2 className="w-8 h-8 text-stone-400 mx-auto" />
        <p className="text-sm font-bold text-stone-800">
          Nenhuma solicitação aguardando análise neste filtro.
        </p>
        <p className="text-xs text-stone-500">Tudo em dia por aqui!</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-stone-300 rounded-2xl shadow-xs overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-stone-100 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider">
            <th className="py-3 px-4">Empresa & Categoria</th>
            <th className="py-3 px-4">Responsável</th>
            <th className="py-3 px-4 text-center">Plano</th>
            <th className="py-3 px-4 text-center">Cadastro</th>
            <th className="py-3 px-4 text-center">Vínculo</th>
            <th className="py-3 px-4 text-center">Contrato</th>
            <th className="py-3 px-4 text-center">Pagamento</th>
            <th className="py-3 px-4 text-center">Status</th>
            <th className="py-3 px-4 text-right">Ação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-200">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-stone-50/80 transition-colors">
              <td className="py-3.5 px-4">
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-[#3B0B14] font-serif font-bold text-sm shrink-0">
                    {item.name ? item.name.charAt(0) : '?'}
                  </div>
                  <div>
                    <div className="font-serif font-bold text-sm text-stone-900 line-clamp-1 flex items-center gap-1.5">
                      <span>{displayOptionalText(item.name, 'Empresa sem nome')}</span>
                      {item.is_pedra_fundamental && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 font-sans text-[9px] font-extrabold">
                          Pedra Fund.
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-stone-500 font-semibold">{displayOptionalText(item.category)}</span>
                  </div>
                </div>
              </td>
              <td className="py-3.5 px-4 text-stone-700">
                <div className="font-bold text-stone-900">{displayOptionalText(item.owner_name, 'Responsável não informado')}</div>
                <div className="text-[11px] text-stone-500 font-mono line-clamp-1">{displayOptionalText(item.owner_email)}</div>
              </td>
              <td className="py-3.5 px-4 text-center">
                <ApprovalPlanBadge planCode={item.plan_code} />
              </td>
              <td className="py-3.5 px-4 text-center">
                <ApprovalCompleteness percent={item.completeness_percent} />
              </td>
              <td className="py-3.5 px-4 text-center">
                {item.has_masonic_link ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10px]">✓ Validado</span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px]">Pendente</span>
                )}
              </td>
              <td className="py-3.5 px-4 text-center">
                {item.has_signed_contract ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10px]">✓ Assinado</span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300 font-bold text-[10px]">Sem Contrato</span>
                )}
              </td>
              <td className="py-3.5 px-4 text-center">
                {item.has_valid_payment ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10px]">✓ Confirmado</span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px]">Pendente</span>
                )}
              </td>
              <td className="py-3.5 px-4 text-center space-y-1">
                <div className="flex justify-center">
                  <ApprovalStatusBadge isReadyForApproval={item.is_ready_for_approval} publicationStatus={item.publication_status} />
                </div>
              </td>
              <td className="py-3.5 px-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/admin/aprovacoes/${item.id}`}
                    className="px-3.5 py-1.5 bg-[#3B0B14] hover:bg-[#4B161B] text-[#C9A227] font-extrabold text-xs rounded-xl transition-all inline-flex items-center gap-1.5 shadow-xs border border-[#C9A227]/40 cursor-pointer"
                  >
                    <span>Analisar</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#C9A227]" />
                  </Link>
                  {onDelete && (
                    <button
                      onClick={() => onDelete(item.id)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Excluir solicitação"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Grid View Component ---
export function ApprovalGrid({ items, onDelete }: { items: ApprovalDirectoryItem[], onDelete?: (id: string) => void }) {
  if (items.length === 0) {
    return (
      <div className="bg-white border border-stone-300 rounded-2xl shadow-xs p-12 text-center space-y-2">
        <Building2 className="w-8 h-8 text-stone-400 mx-auto" />
        <p className="text-sm font-bold text-stone-800">
          Nenhuma solicitação aguardando análise neste filtro.
        </p>
        <p className="text-xs text-stone-500">Tudo em dia por aqui!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {items.map((item) => (
        <div
          key={item.id}
          className={`bg-white rounded-2xl p-4 flex flex-col justify-between shadow-xs border transition-colors ${item.is_ready_for_approval
            ? 'border-[#C9A227]/50 shadow-md'
            : item.completeness_percent < 70
              ? 'border-amber-300/50'
              : 'border-stone-200'
            }`}
        >
          {/* Header */}
          <div className="flex items-start gap-3 border-b border-stone-100 pb-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-[#3B0B14] font-serif font-bold text-lg shrink-0">
              {item.name ? item.name.charAt(0) : '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <ApprovalPlanBadge planCode={item.plan_code} />
                {item.is_pedra_fundamental && (
                  <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 font-sans text-[9px] font-extrabold shrink-0">
                    Pedra Fund.
                  </span>
                )}
              </div>
              <h3 className="font-serif font-bold text-stone-900 truncate" title={item.name || 'Empresa sem nome'}>
                {displayOptionalText(item.name, 'Empresa sem nome')}
              </h3>
              <p className="text-[11px] text-stone-500 font-semibold truncate">{displayOptionalText(item.category)}</p>
            </div>
          </div>

          {/* Body */}
          <div className="space-y-3 mb-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-stone-500 font-bold uppercase tracking-wider">Responsável</span>
              <span className="text-sm font-bold text-stone-800 truncate">{displayOptionalText(item.owner_name, 'Responsável não informado')}</span>
              <span className="text-xs text-stone-500 font-mono truncate">{displayOptionalText(item.owner_email)}</span>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] text-stone-500 font-bold uppercase tracking-wider">Cadastro</span>
                <span className="text-xs font-mono font-bold text-stone-800">{item.completeness_percent}%</span>
              </div>
              <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${item.completeness_percent >= 90
                    ? 'bg-emerald-600'
                    : item.completeness_percent >= 70
                      ? 'bg-amber-500'
                      : 'bg-rose-600'
                    }`}
                  style={{ width: `${item.completeness_percent}%` }}
                />
              </div>
            </div>

            <ApprovalChecklist
              hasMasonicLink={item.has_masonic_link}
              hasSignedContract={item.has_signed_contract}
              hasValidPayment={item.has_valid_payment}
            />

            <div className="pt-1">
              <ApprovalStatusBadge isReadyForApproval={item.is_ready_for_approval} publicationStatus={item.publication_status} />
            </div>
          </div>

          {/* Footer Action */}
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/aprovacoes/${item.id}`}
              className="flex-1 py-2.5 bg-[#3B0B14] hover:bg-[#4B161B] text-[#C9A227] font-extrabold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs border border-[#C9A227]/40 cursor-pointer"
            >
              <span>Analisar cadastro</span>
              <ArrowRight className="w-4 h-4 text-[#C9A227]" />
            </Link>
            {onDelete && (
              <button
                onClick={() => onDelete(item.id)}
                className="p-2.5 text-stone-400 border border-stone-200 hover:border-rose-200 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer shadow-xs"
                title="Excluir solicitação"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
