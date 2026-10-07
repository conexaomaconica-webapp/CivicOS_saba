'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { applyAdminBusinessDescriptionAction, updateAdminBusinessSeoAction, type AdminBusinessSeoData } from '@/app/actions/admin-business-seo';
import { buildBusinessDescription, buildBusinessTitle, businessCanonicalUrl } from '@/lib/seo/business-seo';

const INPUT = 'w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-[#5d1523] focus:outline-none';

/**
 * SEO da empresa. Tudo é automático (título, descrição, canonical, JSON-LD, sitemap); os campos abaixo são
 * sobrescritas opcionais. Deixar em branco mantém o automático.
 */
export default function BusinessSeoPanel({ data }: { data: AdminBusinessSeoData }) {
  const [values, setValues] = useState(data.overrides);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [longText, setLongText] = useState(data.suggestions.longDescription?.text ?? '');
  const [descriptionSaved, setDescriptionSaved] = useState(false);

  const applyLongDescription = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await applyAdminBusinessDescriptionAction(data.businessId, longText);
      if (res.success) setDescriptionSaved(true);
      setMessage(res.success ? { type: 'ok', text: 'Descrição da empresa atualizada. Recarregue a página para ver a nova nota.' } : { type: 'error', text: res.error || 'Erro ao salvar.' });
    });
  };

  const seoInput = useMemo(
    () => ({ slug: data.slug, name: data.name, category: data.category, description: data.description, city: data.city, state: data.state }),
    [data]
  );
  const auto = {
    title: buildBusinessTitle(seoInput),
    description: buildBusinessDescription(seoInput),
  };
  const shownTitle = buildBusinessTitle(seoInput, values);
  const shownDescription = buildBusinessDescription(seoInput, values);
  const url = businessCanonicalUrl(data.slug);
  const published = data.publicationStatus === 'published';
  const indexed = published && values.seo_indexable;

  const save = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await updateAdminBusinessSeoAction(data.businessId, values);
      setMessage(res.success ? { type: 'ok', text: 'SEO salvo. Sitemap e página atualizados.' } : { type: 'error', text: res.error || 'Erro ao salvar.' });
    });
  };

  return (
    <section className="mx-auto mt-8 w-full max-w-5xl rounded-2xl border border-stone-200 bg-white p-6 shadow-sm" aria-label="SEO da empresa">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-900">SEO e presença no Google</h2>
          <p className="text-xs text-stone-500">Automático para toda empresa publicada. Os campos abaixo são opcionais.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${indexed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
          {indexed ? 'Indexável e no sitemap' : published ? 'Fora do Google (noindex)' : 'Ainda não publicada'}
        </span>
      </div>

      <div className="mt-5 rounded-xl border border-stone-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-stone-900">Nota interna de SEO: {data.score.score}/100 · {data.score.statusLabel}</p>
          <span className="text-[11px] text-stone-500">Não é uma nota do Google.</span>
        </div>
        {data.score.issues.length > 0 ? (
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-stone-700">
            {data.score.issues.map((issue) => (
              <li key={issue.label}>{issue.label} <span className="text-stone-400">(+{issue.points})</span></li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs font-semibold text-emerald-700">Cadastro completo para SEO.</p>
        )}
      </div>

      <div className="mt-5 rounded-xl border border-[#C9A227]/40 bg-[#fbf7ee] p-4">
        <p className="text-sm font-bold text-stone-900">Sugestões automáticas</p>
        <p className="text-xs text-stone-600">Geradas só com dados do cadastro, sem inventar nada. Clique para usar e revise antes de salvar.</p>

        <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-stone-500">Título SEO</p>
        <ul className="mt-1 space-y-1">
          {data.suggestions.titles.map((title) => (
            <li key={title} className="flex items-start justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm">
              <span>{title} <span className="text-xs text-stone-400">({title.length})</span></span>
              <button type="button" className="shrink-0 text-xs font-bold text-[#5d1523] hover:underline" onClick={() => setValues({ ...values, seo_title: title })}>Usar</button>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-stone-500">Descrição SEO (aparece no Google)</p>
        <ul className="mt-1 space-y-1">
          {data.suggestions.descriptions.map((text) => (
            <li key={text} className="flex items-start justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm">
              <span>{text} <span className="text-xs text-stone-400">({text.length})</span></span>
              <button type="button" className="shrink-0 text-xs font-bold text-[#5d1523] hover:underline" onClick={() => setValues({ ...values, seo_description: text })}>Usar</button>
            </li>
          ))}
        </ul>

        {data.suggestions.longDescription ? (
          <>
            <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-stone-500">Descrição da empresa (cadastro, vale pontos na nota)</p>
            <textarea className={`${INPUT} mt-1`} rows={4} maxLength={1000} value={longText} onChange={(e) => setLongText(e.target.value)} />
            <p className="mt-1 text-xs text-stone-500">
              {longText.length} caracteres{longText.length >= 150 ? ' · atinge o mínimo de 150 da nota' : ' · abaixo dos 150 da nota: complete o cadastro (veja as dicas abaixo)'}
            </p>
            <button type="button" onClick={applyLongDescription} disabled={pending || descriptionSaved || longText.trim().length < 50} className="mt-2 rounded-lg border border-[#5d1523] px-4 py-2 text-xs font-bold text-[#5d1523] hover:bg-white disabled:opacity-50">
              {descriptionSaved ? 'Descrição aplicada' : 'Aplicar na descrição da empresa'}
            </button>
          </>
        ) : null}

        {data.suggestions.hints.length > 0 ? (
          <ul className="mt-3 list-disc space-y-0.5 pl-5 text-xs text-amber-800">
            {data.suggestions.hints.map((hint) => <li key={hint}>{hint}</li>)}
          </ul>
        ) : null}
      </div>

      <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Prévia aproximada no Google</p>
        <p className="mt-2 truncate text-xs text-emerald-800">{url}</p>
        <p className="mt-0.5 text-lg font-medium text-blue-800">{shownTitle}</p>
        <p className="mt-0.5 text-sm text-stone-700">{shownDescription}</p>
        <p className="mt-2 text-[11px] text-stone-500">O Google pode apresentar o resultado de maneira diferente.</p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-bold text-stone-700">Título SEO ({values.seo_title.length}/70)</label>
          <input className={INPUT} maxLength={70} value={values.seo_title} placeholder={auto.title} onChange={(e) => setValues({ ...values, seo_title: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-bold text-stone-700">Descrição SEO ({values.seo_description.length}/200)</label>
          <textarea className={INPUT} rows={3} maxLength={200} value={values.seo_description} placeholder={auto.description} onChange={(e) => setValues({ ...values, seo_description: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-bold text-stone-700">Imagem de compartilhamento (link https, opcional)</label>
          <input className={INPUT} value={values.seo_og_image_url} placeholder="Vazio = usa a capa da empresa, depois o logo" onChange={(e) => setValues({ ...values, seo_og_image_url: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-stone-800 md:col-span-2">
          <input type="checkbox" checked={values.seo_indexable} onChange={(e) => setValues({ ...values, seo_indexable: e.target.checked })} />
          Permitir que o Google indexe esta página (aparece no sitemap)
        </label>
      </div>

      {message ? (
        <p role="status" className={`mt-4 rounded-md px-3 py-2 text-sm font-semibold ${message.type === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
          {message.text}
        </p>
      ) : null}

      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="mt-4 rounded-lg bg-[#5d1523] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#4B161B] disabled:opacity-60"
      >
        {pending ? 'Salvando...' : 'Salvar SEO'}
      </button>
    </section>
  );
}
