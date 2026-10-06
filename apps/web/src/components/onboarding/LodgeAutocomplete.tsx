'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { searchLodgeSuggestionsAction, type LodgeSuggestion } from '@/app/actions/public-lodge-autocomplete';

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Loja do cadastro escolhida na lista (ou null quando o texto volta a ser digitado livremente). */
  onPick?: (lodge: LodgeSuggestion | null) => void;
  placeholder?: string;
  className?: string;
  /** Fundo da página onde o campo aparece: escuro (onboarding) ou claro (convite). */
  tone?: 'dark' | 'light';
};

const DEBOUNCE_MS = 300;
const MIN_CHARS = 2;

/**
 * Campo de Loja com sugestões ao digitar (mesmo catálogo do Guia). Escolher uma sugestão preenche o nome e guarda o id da
 * loja; se não houver correspondência, o texto digitado é aceito como está e a equipe ajusta depois.
 */
export function LodgeAutocomplete({ id, value, onChange, onPick, placeholder, className, tone = 'dark' }: Props) {
  const light = tone === 'light';
  const [items, setItems] = useState<LodgeSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [searched, setSearched] = useState(false);
  const [picked, setPicked] = useState(false);
  const requestRef = useRef(0);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const term = value.trim();

  useEffect(() => {
    if (!open || picked || term.length < MIN_CHARS) {
      setItems([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    const requestId = ++requestRef.current;
    setLoading(true);
    const timer = setTimeout(() => {
      searchLodgeSuggestionsAction(term)
        .then((result) => {
          if (requestRef.current !== requestId) return;
          setItems(result);
          setSearched(true);
        })
        .finally(() => {
          if (requestRef.current === requestId) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term, open, picked]);

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const choose = (lodge: LodgeSuggestion) => {
    setPicked(true);
    onChange(lodge.label);
    onPick?.(lodge);
    setOpen(false);
  };

  const handleType = (text: string) => {
    if (picked) {
      setPicked(false);
      onPick?.(null);
    }
    onChange(text);
    setOpen(true);
  };

  return (
    <div className="relative" ref={boxRef}>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => handleType(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        className={className}
      />
      {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-stone-400" aria-hidden />}

      {open && !picked && term.length >= MIN_CHARS && (items.length > 0 || (searched && !loading)) && (
        <ul
          role="listbox"
          className={`absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border py-1 shadow-2xl ${
            light ? 'border-stone-300 bg-white' : 'border-[#C9A227]/40 bg-[#1f0509]'
          }`}
        >
          {items.map((lodge) => (
            <li key={lodge.id} role="option" aria-selected={false}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(lodge);
                }}
                className={`block w-full px-3 py-2 text-left focus:outline-none ${
                  light ? 'hover:bg-amber-50 focus:bg-amber-50' : 'hover:bg-[#3B0B14] focus:bg-[#3B0B14]'
                }`}
              >
                <span className={`block text-xs font-semibold ${light ? 'text-stone-900' : 'text-white'}`}>{lodge.label}</span>
                <span className={`block text-[11px] ${light ? 'text-stone-500' : 'text-stone-400'}`}>
                  {[lodge.potency, [lodge.city, lodge.state].filter(Boolean).join('/')].filter(Boolean).join(' · ')}
                </span>
              </button>
            </li>
          ))}
          {items.length === 0 && searched && !loading && (
            <li className={`px-3 py-2 text-[11px] ${light ? 'text-stone-600' : 'text-stone-300'}`}>
              Não encontramos essa Loja na lista. Pode seguir assim mesmo: a equipe ajusta depois.
            </li>
          )}
        </ul>
      )}

      {picked && <p className={`mt-1 text-[11px] font-medium ${light ? 'text-emerald-700' : 'text-emerald-400'}`}>Loja do cadastro selecionada.</p>}
    </div>
  );
}
