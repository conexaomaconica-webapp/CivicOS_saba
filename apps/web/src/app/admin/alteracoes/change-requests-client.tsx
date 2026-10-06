'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ClipboardCheck, Loader2, XCircle } from 'lucide-react';
import { decideChangeRequestAction, type AdminChangeRequestItem } from '@/lib/admin/admin-change-requests-service';

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function Card({ item, decidable }: { item: AdminChangeRequestItem; decidable: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const decide = (decision: 'approve' | 'reject') => {
    setMessage(null);
    startTransition(async () => {
      const result = await decideChangeRequestAction(item.id, decision, note, item.entityType);
      setMessage({ ok: result.success, text: result.message });
      if (result.success) router.refresh();
    });
  };

  return (
    <article className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-xs sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-serif text-base font-bold text-stone-900">{item.entityLabel}</h2>
          <p className="text-xs text-stone-500">
            <Link href={`/admin/empresas/${item.businessId}`} className="font-semibold text-[#3B0B14] underline">
              {item.businessName}
            </Link>{' '}
            · {item.action === 'create' ? 'novo item' : 'alteração'} · enviado em {dateFmt.format(new Date(item.submittedAt))}
          </p>
        </div>
        {!decidable && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
              item.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}
          >
            {item.status === 'approved' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
            {item.status === 'approved' ? 'Aprovada' : 'Recusada'}
            {item.reviewedAt ? ` em ${dateFmt.format(new Date(item.reviewedAt))}` : ''}
          </span>
        )}
      </header>

      {(item.imageAfter || item.imageBefore) && (
        <div className="grid grid-cols-2 gap-3 text-xs">
          {[
            { label: 'Atual', url: item.imageBefore },
            { label: 'Proposta', url: item.imageAfter },
          ].map((image) => (
            <figure key={image.label} className="space-y-1">
              <figcaption className="font-bold text-stone-600">{image.label}</figcaption>
              {image.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image.url} alt={`${image.label}: ${item.entityLabel}`} className="h-36 w-full rounded-xl border border-stone-200 bg-stone-50 object-contain" />
              ) : (
                <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-stone-300 text-stone-400">Sem imagem</div>
              )}
            </figure>
          ))}
        </div>
      )}

      {item.diff.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-stone-200">
          <table className="w-full min-w-[420px] text-left text-xs">
            <thead className="bg-stone-50 text-stone-600">
              <tr>
                <th className="px-3 py-2 font-bold">Campo</th>
                <th className="px-3 py-2 font-bold">Atual</th>
                <th className="px-3 py-2 font-bold">Proposto</th>
              </tr>
            </thead>
            <tbody>
              {item.diff.map((row) => (
                <tr key={row.label} className="border-t border-stone-100 align-top">
                  <td className="px-3 py-2 font-semibold text-stone-800">{row.label}</td>
                  <td className="whitespace-pre-line px-3 py-2 text-stone-500">{row.before}</td>
                  <td className="whitespace-pre-line px-3 py-2 font-medium text-stone-900">{row.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!decidable && item.reviewNote && <p className="text-xs text-stone-600"><strong>Motivo:</strong> {item.reviewNote}</p>}

      {decidable && (
        <div className="space-y-2 border-t border-stone-100 pt-3">
          {rejecting && (
            <label className="block text-xs font-bold text-stone-700">
              Motivo da recusa (o anunciante verá esta mensagem)
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={400}
                className="mt-1 block w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-normal"
                placeholder="Ex.: a imagem está com baixa resolução; envie outra com pelo menos 800 px."
              />
            </label>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {!rejecting ? (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => decide('approve')}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-xs font-bold text-white disabled:opacity-50"
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} {item.entityType === 'plan' ? 'Aceitar pedido' : 'Aprovar e publicar'}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setRejecting(true)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-rose-300 px-4 text-xs font-bold text-rose-700 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" /> Recusar…
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={pending || note.trim().length < 3}
                  onClick={() => decide('reject')}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-rose-700 px-4 text-xs font-bold text-white disabled:opacity-50"
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Confirmar recusa
                </button>
                <button type="button" onClick={() => setRejecting(false)} className="min-h-10 px-3 text-xs font-semibold text-stone-600">
                  Voltar
                </button>
              </>
            )}
          </div>
          {message && (
            <p className={`text-xs font-semibold ${message.ok ? 'text-emerald-700' : 'text-rose-700'}`} role={message.ok ? 'status' : 'alert'}>
              {message.text}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

export default function ChangeRequestsClient({
  view,
  items,
  loadError,
}: {
  view: 'pending' | 'decided';
  items: AdminChangeRequestItem[];
  loadError: string | null;
}) {
  const tabClass = (active: boolean) =>
    `inline-flex min-h-10 items-center rounded-xl px-4 text-sm font-bold ${active ? 'bg-[#3B0B14] text-[#C9A227]' : 'text-stone-600 hover:bg-stone-100'}`;

  return (
    <div className="mx-auto max-w-4xl space-y-5 text-left">
      <header className="space-y-1 border-b border-stone-300 pb-4">
        <span className="block font-mono text-[11px] font-bold uppercase tracking-wider text-[#C9A227]">Governança do Guia</span>
        <h1 className="flex items-center gap-2 font-serif text-2xl font-bold text-stone-900">
          <ClipboardCheck className="h-6 w-6 text-[#C9A227]" aria-hidden /> Alterações dos anunciantes
        </h1>
        <p className="text-xs text-stone-600">
          Identidade da empresa, imagens, vídeo e ofertas só entram no Guia depois da sua aprovação. A versão atual continua publicada enquanto a alteração é analisada.
        </p>
      </header>

      <nav className="inline-flex gap-1 rounded-2xl border border-stone-200 bg-white p-1" aria-label="Filtro">
        <Link href="/admin/alteracoes" className={tabClass(view === 'pending')}>Pendentes</Link>
        <Link href="/admin/alteracoes?aba=decididas" className={tabClass(view === 'decided')}>Decididas</Link>
      </nav>

      {loadError && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{loadError}</p>}

      {!loadError && items.length === 0 && (
        <p className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">
          {view === 'pending' ? 'Nenhuma alteração aguardando análise.' : 'Nenhuma decisão registrada ainda.'}
        </p>
      )}

      <div className="space-y-4">
        {items.map((item) => (
          <Card key={item.id} item={item} decidable={view === 'pending'} />
        ))}
      </div>
    </div>
  );
}
