'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type StateOption = { ibge_code: number; uf: string; name: string };
type CityOption = { ibge_code: number; name: string };
type Props = {
  state: string;
  city: string;
  onStateChange: (value: string) => void;
  onCityChange: (value: string) => void;
  /** 'member' = visual da área do membro (campos maiores, rótulos neutros). */
  variant?: 'admin' | 'member';
};

const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function BrazilianLocationFields({ state, city, onStateChange, onCityChange, variant = 'admin' }: Props) {
  const member = variant === 'member';
  const labelClass = member ? 'block text-xs font-bold text-stone-700' : 'block text-xs font-bold text-stone-800 mb-1';
  const selectClass = member
    ? 'mt-1 block min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-normal text-stone-900 outline-none focus:ring-2 focus:ring-[var(--member-primary,#5d1523)] disabled:opacity-60'
    : 'w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900 disabled:opacity-60';
  const [states, setStates] = useState<StateOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data, error: queryError } = await (createClient() as any).from('brazilian_states').select('ibge_code, uf, name').order('name');
      if (!active) return;
      if (queryError) setError('Não foi possível carregar os estados.'); else setStates(data || []);
      setLoadingStates(false);
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const selectedState = states.find((item) => item.uf === state);
    if (!selectedState) { setCities([]); return; }
    let active = true;
    setLoadingCities(true);
    setError(null);
    void (async () => {
      const { data, error: queryError } = await (createClient() as any).from('brazilian_cities').select('ibge_code, name').eq('state_ibge_code', selectedState.ibge_code).order('name');
      if (!active) return;
      if (queryError) setError('Não foi possível carregar as cidades.'); else setCities(data || []);
      setLoadingCities(false);
    })();
    return () => { active = false; };
  }, [state, states]);

  // Cadastro antigo com grafia diferente (caixa/acentos): troca pelo nome oficial da lista, sem o usuário precisar fazer nada.
  useEffect(() => {
    if (!city || loadingCities || cities.length === 0 || cities.some((item) => item.name === city)) return;
    const official = cities.find((item) => fold(item.name) === fold(city));
    if (official) onCityChange(official.name);
  }, [city, cities, loadingCities, onCityChange]);

  return <>
    <div>
      <label className={labelClass} htmlFor="loc-state">Estado (UF)</label>
      <div className="relative">
        <select id="loc-state" value={state} disabled={loadingStates} required={member} onChange={(event) => { onStateChange(event.target.value); onCityChange(''); }} className={selectClass}>
          <option value="">Selecione o estado</option>
          {states.map((item) => <option key={item.ibge_code} value={item.uf}>{item.uf} — {item.name}</option>)}
        </select>
        {loadingStates && <Loader2 className="absolute right-3 top-2.5 h-3.5 w-3.5 animate-spin text-stone-500" />}
      </div>
    </div>
    <div>
      <label className={labelClass} htmlFor="loc-city">{member ? 'Cidade' : 'Cidade / Oriente'}</label>
      <div className="relative">
        <select id="loc-city" value={city} disabled={!state || loadingCities} required={member} onChange={(event) => onCityChange(event.target.value)} className={selectClass}>
          <option value="">{state ? 'Selecione a cidade' : 'Selecione primeiro o estado'}</option>
          {!member && city && !cities.some((item) => item.name === city) && <option value={city}>{city}</option>}
          {cities.map((item) => <option key={item.ibge_code} value={item.name}>{item.name}</option>)}
        </select>
        {loadingCities && <Loader2 className="absolute right-3 top-2.5 h-3.5 w-3.5 animate-spin text-stone-500" />}
      </div>
    </div>
    {error && <p className={`${member ? 'sm:col-span-2' : 'md:col-span-3'} text-xs font-semibold text-red-700`}>{error}</p>}
  </>;
}
