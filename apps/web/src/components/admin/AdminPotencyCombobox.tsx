'use client';

import { useEffect, useId, useState } from 'react';
import { Landmark } from 'lucide-react';
import { getAdminLodgeFacetsAction } from '@/lib/admin/admin-lodges-list-service';

type Props = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
};

/** Potência com sugestão ao digitar: lista as potências que já existem no cadastro de lojas, mas aceita outra. */
export function AdminPotencyCombobox({ value, onChange, required, className, placeholder }: Props) {
  const listId = useId();
  const [options, setOptions] = useState<Array<{ value: string; label: string; count: number }>>([]);

  useEffect(() => {
    let active = true;
    getAdminLodgeFacetsAction()
      .then((facets) => { if (active) setOptions(facets.potencies); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  return (
    <div className="relative">
      <Landmark className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
      <input
        type="text"
        list={listId}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder || 'Ex: GOB, CMSB, COMAB, GOSP'}
        className={`${className || ''} pl-9`}
        autoComplete="off"
      />
      <datalist id={listId}>
        {options.map((item) => (
          <option key={item.value} value={item.value}>{item.label !== item.value ? item.label : `${item.count} lojas`}</option>
        ))}
      </datalist>
    </div>
  );
}
