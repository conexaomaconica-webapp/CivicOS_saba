'use client';

import { systemConfirm } from '@/components/system/SystemFeedback';
import { useState } from 'react';
import { BadgeCheck, Check, Flag, Handshake, ImageOff, Loader2, ShieldAlert, Trash2, X } from 'lucide-react';
import {
  moderateConnectionPhotoAction,
  resolveConnectionReportsAction,
  type ModerationItem,
  type ReportReason,
} from '@/app/actions/connections';

const REASON_LABEL: Record<ReportReason, string> = {
  foto_inadequada: 'Foto inadequada',
  informacao_falsa: 'Informação falsa',
  ofensivo: 'Conteúdo ofensivo',
  outro: 'Outro motivo',
};

const TYPE_LABEL = { compra: 'Compra realizada', servico: 'Serviço contratado', parceria: 'Parceria realizada', visita: 'Visita realizada' } as const;
const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

type Tab = 'fotos' | 'denuncias';

export function ConnectionsModerationClient({
  initialPhotos,
  initialReports,
  loadError,
}: {
  initialPhotos: ModerationItem[];
  initialReports: ModerationItem[];
  loadError: string | null;
}) {
  const [tab, setTab] = useState<Tab>('fotos');
  const [photos, setPhotos] = useState(initialPhotos);
  const [reports, setReports] = useState(initialReports);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const items = tab === 'fotos' ? photos : reports;

  const finish = (id: string, text: string) => {
    setPhotos((current) => current.filter((item) => item.id !== id));
    setReports((current) => current.filter((item) => item.id !== id));
    setMessage({ type: 'success', text });
  };

  const moderatePhoto = async (item: ModerationItem, decision: 'aprovar' | 'rejeitar') => {
    setBusyId(item.id);
    setMessage(null);
    const res = await moderateConnectionPhotoAction(item.id, decision, notes[item.id]);
    if (res.success) finish(item.id, decision === 'aprovar' ? 'Foto aprovada: já pode aparecer no mural.' : 'Foto rejeitada e removida. A conexão segue sem imagem.');
    else setMessage({ type: 'error', text: res.error || 'Não foi possível registrar a decisão.' });
    setBusyId(null);
  };

  const resolveReport = async (item: ModerationItem, action: 'remover' | 'descartar') => {
    if (action === 'remover' && !(await systemConfirm({ message: 'Remover esta conexão do mural? Ela deixa de aparecer para todos.', danger: true, confirmLabel: 'Remover' }))) return;
    setBusyId(item.id);
    setMessage(null);
    const res = await resolveConnectionReportsAction(item.id, action, notes[item.id]);
    if (res.success) finish(item.id, action === 'remover' ? 'Conexão removida do mural.' : 'Denúncias descartadas.');
    else setMessage({ type: 'error', text: res.error || 'Não foi possível concluir.' });
    setBusyId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-serif text-2xl font-bold text-[#3B0B14]">
          <Handshake className="h-6 w-6 text-[#C9A227]" />
          Mural de Conexões · Moderação
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          A empresa confirma o negócio; a plataforma aprova a <strong>foto</strong> antes de ela aparecer para o público. Denúncias de membros também chegam aqui.
        </p>
      </div>

      {loadError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{loadError}</div>}
      {message && (
        <div className={`rounded-xl border p-4 text-sm ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {message.text}
        </div>
      )}

      <div className="flex gap-2">
        {([
          ['fotos', `Fotos aguardando aprovação (${photos.length})`, ShieldAlert],
          ['denuncias', `Denúncias abertas (${reports.length})`, Flag],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-bold transition ${
              tab === key ? 'border-[#3B0B14] bg-[#3B0B14] text-[#C9A227]' : 'border-stone-300 bg-white text-stone-700 hover:border-[#C9A227]'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">
          {tab === 'fotos' ? 'Nenhuma foto aguardando aprovação.' : 'Nenhuma denúncia aberta.'}
        </p>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row">
                {item.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.photo_url} alt="Foto enviada pelo membro" className="h-44 w-full rounded-xl object-cover sm:w-56 sm:shrink-0" />
                ) : (
                  <div className="flex h-24 w-full items-center justify-center rounded-xl bg-stone-100 text-stone-400 sm:w-56 sm:shrink-0">
                    <ImageOff className="h-6 w-6" />
                  </div>
                )}

                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-sm font-bold text-stone-900">
                    {item.member_name} · {TYPE_LABEL[item.connection_type]} em {item.business_name}
                  </p>
                  {item.item_description && <p className="text-xs text-stone-700">Produto/serviço: {item.item_description}</p>}
                  {item.message && <p className="text-xs italic text-stone-600">“{item.message}”</p>}
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-500">
                    <span>Registrada em {dateFmt.format(new Date(item.created_at))}</span>
                    {item.status === 'confirmada' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700"><BadgeCheck className="h-3 w-3" /> Confirmada pela empresa</span>
                    ) : (
                      <span className="text-amber-700">Empresa ainda não confirmou</span>
                    )}
                  </p>
                  {item.open_reports > 0 && (
                    <p className="inline-flex flex-wrap items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-800">
                      <Flag className="h-3 w-3" /> {item.open_reports} denúncia(s):{' '}
                      {(item.report_reasons || []).map((reason) => REASON_LABEL[reason] || reason).join(', ')}
                    </p>
                  )}

                  <input
                    value={notes[item.id] || ''}
                    onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                    maxLength={300}
                    placeholder="Observação interna (opcional)"
                    className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-xs"
                  />

                  <div className="flex flex-wrap gap-2 pt-1">
                    {tab === 'fotos' ? (
                      <>
                        <button
                          onClick={() => void moderatePhoto(item, 'aprovar')}
                          disabled={busyId === item.id}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                        >
                          {busyId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          Aprovar foto
                        </button>
                        <button
                          onClick={() => void moderatePhoto(item, 'rejeitar')}
                          disabled={busyId === item.id}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-4 py-2 text-xs font-bold text-rose-700 disabled:opacity-60"
                        >
                          <X className="h-3.5 w-3.5" />
                          Rejeitar foto
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => void resolveReport(item, 'remover')}
                          disabled={busyId === item.id}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-rose-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remover do mural
                        </button>
                        <button
                          onClick={() => void resolveReport(item, 'descartar')}
                          disabled={busyId === item.id}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-bold text-stone-700 disabled:opacity-60"
                        >
                          Descartar denúncias
                        </button>
                        {item.photo_url && (
                          <button
                            onClick={() => void moderatePhoto(item, 'rejeitar')}
                            disabled={busyId === item.id}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-4 py-2 text-xs font-bold text-rose-700 disabled:opacity-60"
                          >
                            <ImageOff className="h-3.5 w-3.5" />
                            Só remover a foto
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
