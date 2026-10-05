'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BarChart3,
  Users,
  CalendarClock,
  ShieldCheck,
  Star,
  MessageSquareText,
  Edit3,
  AlertCircle,
  Download,
} from 'lucide-react';
import type { SurveyAnalyticsSummary } from '@/types/surveys';

interface Props {
  survey: { id: string; title: string; slug: string; status: string; current_version: number };
  analytics: SurveyAnalyticsSummary | null;
  errorMessage: string | null;
  selectedVersion: number | null;
}

type QuestionSummary = SurveyAnalyticsSummary['block_summaries'][number]['question_summaries'][number];

const dateFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function cleanTitle(title: string): string {
  return title.replace(/^bloco\s+[a-z0-9]+\s*[-—–:]\s*/i, '').trim() || title;
}

function formatDay(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

/** Gera e baixa um CSV com o resumo por pergunta/opção (compatível com Excel: BOM + ;). */
function exportCsv(survey: Props['survey'], analytics: SurveyAnalyticsSummary) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows: string[] = [['Bloco', 'Pergunta', 'Tipo', 'Resposta', 'Quantidade', 'Percentual'].map(esc).join(';')];
  analytics.block_summaries.forEach((b) => {
    b.question_summaries.forEach((q) => {
      const counts = Object.entries(q.option_counts || {});
      if (counts.length > 0) {
        counts.forEach(([value, count]) => {
          rows.push(
            [
              cleanTitle(b.title),
              q.question_text,
              q.question_type,
              q.option_labels?.[value] || value,
              count,
              `${pct(count, q.total_answers)}%`,
            ]
              .map(esc)
              .join(';')
          );
        });
      } else {
        rows.push(
          [
            cleanTitle(b.title),
            q.question_text,
            q.question_type,
            q.question_type === 'rating' ? `Média ${q.average_rating ?? 0}` : 'Respostas',
            q.total_answers,
            `${pct(q.total_answers, analytics.total_responses)}%`,
          ]
            .map(esc)
            .join(';')
        );
      }
    });
  });
  const blob = new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `resultados-${survey.slug}-v${analytics.version_number}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function DailyChart({ data }: { data: Array<{ date: string; count: number }> }) {
  if (data.length === 0) return <p className="srd-empty">Ainda sem respostas no período.</p>;
  const max = Math.max(...data.map((d) => d.count), 1);
  const labelEvery = Math.ceil(data.length / 8);
  return (
    <div className="srd-daily" role="img" aria-label="Respostas por dia">
      {data.map((d, i) => (
        <div key={d.date} className="srd-daily-col" title={`${formatDay(d.date)}: ${d.count} resposta(s)`}>
          <span className="srd-daily-val">{d.count}</span>
          <div className="srd-daily-bar" style={{ height: `${Math.max((d.count / max) * 100, 4)}%` }} />
          <span className="srd-daily-lbl">{i % labelEvery === 0 ? formatDay(d.date) : ''}</span>
        </div>
      ))}
    </div>
  );
}

function QuestionCard({ q, totalResponses, index }: { q: QuestionSummary; totalResponses: number; index: number }) {
  const counts = Object.entries(q.option_counts || {}).sort(([, a], [, b]) => b - a);
  const base = q.total_answers || 1;
  const isChoice = counts.length > 0;
  const isRating = q.question_type === 'rating';
  const texts = q.text_samples || [];

  return (
    <div className="srd-q">
      <div className="srd-q-head">
        <h4>
          <span className="srd-q-num">{index + 1}.</span> {q.question_text}
        </h4>
        <span className="srd-q-resp">
          {q.total_answers} resp. · {pct(q.total_answers, totalResponses)}%
        </span>
      </div>

      {isChoice && (
        <ul className="srd-bars">
          {counts.map(([value, count]) => (
            <li key={value}>
              <div className="srd-bar-top">
                <span>{q.option_labels?.[value] || value}</span>
                <strong>
                  {count} · {pct(count, base)}%
                </strong>
              </div>
              <div className="srd-bar-track">
                <div className="srd-bar-fill" style={{ width: `${pct(count, base)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {isRating && (
        <div className="srd-rating">
          <Star size={20} className="srd-gold" />
          <strong>{q.average_rating ?? 0}</strong>
          <span>média ({q.total_answers} avaliações)</span>
        </div>
      )}

      {texts.length > 0 && (
        <ul className="srd-texts">
          {texts.map((t, i) => (
            <li key={i}>
              <MessageSquareText size={13} /> {t}
            </li>
          ))}
        </ul>
      )}

      {!isChoice && !isRating && texts.length === 0 && <p className="srd-empty">Sem respostas.</p>}
    </div>
  );
}

export function SurveyResultsDashboardClient({ survey, analytics, errorMessage, selectedVersion }: Props) {
  const total = analytics?.total_responses ?? 0;
  const days = analytics?.responses_by_day ?? [];
  const avgPerDay = days.length > 0 ? (total / days.length).toFixed(1) : '0';
  const versions = analytics?.responses_by_version ?? [];

  return (
    <div className="srd">
      <div className="srd-top">
        <Link href="/admin/pesquisas" className="srd-back">
          <ArrowLeft size={15} /> Pesquisas
        </Link>
        <div className="srd-actions">
          <Link href={`/admin/pesquisas/${survey.id}/editor`} className="srd-btn">
            <Edit3 size={14} /> Editar perguntas
          </Link>
          {analytics && total > 0 && (
            <button type="button" className="srd-btn srd-btn--gold" onClick={() => exportCsv(survey, analytics)}>
              <Download size={14} /> Exportar CSV
            </button>
          )}
        </div>
      </div>

      <header className="srd-header">
        <BarChart3 size={26} className="srd-gold" />
        <div>
          <h1>Resultados · {survey.title}</h1>
          <p>
            Versão {analytics?.version_number ?? survey.current_version} ·{' '}
            {survey.status === 'published' ? 'Publicada' : 'Fora do ar'}
          </p>
        </div>
      </header>

      {versions.length > 1 && (
        <nav className="srd-versions" aria-label="Filtrar por versão">
          <Link href={`/admin/pesquisas/${survey.id}/resultados`} className={!selectedVersion ? 'is-active' : ''}>
            Todas
          </Link>
          {versions.map((v) => (
            <Link
              key={v.version_number}
              href={`/admin/pesquisas/${survey.id}/resultados?versao=${v.version_number}`}
              className={selectedVersion === v.version_number ? 'is-active' : ''}
            >
              v{v.version_number} ({v.count})
            </Link>
          ))}
        </nav>
      )}

      {errorMessage && (
        <div className="srd-error" role="alert">
          <AlertCircle size={18} /> {errorMessage}
        </div>
      )}

      {analytics && (
        <>
          <section className="srd-kpis">
            <div className="srd-kpi">
              <Users size={18} className="srd-gold" />
              <strong>{total}</strong>
              <span>Respostas</span>
            </div>
            <div className="srd-kpi">
              <CalendarClock size={18} className="srd-gold" />
              <strong>{avgPerDay}</strong>
              <span>Média por dia ativo</span>
            </div>
            <div className="srd-kpi">
              <ShieldCheck size={18} className="srd-gold" />
              <strong>{pct(analytics.consent_research_count ?? 0, total)}%</strong>
              <span>Consentem uso em pesquisa</span>
            </div>
            <div className="srd-kpi">
              <ShieldCheck size={18} className="srd-gold" />
              <strong>{pct(analytics.consent_commercial_count ?? 0, total)}%</strong>
              <span>Consentem contato comercial</span>
            </div>
          </section>

          <p className="srd-period">
            {analytics.first_response_at
              ? `Primeira resposta: ${dateFmt.format(new Date(analytics.first_response_at))} · Última: ${dateFmt.format(new Date(analytics.last_response_at as string))}`
              : 'Nenhuma resposta registrada ainda.'}
          </p>

          <section className="srd-panel">
            <h2>Respostas por dia</h2>
            <DailyChart data={days} />
          </section>

          {analytics.block_summaries.map((block) => (
            <section key={block.block_id} className="srd-panel">
              <h2>{cleanTitle(block.title)}</h2>
              <div className="srd-qs">
                {block.question_summaries.map((q, i) => (
                  <QuestionCard key={q.question_id} q={q} totalResponses={total} index={i} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}

      <style>{`
        .srd { max-width: 1040px; margin: 0 auto; padding: 1.5rem 1rem 4rem; color: #1C0D10; font-family: var(--font-sans, sans-serif); }
        .srd-gold { color: #C9A227; flex-shrink: 0; }
        .srd-top { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1rem; }
        .srd-back { display: inline-flex; align-items: center; gap: 0.375rem; font-size: 0.8125rem; font-weight: 700; color: #6B5E62; text-decoration: none; }
        .srd-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .srd-btn { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.5rem 0.875rem; border-radius: 10px; border: 1px solid #E5E0D8; background: #FFFFFF; color: #3B0B14; font-size: 0.8125rem; font-weight: 700; text-decoration: none; cursor: pointer; }
        .srd-btn--gold { background: #3B0B14; color: #C9A227; border-color: #3B0B14; }
        .srd-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
        .srd-header h1 { font-size: 1.5rem; font-weight: 800; margin: 0; }
        .srd-header p { margin: 0.125rem 0 0; font-size: 0.8125rem; color: #6B5E62; }
        .srd-versions { display: flex; gap: 0.375rem; flex-wrap: wrap; margin-bottom: 1rem; }
        .srd-versions a { padding: 0.3125rem 0.75rem; border-radius: 20px; border: 1px solid #E5E0D8; background: #FFFFFF; font-size: 0.75rem; font-weight: 700; color: #6B5E62; text-decoration: none; }
        .srd-versions a.is-active { background: #3B0B14; color: #C9A227; border-color: #3B0B14; }
        .srd-error { display: flex; gap: 0.5rem; align-items: center; padding: 0.875rem 1rem; border-radius: 12px; background: #FEF2F2; border: 1px solid #FECACA; color: #991B1B; font-size: 0.875rem; margin-bottom: 1rem; }
        .srd-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 0.75rem; margin-bottom: 0.75rem; }
        .srd-kpi { display: flex; flex-direction: column; gap: 0.125rem; background: #FFFFFF; border: 1px solid #E5E0D8; border-radius: 14px; padding: 1rem; }
        .srd-kpi strong { font-size: 1.75rem; font-weight: 800; color: #3B0B14; line-height: 1.1; }
        .srd-kpi span { font-size: 0.75rem; color: #6B5E62; }
        .srd-period { font-size: 0.75rem; color: #6B5E62; margin: 0 0 1rem; }
        .srd-panel { background: #FFFFFF; border: 1px solid #E5E0D8; border-radius: 16px; padding: 1.25rem; margin-bottom: 1rem; }
        .srd-panel h2 { font-size: 1rem; font-weight: 800; color: #3B0B14; margin: 0 0 1rem; }
        .srd-empty { font-size: 0.8125rem; color: #6B5E62; margin: 0; }
        .srd-daily { display: flex; align-items: flex-end; gap: 4px; height: 190px; overflow-x: auto; padding-bottom: 0.25rem; }
        .srd-daily-col { flex: 1 0 22px; max-width: 56px; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 2px; }
        .srd-daily-bar { width: 100%; background: linear-gradient(180deg, #C9A227 0%, #3B0B14 100%); border-radius: 4px 4px 0 0; min-height: 3px; }
        .srd-daily-val { font-size: 0.6875rem; font-weight: 700; color: #3B0B14; }
        .srd-daily-lbl { font-size: 0.625rem; color: #6B5E62; height: 0.875rem; white-space: nowrap; }
        .srd-qs { display: flex; flex-direction: column; gap: 1.25rem; }
        .srd-q { padding-bottom: 1.25rem; border-bottom: 1px solid #F0EBE3; }
        .srd-q:last-child { border-bottom: 0; padding-bottom: 0; }
        .srd-q-head { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; margin-bottom: 0.75rem; }
        .srd-q-head h4 { margin: 0; font-size: 0.9375rem; font-weight: 700; }
        .srd-q-num { color: #C9A227; }
        .srd-q-resp { font-size: 0.6875rem; font-weight: 700; color: #6B5E62; white-space: nowrap; background: #FAF8F5; padding: 0.1875rem 0.625rem; border-radius: 20px; }
        .srd-bars { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.625rem; }
        .srd-bar-top { display: flex; justify-content: space-between; gap: 1rem; font-size: 0.8125rem; margin-bottom: 0.25rem; }
        .srd-bar-top strong { color: #3B0B14; white-space: nowrap; }
        .srd-bar-track { height: 10px; background: #F0EBE3; border-radius: 6px; overflow: hidden; }
        .srd-bar-fill { height: 100%; background: linear-gradient(90deg, #3B0B14 0%, #C9A227 100%); border-radius: 6px; }
        .srd-rating { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; }
        .srd-rating strong { font-size: 1.5rem; color: #3B0B14; }
        .srd-texts { list-style: none; margin: 0.5rem 0 0; padding: 0; display: flex; flex-direction: column; gap: 0.375rem; }
        .srd-texts li { display: flex; gap: 0.5rem; align-items: flex-start; font-size: 0.8125rem; background: #FAF8F5; border: 1px solid #E5E0D8; border-radius: 10px; padding: 0.5rem 0.75rem; }
        @media (max-width: 640px) { .srd-q-head { flex-direction: column; gap: 0.375rem; } }
      `}</style>
    </div>
  );
}
