'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Building2, Loader2 } from 'lucide-react';
import { getAdminLodgesListAction, type AdminLodgeListItem } from '@/lib/admin/admin-lodges-service';

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Loja do cadastro escolhida na lista (ou null quando o texto volta a ser digitado livremente). */
  onPick?: (lodge: AdminLodgeListItem | null) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
};

const MIN_CHARS = 2;
const DEBOUNCE_MS = 300;

/**
 * Nome da loja com busca ao digitar. Mostra uma lista própria (nome, nº, potência e cidade) para distinguir lojas de
 * mesmo nome; sem texto, ao focar, mostra as primeiras do cadastro. Escolher uma loja identifica-a pelo id.
 */
export function AdminLodgeNameCombobox({ value, onChange, onPick, required, className, placeholder }: Props) {
  const [lodges, setLodges] = useState<AdminLodgeListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<AdminLodgeListItem | null>(null);
  const requestRef = useRef(0);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const term = value.trim();

  useEffect(() => {
    if (!open) return;
    const requestId = ++requestRef.current;
    setLoading(true);
    const timer = setTimeout(() => {
      getAdminLodgesListAction({ query: term.length >= MIN_CHARS ? term : undefined, page: 1, pageSize: term.length >= MIN_CHARS ? 30 : 20 })
        .then((result) => { if (requestRef.current === requestId) setLodges(result.items); })
        .catch(() => { if (requestRef.current === requestId) setLodges([]); })
        .finally(() => { if (requestRef.current === requestId) setLoading(false); });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term, open]);

  // Fecha ao clicar fora.
  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const choose = (lodge: AdminLodgeListItem) => {
    setPicked(lodge);
    onChange(lodge.name);
    onPick?.(lodge);
    setOpen(false);
  };

  const handleType = (text: string) => {
    if (picked) {
      setPicked(null);
      onPick?.(null);
    }
    onChange(text);
    setOpen(true);
  };

  return (
    <div className="space-y-1.5" ref={boxRef}>
      <div className="relative">
        <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          required={required}
          value={value}
          onChange={(event) => handleType(event.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }}
          placeholder={placeholder || 'Digite para buscar ou cadastrar uma nova Loja'}
          className={`${className || ''} pl-9 pr-9`}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-stone-400" />}

        {open && (
          <ul
            role="listbox"
            className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-stone-300 bg-white py-1 shadow-xl"
          >
            {lodges.map((lodge) => (
              <li key={lodge.id} role="option" aria-selected={picked?.id === lodge.id}>
                <button
                  type="button"
                  onMouseDown={(event) => { event.preventDefault(); choose(lodge); }}
                  className="block w-full px-3 py-2 text-left hover:bg-amber-50 focus:bg-amber-50 focus:outline-none"
                >
                  <span className="block text-sm font-semibold text-stone-900">
                    {lodge.name}{lodge.code_number ? ` nº ${lodge.code_number}` : ''}
                  </span>
                  <span className="block text-[11px] text-stone-500">
                    {[lodge.potency, [lodge.city, lodge.state].filter(Boolean).join('/')].filter(Boolean).join(' · ')}
                  </span>
                </button>
              </li>
            ))}
            {!loading && lodges.length === 0 && (
              <li className="px-3 py-2 text-xs text-stone-500">
                {term.length >= MIN_CHARS ? 'Nenhuma loja encontrada. Continue digitando para cadastrar uma nova.' : 'Digite para buscar.'}
              </li>
            )}
            {term.length < MIN_CHARS && lodges.length > 0 && (
              <li className="border-t border-stone-100 px-3 py-1.5 text-[11px] text-stone-500">
                Mostrando as primeiras lojas. Digite o nome para buscar entre todas.
              </li>
            )}
          </ul>
        )}
      </div>

      {picked && <p className="text-[11px] font-medium text-emerald-700">Loja do cadastro selecionada.</p>}
      {!picked && term.length >= MIN_CHARS && !open && (
        <p className="text-[11px] font-medium text-amber-700">
          Loja nova: ao salvar, será criado um cadastro básico para completar depois em{' '}
          <Link href="/admin/lojas" className="underline">Lojas Maçônicas</Link>. Para usar uma loja já cadastrada, escolha-a na lista.
        </p>
      )}
    </div>
  );
}
