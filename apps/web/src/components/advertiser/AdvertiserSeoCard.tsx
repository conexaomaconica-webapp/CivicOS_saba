import React from 'react';
import Link from 'next/link';
import type { AdvertiserSeoProfile } from '@/lib/advertiser/advertiser-seo-service';

const BAR_BY_STATUS: Record<AdvertiserSeoProfile['status'], string> = {
  incompleto: 'bg-rose-500',
  basico: 'bg-amber-500',
  bom: 'bg-sky-500',
  muito_bom: 'bg-emerald-500',
  completo: 'bg-emerald-600',
};

/** Cartão "Seu perfil no Google" do portal do anunciante: nota interna e as 3 melhorias que mais ajudam. */
export function AdvertiserSeoCard({ profile }: { profile: AdvertiserSeoProfile }) {
  const done = profile.suggestions.length === 0;
  return (
    <section aria-label="Seu perfil no Google" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-stone-900">Seu perfil no Google</h2>
          <p className="mt-0.5 text-xs text-stone-500">
            Perfis completos são mais fáceis de encontrar e passam mais confiança. Esta nota é interna da Conexão e não garante posição no Google.
          </p>
        </div>
        <p className="text-right">
          <span className="text-3xl font-extrabold text-[#5d1523]">{profile.score}</span>
          <span className="text-sm text-stone-400">/100</span>
          <span className="block text-xs font-bold text-stone-600">{profile.statusLabel}</span>
        </p>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100" role="progressbar" aria-valuenow={profile.score} aria-valuemin={0} aria-valuemax={100} aria-label="Nota de SEO">
        <div className={`h-full rounded-full ${BAR_BY_STATUS[profile.status]}`} style={{ width: `${profile.score}%` }} />
      </div>

      {done ? (
        <p className="mt-4 text-sm font-semibold text-emerald-700">Seu perfil está completo. Mantenha as informações atualizadas.</p>
      ) : (
        <>
          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-stone-500">O que mais ajuda agora</p>
          <ul className="mt-2 divide-y divide-stone-100">
            {profile.suggestions.map((item) => (
              <li key={item.key} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm text-stone-800">
                  {item.label} <span className="text-xs font-semibold text-emerald-700">+{item.points} pontos</span>
                </span>
                <Link href={item.href} className="shrink-0 rounded-lg bg-[#5d1523] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#4B161B]">
                  {item.cta}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
