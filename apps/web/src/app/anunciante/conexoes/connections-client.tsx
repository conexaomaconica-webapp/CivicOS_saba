'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck, Check, Handshake, Loader2, MapPin, ShoppingBag, Wrench, X } from 'lucide-react';
import {
  decideConnectionAction,
  type BusinessConnectionRow,
  type ConnectionMetrics,
  type ConnectionType,
} from '@/app/actions/connections';
import { RemoveConnectionPhotoButton } from '@/components/connections/RemoveConnectionPhotoButton';

const TYPE_LABEL: Record<ConnectionType, { label: string; Icon: typeof ShoppingBag }> = {
  compra: { label: 'Compra realizada', Icon: ShoppingBag },
  servico: { label: 'Serviço contratado', Icon: Wrench },
  parceria: { label: 'Parceria realizada', Icon: Handshake },
  visita: { label: 'Visita realizada', Icon: MapPin },
};

const STATUS_STYLE: Record<string, string> = {
  pendente: 'bg-amber-100 text-amber-900',
  confirmada: 'bg-emerald-100 text-emerald-800',
  recusada: 'bg-stone-200 text-stone-700',
  removida: 'bg-stone-200 text-stone-700',
};
const STATUS_LABEL: Record<string, string> = {
  pendente: 'Aguardando você',
  confirmada: 'Confirmada',
  recusada: 'Não reconhecida',
  removida: 'Removida',
};

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export function ConnectionsClient({
  initialItems,
  metrics,
  businessName,
  loadError,
}: {
  initialItems: BusinessConnectionRow[];
  metrics: ConnectionMetrics | null;
  businessName: string | null;
  loadError: string | null;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const decide = async (id: string, action: 'confirmar' | 'recusar') => {
    setBusyId(id);
    setMessage(null);
    const res = await decideConnectionAction(id, action);
    if (res.success) {
      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, status: action === 'confirmar' ? 'confirmada' : 'recusada', confirmed_at: action === 'confirmar' ? new Date().toISOString() : null }
            : item,
        ),
      );
      setMessage({ type: 'success', text: action === 'confirmar' ? 'Atendimento confirmado. A conexão já aparece no mural da sua empresa.' : 'Conexão marcada como não reconhecida.' });
      router.refresh();
    } else {
      setMessage({ type: 'error', text: res.error || 'Não foi possível registrar a resposta.' });
    }
    setBusyId(null);
  };

  const pending = items.filter((item) => item.status === 'pendente');
  const others = items.filter((item) => item.status !== 'pendente');

  const kpis = [
    { label: 'Negócios confirmados', value: metrics?.confirmed ?? 0 },
    { label: 'Aguardando confirmação', value: pending.length },
    { label: 'Confirmados em 30 dias', value: metrics?.confirmed_last_30_days ?? 0 },
    { label: 'Taxa de confirmação', value: metrics?.confirmation_rate != null ? `${metrics.confirmation_rate}%` : '—' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-serif text-2xl font-bold text-[#3B0B14]">
          <Handshake className="h-6 w-6 text-[#C9A227]" />
          Conexões
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Membros que registraram uma compra, serviço ou parceria com {businessName || 'sua empresa'}. Confirme o atendimento: não é preciso informar valores.
        </p>
      </div>

      {loadError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{loadError}</div>}
      {message && (
        <div className={`rounded-xl border p-4 text-sm ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
            <p className="text-2xl font-bold text-[#3B0B14]">{kpi.value}</p>
            <p className="text-xs text-stone-600">{kpi.label}</p>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="font-serif text-lg font-bold text-stone-900">Aguardando sua confirmação</h2>
        {pending.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-500">Nenhuma conexão pendente no momento.</p>
        ) : (
          <ul className="space-y-3">
            {pending.map((item) => {
              const { label, Icon } = TYPE_LABEL[item.connection_type];
              return (
                <li key={item.id} className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-stone-900">🎉 {item.member_name} registrou uma conexão comercial com sua empresa.</p>
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-[#4B161B]">
                        <Icon className="h-3.5 w-3.5" /> {label}
                        {item.item_description ? <span className="font-normal text-stone-700">— {item.item_description}</span> : null}
                      </p>
                      {item.message && <p className="text-xs italic text-stone-600">“{item.message}”</p>}
                      <p className="text-[11px] text-stone-500">Registrada em {dateFmt.format(new Date(item.created_at))}</p>
                    </div>
                    {item.photo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.photo_url} alt="Foto enviada pelo membro" className="h-20 w-20 rounded-lg object-cover" />
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => void decide(item.id, 'confirmar')}
                      disabled={busyId === item.id}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                    >
                      {busyId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Confirmar atendimento
                    </button>
                    <button
                      onClick={() => void decide(item.id, 'recusar')}
                      disabled={busyId === item.id}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-bold text-stone-700 disabled:opacity-60"
                    >
                      <X className="h-3.5 w-3.5" />
                      Não reconheço
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {others.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-serif text-lg font-bold text-stone-900">Histórico</h2>
          <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white shadow-xs">
            {others.map((item) => {
              const { label } = TYPE_LABEL[item.connection_type];
              return (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                  <div>
                    <p className="font-semibold text-stone-900">
                      {item.member_name} · <span className="font-normal text-stone-600">{label}{item.item_description ? ` — ${item.item_description}` : ''}</span>
                    </p>
                    <p className="text-[11px] text-stone-500">{dateFmt.format(new Date(item.confirmed_at || item.created_at))}</p>
                    {item.photo_url && (
                      <div className="mt-2 flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.photo_url} alt="Foto enviada pelo membro" className="h-14 w-14 rounded-lg object-cover" />
                        {item.photo_moderation_status === 'pendente' && (
                          <span className="text-[10px] font-semibold text-amber-700">Foto em análise pela plataforma</span>
                        )}
                        <RemoveConnectionPhotoButton
                          connectionId={item.id}
                          onRemoved={() => setItems((current) => current.map((row) => (row.id === item.id ? { ...row, photo_url: null } : row)))}
                        />
                      </div>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLE[item.status] || STATUS_STYLE.pendente}`}>
                    {item.status === 'confirmada' && <BadgeCheck className="h-3 w-3" />}
                    {STATUS_LABEL[item.status] || item.status}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
