'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { Building2, Loader2 } from 'lucide-react';
import { getAdminLodgesListAction, type AdminLodgeListItem } from '@/lib/admin/admin-lodges-service';

type Props = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
};

export function AdminLodgeNameCombobox({ value, onChange, required, className, placeholder }: Props) {
  const listId = useId();
  const [lodges, setLodges] = useState<AdminLodgeListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getAdminLodgesListAction({ page: 1, pageSize: 200 })
      .then((result) => { if (active) setLodges(result.items); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const normalized = value.trim().toLocaleLowerCase('pt-BR');
  const exists = normalized.length > 0 && lodges.some((lodge) => lodge.name.trim().toLocaleLowerCase('pt-BR') === normalized);

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          list={listId}
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder || 'Digite para buscar ou cadastrar uma nova Loja'}
          className={`${className || ''} pl-9 pr-9`}
          autoComplete="off"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-stone-400" />}
        <datalist id={listId}>
          {lodges.map((lodge) => (
            <option key={lodge.id} value={lodge.name}>{[lodge.potency, lodge.city, lodge.state].filter(Boolean).join(' · ')}</option>
          ))}
        </datalist>
      </div>
      {!loading && normalized && !exists && (
        <p className="text-[11px] font-medium text-amber-700">
          Nova Loja: ao salvar, será criado um cadastro básico para completar depois em{' '}
          <Link href="/admin/lojas" className="underline">Lojas Maçônicas</Link>.
        </p>
      )}
      {!loading && exists && <p className="text-[11px] font-medium text-emerald-700">Loja localizada no cadastro.</p>}
    </div>
  );
}
