import React from 'react';
import Link from 'next/link';
import { BadgeCheck, Handshake, MapPin, ShoppingBag, Wrench } from 'lucide-react';
import { getPublicConnectionsListAction } from '@/app/actions/connections';
import { buildConnectionsUrl } from '@/lib/directory/connections-list';
import { connectionPath, isConnectionId } from '@/lib/directory/connections-share';

/** Quantas conexões aparecem no perfil; o restante fica na página /conexoes filtrada pela empresa. */
export const PROFILE_CONNECTIONS_LIMIT = 2;

const TYPE_INFO = {
  compra: { label: 'Compra', verb: 'comprou', preposition: 'em', Icon: ShoppingBag },
  servico: { label: 'Serviço', verb: 'contratou', preposition: 'em', Icon: Wrench },
  parceria: { label: 'Parceria', verb: 'firmou parceria', preposition: 'com', Icon: Handshake },
  visita: { label: 'Visita', verb: 'visitou', preposition: '', Icon: MapPin },
} as const;

/**
 * Credibilidade da empresa: até duas conexões confirmadas, o total e o caminho para ver as demais.
 * Discreta de propósito (sem foto, sem curtidas) para não competir com as informações comerciais. Quando a empresa não
 * tem conexões públicas, ou a consulta falha, a seção simplesmente não aparece (o perfil nunca mostra um vazio nem um erro).
 * As regras de visibilidade são as do próprio banco (a mesma listagem do Mural).
 */
export async function BusinessConnectionsSection({ slug, businessName }: { slug: string; businessName: string }) {
  const result = await getPublicConnectionsListAction(
    { q: '', type: '', order: 'recent', page: 1, empresa: slug },
    { pageSize: PROFILE_CONNECTIONS_LIMIT },
  );
  if (!result.ok || result.total === 0 || result.items.length === 0) return null;

  const items = result.items.slice(0, PROFILE_CONNECTIONS_LIMIT);
  const total = result.total;

  return (
    <section aria-labelledby="conexoes-da-empresa" className="mx-auto w-full max-w-6xl px-4 pb-10 pt-2 sm:px-6">
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="conexoes-da-empresa" className="font-serif text-xl font-bold text-[#4B161B]">Conexões desta empresa</h2>
            <p className="mt-0.5 text-xs text-stone-500">Experiências confirmadas pela empresa e publicadas com autorização.</p>
          </div>
          <span className="rounded-full bg-[#4B161B]/10 px-3 py-1 text-xs font-bold text-[#4B161B]">
            {total} {total === 1 ? 'conexão' : 'conexões'}
          </span>
        </div>

        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((item) => {
            const info = TYPE_INFO[item.connection_type] ?? TYPE_INFO.compra;
            const Icon = info.Icon;
            const body = (
              <>
                <span className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#4B161B]">
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {info.label}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    Confirmada
                  </span>
                </span>
                <span className="mt-2 block text-sm leading-relaxed text-stone-800">
                  <strong>{item.member_first_name}</strong> {info.verb}
                  {item.item_description ? <> {item.item_description}</> : null}
                  {info.preposition ? ` ${info.preposition} ` : ' '}
                  {businessName}
                </span>
                {item.message && <span className="mt-2 line-clamp-3 block text-xs italic text-stone-600">“{item.message}”</span>}
              </>
            );
            const cls = 'block h-full rounded-xl border border-stone-200 bg-[#faf7f2] p-4 transition hover:border-[#C9A227]/60';
            return (
              <li key={item.id}>
                {isConnectionId(item.id) ? (
                  <Link href={connectionPath(item.id)} className={cls}>{body}</Link>
                ) : (
                  <div className={cls}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-4 text-right">
          <Link href={buildConnectionsUrl({ empresa: slug })} className="text-sm font-bold text-[#4B161B] underline-offset-2 hover:underline">
            Ver todas as conexões{total > items.length ? ` (${total})` : ''}
          </Link>
        </div>
      </div>
    </section>
  );
}
