'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { normalizeSearchTerm } from '@/lib/directory/normalize-search';
import { RegisterConnectionModal } from '@/components/public/business/sections/BusinessConnectionsCard';

type CompanyResult = { id: string; slug: string; name: string; city?: string | null; state?: string | null };

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Para onde voltar depois do login (registrar exige conta de membro). */
  loginRedirect: string;
};

/**
 * Botão que inicia o registro de uma conexão a partir de qualquer página:
 * confere o login, deixa a pessoa buscar e escolher a empresa e abre o formulário (tipo, foto, comentário).
 */
export function ConnectionStartFlow({ children, className, loginRedirect }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const handleStart = async () => {
    const { data } = await createClient().auth.getUser();
    if (!data.user) {
      window.location.href = `/login?redirect=${encodeURIComponent(loginRedirect)}`;
      return;
    }
    setPickerOpen(true);
  };

  return (
    <>
      <button type="button" onClick={() => void handleStart()} className={className}>
        {children}
      </button>

      {pickerOpen && !selectedSlug && (
        <CompanyPickerModal
          onClose={() => setPickerOpen(false)}
          onSelect={(slug) => {
            setSelectedSlug(slug);
            setPickerOpen(false);
          }}
        />
      )}
      {selectedSlug && <RegisterConnectionModal businessSlug={selectedSlug} onClose={() => setSelectedSlug(null)} />}
    </>
  );
}

function CompanyPickerModal({ onClose, onSelect }: { onClose: () => void; onSelect: (slug: string) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const normalized = normalizeSearchTerm(query);
    if (!normalized || normalized.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await (createClient() as any).rpc('public_businesses_search', {
          p_host: window.location.host,
          p_query: normalized,
          p_page: 1,
          p_page_size: 8,
        });
        setResults(!error && data?.items ? (data.items as CompanyResult[]) : []);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-stone-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Escolher a empresa"
      onClick={onClose}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} className="absolute right-3 top-3 rounded-full p-1.5 text-stone-500 hover:bg-stone-100" aria-label="Fechar">
          <X className="h-4 w-4" />
        </button>
        <h4 className="font-serif text-lg font-bold text-[#4B161B]">Em qual empresa?</h4>
        <p className="mt-1 text-xs text-stone-600">Busque pelo nome da empresa que você visitou ou onde comprou ou contratou.</p>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite o nome da empresa…"
            className="w-full rounded-xl border border-stone-300 py-2.5 pl-9 pr-3 text-sm"
          />
        </div>

        <div className="mt-3 max-h-64 overflow-y-auto">
          {loading && (
            <p className="flex items-center gap-2 p-3 text-xs text-stone-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Buscando…
            </p>
          )}
          {!loading && query.trim().length >= 2 && results.length === 0 && <p className="p-3 text-xs text-stone-500">Nenhuma empresa encontrada.</p>}
          <ul className="divide-y divide-stone-100">
            {results.map((company) => (
              <li key={company.id}>
                <button
                  type="button"
                  onClick={() => onSelect(company.slug)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-stone-50"
                >
                  <span className="text-sm font-semibold text-stone-900">{company.name}</span>
                  {(company.city || company.state) && (
                    <span className="shrink-0 text-[11px] text-stone-500">{[company.city, company.state].filter(Boolean).join(' - ')}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
