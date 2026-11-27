'use client';

import React, { useState, useTransition } from 'react';
import { Award, Lock, PauseCircle, PlayCircle, ShieldAlert, CheckCircle2, Trash2 } from 'lucide-react';
import type {
  CampaignExceptionRecord,
  CommercialCampaignSummary,
} from '@/lib/commercial/campaign-availability-service';
import {
  grantCampaignExceptionAdminAction,
  revokeCampaignExceptionAdminAction,
  updateCampaignStatusAdminAction,
} from '@/app/actions/commercial-campaigns';

interface PedraCampaignControlCardProps {
  initialCampaign: CommercialCampaignSummary;
  initialExceptions: CampaignExceptionRecord[];
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  active: { label: 'Ativa', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  paused: { label: 'Pausada', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
  ended: { label: 'Encerrada', cls: 'bg-rose-100 text-rose-800 border-rose-300' },
  archived: { label: 'Arquivada', cls: 'bg-stone-200 text-stone-700 border-stone-300' },
};

export function PedraCampaignControlCard({
  initialCampaign,
  initialExceptions,
}: PedraCampaignControlCardProps) {
  const [campaign, setCampaign] = useState<CommercialCampaignSummary>(initialCampaign);
  const [exceptions, setExceptions] = useState<CampaignExceptionRecord[]>(initialExceptions);
  const [statusReason, setStatusReason] = useState('');
  const [targetDocument, setTargetDocument] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [justification, setJustification] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const badge = STATUS_LABEL[campaign.status] ?? {
    label: 'Encerrada',
    cls: 'bg-rose-100 text-rose-800 border-rose-300',
  };

  const handleStatusChange = (nextStatus: 'active' | 'paused' | 'ended') => {
    setFeedback(null);
    startTransition(async () => {
      const res = await updateCampaignStatusAdminAction({
        campaignCode: campaign.code,
        status: nextStatus,
        reason: statusReason || undefined,
      });
      if (res.success && res.campaign) {
        setCampaign(res.campaign);
        setStatusReason('');
        setFeedback({ ok: true, text: `Disponibilidade atualizada para "${STATUS_LABEL[nextStatus]?.label || nextStatus}".` });
      } else {
        setFeedback({ ok: false, text: res.error || 'Não foi possível alterar o status.' });
      }
    });
  };

  const handleGrantException = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const res = await grantCampaignExceptionAdminAction({
        campaignCode: campaign.code,
        targetDocument: targetDocument || null,
        targetEmail: targetEmail || null,
        justification,
        expiresInDays: 15,
      });
      if (res.success && res.exceptionId) {
        setExceptions((prev) => [
          {
            id: res.exceptionId!,
            campaignId: campaign.id || '',
            businessId: null,
            leadId: null,
            targetDocument: targetDocument.replace(/\D/g, '') || null,
            targetEmail: targetEmail.trim().toLowerCase() || null,
            justification: justification.trim(),
            status: 'authorized',
            authorizedBy: 'admin',
            expiresAt: null,
            consumedBusinessId: null,
            consumedAt: null,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
        setTargetDocument('');
        setTargetEmail('');
        setJustification('');
        setFeedback({ ok: true, text: 'Exceção individual registrada com auditoria.' });
      } else {
        setFeedback({ ok: false, text: res.error || 'Erro ao autorizar exceção.' });
      }
    });
  };

  const handleRevoke = (exceptionId: string) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await revokeCampaignExceptionAdminAction(exceptionId);
      if (res.success) {
        setExceptions((prev) =>
          prev.map((item) => (item.id === exceptionId ? { ...item, status: 'revoked' } : item))
        );
        setFeedback({ ok: true, text: 'Exceção revogada.' });
      } else {
        setFeedback({ ok: false, text: res.error || 'Erro ao revogar exceção.' });
      }
    });
  };

  return (
    <section className="rounded-2xl border border-amber-900/25 bg-gradient-to-br from-[#faf6ed] to-white p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-900/15 pb-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#3B0B14] text-[#C9A227]">
            <Award className="h-5 w-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-[#3B0B14]">{campaign.name}</h2>
              <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${badge.cls}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-xs text-stone-600 mt-0.5">
              Plano Acácia · Vigência {campaign.contractDurationMonths} meses · R$ 1.200,00 à vista ou 4x R$ 325,00 (R$ 1.300,00) ·
              Contratações pendentes e selos já concedidos permanecem preservados após o encerramento.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {campaign.status !== 'active' && (
            <button
              type="button"
              disabled={isPending || campaign.source !== 'database'}
              onClick={() => handleStatusChange('active')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              <PlayCircle className="h-3.5 w-3.5" /> Reativar
            </button>
          )}
          {campaign.status === 'active' && (
            <button
              type="button"
              disabled={isPending || campaign.source !== 'database'}
              onClick={() => handleStatusChange('paused')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              <PauseCircle className="h-3.5 w-3.5" /> Pausar
            </button>
          )}
          {campaign.status !== 'ended' && (
            <button
              type="button"
              disabled={isPending || campaign.source !== 'database'}
              onClick={() => handleStatusChange('ended')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#3B0B14] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#2a070e] disabled:opacity-50"
            >
              <Lock className="h-3.5 w-3.5" /> Encerrar campanha
            </button>
          )}
        </div>
      </div>

      {campaign.source !== 'database' && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Migration <code>255_commercial_campaigns_pedra_closure.sql</code> ainda não aplicada neste banco. Os botões persistentes serão habilitados após a aplicação controlada da migration.
        </div>
      )}

      {feedback && (
        <div
          className={`rounded-xl border px-3 py-2 text-xs font-semibold flex items-center gap-2 ${
            feedback.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {feedback.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <ShieldAlert className="h-4 w-4 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
        <form onSubmit={handleGrantException} className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
            Autorizar exceção individual (negociação anterior)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={targetDocument}
              onChange={(e) => setTargetDocument(e.target.value)}
              placeholder="CPF ou CNPJ vinculado"
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs"
            />
            <input
              type="email"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              placeholder="E-mail do responsável"
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs"
            />
          </div>
          <textarea
            rows={2}
            required
            minLength={10}
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Justificativa obrigatória para auditoria (ex.: negociação comercial iniciada antes do encerramento)."
            className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-xs"
          />
          <button
            type="submit"
            disabled={isPending || campaign.source !== 'database'}
            className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50"
          >
            Autorizar exceção vinculada
          </button>
        </form>

        <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
            Exceções registradas ({exceptions.length})
          </h3>
          {exceptions.length === 0 ? (
            <p className="text-xs text-stone-500">Nenhuma exceção registrada.</p>
          ) : (
            <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {exceptions.map((exc) => (
                <li
                  key={exc.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-stone-800">
                      {exc.targetEmail || exc.targetDocument || exc.businessId || exc.leadId}{' '}
                      <span className="ml-1 uppercase text-[10px] font-bold text-stone-500">[{exc.status}]</span>
                    </div>
                    <p className="text-[11px] text-stone-600">{exc.justification}</p>
                  </div>
                  {exc.status === 'authorized' && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleRevoke(exc.id)}
                      title="Revogar exceção"
                      className="text-rose-600 hover:text-rose-800 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

